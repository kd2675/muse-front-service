"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";
import { canAccessPath } from "../lib/routeGuard";
import { onAuthChanged, onAuthExpired } from "../lib/authEvents";
import { bootstrapAccessToken, type AuthExpireReason } from "../lib/auth";
import { buildLoginPath, currentBrowserPath, rememberOAuthNextPath } from "../lib/authRouting";

export default function AuthWatcher() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthExpired((reason: AuthExpireReason) => {
      const message =
        reason === "refresh_failed"
          ? "세션 갱신에 실패했습니다. 다시 로그인해주세요."
          : "로그인이 만료되었습니다. 다시 로그인해주세요.";
      dispatch(showToast(message));
      if (pathname !== "/login" && pathname !== "/auth/callback") {
        const redirectPath = currentBrowserPath();
        dispatch(setPendingPath(redirectPath));
        rememberOAuthNextPath(redirectPath);
        router.push(buildLoginPath(redirectPath, true));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [dispatch, pathname, router]);

  useEffect(() => {
    const verifyAccess = () => {
      const guard = canAccessPath(pathname);
      if (guard.allowed) {
        return;
      }

      const redirectPath = currentBrowserPath();
      dispatch(setPendingPath(redirectPath));
      rememberOAuthNextPath(redirectPath);

      if (guard.reason === "ROLE") {
        dispatch(showToast("권한이 없습니다."));
        router.push("/?tab=home");
        return;
      }

      dispatch(showToast("로그인이 필요한 기능입니다."));
      router.push(buildLoginPath(redirectPath));
    };

    let cancelled = false;
    void bootstrapAccessToken().finally(() => {
      if (!cancelled) {
        verifyAccess();
      }
    });
    const unsubscribeAuthChanged = onAuthChanged(() => {
      verifyAccess();
    });

    return () => {
      cancelled = true;
      unsubscribeAuthChanged();
    };
  }, [dispatch, pathname, router]);

  return null;
}
