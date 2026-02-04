"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setActiveTab, setPendingPath, showToast } from "../store/uiSlice";
import {
  clearAccessToken,
  getAccessToken,
  getUserFromToken,
  isTokenExpired,
  logout,
  notifyAuthExpired,
  scheduleTokenExpiry,
} from "../lib/auth";
import { onAuthChanged } from "../lib/authEvents";
import { canAccessPath } from "../lib/routeGuard";
import { Skeleton } from "./Skeleton";

const tabs = ["home", "contest", "gallery", "profile"] as const;
type TabKey = (typeof tabs)[number];

type AuthSnapshot = {
  status: "unknown" | "in" | "out";
  label: string | null;
  exp: number | null;
};

const labelMap: Record<TabKey, string> = {
  home: "Home",
  contest: "Contest",
  gallery: "Gallery",
  profile: "Profile",
};

const pathMap: Record<TabKey, string> = {
  home: "/",
  contest: "/contest",
  gallery: "/gallery",
  profile: "/profile",
};

function tabFromPath(pathname: string): TabKey {
  if (pathname.startsWith("/contest")) return "contest";
  if (pathname.startsWith("/gallery")) return "gallery";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

function isTabKey(value: string | null): value is TabKey {
  return value !== null && tabs.includes(value as TabKey);
}

export default function TopNav() {
  const dispatch = useAppDispatch();
  const { activeTab } = useAppSelector((state) => state.ui);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>({
    status: "unknown",
    label: null,
    exp: null,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { status: authStatus, label: userLabel, exp: tokenExp } = authSnapshot;

  const queryTab = searchParams.get("tab");
  const derivedTab = isTabKey(queryTab) ? queryTab : tabFromPath(pathname);

  useEffect(() => {
    dispatch(setActiveTab(derivedTab));

    if (!queryTab || queryTab !== derivedTab) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", derivedTab);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [dispatch, derivedTab, pathname, queryTab, router, searchParams]);

  useEffect(() => {
    const updateAuth = () => {
      const token = getAccessToken();
      const user = getUserFromToken();
      const exp = typeof user?.exp === "number" ? user.exp : null;
      if (exp && isTokenExpired(exp)) {
        setAuthSnapshot({ status: "out", label: null, exp: null });
        clearAccessToken();
        notifyAuthExpired("expired");
        return;
      }
      setAuthSnapshot({
        status: token ? "in" : "out",
        label: user?.name ?? user?.email ?? null,
        exp,
      });
    };
    setIsHydrated(true);
    updateAuth();
    const unsubscribe = onAuthChanged(updateAuth);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!tokenExp) {
      return;
    }
    if (isTokenExpired(tokenExp)) {
      setAuthSnapshot({ status: "out", label: null, exp: null });
      clearAccessToken();
      notifyAuthExpired("expired");
      return;
    }
    return scheduleTokenExpiry(() => {
      setAuthSnapshot({ status: "out", label: null, exp: null });
      clearAccessToken();
      notifyAuthExpired("expired");
    }, tokenExp);
  }, [isHydrated, tokenExp]);

  const navItemClass = (tab: TabKey) =>
    `rounded-full border px-4 py-2 transition ${
      activeTab === tab
        ? "border-[color:var(--accent)] text-[color:var(--accent)]"
        : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
    }`;

  const handleNav = (tab: TabKey) => {
    dispatch(setActiveTab(tab));
    const nextPath = pathMap[tab];
    const guard = canAccessPath(nextPath);
    if (!guard.allowed) {
      dispatch(setPendingPath(`${nextPath}?tab=${tab}`));
      if (guard.reason === "ROLE") {
        dispatch(showToast("권한이 없습니다."));
        router.push("/?tab=home");
        return;
      }
      dispatch(showToast("로그인이 필요한 기능입니다."));
      router.push("/login");
      return;
    }
    router.push(`${nextPath}?tab=${tab}`);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      clearAccessToken();
      dispatch(showToast("로그아웃 되었습니다."));
      router.push("/?tab=home");
    } catch {
      clearAccessToken();
      dispatch(showToast("로그아웃 처리 중 오류가 발생했습니다."));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCta = () => {
    const target = "/contest?tab=contest";
    const guard = canAccessPath("/contest");
    if (!guard.allowed) {
      dispatch(setPendingPath(target));
      if (guard.reason === "ROLE") {
        dispatch(showToast("권한이 없습니다."));
        router.push("/?tab=home");
        return;
      }
      dispatch(showToast("콘테스트 참여를 위해 로그인해주세요."));
      router.push("/login");
      return;
    }
    router.push(target);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Gallery Mode
        </p>
        <h1 className="font-[var(--font-display)] text-2xl text-[color:var(--canvas-ink)]">
          muse
        </h1>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted)]">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={navItemClass(tab)}
            onClick={() => handleNav(tab)}
          >
            {labelMap[tab]}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {!isHydrated ? (
          <Skeleton className="h-9 w-24 rounded-full border border-[color:var(--line)]" />
        ) : (
          <>
            {authStatus === "in" && userLabel && (
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)]">
                {userLabel}
              </span>
            )}
            {authStatus === "in" ? (
              <button
                className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                Sign in
              </Link>
            )}
          </>
        )}
        <button
          className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm text-white shadow-[var(--shadow)] transition hover:opacity-90"
          onClick={handleCta}
        >
          {authStatus === "in" ? "Start contest" : "Get started"}
        </button>
      </div>
    </header>
  );
}
