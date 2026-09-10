"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import useAuthSession from "../hooks/useAuthSession";
import { canAccessPath, isProtectedPath } from "../lib/routeGuard";

export default function ProtectedContent({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (!isProtectedPath(pathname)) return children;
  return (
    <AuthenticatedContent pathname={pathname}>{children}</AuthenticatedContent>
  );
}

function AuthenticatedContent({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const { authStatus } = useAuthSession();
  // AuthWatcher owns redirects. Keep private queries unmounted until session recovery finishes.
  if (authStatus !== "in" || !canAccessPath(pathname).allowed) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-dvh items-center justify-center px-6"
      >
        <p role="status" className="text-sm text-[var(--muted)]">
          로그인 상태와 접근 권한을 확인하고 있습니다.
        </p>
      </main>
    );
  }
  return children;
}
