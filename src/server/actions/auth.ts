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

  const complex = await basePrisma.$transaction(async (tx: any) => {
    const user = await tx.user.create({
      data: { email: data.ownerEmail, name: data.ownerEmail.split("@")[0], passwordHash },
    });

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    const complex = await tx.complex.create({
      data: {
        name: data.complexName,
        slug,
        plan: "STARTER",
        planStatus: "TRIALING",
        memberships: { create: { userId: user.id, role: "OWNER" } },
        subscription: { create: { plan: "STARTER", status: "TRIALING", currentPeriodEnd: trialEnds } },
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

const RegisterPlayerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

/** Cuenta de jugador: solo login, sin complejo ni membership — no gestiona nada, solo reserva. */
export async function registerPlayer(input: z.infer<typeof RegisterPlayerSchema>) {
  const data = RegisterPlayerSchema.parse(input);

  const existing = await basePrisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Ya existe una cuenta con ese email.");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await basePrisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
  });

  return { userId: user.id };
}

export async function hasAnyMembership(email: string) {
  const user = await basePrisma.user.findUnique({ where: { email }, include: { memberships: true } });
  return (user?.memberships.length ?? 0) > 0;
}
