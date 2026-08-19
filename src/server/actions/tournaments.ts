"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";
import {
  generateSingleEliminationBracket,
  generateRoundRobin,
  computeStandings,
  splitIntoGroups,
  groupLabel,
} from "@/server/services/bracket";

// ============================================================
// SCHEMA
// ============================================================

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

// ============================================================
// HELPERS
// ============================================================

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================
// CREAR TORNEO
// ============================================================

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

  // Verificar que el deporte pertenezca al complejo
  const sport = await db.sport.findFirst({
    where: {
      id: data.sportId,
      complexId: complex.id,
    },
  });

  if (!sport) {
    throw new Error("El deporte seleccionado no pertenece a este complejo.");
  }

  const tournament = await db.tournament.create({
    data: {
      complexId: complex.id,
      sportId: data.sportId,
      name: data.name,
      format: data.format,
      registrationFee: data.registrationFee,
      publicSlug: `${slugify(data.name)}-${Date.now().toString(36)}`,
      status: "REGISTRATION_OPEN",
    },
  });

  revalidatePath("/tournaments");

  return tournament;
}

// ============================================================
// INSCRIBIR EQUIPO
// ============================================================

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
      complexId: complex.id,
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado.");
  }

  const existingTeams = await db.tournamentTeam.count({
    where: {
      tournamentId,
    },
  });

  const team = await db.tournamentTeam.create({
    data: {
      tournamentId,
      name,
      players,
      seed: existingTeams + 1,
    },
  });

  revalidatePath(`/tournaments/${tournamentId}`);

  return team;
}

// ============================================================
// GENERAR FIXTURE
// ============================================================

export async function generateFixture(tournamentId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.findFirst({
    where: {
      id: tournamentId,
      complexId: complex.id,
    },
    include: {
      teams: true,
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado");
  }

  const teamSeeds = tournament.teams.map((t) => ({
    id: t.id,
    name: t.name,
    seed: t.seed ?? 999,
  }));

  if (teamSeeds.length < 2) {
    throw new Error(
      "Necesitás al menos 2 equipos para generar el fixture."
    );
  }

  let matches: Array<{
    round: string;
    roundOrder: number;
    teamAId: string | null;
    teamBId: string | null;
  }>;

  if (tournament.format === "SINGLE_ELIM") {
    matches = generateSingleEliminationBracket(teamSeeds);
  } else if (tournament.format === "DOUBLE_ELIM") {
    matches = generateSingleEliminationBracket(teamSeeds).map((m) => ({
      ...m,
      round: `WB - ${m.round}`,
    }));
  } else if (
    tournament.format === "ROUND_ROBIN" ||
    tournament.format === "LEAGUE"
  ) {
    matches = generateRoundRobin(teamSeeds);
  } else if (tournament.format === "GROUPS_KNOCKOUT") {
    const groups = splitIntoGroups(teamSeeds, 4);

    matches = groups.flatMap((group, gi) => {
      if (group.length < 2) return [];

      const label = groupLabel(gi);

      return generateRoundRobin(group).map((m) => ({
        round: `Grupo ${label} · ${m.round}`,
        roundOrder: gi * 100 + m.roundOrder,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
      }));
    });
  } else {
    throw new Error("Formato de torneo no soportado.");
  }

  // Eliminamos fixture anterior
  await db.match.deleteMany({
    where: {
      tournamentId,
    },
  });

  if (matches.length > 0) {
    await db.match.createMany({
      data: matches.map((m) => ({
        tournamentId,
        round: m.round,
        roundOrder: m.roundOrder,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        status: "SCHEDULED" as const,
      })),
    });
  }

  await db.tournament.updateMany({
    where: {
      id: tournamentId,
      complexId: complex.id,
    },
    data: {
      status: "IN_PROGRESS",
    },
  });

  revalidatePath(`/tournaments/${tournamentId}`);
}

// ============================================================
// GRAN FINAL
// ============================================================

async function upsertGrandFinal(
  db: ReturnType<typeof tenantPrisma>,
  tournamentId: string,
  side: "A" | "B",
  teamId: string
) {
  const existing = await db.match.findFirst({
    where: {
      tournamentId,
      round: "Gran Final",
    },
  });

  if (!existing) {
    await db.match.create({
      data: {
        tournamentId,
        round: "Gran Final",
        roundOrder: 9999,
        status: "SCHEDULED",
        ...(side === "A"
          ? { teamAId: teamId }
          : { teamBId: teamId }),
      },
    });

    return;
  }

  await db.match.updateMany({
    where: {
      id: existing.id,
    },
    data:
      side === "A"
        ? { teamAId: teamId }
        : { teamBId: teamId },
  });
}

// ============================================================
// SINCRONIZAR DOBLE ELIMINACIÓN
// ============================================================

async function syncDoubleElimination(
  db: ReturnType<typeof tenantPrisma>,
  tournamentId: string
) {
  const tournament = await db.tournament.findFirst({
    where: {
      id: tournamentId,
    },
    include: {
      teams: true,
      matches: true,
    },
  });

  if (!tournament) return;

  const lossCount = new Map<string, number>();

  for (const team of tournament.teams) {
    lossCount.set(team.id, 0);
  }

  for (const match of tournament.matches) {
    if (
      match.status !== "PLAYED" ||
      match.scoreA == null ||
      match.scoreB == null ||
      match.round === "Gran Final"
    ) {
      continue;
    }

    const loserId =
      match.scoreA > match.scoreB
        ? match.teamBId
        : match.teamAId;

    if (loserId) {
      lossCount.set(
        loserId,
        (lossCount.get(loserId) ?? 0) + 1
      );
    }
  }

  const locked = new Set<string>();

  for (const match of tournament.matches) {
    if (
      match.round.startsWith("LB - ") &&
      match.status === "SCHEDULED"
    ) {
      if (match.teamAId) locked.add(match.teamAId);
      if (match.teamBId) locked.add(match.teamBId);
    }
  }

  const grandFinal = tournament.matches.find(
    (match) => match.round === "Gran Final"
  );

  if (grandFinal?.teamAId) {
    locked.add(grandFinal.teamAId);
  }

  if (grandFinal?.teamBId) {
    locked.add(grandFinal.teamBId);
  }

  const pending = tournament.teams
    .filter(
      (team) =>
        lossCount.get(team.id) === 1 &&
        !locked.has(team.id)
    )
    .map((team) => team.id);

  const existingLbRounds = new Set(
    tournament.matches
      .filter((match) =>
        match.round.startsWith("LB - ")
      )
      .map((match) => match.round)
  ).size;

  let roundCounter = existingLbRounds;

  const toCreate: Array<{
    tournamentId: string;
    round: string;
    roundOrder: number;
    teamAId: string;
    teamBId: string;
    status: "SCHEDULED";
  }> = [];

  for (
    let i = 0;
    i + 1 < pending.length;
    i += 2
  ) {
    roundCounter++;

    toCreate.push({
      tournamentId,
      round: `LB - Ronda ${roundCounter}`,
      roundOrder: 5000 + roundCounter,
      teamAId: pending[i],
      teamBId: pending[i + 1],
      status: "SCHEDULED",
    });
  }

  if (toCreate.length > 0) {
    await db.match.createMany({
      data: toCreate,
    });
  }

  if (
    pending.length % 2 === 1 &&
    grandFinal?.teamAId
  ) {
    const stillScheduled = await db.match.count({
      where: {
        tournamentId,
        round: {
          startsWith: "LB - ",
        },
        status: "SCHEDULED",
      },
    });

    if (stillScheduled === 0) {
      await upsertGrandFinal(
        db,
        tournamentId,
        "B",
        pending[pending.length - 1]
      );
    }
  }
}

// ============================================================
// CARGAR RESULTADO
// ============================================================

export async function reportResult(
  matchId: string,
  scoreA: number,
  scoreB: number
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  if (!Number.isInteger(scoreA) || scoreA < 0) {
    throw new Error("Resultado inválido.");
  }

  if (!Number.isInteger(scoreB) || scoreB < 0) {
    throw new Error("Resultado inválido.");
  }

  if (scoreA === scoreB) {
    throw new Error(
      "El partido no puede terminar empatado."
    );
  }

  const match = await db.match.findFirst({
    where: {
      id: matchId,
      tournament: {
        complexId: complex.id,
      },
    },
  });

  if (!match) {
    throw new Error("Partido no encontrado");
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

  const tournament = await db.tournament.findFirst({
    where: {
      id: match.tournamentId,
      complexId: complex.id,
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado.");
  }

  const winnerId =
    scoreA > scoreB
      ? match.teamAId
      : match.teamBId;

  if (!winnerId) {
    throw new Error(
      "No se pudo determinar el ganador."
    );
  }

  // ========================================================
  // DOBLE ELIMINACIÓN
  // ========================================================

  if (tournament.format === "DOUBLE_ELIM") {
    if (match.round === "Gran Final") {
      await db.tournament.updateMany({
        where: {
          id: match.tournamentId,
          complexId: complex.id,
        },
        data: {
          status: "FINISHED",
        },
      });
    } else {
      if (match.round.startsWith("WB - ")) {
        const nextRoundMatches =
          await db.match.findMany({
            where: {
              tournamentId: match.tournamentId,
              roundOrder: match.roundOrder + 1,
              round: {
                startsWith: "WB - ",
              },
            },
          });

        const nextMatch = nextRoundMatches[0];

        if (nextMatch) {
          await db.match.updateMany({
            where: {
              id: nextMatch.id,
            },
            data: nextMatch.teamAId
              ? { teamBId: winnerId }
              : { teamAId: winnerId },
          });
        } else {
          await upsertGrandFinal(
            db,
            match.tournamentId,
            "A",
            winnerId
          );
        }
      }

      await syncDoubleElimination(
        db,
        match.tournamentId
      );
    }
  }

  // ========================================================
  // SINGLE ELIM / PLAYOFFS
  // ========================================================

  else if (
    tournament.format === "SINGLE_ELIM" ||
    match.round.startsWith("Playoffs")
  ) {
    const nextRoundMatches =
      await db.match.findMany({
        where: {
          tournamentId: match.tournamentId,
          roundOrder: match.roundOrder + 1,
        },
      });

    const target = nextRoundMatches[0];

    if (target) {
      await db.match.updateMany({
        where: {
          id: target.id,
        },
        data: target.teamAId
          ? { teamBId: winnerId }
          : { teamAId: winnerId },
      });
    }
  }

  revalidatePath(
    `/tournaments/${match.tournamentId}`
  );
}

// ============================================================
// GENERAR PLAYOFFS
// ============================================================

export async function generatePlayoffs(
  tournamentId: string
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.findFirst({
    where: {
      id: tournamentId,
      complexId: complex.id,
    },
    include: {
      matches: {
        include: {
          teamA: true,
          teamB: true,
        },
      },
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado");
  }

  const groupMatches = tournament.matches.filter(
    (match) =>
      match.round.startsWith("Grupo ")
  );

  if (
    groupMatches.some(
      (match) => match.status !== "PLAYED"
    )
  ) {
    throw new Error(
      "Todavía hay partidos de la fase de grupos sin jugar."
    );
  }

  if (
    tournament.matches.some((match) =>
      match.round.startsWith("Playoffs")
    )
  ) {
    throw new Error(
      "Los playoffs de este torneo ya se generaron."
    );
  }

  const byGroup = new Map<
    string,
    typeof groupMatches
  >();

  for (const match of groupMatches) {
    const label = match.round
      .split(" · ")[0]
      .replace("Grupo ", "");

    byGroup.set(label, [
      ...(byGroup.get(label) ?? []),
      match,
    ]);
  }

  const firstPlace: {
    id: string;
    name: string;
    points: number;
  }[] = [];

  const secondPlace: {
    id: string;
    name: string;
    points: number;
  }[] = [];

  for (const groupList of byGroup.values()) {
    const standings = computeStandings(
      groupList.map((match) => ({
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        teamAName: match.teamA?.name,
        teamBName: match.teamB?.name,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        status: match.status,
      }))
    );

    if (standings[0]) {
      firstPlace.push({
        id: standings[0].teamId,
        name: standings[0].teamName,
        points: standings[0].points,
      });
    }

    if (standings[1]) {
      secondPlace.push({
        id: standings[1].teamId,
        name: standings[1].teamName,
        points: standings[1].points,
      });
    }
  }

  firstPlace.sort(
    (a, b) => b.points - a.points
  );

  secondPlace.sort(
    (a, b) => b.points - a.points
  );

  const qualifiers = [
    ...firstPlace,
    ...secondPlace,
  ];

  if (qualifiers.length < 2) {
    throw new Error(
      "No hay suficientes equipos clasificados para armar playoffs."
    );
  }

  const seeded = qualifiers.map((team, index) => ({
    id: team.id,
    name: team.name,
    seed: index + 1,
  }));

  const bracket =
    generateSingleEliminationBracket(seeded);

  await db.match.createMany({
    data: bracket.map((match) => ({
      tournamentId,
      round: `Playoffs - ${match.round}`,
      roundOrder: 10000 + match.roundOrder,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      status: "SCHEDULED" as const,
    })),
  });

  revalidatePath(
    `/tournaments/${tournamentId}`
  );
}

// ============================================================
// TABLA DE POSICIONES
// ============================================================

export async function getStandings(
  tournamentId: string
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const matches = await db.match.findMany({
    where: {
      tournamentId,
      tournament: {
        complexId: complex.id,
      },
    },
    include: {
      teamA: true,
      teamB: true,
    },
  });

  return computeStandings(
    matches.map((match) => ({
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName: match.teamA?.name,
      teamBName: match.teamB?.name,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      status: match.status,
    }))
  );
}