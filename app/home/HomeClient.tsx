"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CinematicBottomNav from "../components/CinematicBottomNav";
import MuseumAtmosphere from "../components/MuseumAtmosphere";
import useAuthSession from "../hooks/useAuthSession";
import { logout } from "../lib/auth";
import { getHomeData } from "../lib/home";
import { APP_ROUTES } from "../lib/router";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";

const DRAG_TRIGGER = -64;

export default function HomeClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const reduceMotion = Boolean(useReducedMotion());
  const { isHydrated, authStatus, userLabel } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["home"],
    queryFn: getHomeData,
  });

  const payload = data?.data ?? null;
  const heroMuseum = payload?.featuredMuseums.find((museum) => museum.coverImageUrl) ?? null;
  const heroPick = payload?.todaysPick[0] ?? null;

  const enterMuseum = () => {
    if (isEntering) {
      return;
    }
    setIsEntering(true);
    window.setTimeout(() => router.push(APP_ROUTES.homeOverview), reduceMotion ? 0 : 280);
  };

  const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    if (info.offset.y <= DRAG_TRIGGER || info.velocity.y < -480) {
      enterMuseum();
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      dispatch(showToast("로그아웃했습니다."));
      router.push(APP_ROUTES.home);
    } catch {
      dispatch(showToast("로그아웃을 완료하지 못했습니다."));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <MuseumAtmosphere variant="lobby" />
      <div className="museum-grain pointer-events-none absolute inset-0 z-20 opacity-70" />
      <main id="main-content" tabIndex={-1} className="relative z-30 mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col px-5 pb-28 pt-4 md:px-10 md:pb-32 md:pt-6 xl:px-14">
        <header className="flex min-h-16 items-center justify-between border-b border-white/15">
          <div>
            <p className="font-[var(--font-display)] text-2xl tracking-[0.22em] md:text-3xl">MUSE</p>
            <p className="mt-1 hidden text-[9px] uppercase tracking-[0.3em] text-white/48 sm:block">Photography lives on</p>
          </div>
          <nav aria-label="전시 안내" className="hidden items-center gap-9 text-[11px] tracking-[0.16em] text-white/56 md:flex">
            <button type="button" onClick={() => router.push("/overview")} className="museum-link-line hover:text-white">오늘</button>
            <button type="button" onClick={() => router.push("/contest")} className="museum-link-line hover:text-white">공모전</button>
            <button type="button" onClick={() => router.push("/gallery")} className="museum-link-line hover:text-white">영구 전시</button>
          </nav>
          {!isHydrated || authStatus === "unknown" ? (
            <div className="skeleton h-8 w-20" />
          ) : authStatus === "in" ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="museum-link-line text-right text-xs text-white/65 transition hover:text-white disabled:opacity-50"
            >
              <span className="block text-white/90">{userLabel ?? "작가"}</span>
              <span className="mt-1 block text-[10px]">{isSigningOut ? "나가는 중" : "로그아웃"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="museum-link-line py-2 text-xs text-white/75 hover:text-white"
            >
              작가 로그인
            </button>
          )}
        </header>

        <div className="relative grid flex-1 items-center gap-6 py-6 lg:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)] lg:gap-14 lg:py-12">
          <p aria-hidden="true" className="pointer-events-none absolute -left-3 top-12 font-[var(--font-display)] text-[clamp(8rem,24vw,24rem)] leading-none tracking-[-0.09em] text-white/[0.025]">
            MUSE
          </p>
          {isLoading ? (
            <div className="relative z-10" aria-live="polite">
              <p className="museum-kicker text-white/60">Preparing exhibition</p>
              <p className="mt-4 text-sm text-white/70">오늘의 전시를 준비하고 있습니다.</p>
            </div>
          ) : payload ? (
            <>
              <motion.section
                initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: isEntering ? 0 : 1, y: isEntering ? -18 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.62, ease: "easeOut" }}
                className="relative z-10 order-2 max-w-2xl lg:order-1"
              >
                <p className="museum-kicker text-white/70">Entrance · 001</p>
                <h1 className="mt-4 text-balance font-[var(--font-display)] text-4xl font-normal leading-[1.02] text-white sm:text-6xl lg:mt-5 lg:text-[clamp(4.6rem,6.3vw,7.2rem)] lg:leading-[0.98]">
                  {payload.hero.headline}
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/78 md:mt-6 md:text-lg md:leading-8">
                  {payload.hero.subheadline}
                </p>
                <p className="mt-2 max-w-lg text-xs leading-6 text-white/50 md:mt-3 md:text-sm md:leading-7">
                  {payload.hero.description}
                </p>
                <motion.button
                  type="button"
                  drag="y"
                  dragConstraints={{ top: -80, bottom: 0 }}
                  dragElastic={0.08}
                  dragMomentum={false}
                  onDragEnd={handleDragEnd}
                  onClick={enterMuseum}
                  disabled={isEntering}
                  className="group mt-5 flex min-h-13 w-full max-w-sm items-center justify-between border border-white/22 bg-black/20 px-5 text-sm tracking-[0.12em] text-white backdrop-blur-sm transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50 md:mt-9 md:min-h-14"
                  style={{ touchAction: "none" }}
                >
                  <span>{isEntering ? "전시장으로 이동 중" : "MUSE 입장하기"}</span>
                  <span aria-hidden="true" className="text-xl text-[var(--accent)] transition-transform group-hover:translate-x-1">→</span>
                </motion.button>
              </motion.section>

              <motion.section
                initial={reduceMotion ? false : { opacity: 0, x: 28 }}
                animate={{ opacity: isEntering ? 0 : 1, x: 0, scale: isEntering ? 1.025 : 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.72, ease: "easeOut", delay: reduceMotion ? 0 : 0.08 }}
                className="museum-stage relative order-1 aspect-[4/3] overflow-hidden lg:order-2 lg:aspect-auto lg:min-h-[68vh]"
              >
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center"
                  style={heroMuseum?.coverImageUrl
                    ? { backgroundImage: `url(${heroMuseum.coverImageUrl})` }
                    : { background: `linear-gradient(145deg, ${heroPick?.colorFrom ?? "#171b1d"}, ${heroPick?.colorTo ?? "#32302c"})` }}
                  animate={reduceMotion ? undefined : { scale: [1.01, 1.045] }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 16, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse", ease: "easeInOut" }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,5,0.02),rgba(4,5,5,0.18)_55%,rgba(4,5,5,0.84))]" />
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-5 md:p-7">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.24em] text-white/52">Now on view</p>
                    <p className="mt-2 font-[var(--font-display)] text-2xl text-white md:text-3xl">{heroMuseum?.name ?? "MUSE Collection"}</p>
                    <p className="mt-1 text-xs text-white/56">{heroMuseum?.ownerName ?? heroPick?.artist ?? "MUSE Archive"}</p>
                  </div>
                  <p className="text-right text-[10px] leading-5 tracking-[0.12em] text-white/48">
                    {heroMuseum ? `${heroMuseum.artworkCount} WORKS` : "OPEN DAILY"}<br />DIGITAL MUSEUM
                  </p>
                </div>
              </motion.section>
            </>
          ) : (
            <section className="relative z-10 max-w-xl lg:col-span-2" aria-live="polite">
              <p className="museum-kicker text-white/60">Gallery unavailable</p>
              <h1 className="mt-5 font-[var(--font-display)] text-4xl">오늘의 전시를 불러오지 못했습니다.</h1>
              <p className="mt-4 text-sm leading-7 text-white/60">연결을 확인한 뒤 다시 시도해 주세요.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-7 border border-white/30 px-6 py-3 text-sm transition hover:border-[var(--accent)] disabled:opacity-50"
              >
                {isFetching ? "다시 연결 중" : "다시 시도"}
              </button>
            </section>
          )}
        </div>

        {payload ? (
          <div className="grid grid-cols-3 gap-3 border-t border-white/15 py-4 text-[9px] uppercase tracking-[0.16em] text-white/42 md:text-[10px]">
            <span>Open 24 hours</span>
            <span className="text-center">Photography archive</span>
            <span className="text-right">Seoul · Online</span>
          </div>
        ) : null}
      </main>
      <CinematicBottomNav activeTab="home" layout="fixed" />
    </div>
  );
}
