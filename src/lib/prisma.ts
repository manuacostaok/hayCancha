import { PrismaClient } from "@prisma/client";

// Cliente base de Prisma (singleton en dev para evitar agotar conexiones con hot-reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const basePrisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

/**
 * Devuelve un cliente de Prisma "scopeado" a un complexId (tenant).
 * Inyecta automáticamente el filtro complexId en find/update/delete
 * para los modelos tenant-scoped, como red de seguridad de aplicación.
 * La red de seguridad final (aunque alguien se olvide de usar esto)
 * es la Row Level Security activada en Postgres — ver docs/rls.sql.
 * (Nota: migramos a MongoDB, que no tiene RLS nativo — ver README, sección
 * "Pendiente para robustecer multi-tenant". Esta función es hoy la ÚNICA
 * capa de aislamiento entre complejos, tratala como código crítico.)
 */
const TENANT_SCOPED_MODELS = new Set([
  "Sport", "Court", "Branch", "Customer", "Booking", "Tournament", "Membership",
]);

export function tenantPrisma(complexId: string) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) return query(args);

          const a = args as any;
          const WHERE_OPS = ["findFirst", "findMany", "findUnique", "count", "updateMany", "deleteMany", "aggregate", "groupBy"];
          if (WHERE_OPS.includes(operation)) {
            a.where = { ...(a.where ?? {}), complexId };
          }
          if (operation === "create") {
            a.data = { ...(a.data ?? {}), complexId };
          }
          if (operation === "createMany" && Array.isArray(a.data)) {
            a.data = a.data.map((d: any) => ({ ...d, complexId }));
          }
          return query(a);
        },
      },
    },
  });
}
