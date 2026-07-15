"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { useRouter } from "next/navigation";
import { logout } from "../lib/auth";
import CinematicBottomNav from "../components/CinematicBottomNav";
import { getHomeData } from "../lib/home";
import { staggeredFadeUpMotion } from "../lib/motion";
import { APP_ROUTES } from "../lib/router";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";
import useAuthSession from "../hooks/useAuthSession";

const HOME_LABEL = "MUSE CINEMA";
const STEP_INSIDE_MAX_DRAG = 140;
const STEP_INSIDE_TRIGGER_OFFSET = -68;
const STEP_INSIDE_TRIGGER_VELOCITY = -520;
const STEP_INSIDE_BG_OVERSCAN = 160;

export default function HomeClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const { isHydrated, authStatus, userLabel } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isStepDragging, setIsStepDragging] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [stepLiftProgress, setStepLiftProgress] = useState(0);
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

  const updateLiftProgressByOffset = (offsetY: number) => {
    const clampedOffset = Math.max(Math.min(offsetY, 0), -STEP_INSIDE_MAX_DRAG);
    const progress = Math.min(Math.abs(clampedOffset) / STEP_INSIDE_MAX_DRAG, 1);
    setStepLiftProgress(progress);
  };

  const moveToOverviewByDrag = () => {
    if (isStepTransitioning) {
      return;
    }
    setIsStepTransitioning(true);
    setStepLiftProgress(1);
    window.setTimeout(() => {
      router.push(APP_ROUTES.homeOverview);
    }, 260);
  };

  const handleStepDrag = (_event: PointerEvent, info: PanInfo) => {
    updateLiftProgressByOffset(info.offset.y);
  };

  const handleStepDragEnd = (_event: PointerEvent, info: PanInfo) => {
    setIsStepDragging(false);
    const shouldMoveToOverview =
      info.offset.y <= STEP_INSIDE_TRIGGER_OFFSET || info.velocity.y <= STEP_INSIDE_TRIGGER_VELOCITY;

    if (shouldMoveToOverview) {
      moveToOverviewByDrag();
      return;
    }
    setStepLiftProgress(0);
  };

  const sceneShift = Math.round(stepLiftProgress * 96);
  const sceneStyle = {
    transform: `translate3d(0, -${sceneShift}px, 0)`,
    transition: isStepDragging ? "none" : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
  } as const;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      dispatch(showToast("로그아웃 되었습니다."));
      router.push(APP_ROUTES.home);
    } catch {
      dispatch(showToast("로그아웃 처리 중 오류가 발생했습니다."));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(84,90,111,0.22),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(73,108,115,0.18),transparent_36%),radial-gradient(circle_at_52%_82%,rgba(120,86,64,0.14),transparent_38%)]" />
      <div className="absolute inset-0" style={sceneStyle}>
        {heroImageUrl ? (
          <motion.div
            className="absolute left-0 right-0 bg-cover bg-center"
            style={{
              top: -STEP_INSIDE_BG_OVERSCAN,
              bottom: -STEP_INSIDE_BG_OVERSCAN,
              backgroundImage: `url(${heroImageUrl})`,
            }}
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
            className="absolute left-0 right-0"
            style={{
              top: -STEP_INSIDE_BG_OVERSCAN,
              bottom: -STEP_INSIDE_BG_OVERSCAN,
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
        <div
          className="absolute left-0 right-0 bg-[linear-gradient(180deg,rgba(8,8,12,0.45)_0%,rgba(8,8,12,0.15)_48%,rgba(8,8,12,0.88)_100%)]"
          style={{ top: -STEP_INSIDE_BG_OVERSCAN, bottom: -STEP_INSIDE_BG_OVERSCAN }}
        />

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
                <div className="h-9 w-24  border border-slate-100/20 bg-slate-100/10" />
              ) : authStatus === "in" ? (
                <div className="flex items-center gap-2">
                  {userLabel ? (
                    <span className="hidden  border border-slate-100/18 bg-slate-100/10 px-3 py-1 text-xs text-slate-100/82 md:inline-flex">
                      {userLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className=" border border-slate-100/24 bg-[rgba(8,8,12,0.4)] px-4 py-2 text-xs text-slate-100/85 transition hover:border-slate-100/40 hover:text-slate-100 disabled:opacity-60"
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className=" border border-slate-100/24 bg-[rgba(8,8,12,0.4)] px-4 py-2 text-xs text-slate-100/85 transition hover:border-slate-100/40 hover:text-slate-100"
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
              <motion.button
                type="button"
                drag="y"
                dragConstraints={{ top: -STEP_INSIDE_MAX_DRAG, bottom: 0 }}
                dragElastic={0.08}
                dragMomentum={false}
                onDragStart={() => setIsStepDragging(true)}
                onDrag={handleStepDrag}
                onDragEnd={handleStepDragEnd}
                className="group flex flex-col items-center gap-3 text-slate-100 transition hover:opacity-85"
                style={{ touchAction: "none" }}
              >
                <span className="flex h-12 w-12 items-center justify-center  border border-slate-100/20 bg-[rgba(8,8,12,0.4)] text-2xl backdrop-blur-md">
                  <span className="material-symbols-outlined text-[28px]">keyboard_double_arrow_up</span>
                </span>
                <span className="text-sm uppercase tracking-[0.2em]">Step Inside</span>
              </motion.button>
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
      </div>
      <CinematicBottomNav activeTab="home" layout="fixed" />
    </div>
  );
}
