/**
 * Role -> default landing page mapping.
 *
 * Single source of truth for where each role lands after sign-in and where an
 * authenticated but wrong-role user is redirected. Imported by the DAL
 * (requireRole), the root landing page, and the auth actions so the mapping
 * is never duplicated.
 */

export type Role = "reporter" | "dicht_admin" | "dicht_technician";

export function defaultLandingForRole(role: Role | null | undefined): string {
  if (role === "dicht_admin") return "/admin/queue";
  if (role === "dicht_technician") return "/technician/assignments";
  return "/complaints/mine";
}
