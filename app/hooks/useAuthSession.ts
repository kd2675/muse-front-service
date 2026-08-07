"use client";

import { useEffect, useState } from "react";
import {
  bootstrapAccessToken,
  clearAccessToken,
  getAccessToken,
  getUserFromToken,
  hasAnyRole,
  isTokenExpired,
  notifyAuthExpired,
  refreshAccessToken,
  scheduleTokenExpiry,
} from "../lib/auth";
import { onAuthChanged } from "../lib/authEvents";

type AuthSnapshot = {
  status: "unknown" | "in" | "out";
  label: string | null;
  exp: number | null;
};

export default function useAuthSession() {
  const readAuthSnapshot = (): AuthSnapshot => {
    if (typeof window === "undefined") {
      return { status: "unknown", label: null, exp: null };
    }

    const token = getAccessToken();
    const user = getUserFromToken();
    if (!token || !user || !hasAnyRole(user.role, ["USER", "ADMIN"])) {
      return { status: "out", label: null, exp: null };
    }
    const exp = typeof user?.exp === "number" ? user.exp : null;

    return {
      status: "in",
      label: user?.name ?? user?.email ?? null,
      exp,
    };
  };

  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>(readAuthSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const { status: authStatus, label: userLabel, exp: tokenExp } = authSnapshot;

  useEffect(() => {
    let cancelled = false;
    const frameId = window.requestAnimationFrame(() => setIsHydrated(true));
    void (async () => {
      await bootstrapAccessToken();
      if (!cancelled) {
        setAuthSnapshot(readAuthSnapshot());
        setIsRestoring(false);
      }
    })();

    const unsubscribe = onAuthChanged(() => {
      setAuthSnapshot(readAuthSnapshot());
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!tokenExp) {
      return;
    }
    if (isTokenExpired(tokenExp)) {
      let cancelled = false;
      void (async () => {
        const refreshed = await refreshAccessToken();
        if (!cancelled && !refreshed) {
          clearAccessToken();
          notifyAuthExpired("refresh_failed");
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    return scheduleTokenExpiry(() => {
      void (async () => {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearAccessToken();
          notifyAuthExpired("refresh_failed");
        }
      })();
    }, tokenExp);
  }, [tokenExp]);

  return { isHydrated, authStatus: isRestoring ? "unknown" : authStatus, userLabel };
}
