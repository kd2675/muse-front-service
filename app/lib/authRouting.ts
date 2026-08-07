const INTERNAL_ORIGIN = "https://muse.internal";

export const OAUTH_NEXT_SESSION_KEY = "muse.oauth.next";

export function sanitizeAuthNextPath(value: string | null): string {
  if (!value) {
    return "/";
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) {
      return "/";
    }
    const resolved = new URL(decoded, INTERNAL_ORIGIN);
    if (resolved.origin !== INTERNAL_ORIGIN) {
      return "/";
    }
    if (resolved.pathname === "/login" || resolved.pathname.startsWith("/auth/callback")) {
      return "/";
    }
    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return "/";
  }
}

export function currentBrowserPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return sanitizeAuthNextPath(`${window.location.pathname}${window.location.search}`);
}

export function buildLoginPath(nextPath: string, expired = false): string {
  const query = new URLSearchParams();
  const safeNextPath = sanitizeAuthNextPath(nextPath);
  if (safeNextPath !== "/") {
    query.set("next", safeNextPath);
  }
  if (expired) {
    query.set("expired", "1");
  }
  const queryString = query.toString();
  return queryString ? `/login?${queryString}` : "/login";
}

export function rememberOAuthNextPath(nextPath: string): void {
  window.sessionStorage.setItem(OAUTH_NEXT_SESSION_KEY, sanitizeAuthNextPath(nextPath));
}

export function consumeOAuthNextPath(fallback = "/"): string {
  const storedPath = window.sessionStorage.getItem(OAUTH_NEXT_SESSION_KEY);
  window.sessionStorage.removeItem(OAUTH_NEXT_SESSION_KEY);
  return sanitizeAuthNextPath(storedPath ?? fallback);
}
