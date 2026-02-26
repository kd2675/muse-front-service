"use client";

import { useEffect, useState } from "react";
import {
  clearAccessToken,
  getAccessToken,
  getUserFromToken,
  isTokenExpired,
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
    const exp = typeof user?.exp === "number" ? user.exp : null;
    if (exp && isTokenExpired(exp)) {
      return { status: "out", label: null, exp: null };
    }

    return {
      status: token ? "in" : "out",
      label: user?.name ?? user?.email ?? null,
      exp,
    };
  };

  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>(readAuthSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);
  const { status: authStatus, label: userLabel, exp: tokenExp } = authSnapshot;

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsHydrated(true);
    });

    const initial = readAuthSnapshot();
    if (initial.status === "out" && getAccessToken()) {
      clearAccessToken();
    }

    const unsubscribe = onAuthChanged(() => {
      setAuthSnapshot(readAuthSnapshot());
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!tokenExp) {
      return;
    }
    if (isTokenExpired(tokenExp)) {
      clearAccessToken();
      return;
    }
    return scheduleTokenExpiry(() => {
      clearAccessToken();
    }, tokenExp);
  }, [tokenExp]);

  return { isHydrated, authStatus, userLabel };
}
