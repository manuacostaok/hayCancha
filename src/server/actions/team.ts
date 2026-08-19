"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma, basePrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";

// ============================================================
// EMPLEADOS
// ============================================================

export async function getEmployees() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.membership.findMany({
    where: {
      complexId: complex.id,
    },
    include: {
      user: true,
    },
    orderBy: {
      role: "asc",
    },
  });
}

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

/**
 * Invita a un empleado por email.
 *
 * Si la persona ya tiene una cuenta en la plataforma,
 * se reutiliza ese User y se crea una Membership para
 * el complejo actual.
 *
 * Si no existe, se crea el User sin contraseña.
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

  // ==========================================================
  // USER
  // ==========================================================

  let user = await basePrisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    user = await basePrisma.user.create({
      data: {
        email: data.email,
        name: data.name,
      },
    });
  }

  // ==========================================================
  // MEMBERSHIP
  // ==========================================================

  const existing = await basePrisma.membership.findFirst({
    where: {
      userId: user.id,
      complexId: complex.id,
    },
  });

  if (existing) {
    throw new Error(
      "Esa persona ya es parte de tu equipo."
    );
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

// ============================================================
// ELIMINAR EMPLEADO
// ============================================================

export async function removeEmployee(
  membershipId: string
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const membership = await db.membership.findFirst({
    where: {
      id: membershipId,
      complexId: complex.id,
    },
  });

  if (!membership) {
    throw new Error(
      "Membresía no encontrada."
    );
  }

  if (membership.role === "OWNER") {
    throw new Error(
      "No podés sacar al dueño del complejo."
    );
  }

  // Usamos el ID que acabamos de verificar que
  // pertenece al complejo actual.
  await basePrisma.membership.delete({
    where: {
      id: membershipId,
    },
  });

  revalidatePath("/team");
}

// ============================================================
// SUCURSALES
// ============================================================

export async function getBranches() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.branch.findMany({
    where: {
      complexId: complex.id,
    },
    include: {
      courts: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

const BranchSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
});

// ============================================================
// CREAR SUCURSAL
// ============================================================

export async function createBranch(
  input: z.infer<typeof BranchSchema>
) {
  const complex = await requireComplex();

  if (!hasFeature(complex.plan, "multi_branch")) {
    throw new Error(
      "Multi sucursal es una función del plan Pro."
    );
  }

  const data = BranchSchema.parse(input);
  const db = tenantPrisma(complex.id);

  const branch = await db.branch.create({
    data: {
      complexId: complex.id,
      name: data.name,
      address: data.address,
    },
  });

  revalidatePath("/team");

  return branch;
}