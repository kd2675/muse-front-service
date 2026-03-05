import { API_BASE, postJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { LoginResponse } from "../types/auth";
import { emitAuthChanged, emitAuthExpired } from "./authEvents";

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

let accessTokenMemory: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function setAccessToken(token: string) {
  accessTokenMemory = token;
  emitAuthChanged();
}

export function clearAccessToken() {
  accessTokenMemory = null;
  emitAuthChanged();
}

export type AuthExpireReason = "expired" | "refresh_failed";
const TOKEN_EXPIRY_LEEWAY_SECONDS = 300;

export function notifyAuthExpired(reason: AuthExpireReason = "expired") {
  emitAuthExpired(reason);
}

function decodeBase64Url(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(padded);
    return decoded;
  } catch {
    return null;
  }
}

export function getUserFromToken(): AuthUser | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return null;
  }
  try {
    const data = JSON.parse(payload) as Record<string, unknown>;
    return {
      id: typeof data.sub === "string" ? data.sub : undefined,
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

export async function logout() {
  const token = getAccessToken();
  if (!token) {
    return;
  }

  await postJson("/auth/logout", {}, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  });
}

async function requestRefreshAccessToken(): Promise<string | null> {
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

function resolveAccessTokenFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const envelope = payload as { data?: { accessToken?: string } };
  const token = envelope.data?.accessToken;
  return typeof token === "string" ? token : null;
}

async function requestRefreshAccessTokenSilently(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Refresh failed with status ${response.status}`);
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      payload = JSON.parse(text);
    }

    const accessToken = resolveAccessTokenFromPayload(payload);
    if (!accessToken) {
      return null;
    }

    setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[auth] bootstrap refresh failed", error);
    }
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = requestRefreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function refreshAccessTokenOnBootstrap(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = requestRefreshAccessTokenSilently().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function ensureAccessToken(): Promise<string | null> {
  if (accessTokenMemory) {
    return accessTokenMemory;
  }
  return refreshAccessToken();
}
