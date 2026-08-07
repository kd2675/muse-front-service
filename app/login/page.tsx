"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";

import useAuthSession from "@/app/hooks/useAuthSession";
import { getUserFromToken, hasAnyRole, login, logout, signup } from "@/app/lib/auth";
import { API_BASE } from "@/app/lib/api";
import { rememberOAuthNextPath, sanitizeAuthNextPath } from "@/app/lib/authRouting";
import { staggeredFadeUpMotion } from "@/app/lib/motion";
import { initializeProfile } from "@/app/lib/profile";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setPendingPath } from "@/app/store/uiSlice";

type LoginMode = "login" | "signup";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const pendingPath = useAppSelector((state) => state.ui.pendingPath);
  const { authStatus, isHydrated } = useAuthSession();
  const [mode, setMode] = useState<LoginMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const nextPath = useMemo(
    () => sanitizeAuthNextPath(searchParams.get("next") ?? pendingPath ?? null),
    [pendingPath, searchParams],
  );
  const queryMessage = resolveQueryMessage(searchParams);

  useEffect(() => {
    if (isSubmitting || !isHydrated || authStatus === "unknown" || authStatus === "out") {
      return;
    }
    dispatch(setPendingPath(undefined));
    router.replace(nextPath);
  }, [authStatus, dispatch, isHydrated, isSubmitting, nextPath, router]);

  const completeLocalLogin = async (token: string) => {
    const user = getUserFromToken(token);
    if (!hasAnyRole(user?.role, ["USER", "ADMIN"])) {
      await logout();
      setMessage("Muse는 USER 또는 ADMIN 계정만 로그인할 수 있습니다.");
      return;
    }
    const profileResult = await initializeProfile();
    if (profileResult.error) {
      await logout();
      setMessage("프로필을 준비하지 못했습니다. 다시 로그인해 주세요.");
      return;
    }
    dispatch(setPendingPath(undefined));
    router.replace(nextPath);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const validationMessage = validateForm(mode, normalizedUsername, password, normalizedEmail);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const signupResult = await signup(normalizedUsername, password, normalizedEmail);
        if (!signupResult.ok) {
          setMessage(signupResult.message ?? "회원가입에 실패했습니다. 입력값 또는 중복 계정을 확인해 주세요.");
          return;
        }
      }
      const loginResult = await login(normalizedUsername, password);
      if (!loginResult.ok || !loginResult.token) {
        setMessage(loginResult.message ?? "로그인에 실패했습니다.");
        return;
      }
      await completeLocalLogin(loginResult.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOAuthLogin = (provider: "naver-muse" | "kakao-muse") => {
    rememberOAuthNextPath(nextPath);
    window.location.replace(`${API_BASE}/oauth2/authorize/${provider}`);
  };

  if (!isHydrated || authStatus === "unknown" || (authStatus === "in" && !isSubmitting)) {
    return <MuseLoginProgress reduceMotion={reduceMotion} />;
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-5 py-8 text-[var(--canvas-ink)]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <motion.div {...staggeredFadeUpMotion(0, reduceMotion)}>
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-[color:var(--accent)]">MUSE PRIVATE VIEW</p>
          <h1 className="mt-5 max-w-3xl font-[var(--font-display)] text-5xl leading-[0.98] tracking-[-0.04em] md:text-7xl">
            Your collection,
            <br />quietly curated.
          </h1>
          <p className="mt-6 max-w-xl break-keep text-base leading-7 text-[color:var(--muted)]">
            전시와 콘테스트를 둘러보고, 선택한 작품과 나만의 갤러리를 한 계정에 이어 보세요.
            로그인 후 요청했던 전시 화면으로 그대로 돌아갑니다.
          </p>
          <div className="mt-10 flex max-w-xl items-center gap-4 border-y border-[color:var(--line)] py-4 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            <span>Contest</span><span className="size-1 rounded-full bg-[color:var(--accent-2)]" />
            <span>Gallery</span><span className="size-1 rounded-full bg-[color:var(--accent-2)]" />
            <span>Archive</span>
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="border border-[color:var(--line)] bg-[#fffdf8] p-5 shadow-[var(--shadow)]"
          {...staggeredFadeUpMotion(1, reduceMotion)}
        >
          <div className="grid grid-cols-2 bg-[color:var(--chip)] p-1">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setMessage(null);
                }}
                className={item === mode
                  ? "bg-[#fffdf8] px-3 py-2.5 text-sm font-black text-[color:var(--canvas-ink)] shadow-sm"
                  : "px-3 py-2.5 text-sm font-bold text-[color:var(--muted)]"}
              >
                {item === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <MuseField label="아이디" name="username" value={username} onChange={setUsername} autoComplete="username" />
            {mode === "signup" ? (
              <MuseField label="이메일" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            ) : null}
            <MuseField label="비밀번호" name="password" value={password} onChange={setPassword} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>

          {message || queryMessage ? (
            <p role="alert" aria-live="polite" className="mt-4 border border-[#c95c47]/25 bg-[#c95c47]/8 px-3 py-2.5 text-sm font-semibold text-[#8f382b]">
              {message ?? queryMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 min-h-12 w-full bg-[color:var(--accent)] px-4 py-3 text-sm font-black text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "처리 중" : mode === "login" ? "Muse 로그인" : "가입 후 시작"}
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[color:var(--muted)]">
            <span className="h-px flex-1 bg-[color:var(--line)]" />
            Social access
            <span className="h-px flex-1 bg-[color:var(--line)]" />
          </div>
          <div className="grid gap-2">
            <button type="button" onClick={() => startOAuthLogin("naver-muse")} className="min-h-12 bg-[#03c75a] px-4 py-3 text-sm font-black text-white hover:brightness-95">네이버로 계속</button>
            <button type="button" onClick={() => startOAuthLogin("kakao-muse")} className="min-h-12 bg-[#fee500] px-4 py-3 text-sm font-black text-[#191919] hover:brightness-95">카카오로 계속</button>
          </div>
        </motion.form>
      </section>
    </main>
  );
}

function MuseField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[color:var(--muted)]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        maxLength={255}
        className="mt-1 min-h-12 w-full border border-[color:var(--line)] bg-transparent px-3 py-3 text-sm font-bold outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/10"
      />
    </label>
  );
}

function MuseLoginProgress({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5" aria-live="polite">
      <motion.section className="text-center" {...staggeredFadeUpMotion(0, reduceMotion)}>
        <span className="spinner mx-auto block" aria-hidden="true" />
        <h1 className="mt-5 font-[var(--font-display)] text-2xl">로그인을 준비하고 있습니다</h1>
        <p className="mt-2 text-sm font-semibold text-[color:var(--muted)]">세션과 전시 프로필을 확인합니다.</p>
      </motion.section>
    </main>
  );
}

function validateForm(mode: LoginMode, username: string, password: string, email: string): string | null {
  if (!username) {
    return "아이디를 입력해 주세요.";
  }
  if (!password) {
    return "비밀번호를 입력해 주세요.";
  }
  if (mode === "signup" && !/^\S+@\S+\.\S+$/.test(email)) {
    return "올바른 이메일을 입력해 주세요.";
  }
  return null;
}

function resolveQueryMessage(searchParams: URLSearchParams): string | null {
  if (searchParams.get("expired") === "1") {
    return "세션이 만료되었습니다. 다시 로그인해 주세요.";
  }
  const errorCode = searchParams.get("errorCode");
  const provider = searchParams.get("provider")?.trim().toUpperCase();
  if (errorCode === "oauth_provider_mismatch") {
    const providerLabel = provider === "NAVER" ? "네이버" : provider === "KAKAO" ? "카카오" : "기존 소셜 계정";
    return `${providerLabel} 로그인으로 다시 시도해 주세요.`;
  }
  if (errorCode === "oauth_email_missing") {
    return "소셜 계정의 이메일 제공 동의가 필요합니다.";
  }
  if (errorCode === "oauth_provider_unsupported") {
    return "지원하지 않는 소셜 로그인 방식입니다.";
  }
  switch (searchParams.get("loginError")) {
    case "unsupported_role":
      return "Muse는 USER 또는 ADMIN 계정만 로그인할 수 있습니다.";
    case "profile_initialize_failed":
      return "프로필을 준비하지 못했습니다. 다시 로그인해 주세요.";
    case "session_restore_failed":
      return "소셜 로그인 세션을 확인할 수 없습니다. 다시 시도해 주세요.";
    case "processing_failed":
      return "로그인 정보를 처리하는 중 문제가 발생했습니다. 다시 시도해 주세요.";
    default:
      return searchParams.get("error") ? "소셜 로그인에 실패했습니다. 다시 시도해 주세요." : null;
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--canvas)]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
