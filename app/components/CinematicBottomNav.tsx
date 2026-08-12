"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getUserFromToken, isAdminRole } from "../lib/auth";
import { onAuthChanged } from "../lib/authEvents";
import { canAccessPath } from "../lib/routeGuard";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";

type NavTab = "home" | "overview" | "contest" | "gallery" | "profile";

type CinematicBottomNavProps = {
  activeTab: NavTab;
  layout?: "inline" | "fixed";
};

type NavItem = {
  key: NavTab | "admin";
  label: string;
  path: string;
  tab: NavTab;
};

const items: NavItem[] = [
  { key: "home", label: "입구", path: "/", tab: "home" },
  { key: "overview", label: "오늘", path: "/overview", tab: "overview" },
  { key: "contest", label: "공모전", path: "/contest", tab: "contest" },
  { key: "gallery", label: "전시관", path: "/gallery", tab: "gallery" },
  { key: "profile", label: "기록", path: "/profile", tab: "profile" },
];

export default function CinematicBottomNav({
  activeTab,
  layout = "inline",
}: CinematicBottomNavProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = Boolean(useReducedMotion());
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const updateRole = () => setIsAdminUser(isAdminRole(getUserFromToken()?.role));
    updateRole();
    return onAuthChanged(updateRole);
  }, []);

  const navigate = (item: NavItem) => {
    const guard = canAccessPath(item.path);
    if (!guard.allowed) {
      dispatch(setPendingPath(`${item.path}?tab=${item.tab}`));
      if (guard.reason === "ROLE") {
        dispatch(showToast("이 메뉴에 접근할 권한이 없습니다."));
        router.push("/");
      } else {
        dispatch(showToast("로그인 후 작가 기록을 이용할 수 있습니다."));
        router.push("/login");
      }
      return;
    }
    router.push(`${item.path}?tab=${item.tab}`);
  };

  const navItems: NavItem[] = [
    ...items,
    ...(isAdminUser
      ? [{ key: "admin", label: "운영", path: "/admin/contests", tab: "contest" } as const]
      : []),
  ];

  return (
    <div
      className={
        layout === "fixed"
          ? "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] md:hidden"
          : "w-full md:hidden"
      }
    >
      <nav
        aria-label="주요 메뉴"
        className="pointer-events-auto mx-auto flex w-full max-w-2xl items-stretch justify-center border border-white/10 bg-[rgba(9,10,10,0.9)] px-2 shadow-[0_-16px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      >
        {navItems.map((item) => {
          const isAdminPath = pathname.startsWith("/admin");
          const isActive = isAdminPath ? item.key === "admin" : item.key === activeTab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item)}
              aria-current={isActive ? "page" : undefined}
              className="relative min-h-14 flex-1 px-2 py-3 text-[11px] tracking-[0.12em] text-[var(--muted-deep)] transition hover:text-white md:min-h-16 md:text-xs"
            >
              {isActive ? (
                <motion.span
                  layoutId="muse-active-nav"
                  className="absolute inset-x-3 top-0 h-px bg-[var(--accent)]"
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
                />
              ) : null}
              <span className={isActive ? "text-[var(--canvas-ink)]" : undefined}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
