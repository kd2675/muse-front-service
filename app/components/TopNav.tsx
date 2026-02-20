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
  scheduleTokenExpiry,
} from "../lib/auth";
import { onAuthChanged } from "../lib/authEvents";
import { canAccessPath } from "../lib/routeGuard";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
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
  if (pathname.startsWith("/contest") || pathname.startsWith("/admin/contests")) return "contest";
  if (pathname.startsWith("/gallery") || pathname.startsWith("/admin/gallery")) return "gallery";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    status: authStatus,
    label: userLabel,
    exp: tokenExp,
  } = authSnapshot;

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
    setIsMenuOpen(false);
  }, [pathname, searchParams]);

  useBodyScrollLock(isMenuOpen);

  useEffect(() => {
    const updateAuth = () => {
      const token = getAccessToken();
      const user = getUserFromToken();
      const exp = typeof user?.exp === "number" ? user.exp : null;
      if (exp && isTokenExpired(exp)) {
        setAuthSnapshot({ status: "out", label: null, exp: null });
        clearAccessToken();
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
      return;
    }
    return scheduleTokenExpiry(() => {
      setAuthSnapshot({ status: "out", label: null, exp: null });
      clearAccessToken();
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
    setIsMenuOpen(false);
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
      setIsMenuOpen(false);
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
    setIsMenuOpen(false);
  };

  return (
    <header className="relative flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Gallery Mode
        </p>
        <h1 className="font-[var(--font-display)] text-2xl text-[color:var(--canvas-ink)]">
          muse
        </h1>
        <button
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] text-lg text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] md:hidden"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <span className="leading-none">{isMenuOpen ? "✕" : "☰"}</span>
        </button>
      </div>
      <nav className="hidden flex-wrap items-center gap-3 text-sm text-[color:var(--muted)] md:flex">
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
      <div className="hidden items-center gap-3 md:flex">
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
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
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
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[78%] max-w-xs transform bg-[color:var(--canvas)] p-6 shadow-[var(--shadow)] transition-transform duration-300 md:hidden ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Gallery Mode
            </p>
            <h2 className="font-[var(--font-display)] text-xl">muse</h2>
          </div>
          <button
            className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            onClick={() => setIsMenuOpen(false)}
          >
            닫기
          </button>
        </div>
        <div className="mt-6 flex flex-col gap-2 text-sm text-[color:var(--muted)]">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={navItemClass(tab)}
              onClick={() => handleNav(tab)}
            >
              {labelMap[tab]}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-2">
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
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
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
      </div>
    </header>
  );
}
