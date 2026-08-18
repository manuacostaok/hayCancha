"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";
import { generateSingleEliminationBracket, generateRoundRobin, computeStandings } from "@/server/services/bracket";

const CreateTournamentSchema = z.object({
  name: z.string().min(2),
  sportId: z.string(),
  format: z.enum(["SINGLE_ELIM", "DOUBLE_ELIM", "ROUND_ROBIN", "GROUPS_KNOCKOUT", "LEAGUE"]),
  registrationFee: z.number().nonnegative().optional(),
});

function slugify(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
}

export async function createTournament(input: z.infer<typeof CreateTournamentSchema>) {
  const complex = await requireComplex();
  if (!hasFeature(complex.plan, "tournaments")) {
    throw new Error("Los torneos son una función del plan Pro. Activá el trial de 14 días para probarlos.");
  }
  const data = CreateTournamentSchema.parse(input);
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.create({
    data: { ...data, publicSlug: `${slugify(data.name)}-${Date.now().toString(36)}`, status: "REGISTRATION_OPEN" },
  });

  revalidatePath("/tournaments");
  return tournament;
}

export async function registerTeam(tournamentId: string, name: string, players: string[]) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const team = await db.tournamentTeam.create({
    data: { tournamentId, name, players, seed: (await db.tournamentTeam.count({ where: { tournamentId } })) + 1 },
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  return team;
}

/** Arma el fixture completo (todas las rondas) y lo persiste como Match[]. */
export async function generateFixture(tournamentId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.findFirst({ where: { id: tournamentId }, include: { teams: true } });
  if (!tournament) throw new Error("Torneo no encontrado");

  const teamSeeds = tournament.teams.map((t) => ({ id: t.id, name: t.name, seed: t.seed ?? 999 }));
  let matches;

  if (tournament.format === "SINGLE_ELIM") {
    matches = generateSingleEliminationBracket(teamSeeds);
  } else if (tournament.format === "ROUND_ROBIN" || tournament.format === "LEAGUE") {
    matches = generateRoundRobin(teamSeeds);
  } else {
    throw new Error("Este formato (doble eliminación / fase de grupos) todavía no tiene generador automático — se viene en la siguiente iteración.");
  }

  await db.match.deleteMany({ where: { tournamentId } });
  await db.match.createMany({
    data: matches.map((m) => ({
      tournamentId,
      round: m.round,
      roundOrder: m.roundOrder,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      status: "SCHEDULED",
    })),
  });

  await db.tournament.updateMany({ where: { id: tournamentId }, data: { status: "IN_PROGRESS" } });
  revalidatePath(`/tournaments/${tournamentId}`);
}

/** Carga resultado. En eliminación simple, además avanza al ganador a la siguiente ronda. */
export async function reportResult(matchId: string, scoreA: number, scoreB: number) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const match = await db.match.findFirst({ where: { id: matchId } });
  if (!match) throw new Error("Partido no encontrado");

  await db.match.updateMany({ where: { id: matchId }, data: { scoreA, scoreB, status: "PLAYED" } });

  const tournament = await db.tournament.findFirst({ where: { id: match.tournamentId } });
  if (tournament?.format === "SINGLE_ELIM") {
    const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
    const nextRoundMatches = await db.match.findMany({
      where: { tournamentId: match.tournamentId, roundOrder: match.roundOrder + 1 },
    });
    const target = nextRoundMatches[0]; // simplificado: MVP arma bien el bracket pero el emparejamiento fino de "próximo partido" es la siguiente iteración
    if (target && winnerId) {
      await db.match.updateMany({
        where: { id: target.id },
        data: target.teamAId ? { teamBId: winnerId } : { teamAId: winnerId },
      });
    }
  }
  // Round robin / Liga no necesita avanzar nada — la tabla se recalcula sola en base a los resultados.

  revalidatePath(`/tournaments/${match.tournamentId}`);
}

export async function getStandings(tournamentId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  const matches = await db.match.findMany({
    where: { tournamentId },
    include: { teamA: true, teamB: true },
  });

  return computeStandings(
    matches.map((m) => ({
      teamAId: m.teamAId, teamBId: m.teamBId,
      teamAName: m.teamA?.name, teamBName: m.teamB?.name,
      scoreA: m.scoreA, scoreB: m.scoreB, status: m.status,
    }))
  );
}
