"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
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
  { key: "contest-manage", label: "Contest Manage", path: APP_ROUTES.adminContestManage },
  { key: "contest-review", label: "Contest Review", path: APP_ROUTES.adminContestReview },
  { key: "gallery-manage", label: "Gallery Manage", path: APP_ROUTES.adminGalleryManage },
];

export default function AdminShell({ section, title, description, children }: AdminShellProps) {
  const router = useRouter();
  const activeBottomTab = section === "gallery-manage" ? "gallery" : "contest";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(84,90,111,0.2),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(73,108,115,0.16),transparent_36%),radial-gradient(circle_at_52%_82%,rgba(120,86,64,0.12),transparent_38%)]" />

      <main
        className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-32 pt-8 md:px-8"
        style={
          {
            "--canvas-ink": "#e5e7eb",
            "--muted": "rgba(226,232,240,0.72)",
            "--line": "rgba(255,255,255,0.14)",
            "--accent": "#67e8f9",
            "--accent-2": "#fbbf24",
            "--chip": "rgba(148,163,184,0.14)",
            "--shadow": "0 24px 60px rgba(0,0,0,0.35)",
          } as CSSProperties
        }
      >
        <OverviewStyleHeader title={title} subtitle="Admin Hub" />

        <div className="mt-5  bg-[rgba(22,24,31,0.74)] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
          <nav className="flex flex-wrap items-center gap-2">
            {menuItems.map((item) => {
              const isActive = item.key === section;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => router.push(item.path)}
                  className={` px-4 py-2 text-xs uppercase tracking-[0.14em] transition ${
                    isActive
                      ? "bg-cyan-300/22 text-cyan-100"
                      : "bg-white/8 text-slate-300 hover:bg-white/14 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {description ? (
          <p className="mt-4 text-sm text-slate-300/76">{description}</p>
        ) : null}

        <div className="mt-6">{children}</div>
      </main>

      <CinematicBottomNav activeTab={activeBottomTab} layout="fixed" />
    </div>
  );
}
