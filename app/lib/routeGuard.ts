"use client";

import { getAccessToken, getUserFromToken } from "./auth";

export const PROTECTED_PREFIXES = ["/profile", "/admin"];

export const ROLE_REQUIREMENTS: Record<string, string[]> = {
  "/profile": ["USER", "ADMIN"],
  "/admin": ["ADMIN"],
};

export function isProtectedPath(pathname: string) {
  return (
    PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export function hasAuth() {
  return !!getAccessToken();
}

export function getRequiredRoles(pathname: string): string[] | null {
  const key = Object.keys(ROLE_REQUIREMENTS).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return key ? ROLE_REQUIREMENTS[key] : null;
}

export function hasRequiredRole(required: string[] | null): boolean {
  if (!required || required.length === 0) {
    return true;
  }
  const user = getUserFromToken();
  if (!user?.role) {
    return false;
  }
  return required.includes(user.role);
}

export function canAccessPath(pathname: string): {
  allowed: boolean;
  reason?: "AUTH" | "ROLE";
  requiredRoles?: string[];
} {
  if (!isProtectedPath(pathname)) {
    return { allowed: true };
  }
  if (!hasAuth()) {
    return { allowed: false, reason: "AUTH" };
  }
  const required = getRequiredRoles(pathname);
  if (!hasRequiredRole(required)) {
    return { allowed: false, reason: "ROLE", requiredRoles: required ?? [] };
  }
  return { allowed: true };
}
