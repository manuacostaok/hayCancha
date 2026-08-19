"use server";

import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";

// ============================================================
// LISTAR TORNEOS
// ============================================================

export async function getTournaments() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.tournament.findMany({
    where: {
      complexId: complex.id,
    },
    include: {
      teams: true,
      sport: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// ============================================================
// OBTENER TORNEO
// ============================================================

export async function getTournament(id: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.tournament.findFirst({
    where: {
      id,
      complexId: complex.id,
    },
    include: {
      teams: true,
      matches: {
        include: {
          teamA: true,
          teamB: true,
        },
        orderBy: {
          roundOrder: "asc",
        },
      },
    },
  });
}

// ============================================================
// OBTENER TORNEO POR SLUG
// ============================================================

export async function getTournamentBySlug(
  slug: string
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.tournament.findFirst({
    where: {
      publicSlug: slug,
      complexId: complex.id,
    },
    include: {
      teams: true,
      matches: {
        include: {
          teamA: true,
          teamB: true,
        },
        orderBy: {
          roundOrder: "asc",
        },
      },
    },
  });
}