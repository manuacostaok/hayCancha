"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { basePrisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  complexName: z.string().min(2, "Poné el nombre de tu complejo"),
  ownerEmail: z.string().email("Email inválido"),
  ownerPassword: z.string().min(6, "Mínimo 6 caracteres"),
  sportName: z.string().min(2),
  courtName: z.string().min(1),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Onboarding completo en una sola transacción: usuario dueño + complejo +
 * primer deporte + primera cancha. Este es el flujo de "menos de 5 minutos"
 * del brief — todo lo mínimo para que el complejo ya pueda recibir reservas.
 */
export async function registerComplex(input: z.infer<typeof RegisterSchema>) {
  const data = RegisterSchema.parse(input);

  const existing = await basePrisma.user.findUnique({ where: { email: data.ownerEmail } });
  if (existing) throw new Error("Ya existe una cuenta con ese email.");

  const baseSlug = slugify(data.complexName) || "complejo";
  let slug = baseSlug;
  let n = 1;
  while (await basePrisma.complex.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const passwordHash = await bcrypt.hash(data.ownerPassword, 10);

  const complex = await basePrisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: data.ownerEmail, name: data.ownerEmail.split("@")[0], passwordHash },
    });

    const complex = await tx.complex.create({
      data: {
        name: data.complexName,
        slug,
        plan: "FREE",
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    const sport = await tx.sport.create({
      data: { complexId: complex.id, name: data.sportName, defaultSlotMinutes: 60 },
    });

    await tx.court.create({
      data: { complexId: complex.id, sportId: sport.id, name: data.courtName },
    });

    return complex;
  });

  return { slug: complex.slug };
}
