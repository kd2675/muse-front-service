"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageShell from "@/app/components/PageShell";
import { ensureAccessToken, getUserFromToken, hasAnyRole, logout } from "@/app/lib/auth";
import { consumeOAuthNextPath } from "@/app/lib/authRouting";
import { initializeProfile } from "@/app/lib/profile";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const failureQuery = buildOAuthFailureQuery(window.location.search);
    if (failureQuery) {
      const nextPath = consumeOAuthNextPath();
      if (nextPath !== "/") {
        failureQuery.set("next", nextPath);
      }
      router.replace(`/login?${failureQuery}`);
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = await ensureAccessToken();
      if (cancelled) {
        return;
      }
      if (!token) {
        consumeOAuthNextPath();
        router.replace("/login?loginError=session_restore_failed");
        return;
      }

      const user = getUserFromToken(token);
      if (!hasAnyRole(user?.role, ["USER", "ADMIN"])) {
        await logout();
        consumeOAuthNextPath();
        router.replace("/login?loginError=unsupported_role");
        return;
      }

      const profileResult = await initializeProfile();
      if (cancelled) {
        return;
      }
      if (profileResult.error) {
        await logout();
        consumeOAuthNextPath();
        router.replace("/login?loginError=profile_initialize_failed");
        return;
      }

      router.replace(consumeOAuthNextPath());
    })().catch(async () => {
      await logout().catch(() => undefined);
      consumeOAuthNextPath();
      if (!cancelled) {
        router.replace("/login?loginError=processing_failed");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <PageShell>
      <main id="main-content" tabIndex={-1} className="grid min-h-[70vh] place-items-center px-6" aria-live="polite">
        <section className="text-center">
          <span className="spinner mx-auto block" aria-hidden="true" />
          <h1 className="mt-5 font-[var(--font-display)] text-2xl">로그인을 마무리하고 있습니다</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">인증 정보를 확인한 뒤 이전 화면으로 이동합니다.</p>
        </section>
      </main>
    </PageShell>
  );
}

function buildOAuthFailureQuery(search: string): URLSearchParams | null {
  const callbackQuery = new URLSearchParams(search);
  if (!callbackQuery.has("error") && !callbackQuery.has("errorCode")) {
    return null;
  }
  const loginQuery = new URLSearchParams();
  ["error", "errorCode", "provider"].forEach((key) => {
    const value = callbackQuery.get(key);
    if (value) {
      loginQuery.set(key, value);
    }
  });
  return loginQuery;
}
