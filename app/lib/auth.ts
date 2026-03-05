import { postJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { LoginResponse } from "../types/auth";
import { emitAuthChanged, emitAuthExpired } from "./authEvents";

const TOKEN_EXPIRY_LEEWAY_SECONDS = 300;
let accessTokenMemory: string | null = null;

const DEFAULT_AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  exp?: number;
  role?: string;
};

export function normalizeRole(role?: string | null): string | null {
  if (!role) {
    return null;
  }
  const normalized = role.trim().toUpperCase();
  if (normalized.startsWith("ROLE_")) {
    return normalized.slice(5);
  }
  return normalized;
}

export function hasAnyRole(
  role: string | null | undefined,
  requiredRoles: string[],
): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }
  return requiredRoles.some(
    (required) => normalizeRole(required) === normalizedRole,
  );
}

export function isAdminRole(role?: string | null): boolean {
  return hasAnyRole(role, ["ADMIN"]);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return accessTokenMemory;
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  accessTokenMemory = token;
  emitAuthChanged();
}

export function clearAccessToken() {
  if (typeof window === "undefined") {
    return;
  }
  accessTokenMemory = null;
  emitAuthChanged();
}

export function clearAuthTokens() {
  clearAccessToken();
}

export type AuthExpireReason = "expired" | "refresh_failed";

export function notifyAuthExpired(reason: AuthExpireReason = "expired") {
  emitAuthExpired(reason);
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

export function getUserFromToken(token?: string | null): AuthUser | null {
  const rawToken = token ?? getAccessToken();
  if (!rawToken) {
    return null;
  }
  const parts = rawToken.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return null;
  }
  try {
    const data = JSON.parse(payload) as Record<string, unknown>;
    const userId =
      typeof data.userId === "number"
        ? String(data.userId)
        : typeof data.userId === "string"
          ? data.userId
          : typeof data.sub === "string"
            ? data.sub
            : undefined;

    return {
      id: userId,
      name:
        typeof data.name === "string"
          ? data.name
          : typeof data.nickname === "string"
            ? data.nickname
            : undefined,
      email: typeof data.email === "string" ? data.email : undefined,
      exp: typeof data.exp === "number" ? data.exp : undefined,
      role: typeof data.role === "string" ? data.role : undefined,
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(
  exp?: number,
  leewaySeconds = TOKEN_EXPIRY_LEEWAY_SECONDS,
): boolean {
  if (!exp) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + leewaySeconds;
}

export function scheduleTokenExpiry(
  onExpire: () => void,
  exp?: number,
  leewaySeconds = TOKEN_EXPIRY_LEEWAY_SECONDS,
): () => void {
  if (!exp) {
    return () => undefined;
  }
  const now = Math.floor(Date.now() / 1000);
  const delayMs = Math.max((exp - now - leewaySeconds) * 1000, 0);
  const timeoutId = window.setTimeout(onExpire, delayMs);
  return () => window.clearTimeout(timeoutId);
}

export async function beginOAuthLogin(provider = "naver"): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const normalizedProvider = provider?.trim() || "naver";
  window.location.href = `${DEFAULT_AUTH_BASE_URL}/auth/bff/login/muse-front-service?provider=${encodeURIComponent(normalizedProvider)}`;
}

export async function logout() {
  const token = getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  try {
    await postJson("/auth/logout", {}, { headers, withCredentials: true });
  } finally {
    clearAuthTokens();
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const { data } = await postJson<ResponseEnvelope<LoginResponse>>(
    "/auth/refresh",
    {},
    { withCredentials: true },
  );

  if (!data?.data?.accessToken) {
    return null;
  }

  setAccessToken(data.data.accessToken);
  return data.data.accessToken;
}
