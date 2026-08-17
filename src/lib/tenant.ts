import { headers } from "next/headers";
import { basePrisma } from "./prisma";

/**
 * Resuelve el Complex (tenant) actual a partir del subdominio o dominio
 * personalizado, seteado en middleware.ts en el header x-complex-slug.
 * Toda página/acción del área (app) debe pasar por acá antes de tocar datos.
 */
export async function getCurrentComplex() {
  const slug = headers().get("x-complex-slug");
  if (!slug) return null;

  return basePrisma.complex.findFirst({
    where: { OR: [{ slug }, { customDomain: slug }] },
  });
}

export async function requireComplex() {
  const complex = await getCurrentComplex();
  if (!complex) throw new Error("No se pudo resolver el complejo (tenant) para este dominio.");
  return complex;
}
