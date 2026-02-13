"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { setAccessToken } from "../lib/auth";
import { initializeProfile } from "../lib/profile";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";
import PageShell from "../components/PageShell";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pendingPath = useAppSelector((state) => state.ui.pendingPath);
  const token = searchParams.get("token");
  const isProcessing = Boolean(token);

  useEffect(() => {
    if (token) {
      setAccessToken(token);
      let active = true;
      (async () => {
        const result = await initializeProfile();
        if (result.error) {
          dispatch(
            showToast(
              `프로필 생성에 실패했습니다. (${result.error})`,
            ),
          );
        }
        if (!active) {
          return;
        }
        if (pendingPath) {
          dispatch(setPendingPath(undefined));
          router.push(pendingPath);
        } else {
          router.push("/");
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [dispatch, pendingPath, router, token]);

  const handleNaverLogin = () => {
    window.location.href = "http://localhost:8080/oauth2/authorize/naver";
  };

  if (isProcessing) {
    return (
      <PageShell>
        <div className="mt-16 flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--line)] bg-white/70 p-10 shadow-[var(--shadow)]">
            <div className="mb-6 flex items-center justify-between text-xs text-[color:var(--muted)]">
              <button
                className="rounded-full border border-[color:var(--line)] px-3 py-1 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => router.back()}
              >
                뒤로가기
              </button>
              <button
                className="rounded-full border border-[color:var(--line)] px-3 py-1 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => router.push("/")}
              >
                홈으로
              </button>
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
              Signing in
            </p>
            <h1 className="mt-3 font-[var(--font-display)] text-2xl">
              로그인 처리 중입니다.
            </h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              잠시만 기다려주세요.
            </p>
            <div className="mt-6 flex items-center gap-3 text-xs text-[color:var(--muted)]">
              <div className="spinner" />
              <span>인증 정보를 확인하는 중입니다.</span>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800 md:p-10">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <button
            className="rounded-full border border-gray-300 px-3 py-1 transition hover:border-[#03C75A] hover:text-[#03C75A] dark:border-gray-600"
            onClick={() => router.back()}
          >
            뒤로가기
          </button>
          <button
            className="rounded-full border border-gray-300 px-3 py-1 transition hover:border-[#03C75A] hover:text-[#03C75A] dark:border-gray-600"
            onClick={() => router.push("/")}
          >
            홈으로
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome to muse
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to continue to your dashboard
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Continue with
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleNaverLogin}
            className="group relative flex w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-[#03C75A] py-3 px-4 text-lg font-semibold text-white transition-all duration-300 ease-in-out hover:bg-[#03C75A]/90 focus:outline-none focus:ring-2 focus:ring-[#03C75A] focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <Image
              src="/naver_logo.svg"
              alt="Naver Logo"
              width={24}
              height={24}
              className="transition-transform duration-300 group-hover:scale-110"
            />
            <span>Login with Naver</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
