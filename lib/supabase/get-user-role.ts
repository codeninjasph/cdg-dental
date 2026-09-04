import { UserRole } from "@/types/dental";

export const ROLE_COOKIE_NAME = "cdg-user-role";

/**
 * Normalize database user_role enum or string to app UserRole ('dentist' | 'secretary' | 'admin')
 */
export function normalizeRole(roleStr?: string | null): UserRole {
  if (!roleStr) return "dentist";
  const lower = roleStr.toLowerCase().trim();
  if (lower === "doctor" || lower === "dentist") return "dentist";
  if (lower === "secretary") return "secretary";
  if (lower === "admin") return "admin";
  return "dentist";
}

/**
 * Helper to set client-side role cookie
 */
export function setRoleCookie(role: UserRole) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `${ROLE_COOKIE_NAME}=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Helper to clear client-side role cookie
 */
export function clearRoleCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Helper to read client-side role cookie
 */
export function getRoleFromCookie(): UserRole | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ROLE_COOKIE_NAME}=`));
  if (!match) return null;
  const val = match.split("=")[1];
  return normalizeRole(val);
}
