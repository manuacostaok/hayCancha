"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma, basePrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";

export async function getEmployees() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.membership.findMany({
    include: { user: true },
    orderBy: { role: "asc" },
  });
}

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

/**
 * Invita a un empleado por email.
 * Si la persona ya tiene cuenta en la plataforma
 * (de otro complejo, por ejemplo), se le suma la membership acá directo.
 * Si no, se crea el User sin contraseña — queda "pendiente" hasta que
 * inicie sesión por primera vez y la fije.
 */
export async function inviteEmployee(
  input: z.infer<typeof InviteSchema>
) {
  const complex = await requireComplex();

  if (complex.plan !== "PRO") {
    throw new Error(
      "Empleados ilimitados es una función del plan Pro. En Starter podés tener hasta 1 usuario (vos)."
    );
  }

  const data = InviteSchema.parse(input);

  let user = await basePrisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    user = await basePrisma.user.create({
      data: {
        email: data.email,
        name: data.name,
      },
    });
  }

  const existing = await basePrisma.membership.findFirst({
    where: {
      userId: user.id,
      complexId: complex.id,
    },
  });

  if (existing) {
    throw new Error("Esa persona ya es parte de tu equipo.");
  }

  await basePrisma.membership.create({
    data: {
      userId: user.id,
      complexId: complex.id,
      role: "EMPLOYEE",
    },
  });

  revalidatePath("/team");
}

export async function removeEmployee(membershipId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const membership = await db.membership.findFirst({
    where: { id: membershipId },
  });

  if (membership?.role === "OWNER") {
    throw new Error("No podés sacar al dueño del complejo.");
  }

  await basePrisma.membership.delete({
    where: { id: membershipId },
  });

  revalidatePath("/team");
}

export async function getBranches() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.branch.findMany({
    include: { courts: true },
    orderBy: { name: "asc" },
  });
}

const BranchSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
});

export async function createBranch(
  input: z.infer<typeof BranchSchema>
) {
  const complex = await requireComplex();

  if (!hasFeature(complex.plan, "multi_branch")) {
    throw new Error("Multi sucursal es una función del plan Pro.");
  }

  const data = BranchSchema.parse(input);
  const db = tenantPrisma(complex.id);

  await db.branch.create({
    data: {
      ...data,
      complexId: complex.id,
    },
  });

  revalidatePath("/team");
}