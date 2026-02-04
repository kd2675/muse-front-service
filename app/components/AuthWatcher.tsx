"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";
import { canAccessPath } from "../lib/routeGuard";
import { onAuthExpired } from "../lib/authEvents";
import type { AuthExpireReason } from "../lib/auth";

export default function AuthWatcher() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthExpired((reason: AuthExpireReason) => {
      const message =
        reason === "refresh_failed"
          ? "세션 갱신에 실패했습니다. 다시 로그인해주세요."
          : "로그인이 만료되었습니다. 다시 로그인해주세요.";
      dispatch(showToast(message));
      if (pathname !== "/login") {
        const redirectPath = `${pathname}${
          searchParams.toString() ? `?${searchParams.toString()}` : ""
        }`;
        dispatch(setPendingPath(redirectPath));
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [dispatch, pathname, router, searchParams]);

  useEffect(() => {
    const guard = canAccessPath(pathname);
    if (guard.allowed) {
      return;
    }
    const redirectPath = `${pathname}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    dispatch(setPendingPath(redirectPath));
    if (guard.reason === "ROLE") {
      dispatch(showToast("권한이 없습니다."));
      router.push("/?tab=home");
      return;
    }
    dispatch(showToast("로그인이 필요한 기능입니다."));
    router.push("/login");
  }, [dispatch, pathname, router, searchParams]);

  return null;
}
