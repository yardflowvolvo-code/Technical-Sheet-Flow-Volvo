export type CompanyRole = "gestor" | "portaria" | "doca";

// Single source of truth for which company role can see which page.
// Keep this in sync with the backend's requireRole(...) calls in
// artifacts/api-server/src/routes — this only controls what's shown/
// navigable in the UI; the API enforces the real restriction.
export const ROUTE_ROLES: Record<string, CompanyRole[]> = {
  "/portaria": ["portaria", "gestor"],
  "/doca": ["doca", "gestor"],
  "/mapa": ["doca", "gestor"],
  "/relatorios": ["gestor"],
  "/configuracoes": ["gestor"],
  "/usuarios": ["gestor"],
};

export function canAccess(
  role: CompanyRole | undefined,
  path: string
): boolean {
  if (!role) return false;
  const allowed = ROUTE_ROLES[path];
  if (!allowed) return true; // unlisted routes (e.g. not-found) aren't restricted
  return allowed.includes(role);
}

// Where to send someone after login / when they land on a page they can't
// access.
export function defaultRouteFor(role: CompanyRole | undefined): string {
  if (role === "doca") return "/doca";
  return "/portaria";
}
