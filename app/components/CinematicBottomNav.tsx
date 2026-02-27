"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { canAccessPath } from "../lib/routeGuard";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";

type NavTab = "home" | "overview" | "contest" | "gallery" | "profile";

type CinematicBottomNavProps = {
  activeTab: NavTab;
  layout?: "inline" | "fixed";
};

type NavItem = {
  key: NavTab;
  label: string;
  icon: string;
  path: string;
  tab: NavTab;
};

const items: NavItem[] = [
  { key: "home", label: "Home", icon: "home", path: "/", tab: "home" },
  {
    key: "overview",
    label: "Overview",
    icon: "dashboard",
    path: "/overview",
    tab: "overview",
  },
  {
    key: "contest",
    label: "Contest",
    icon: "emoji_events",
    path: "/contest",
    tab: "contest",
  },
  {
    key: "gallery",
    label: "Gallery",
    icon: "photo_library",
    path: "/gallery",
    tab: "gallery",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "account_circle",
    path: "/profile",
    tab: "profile",
  },
];

const DOCK_TRIGGER_OFFSET_PX = 120;

export default function CinematicBottomNav({
  activeTab,
  layout = "inline",
}: CinematicBottomNavProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const [isDocked, setIsDocked] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [showDockedMenu, setShowDockedMenu] = useState(false);

  useEffect(() => {
    if (layout !== "fixed") {
      return;
    }

    let rafId = 0;

    const recalcDocking = () => {
      const doc = document.documentElement;
      const body = document.body;
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const contentHeight = Math.max(doc.scrollHeight, body.scrollHeight);
      const nextHasScrollable = contentHeight > viewportHeight + 2;
      const atBottom = scrollTop + viewportHeight >= contentHeight - DOCK_TRIGGER_OFFSET_PX;
      setIsDocked(!nextHasScrollable || atBottom);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(recalcDocking);
    };

    recalcDocking();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [layout]);

  useEffect(() => {
    if (layout !== "fixed") {
      return;
    }

    let timerId: number | undefined;
    let instantId: number | undefined;
    const floatingExitDelay = reduceMotion ? 0 : 307;
    const dockedExitDelay = reduceMotion ? 0 : 307;

    if (isDocked) {
      instantId = window.setTimeout(() => setShowFloatingMenu(false), 0);
      timerId = window.setTimeout(
        () => setShowDockedMenu(true),
        floatingExitDelay,
      );
    } else {
      instantId = window.setTimeout(() => setShowDockedMenu(false), 0);
      timerId = window.setTimeout(
        () => setShowFloatingMenu(true),
        dockedExitDelay,
      );
    }

    return () => {
      if (instantId) {
        window.clearTimeout(instantId);
      }
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [isDocked, layout, reduceMotion]);

  const navigateWithGuard = (path: string, tab: NavTab) => {
    const guard = canAccessPath(path);
    if (!guard.allowed) {
      dispatch(setPendingPath(`${path}?tab=${tab}`));
      if (guard.reason === "ROLE") {
        dispatch(showToast("권한이 없습니다."));
        router.push("/?tab=home");
        return;
      }
      dispatch(showToast("로그인이 필요한 기능입니다."));
      router.push("/login");
      return;
    }
    router.push(`${path}?tab=${tab}`);
  };

  const renderButtons = () =>
    items.map((item) => {
      const isActive = item.key === activeTab;
      return (
        <button
          key={item.key}
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
            isActive ? "text-slate-100" : "text-slate-100/40 hover:text-slate-100"
          }`}
          onClick={() => navigateWithGuard(item.path, item.tab)}
          aria-label={item.label}
        >
          <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
        </button>
      );
    });

  const InlineMenu = (
    <nav className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-100/10 bg-[rgba(8,8,12,0.4)] px-4 py-3 backdrop-blur-md">
      {renderButtons()}
    </nav>
  );

  const FloatingMenu = (
    <div className="pointer-events-auto">
      <nav className="flex w-[clamp(280px,33vw,460px)] max-w-[calc(100vw-2.5rem)] items-center justify-center gap-3 rounded-full border border-slate-100/10 bg-[rgba(8,8,12,0.4)] px-4 py-3 backdrop-blur-md">
        {renderButtons()}
      </nav>
    </div>
  );

  const DockedMenu = (
    <div className="pointer-events-auto">
      <nav className="flex w-full items-center justify-center border-t border-slate-100/12 bg-[rgba(8,8,12,0.88)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-md">
        <div className="flex w-[clamp(360px,44vw,640px)] max-w-[calc(100vw-1.5rem)] items-center justify-center gap-6">
          {renderButtons()}
        </div>
      </nav>
    </div>
  );

  if (layout === "fixed") {
    const unifiedMotion = reduceMotion
      ? {
          initial: false,
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0 },
        }
      : {
          initial: { opacity: 0, y: 10, scale: 0.93 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 10, scale: 0.93 },
          transition: { duration: 0.3, ease: "easeOut" as const },
        };

    const dockedFixedMotion = unifiedMotion;
    const floatingMotion = unifiedMotion;

    return (
      <>
        <AnimatePresence>
          {showFloatingMenu ? (
            <motion.div
              key="bottom-floating-fixed"
              {...floatingMotion}
              className="pointer-events-none fixed bottom-0 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-4 pb-[calc(env(safe-area-inset-bottom)+12px)]"
            >
              {FloatingMenu}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {showDockedMenu ? (
            <motion.div
              key="bottom-docked-fixed"
              {...dockedFixedMotion}
              className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-stretch"
            >
              {DockedMenu}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </>
    );
  }

  return InlineMenu;
}
