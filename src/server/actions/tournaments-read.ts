"use server";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";

export async function getTournaments() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  return db.tournament.findMany({ include: { teams: true, sport: true }, orderBy: { createdAt: "desc" } });
}

export async function getTournament(id: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  return db.tournament.findFirst({
    where: { id },
    include: { teams: true, matches: { include: { teamA: true, teamB: true }, orderBy: { roundOrder: "asc" } } },
  });
}

export async function getTournamentBySlug(slug: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  return db.tournament.findFirst({
    where: { publicSlug: slug },
    include: { teams: true, matches: { include: { teamA: true, teamB: true }, orderBy: { roundOrder: "asc" } } },
  });
}
