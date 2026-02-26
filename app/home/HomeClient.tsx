"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  clearAccessToken,
  logout,
} from "../lib/auth";
import CinematicBottomNav from "../components/CinematicBottomNav";
import { getHomeData } from "../lib/home";
import { staggeredFadeUpMotion } from "../lib/motion";
import { APP_ROUTES } from "../lib/router";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";
import useAuthSession from "../hooks/useAuthSession";

const HOME_LABEL = "MUSE CINEMA";

export default function HomeClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const { isHydrated, authStatus, userLabel } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["home"],
    queryFn: getHomeData,
  });

  const payload = data?.data ?? null;
  const error = data?.error;
  const todaysPick = payload?.todaysPick ?? [];
  const heroPick = todaysPick[0] ?? null;
  const featuredMuseums = payload?.featuredMuseums ?? [];
  const heroImageUrl =
    featuredMuseums.find((museum) => museum.coverImageUrl)?.coverImageUrl ?? null;
  const handleStepInside = () => {
    router.push(APP_ROUTES.galleryLobby);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      clearAccessToken();
      dispatch(showToast("로그아웃 되었습니다."));
      router.push(APP_ROUTES.home);
    } catch {
      clearAccessToken();
      dispatch(showToast("로그아웃 처리 중 오류가 발생했습니다."));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#08080c] text-slate-100">
      {heroImageUrl ? (
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
          animate={reduceMotion ? undefined : { scale: [1.08, 1.15] }}
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 22,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }
          }
        />
      ) : (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${heroPick?.colorFrom ?? "#1a2438"} 0%, ${heroPick?.colorTo ?? "#485f80"} 100%)`,
          }}
          animate={reduceMotion ? undefined : { scale: [1.06, 1.12] }}
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 18,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }
          }
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,12,0.45)_0%,rgba(8,8,12,0.15)_48%,rgba(8,8,12,0.88)_100%)]" />

      <main className="relative z-10 flex h-full w-full flex-col items-center justify-between px-6 pb-[calc(env(safe-area-inset-bottom)+116px)] pt-12 text-center md:px-8">
        {isLoading ? (
          <div className="flex h-full w-full max-w-5xl flex-col items-center justify-center">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-200/65">{HOME_LABEL}</p>
            <p className="mt-4 text-sm text-slate-100/80">홈 화면을 불러오는 중입니다.</p>
          </div>
        ) : payload ? (
          <>
            <motion.div
              className="flex w-full max-w-5xl items-center justify-between"
              {...staggeredFadeUpMotion(0, reduceMotion)}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-100/62">{HOME_LABEL}</p>
              {!isHydrated ? (
                <div className="h-9 w-24 rounded-full border border-slate-100/20 bg-slate-100/10" />
              ) : authStatus === "in" ? (
                <div className="flex items-center gap-2">
                  {userLabel ? (
                    <span className="hidden rounded-full border border-slate-100/18 bg-slate-100/10 px-3 py-1 text-xs text-slate-100/82 md:inline-flex">
                      {userLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="rounded-full border border-slate-100/24 bg-[rgba(8,8,12,0.4)] px-4 py-2 text-xs text-slate-100/85 transition hover:border-slate-100/40 hover:text-slate-100 disabled:opacity-60"
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-full border border-slate-100/24 bg-[rgba(8,8,12,0.4)] px-4 py-2 text-xs text-slate-100/85 transition hover:border-slate-100/40 hover:text-slate-100"
                >
                  Sign in
                </button>
              )}
            </motion.div>

            <motion.section
              className="flex max-w-3xl flex-col items-center"
              {...staggeredFadeUpMotion(1, reduceMotion)}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-slate-100/70">Now Presenting</p>
              <h1 className="mt-5 font-[var(--font-display)] text-5xl leading-tight tracking-tight text-slate-100 md:text-7xl">
                {payload.hero.headline}
              </h1>
              <p className="mt-4 text-base text-slate-100/84 md:text-xl">{payload.hero.subheadline}</p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200/72">{payload.hero.description}</p>
              <div className="mt-6 h-px w-12 bg-slate-100/35" />
            </motion.section>

            <motion.div
              className="flex w-full max-w-sm flex-col items-center gap-10"
              {...staggeredFadeUpMotion(2, reduceMotion)}
            >
              <button
                type="button"
                onClick={handleStepInside}
                className="group flex flex-col items-center gap-3 text-slate-100 transition hover:opacity-85"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100/20 bg-[rgba(8,8,12,0.4)] text-2xl backdrop-blur-md">
                  <span className="material-symbols-outlined text-[28px]">keyboard_double_arrow_up</span>
                </span>
                <span className="text-sm uppercase tracking-[0.2em]">Step Inside</span>
              </button>
            </motion.div>
          </>
        ) : (
          <div className="flex h-full w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-200/65">{HOME_LABEL}</p>
            <p className="mt-4 text-sm text-slate-100/80">
              홈 데이터를 불러오지 못했습니다.
              {error ? ` (${error})` : ""}
            </p>
          </div>
        )}
      </main>
      <CinematicBottomNav activeTab="home" layout="fixed" />
    </div>
  );
}
