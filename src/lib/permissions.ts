import type { Role, Plan } from "@prisma/client";

/** Features exclusivas de cada plan. Un solo lugar para cambiar el gating. */
const PRO_FEATURES = new Set([
  "mercado_pago",
  "whatsapp",
  "multi_branch",
  "unlimited_employees",
  "tournaments",
  "advanced_reports",
  "exports",
  "api",
  "custom_domain",
  "coupons",
  "loyalty",
]);

export function hasFeature(plan: Plan, feature: string): boolean {
  if (plan === "PRO") return true;
  return !PRO_FEATURES.has(feature);
}

type Action = "view" | "create" | "edit" | "delete" | "manage_billing" | "manage_employees";
type Resource = "booking" | "customer" | "court" | "sport" | "tournament" | "settings";

interface MembershipLike {
  role: Role;
  permissions?: Record<string, boolean> | null;
}

/**
 * Helper central de autorización. Todo chequeo de permisos en el server
 * pasa por acá — nunca se compara `role === 'OWNER'` suelto en el código.
 */
export function can(membership: MembershipLike | null, action: Action, _resource: Resource): boolean {
  if (!membership) return false;
  if (membership.role === "SUPER_ADMIN" || membership.role === "OWNER") return true;

  // EMPLOYEE: por defecto puede operar, salvo overrides finos (PRO) guardados en `permissions`
  const restricted: Action[] = ["manage_billing", "manage_employees"];
  if (restricted.includes(action)) return false;

  const override = membership.permissions?.[action];
  return override ?? true;
}
