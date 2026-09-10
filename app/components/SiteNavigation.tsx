"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import useAuthSession from "../hooks/useAuthSession";
import { getUserFromToken, isAdminRole } from "../lib/auth";
import { buildLoginPath } from "../lib/authRouting";
import NotificationCenter from "./NotificationCenter";

const destinations = [
  { href: "/overview", label: "오늘의 MUSE" },
  { href: "/contest", label: "공모전" },
  { href: "/gallery", label: "영구 전시" },
];

export default function SiteNavigation({ action }: { action?: ReactNode }) {
  const pathname = usePathname();
  const { authStatus } = useAuthSession();
  const signedIn = authStatus === "in";
  const admin = signedIn && isAdminRole(getUserFromToken()?.role);

  return (
    <div className="muse-site-nav">
      <Link
        href="/"
        aria-label="MUSE 홈"
        className="shrink-0 font-[var(--font-display)] text-2xl tracking-[0.2em]"
      >
        MUSE
      </Link>
      <nav
        aria-label="전시 안내"
        className="hidden items-center gap-6 text-sm text-[var(--muted)] lg:flex"
      >
        {destinations.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname === href || pathname.startsWith(`${href}/`)
                ? "page"
                : undefined
            }
            className="muse-nav-link inline-flex"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-1 text-sm">
        <Link
          href="/search"
          aria-current={pathname === "/search" ? "page" : undefined}
          className="muse-nav-link inline-flex px-2"
        >
          검색
        </Link>
        {signedIn ? (
          <>
            <NotificationCenter />
            <Link
              href="/profile"
              className="muse-nav-link hidden px-2 sm:inline-flex"
              aria-current={pathname === "/profile" ? "page" : undefined}
            >
              작가실
            </Link>
            {admin ? (
              <Link
                href="/admin"
                className="muse-nav-link hidden px-2 sm:inline-flex"
                aria-current={
                  pathname.startsWith("/admin") ? "page" : undefined
                }
              >
                운영실
              </Link>
            ) : null}
          </>
        ) : authStatus === "unknown" ? (
          <span
            className="skeleton h-8 w-16"
            aria-label="로그인 상태 확인 중"
          />
        ) : (
          <Link href={buildLoginPath(pathname)} className="muse-nav-link inline-flex px-2">
            로그인
          </Link>
        )}
      </div>
      {action ? <div className="muse-page-action">{action}</div> : null}
    </div>
  );
}
