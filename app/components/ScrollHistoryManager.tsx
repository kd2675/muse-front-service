"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

const STORAGE_KEY = "muse:scroll:history:v1";
const MAX_ROUTE_ENTRIES = 120;

type ScrollSnapshot = {
  y: number;
  updatedAt: number;
};

type ScrollHistory = Record<string, ScrollSnapshot>;

function readHistory(): ScrollHistory {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as ScrollHistory;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeHistory(history: ScrollHistory): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore storage errors
  }
}

export default function ScrollHistoryManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const routeKey = useMemo(
    () => (search.length > 0 ? `${pathname}?${search}` : pathname),
    [pathname, search],
  );

  const historyRef = useRef<ScrollHistory>({});
  const currentRouteRef = useRef(routeKey);
  const shouldRestoreRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  const saveScrollForRoute = (targetRoute: string) => {
    if (typeof window === "undefined" || !targetRoute) {
      return;
    }
    const doc = document.documentElement;
    const y = window.scrollY || doc.scrollTop || 0;
    const nextHistory: ScrollHistory = {
      ...historyRef.current,
      [targetRoute]: {
        y,
        updatedAt: Date.now(),
      },
    };

    const entries = Object.entries(nextHistory);
    if (entries.length > MAX_ROUTE_ENTRIES) {
      entries
        .sort(([, left], [, right]) => left.updatedAt - right.updatedAt)
        .slice(0, entries.length - MAX_ROUTE_ENTRIES)
        .forEach(([key]) => {
          delete nextHistory[key];
        });
    }

    historyRef.current = nextHistory;
    writeHistory(nextHistory);
  };

  const restoreScrollForRoute = (targetRoute: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const snapshot = historyRef.current[targetRoute];
    if (!snapshot || typeof snapshot.y !== "number") {
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: snapshot.y, behavior: "auto" });
      });
    });
  };

  useEffect(() => {
    historyRef.current = readHistory();
    currentRouteRef.current = routeKey;
  }, [routeKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onPopState = () => {
      shouldRestoreRef.current = true;
    };

    const onScroll = () => {
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      scrollRafRef.current = window.requestAnimationFrame(() => {
        saveScrollForRoute(currentRouteRef.current);
      });
    };

    const onPageHide = () => {
      saveScrollForRoute(currentRouteRef.current);
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    return () => {
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      saveScrollForRoute(currentRouteRef.current);
    };
  }, []);

  useEffect(() => {
    const previousRoute = currentRouteRef.current;
    if (previousRoute !== routeKey) {
      saveScrollForRoute(previousRoute);
    }
    currentRouteRef.current = routeKey;

    if (shouldRestoreRef.current) {
      shouldRestoreRef.current = false;
      restoreScrollForRoute(routeKey);
    }
  }, [routeKey]);

  return null;
}
