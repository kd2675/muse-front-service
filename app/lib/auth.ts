import { MUSE_CLIENT_ID, postJson } from "./api";
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

export type AuthActionResult = {
  ok: boolean;
  message?: string;
  token?: string;
  user?: AuthUser | null;
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
let bootstrapRefreshDone = false;
let bootstrapRefreshInFlight: Promise<string | null> | null = null;
let authGeneration = 0;
let explicitlySignedOut = false;

function withClientId(
  headers: Record<string, string> = {},
): Record<string, string> {
  return {
    "X-Client-Id": MUSE_CLIENT_ID,
    ...headers,
  };
}

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function setAccessToken(token: string) {
  accessTokenMemory = token;
  explicitlySignedOut = false;
  bootstrapRefreshDone = false;
  authGeneration += 1;
  emitAuthChanged();
}

export function clearAccessToken() {
  accessTokenMemory = null;
  bootstrapRefreshDone = false;
  bootstrapRefreshInFlight = null;
  authGeneration += 1;
  emitAuthChanged();
}

export type AuthExpireReason = "expired" | "refresh_failed";
const TOKEN_EXPIRY_LEEWAY_SECONDS = 300;

export function notifyAuthExpired(reason: AuthExpireReason = "expired") {
  emitAuthExpired(reason);
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function getUserFromToken(token = getAccessToken()): AuthUser | null {
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

function resolveAuthError(result: {
  error?: string;
  backendMapped?: string;
  backendMessage?: string;
}, fallback: string): string {
  return result.backendMapped ?? result.backendMessage ?? result.error ?? fallback;
}

export async function login(username: string, password: string): Promise<AuthActionResult> {
  const result = await postJson<ResponseEnvelope<LoginResponse>>(
    "/auth/login",
    { username, password },
    { headers: withClientId(), withCredentials: true },
  );
  const accessToken = result.data?.data?.accessToken;
  if (!accessToken) {
    return { ok: false, message: resolveAuthError(result, "로그인에 실패했습니다.") };
  }
  setAccessToken(accessToken);
  return {
    ok: true,
    token: accessToken,
    user: getUserFromToken(accessToken),
  };
}

export async function signup(username: string, password: string, email: string): Promise<AuthActionResult> {
  const result = await postJson<ResponseEnvelope<unknown>>(
    "/api/users",
    { username, password, email, role: "USER" },
    { headers: withClientId(), withCredentials: true },
  );
  return result.data?.success
    ? { ok: true, message: result.data.message }
    : { ok: false, message: resolveAuthError(result, "회원가입에 실패했습니다.") };
}

export async function logout() {
  explicitlySignedOut = true;
  authGeneration += 1;
  try {
    await postJson("/auth/logout", {}, {
      headers: withClientId(),
      withCredentials: true,
    });
  } finally {
    accessTokenMemory = null;
    bootstrapRefreshDone = true;
    bootstrapRefreshInFlight = null;
    emitAuthChanged();
  }
}

async function requestRefreshAccessToken(): Promise<string | null> {
  const requestGeneration = authGeneration;
  const { data } = await postJson<ResponseEnvelope<LoginResponse>>(
    "/auth/refresh",
    {},
    {
      headers: withClientId(),
      withCredentials: true,
    },
  );

  if (!data?.data?.accessToken) {
    return null;
  }
  if (requestGeneration !== authGeneration || explicitlySignedOut) {
    return null;
  }

  setAccessToken(data.data.accessToken);
  return data.data.accessToken;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (explicitlySignedOut) {
    return null;
  }
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = requestRefreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function bootstrapAccessToken(): Promise<string | null> {
  if (accessTokenMemory) {
    return accessTokenMemory;
  }
  if (explicitlySignedOut) {
    return null;
  }
  if (bootstrapRefreshDone) {
    return null;
  }
  if (bootstrapRefreshInFlight) {
    return bootstrapRefreshInFlight;
  }

  bootstrapRefreshInFlight = refreshAccessToken().finally(() => {
    bootstrapRefreshDone = true;
    bootstrapRefreshInFlight = null;
  });
  return bootstrapRefreshInFlight;
}

export async function ensureAccessToken(): Promise<string | null> {
  if (accessTokenMemory) {
    return accessTokenMemory;
  }
  return bootstrapAccessToken();
}
