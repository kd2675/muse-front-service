"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clearAccessToken, logout } from "../lib/auth";
import useAuthSession from "../hooks/useAuthSession";

type OverviewStyleHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  rightSlot?: ReactNode;
};

export default function OverviewStyleHeader({
  title,
  subtitle = "Museum Hub",
  className = "",
  rightSlot,
}: OverviewStyleHeaderProps) {
  const router = useRouter();
  const { isHydrated, authStatus } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } catch {
      // Clear client token even when logout API fails.
    } finally {
      clearAccessToken();
      setIsSigningOut(false);
    }
  };

  return (
    <header className={`flex w-full items-center justify-between ${className}`}>
      <div className="flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">{subtitle}</p>
        <h1 className="mt-1 font-[var(--font-display)] text-2xl italic text-slate-200">{title}</h1>
      </div>
      {rightSlot ?? (
        !isHydrated || authStatus === "unknown" ? (
          <div className="h-9 w-24 rounded-full bg-white/8" />
        ) : authStatus === "in" ? (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded-full bg-white/8 px-4 py-2 text-xs text-slate-200/88 transition hover:bg-white/14 disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="rounded-full bg-white/8 px-4 py-2 text-xs text-slate-200/88 transition hover:bg-white/14"
          >
            Sign in
          </button>
        )
      )}
    </header>
  );
}
