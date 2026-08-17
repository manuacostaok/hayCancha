"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";

const SportSchema = z.object({
  name: z.string().min(2),
  defaultSlotMinutes: z.number().int().positive().default(60),
});

export async function getSports() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.sport.findMany({
    include: { courts: true },
    orderBy: { name: "asc" },
  });
}

export async function createSport(
  input: z.infer<typeof SportSchema>
) {
  const complex = await requireComplex();
  const data = SportSchema.parse(input);
  const db = tenantPrisma(complex.id);

  const sport = await db.sport.create({
    data: {
      ...data,
      complexId: complex.id,
    },
  });

  revalidatePath("/sports");

  return sport;
}

const CourtSchema = z.object({
  sportId: z.string(),
  name: z.string().min(1),
});

export async function createCourt(
  input: z.infer<typeof CourtSchema>
) {
  const complex = await requireComplex();
  const data = CourtSchema.parse(input);
  const db = tenantPrisma(complex.id);

  // Starter tiene tope de 3 canchas.
  // Se valida acá, no solo en el UI.
  if (complex.plan === "STARTER") {
    const count = await db.court.count();

    if (count >= 3) {
      throw new Error(
        "Llegaste al límite de 3 canchas de tu plan Starter. Pasate a Pro para sumar sin tope."
      );
    }
  }

  const court = await db.court.create({
    data: {
      ...data,
      complexId: complex.id,
    },
  });

  revalidatePath("/sports");
  revalidatePath("/courts");

  return court;
}