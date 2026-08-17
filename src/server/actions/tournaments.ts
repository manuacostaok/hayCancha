"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";
import { generateSingleEliminationBracket } from "@/server/services/bracket";

const CreateTournamentSchema = z.object({
  name: z.string().min(2),
  sportId: z.string(),
  format: z.enum([
    "SINGLE_ELIM",
    "DOUBLE_ELIM",
    "ROUND_ROBIN",
    "GROUPS_KNOCKOUT",
    "LEAGUE",
  ]),
  registrationFee: z.number().nonnegative().optional(),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTournament(
  input: z.infer<typeof CreateTournamentSchema>
) {
  const complex = await requireComplex();

  if (!hasFeature(complex.plan, "tournaments")) {
    throw new Error(
      "Los torneos son una función del plan Pro. Activá el trial de 14 días para probarlos."
    );
  }

  const data = CreateTournamentSchema.parse(input);
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.create({
    data: {
      ...data,
      complexId: complex.id,
      publicSlug: `${slugify(data.name)}-${Date.now().toString(36)}`,
      status: "REGISTRATION_OPEN",
    },
  });

  revalidatePath("/tournaments");

  return tournament;
}

export async function registerTeam(
  tournamentId: string,
  name: string,
  players: string[]
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.findFirst({
    where: {
      id: tournamentId,
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado");
  }

  const teamCount = await db.tournamentTeam.count({
    where: {
      tournamentId,
    },
  });

  const team = await db.tournamentTeam.create({
    data: {
      tournamentId,
      name,
      players,
      seed: teamCount + 1,
    },
  });

  revalidatePath(`/tournaments/${tournamentId}`);

  return team;
}

/**
 * Arma el fixture completo (todas las rondas)
 * y lo persiste como Match[].
 */
export async function generateFixture(tournamentId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.findFirst({
    where: {
      id: tournamentId,
    },
    include: {
      teams: true,
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado");
  }

  if (tournament.format !== "SINGLE_ELIM") {
    throw new Error(
      "Por ahora el generador automático soporta eliminación simple; el resto de formatos vienen en la siguiente iteración."
    );
  }

  const bracket = generateSingleEliminationBracket(
    tournament.teams.map((t) => ({
      id: t.id,
      name: t.name,
      seed: t.seed ?? 999,
    }))
  );

  await db.match.deleteMany({
    where: {
      tournamentId,
    },
  });

  await db.match.createMany({
    data: bracket.map((m) => ({
      tournamentId,
      round: m.round,
      roundOrder: m.roundOrder,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      status: "SCHEDULED",
    })),
  });

  await db.tournament.updateMany({
    where: {
      id: tournamentId,
    },
    data: {
      status: "IN_PROGRESS",
    },
  });

  revalidatePath(`/tournaments/${tournamentId}`);
}

/**
 * Carga resultado y, si corresponde,
 * avanza al ganador a la siguiente ronda.
 */
export async function reportResult(
  matchId: string,
  scoreA: number,
  scoreB: number
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const match = await db.match.findFirst({
    where: {
      id: matchId,
    },
  });

  if (!match) {
    throw new Error("Partido no encontrado");
  }

  if (scoreA < 0 || scoreB < 0) {
    throw new Error("Los resultados no pueden ser negativos");
  }

  if (scoreA === scoreB) {
    throw new Error(
      "Un partido de eliminación simple no puede terminar empatado."
    );
  }

  await db.match.updateMany({
    where: {
      id: matchId,
    },
    data: {
      scoreA,
      scoreB,
      status: "PLAYED",
    },
  });

  const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;

  const nextRoundMatches = await db.match.findMany({
    where: {
      tournamentId: match.tournamentId,
      roundOrder: match.roundOrder + 1,
    },
    orderBy: {
      roundOrder: "asc",
    },
  });

  const target = nextRoundMatches[0];

  if (target && winnerId) {
    await db.match.updateMany({
      where: {
        id: target.id,
      },
      data: target.teamAId
        ? {
            teamBId: winnerId,
          }
        : {
            teamAId: winnerId,
          },
    });
  }

  revalidatePath(`/tournaments/${match.tournamentId}`);
}