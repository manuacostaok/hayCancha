"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";
import { generateSingleEliminationBracket, generateRoundRobin, computeStandings, splitIntoGroups, groupLabel } from "@/server/services/bracket";

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

  const teamSeeds = tournament.teams.map((t: any) => ({ id: t.id, name: t.name, seed: t.seed ?? 999 }));
  let matches;

  if (tournament.format === "SINGLE_ELIM") {
    matches = generateSingleEliminationBracket(teamSeeds);
  } else if (tournament.format === "DOUBLE_ELIM") {
    // Solo se arma la llave de ganadores de entrada. La llave de perdedores
    // se va armando sola, partido a partido, en reportResult/syncDoubleElimination —
    // no se puede pre-generar porque depende de quién va perdiendo y cuándo.
    matches = generateSingleEliminationBracket(teamSeeds).map((m) => ({ ...m, round: `WB - ${m.round}` }));
  } else if (tournament.format === "ROUND_ROBIN" || tournament.format === "LEAGUE") {
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
    throw new Error("Este formato (doble eliminación) todavía no tiene generador automático — se viene en la siguiente iteración.");
  }

  await db.match.deleteMany({ where: { tournamentId } });
  await db.match.createMany({
    data: matches.map((m: any) => ({
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

/** Busca (o crea) el partido de Gran Final y le asigna el equipo del lado que corresponda. */
async function upsertGrandFinal(db: any, tournamentId: string, side: "A" | "B", teamId: string) {
  const existing = await db.match.findFirst({ where: { tournamentId, round: "Gran Final" } });
  if (!existing) {
    await db.match.create({
      data: {
        tournamentId, round: "Gran Final", roundOrder: 9999, status: "SCHEDULED",
        ...(side === "A" ? { teamAId: teamId } : { teamBId: teamId }),
      },
    });
  } else {
    await db.match.updateMany({
      where: { id: existing.id },
      data: side === "A" ? { teamAId: teamId } : { teamBId: teamId },
    });
  }
}

/**
 * Recalcula la llave de perdedores de un torneo de doble eliminación.
 * Un equipo "espera turno" en la llave de perdedores cuando perdió
 * exactamente 1 vez y no está ya metido en un partido de LB sin jugar.
 * Se llama después de CADA resultado cargado (de WB o de LB) — así se van
 * armando los cruces de a poco, a medida que hay parejas disponibles.
 */
async function syncDoubleElimination(db: any, tournamentId: string) {
  const tournament = await db.tournament.findFirst({
    where: { id: tournamentId },
    include: { teams: true, matches: true },
  });
  if (!tournament) return;

  const lossCount = new Map<string, number>();
  for (const t of tournament.teams) lossCount.set(t.id, 0);

  for (const m of tournament.matches) {
    if (m.status !== "PLAYED" || m.scoreA == null || m.scoreB == null || m.round === "Gran Final") continue;
    const loserId = m.scoreA > m.scoreB ? m.teamBId : m.teamAId;
    if (loserId) lossCount.set(loserId, (lossCount.get(loserId) ?? 0) + 1);
  }

  const locked = new Set<string>();
  for (const m of tournament.matches) {
    if (m.round.startsWith("LB - ") && m.status === "SCHEDULED") {
      if (m.teamAId) locked.add(m.teamAId);
      if (m.teamBId) locked.add(m.teamBId);
    }
  }
  const gf = tournament.matches.find((m: any) => m.round === "Gran Final");
  if (gf?.teamAId) locked.add(gf.teamAId);
  if (gf?.teamBId) locked.add(gf.teamBId);

  const pending = tournament.teams
    .filter((t: any) => lossCount.get(t.id) === 1 && !locked.has(t.id))
    .map((t: any) => t.id);

  const existingLbRounds = new Set(tournament.matches.filter((m: any) => m.round.startsWith("LB - ")).map((m: any) => m.round)).size;
  let roundCounter = existingLbRounds;
  const toCreate: any[] = [];
  for (let i = 0; i + 1 < pending.length; i += 2) {
    roundCounter++;
    toCreate.push({
      tournamentId, round: `LB - Ronda ${roundCounter}`, roundOrder: 5000 + roundCounter,
      teamAId: pending[i], teamBId: pending[i + 1], status: "SCHEDULED",
    });
  }
  if (toCreate.length > 0) await db.match.createMany({ data: toCreate });

  // Si queda un único sobreviviente sin rival, ya no hay más partidos de LB
  // pendientes, y la llave de ganadores ya definió campeón: ese sobreviviente
  // es el campeón de la llave de perdedores -> pasa a la Gran Final.
  if (pending.length % 2 === 1 && gf?.teamAId) {
    const stillScheduled = await db.match.count({
      where: { tournamentId, round: { startsWith: "LB - " }, status: "SCHEDULED" },
    });
    if (stillScheduled === 0) {
      await upsertGrandFinal(db, tournamentId, "B", pending[pending.length - 1]);
    }
  }
}

/** Carga resultado y avanza el bracket según el formato del torneo. */
export async function reportResult(matchId: string, scoreA: number, scoreB: number) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const match = await db.match.findFirst({ where: { id: matchId } });
  if (!match) throw new Error("Partido no encontrado");

  await db.match.updateMany({ where: { id: matchId }, data: { scoreA, scoreB, status: "PLAYED" } });

  const tournament = await db.tournament.findFirst({ where: { id: match.tournamentId } });
  const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;

  if (tournament?.format === "DOUBLE_ELIM") {
    if (match.round === "Gran Final") {
      await db.tournament.updateMany({ where: { id: match.tournamentId }, data: { status: "FINISHED" } });
    } else {
      if (match.round.startsWith("WB - ")) {
        const nextRoundMatches = await db.match.findMany({
          where: { tournamentId: match.tournamentId, roundOrder: match.roundOrder + 1, round: { startsWith: "WB - " } },
        });
        if (nextRoundMatches[0] && winnerId) {
          await db.match.updateMany({
            where: { id: nextRoundMatches[0].id },
            data: nextRoundMatches[0].teamAId ? { teamBId: winnerId } : { teamAId: winnerId },
          });
        } else if (winnerId) {
          // no hay siguiente ronda de WB: este es el campeón de la llave de ganadores
          await upsertGrandFinal(db, match.tournamentId, "A", winnerId);
        }
      }
      // el perdedor (de WB o de LB) queda reflejado solo en syncDoubleElimination,
      // que recalcula quién está esperando rival en la llave de perdedores.
      await syncDoubleElimination(db, match.tournamentId);
    }
  } else if (tournament?.format === "SINGLE_ELIM" || match.round.startsWith("Playoffs")) {
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
  // Round robin / Liga / fase de grupos no necesitan avanzar nada — la tabla se recalcula sola.

  revalidatePath(`/tournaments/${match.tournamentId}`);
}

/**
 * Fase de grupos → playoffs: exige que todos los partidos de grupo estén
 * jugados, calcula la tabla de cada grupo, clasifica a los 2 primeros de
 * cada uno (1ros primero, después 2dos, ordenados por puntos) y arma el
 * cruce de eliminación reusando el mismo generador de bracket simple.
 */
export async function generatePlayoffs(tournamentId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const tournament = await db.tournament.findFirst({
    where: { id: tournamentId },
    include: { matches: { include: { teamA: true, teamB: true } } },
  });
  if (!tournament) throw new Error("Torneo no encontrado");

  const groupMatches = tournament.matches.filter((m: any) => m.round.startsWith("Grupo "));
  if (groupMatches.some((m: any) => m.status !== "PLAYED")) {
    throw new Error("Todavía hay partidos de la fase de grupos sin jugar.");
  }
  if (tournament.matches.some((m: any) => m.round.startsWith("Playoffs"))) {
    throw new Error("Los playoffs de este torneo ya se generaron.");
  }

  const byGroup = new Map<string, typeof groupMatches>();
  for (const m of groupMatches) {
    const label = m.round.split(" · ")[0].replace("Grupo ", "");
    byGroup.set(label, [...(byGroup.get(label) ?? []), m]);
  }

  const firstPlace: { id: string; name: string; points: number }[] = [];
  const secondPlace: { id: string; name: string; points: number }[] = [];

  for (const groupList of byGroup.values()) {
    const standings = computeStandings(
      groupList.map((m: any) => ({
        teamAId: m.teamAId, teamBId: m.teamBId,
        teamAName: m.teamA?.name, teamBName: m.teamB?.name,
        scoreA: m.scoreA, scoreB: m.scoreB, status: m.status,
      }))
    );
    if (standings[0]) firstPlace.push({ id: standings[0].teamId, name: standings[0].teamName, points: standings[0].points });
    if (standings[1]) secondPlace.push({ id: standings[1].teamId, name: standings[1].teamName, points: standings[1].points });
  }

  firstPlace.sort((a, b) => b.points - a.points);
  secondPlace.sort((a, b) => b.points - a.points);
  const qualifiers = [...firstPlace, ...secondPlace];
  if (qualifiers.length < 2) throw new Error("No hay suficientes equipos clasificados para armar playoffs.");

  const seeded = qualifiers.map((q, i) => ({ id: q.id, name: q.name, seed: i + 1 }));
  const bracket = generateSingleEliminationBracket(seeded);

  await db.match.createMany({
    data: bracket.map((m) => ({
      tournamentId,
      round: `Playoffs - ${m.round}`,
      roundOrder: 10000 + m.roundOrder, // separado de la numeración de grupos para no pisarse
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      status: "SCHEDULED",
    })),
  });

  revalidatePath(`/tournaments/${tournamentId}`);
}

export async function getStandings(tournamentId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  const matches = await db.match.findMany({
    where: { tournamentId },
    include: { teamA: true, teamB: true },
  });

  return computeStandings(
    matches.map((m: any) => ({
      teamAId: m.teamAId, teamBId: m.teamBId,
      teamAName: m.teamA?.name, teamBName: m.teamB?.name,
      scoreA: m.scoreA, scoreB: m.scoreB, status: m.status,
    }))
  );
}
