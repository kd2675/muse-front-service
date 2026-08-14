"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import CinematicBottomNav from "./CinematicBottomNav";
import OverviewStyleHeader from "./OverviewStyleHeader";
import { APP_ROUTES } from "../lib/router";

type AdminSection = "contest-manage" | "contest-review" | "gallery-manage";

type AdminShellProps = {
  section: AdminSection;
  title: string;
  description?: string;
  children: ReactNode;
};

type AdminMenuItem = {
  key: AdminSection;
  label: string;
  path: string;
};

const menuItems: AdminMenuItem[] = [
  { key: "contest-manage", label: "공모전 운영", path: APP_ROUTES.adminContestManage },
  { key: "contest-review", label: "출품 심사", path: APP_ROUTES.adminContestReview },
  { key: "gallery-manage", label: "전시 심사", path: APP_ROUTES.adminGalleryManage },
];

export default function AdminShell({ section, title, description, children }: AdminShellProps) {
  const router = useRouter();
  const activeBottomTab = section === "gallery-manage" ? "gallery" : "contest";

  return (
    <div className="museum-grain relative min-h-screen overflow-x-hidden bg-[var(--canvas)] text-[color:var(--canvas-ink)]">

      <main
        id="main-content"
        tabIndex={-1}
        className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-32 pt-8 md:px-8"
      >
        <OverviewStyleHeader title={title} subtitle="Muse 운영실" />

        <div className="mt-6 border-y border-[color:var(--line)] py-2">
          <nav aria-label="운영 메뉴" className="flex flex-wrap items-center gap-1">
            {menuItems.map((item) => {
              const isActive = item.key === section;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => router.push(item.path)}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-h-11 px-4 py-2 text-xs font-bold tracking-[-0.01em] transition ${
                    isActive
                      ? "bg-[color:var(--accent)] text-[#111]"
                      : "text-[color:var(--muted)] hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {description ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">{description}</p>
        ) : null}

        <div className="mt-6">{children}</div>
      </main>

      <CinematicBottomNav activeTab={activeBottomTab} layout="fixed" />
    </div>
  );
}
