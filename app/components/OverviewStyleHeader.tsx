"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import useAuthSession from "../hooks/useAuthSession";
import useLogoutAction from "../hooks/useLogoutAction";
import NotificationCenter from "./NotificationCenter";

type OverviewStyleHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  rightSlot?: ReactNode;
  headingAs?: "h1" | "p";
};

export default function OverviewStyleHeader({
  title,
  subtitle = "Museum Hub",
  className = "",
  rightSlot,
  headingAs = "h1",
}: OverviewStyleHeaderProps) {
  const router = useRouter();
  const { isHydrated, authStatus } = useAuthSession();
  const { isSigningOut, signOut } = useLogoutAction();
  const Heading = headingAs;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className={`w-full ${className}`}>
      <div className="flex min-h-14 items-center justify-between border-b border-[var(--line)]">
        <Link href="/" className="font-[var(--font-display)] text-xl tracking-[0.22em] md:text-2xl">
          MUSE
        </Link>
        <nav aria-label="전시 안내" className="hidden items-center gap-8 text-[11px] tracking-[0.16em] text-[var(--muted)] md:flex">
          <Link href="/overview" className="museum-link-line hover:text-white">오늘</Link>
          <Link href="/contest" className="museum-link-line hover:text-white">공모전</Link>
          <Link href="/gallery" className="museum-link-line hover:text-white">영구 전시</Link>
        </nav>
        <div className="flex min-w-20 items-center justify-end gap-1 text-right">
          {rightSlot ?? (
            !isHydrated || authStatus === "unknown" ? (
              <div className="skeleton ml-auto h-8 w-20" />
            ) : authStatus === "in" ? (
              <>
                <Link href="/search" className="min-h-10 px-2 py-3 text-xs text-[var(--muted)] hover:text-white">검색</Link>
                <NotificationCenter />
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="museum-link-line hidden py-2 text-xs text-[var(--muted)] hover:text-white disabled:opacity-60 sm:block"
                >
                  {isSigningOut ? "나가는 중" : "로그아웃"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="museum-link-line py-2 text-xs text-[var(--muted)] hover:text-white"
              >
                작가 로그인
              </button>
            )
          )}
        </div>
      </div>
      <div className="relative overflow-hidden border-b border-[var(--line)] py-8 md:py-12">
        <p className="museum-index absolute -bottom-2 right-0" aria-hidden="true">M</p>
        <p className="museum-kicker relative z-10">{subtitle}</p>
        <Heading className="relative z-10 mt-3 max-w-4xl font-[var(--font-display)] text-4xl font-normal leading-none text-[var(--canvas-ink)] md:text-6xl lg:text-7xl">
          {title}
        </Heading>
      </div>
    </header>
  );
}
