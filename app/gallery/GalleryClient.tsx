"use client";
/* eslint-disable @next/next/no-img-element */

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CinematicBottomNav from "../components/CinematicBottomNav";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import { Skeleton } from "../components/Skeleton";
import { getPublicMuseums } from "../lib/museum";
import { APP_ROUTES, galleryMuseumDetailRoute } from "../lib/router";
import { canAccessPath } from "../lib/routeGuard";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";

const WHEEL_THRESHOLD = 120;
const MOVE_LOCK_MS = 360;
const DRAG_THRESHOLD = 70;
const DRAG_CANCEL_CLICK_THRESHOLD = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const centerCardVariants = {
  enter: (direction: number) => ({
    opacity: 0.35,
    x: direction >= 0 ? 140 : -140,
    rotateY: direction >= 0 ? 13 : -13,
    scale: 0.9,
  }),
  center: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: {
      duration: 1.12,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: (direction: number) => ({
    opacity: 0.15,
    x: direction >= 0 ? -180 : 180,
    rotateY: direction >= 0 ? -18 : 18,
    scale: 0.88,
    transition: {
      duration: 0.16,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export default function GalleryClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);

  const [activeMuseumIndex, setActiveMuseumIndex] = useState(0);
  const [navigationDirection, setNavigationDirection] = useState<1 | -1>(1);
  const wheelAccumulatorRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const dragStartXRef = useRef<number | null>(null);
  const dragDeltaXRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "museums"],
    queryFn: getPublicMuseums,
  });

  const museums = useMemo(() => data?.data ?? [], [data?.data]);
  const error = data?.error;
  const featuredMuseums = useMemo(
    () => museums.filter((museum) => museum.isFeatured),
    [museums],
  );
  const stageMuseums = featuredMuseums.length > 0 ? featuredMuseums : museums;
  const safeIndex = stageMuseums.length === 0
    ? 0
    : clamp(activeMuseumIndex, 0, stageMuseums.length - 1);
  const dateLabel = useMemo(() => {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, "0"),
      month: now.toLocaleString("en-US", { month: "long" }),
    };
  }, []);

  const moveMuseum = (direction: 1 | -1) => {
    if (stageMuseums.length <= 1 || wheelLockedRef.current) {
      return;
    }
    setNavigationDirection(direction);
    setActiveMuseumIndex((prev) => {
      const next = prev + direction;
      if (next < 0) {
        return stageMuseums.length - 1;
      }
      if (next >= stageMuseums.length) {
        return 0;
      }
      return next;
    });
    wheelLockedRef.current = true;
    window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, reduceMotion ? 0 : MOVE_LOCK_MS);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    wheelAccumulatorRef.current += event.deltaY;
    if (Math.abs(wheelAccumulatorRef.current) < WHEEL_THRESHOLD) {
      return;
    }
    const direction: 1 | -1 = wheelAccumulatorRef.current > 0 ? 1 : -1;
    wheelAccumulatorRef.current = 0;
    moveMuseum(direction);
  };

  const clearSuppressClick = () => {
    if (suppressClickTimerRef.current != null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 220);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    dragStartXRef.current = event.clientX;
    dragDeltaXRef.current = 0;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current == null) {
      return;
    }
    dragDeltaXRef.current = event.clientX - dragStartXRef.current;
  };

  const commitDragMove = () => {
    const deltaX = dragDeltaXRef.current;
    if (Math.abs(deltaX) >= DRAG_THRESHOLD) {
      moveMuseum(deltaX < 0 ? 1 : -1);
    }
    if (Math.abs(deltaX) > DRAG_CANCEL_CLICK_THRESHOLD) {
      suppressClickRef.current = true;
      clearSuppressClick();
    }
    dragStartXRef.current = null;
    dragDeltaXRef.current = 0;
  };

  const handlePointerUp = () => {
    if (dragStartXRef.current == null) {
      return;
    }
    commitDragMove();
  };

  const handlePointerCancel = () => {
    dragStartXRef.current = null;
    dragDeltaXRef.current = 0;
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    if (startX == null) {
      return;
    }
    const currentX = event.touches[0]?.clientX ?? startX;
    touchDeltaXRef.current = currentX - startX;
  };

  const handleTouchEnd = () => {
    const deltaX = touchDeltaXRef.current;
    if (Math.abs(deltaX) >= DRAG_THRESHOLD) {
      moveMuseum(deltaX < 0 ? 1 : -1);
    }
    if (Math.abs(deltaX) > DRAG_CANCEL_CLICK_THRESHOLD) {
      suppressClickRef.current = true;
      clearSuppressClick();
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const handleTouchCancel = () => {
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const openMuseum = (museumId: number) => {
    if (suppressClickRef.current) {
      return;
    }
    router.push(galleryMuseumDetailRoute(museumId, { focus: true }));
  };

  const handleMoveToMyMuseum = () => {
    const targetPath = "/gallery/my";
    const guard = canAccessPath(targetPath);
    if (!guard.allowed) {
      dispatch(setPendingPath(`${targetPath}?tab=gallery`));
      if (guard.reason === "ROLE") {
        dispatch(showToast("권한이 없습니다."));
        router.push(APP_ROUTES.galleryLobby);
        return;
      }
      dispatch(showToast("로그인이 필요한 기능입니다."));
      router.push("/login");
      return;
    }

    router.push(APP_ROUTES.galleryMyMuseums);
  };

  const totalMuseums = stageMuseums.length;
  const currentMuseum = totalMuseums > 0 ? stageMuseums[safeIndex] : null;
  const progressPercent = totalMuseums > 0
    ? Math.max(22, ((safeIndex + 1) / totalMuseums) * 100)
    : 0;

  return (
    <section
      className="relative h-screen overflow-hidden bg-[#050505] text-slate-100 touch-pan-y"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_0%,rgba(156,156,156,0.18)_0%,rgba(0,0,0,0)_68%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.44)_0%,rgba(0,0,0,0.16)_34%,rgba(0,0,0,0.18)_68%,rgba(0,0,0,0.9)_100%)]" />
      <div
        className="pointer-events-none absolute top-[-20%] left-1/2 z-0 h-[122%] w-[210%] -translate-x-1/2  shadow-[inset_0_0_260px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(210,210,210,0.08)]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(122,122,122,0.42) 0%, rgba(82,82,82,0.58) 40%, rgba(36,36,36,0.82) 72%, rgba(8,8,8,0.98) 100%), url(https://www.transparenttextures.com/patterns/dark-concrete.png)",
          backgroundSize: "100% 100%, 220px 220px",
          backgroundPosition: "center, center",
          backgroundBlendMode: "normal, soft-light",
        }}
      />
      <div className="pointer-events-none absolute top-[10%] left-1/2 z-[1] h-[48%] w-[170%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(232,232,232,0.16)_0%,rgba(220,220,220,0)_72%)] opacity-[0.46]" />
      <div className="pointer-events-none absolute bottom-[-12%] left-1/2 z-[1] h-[52%] w-[220%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center_top,rgba(40,40,40,0.92)_0%,rgba(14,14,14,0.92)_62%,rgba(0,0,0,1)_100%)] [transform:rotateX(64deg)] opacity-94" />
      <div className="pointer-events-none absolute top-[18%] left-1/2 z-[4] h-[42%] w-[112%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(232,232,232,0.14)_0%,rgba(255,255,255,0)_74%)] opacity-[0.58] md:top-[12%] md:h-[48%] md:w-[102%]" />

      <header className="pointer-events-none absolute top-0 left-0 z-40 w-full">
        <div className="pointer-events-auto mx-auto w-full max-w-[1120px] px-6 pt-10 md:px-8">
          <OverviewStyleHeader title="The Gallery" />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleMoveToMyMuseum}
              className="inline-flex items-center gap-2 border border-white/28 bg-white/12 px-4 py-2 text-xs uppercase tracking-[0.14em] text-white transition hover:border-white/50 hover:bg-white/18"
            >
              <span className="material-symbols-outlined text-[18px]">gallery_thumbnail</span>
              내 뮤지엄 가기
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto flex h-full w-full max-w-[1120px] items-center justify-end px-6 pb-30 pt-20 md:px-8">
        <div className="pointer-events-none absolute top-24 left-8 z-20 flex flex-col items-start opacity-80">
          <h1 className="font-[var(--font-display)] text-7xl font-thin tracking-tight text-white/90">{dateLabel.day}</h1>
          <span className="mt-2 ml-1 block text-xs uppercase tracking-[0.34em] text-slate-400">{dateLabel.month}</span>
          <div className="mt-8 ml-2 h-16 w-px bg-gradient-to-b from-white/20 to-transparent" />
        </div>

        {isLoading ? (
          <div className="mr-[-2px] h-[72vh] w-[75%]">
            <Skeleton className="h-full " />
          </div>
        ) : currentMuseum ? (
          <div className="relative mr-[-2px] h-[72vh] w-[75%] overflow-visible">
            <div className="relative h-full overflow-visible">
              <AnimatePresence mode="wait" custom={navigationDirection}>
                <motion.button
                  key={currentMuseum.museumId}
                  type="button"
                  custom={navigationDirection}
                  variants={centerCardVariants}
                  initial={reduceMotion ? false : "enter"}
                  animate="center"
                  exit={reduceMotion ? undefined : "exit"}
                  onClick={() => openMuseum(currentMuseum.museumId)}
                  className="group relative h-full w-full overflow-visible [transform-style:preserve-3d]"
                >
                  <div className="pointer-events-none absolute -top-[40%] left-1/2 z-20 h-[58%] w-[122%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_70%)]" />
                  <div className="relative h-full w-full overflow-hidden border border-white/16 bg-black/45 shadow-[0_20px_56px_rgba(0,0,0,0.7)]">
                    {currentMuseum.coverImageUrl ? (
                      <img
                        src={currentMuseum.coverImageUrl}
                        alt={currentMuseum.name}
                        className="h-full w-full object-cover opacity-92 transition duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="h-full w-full bg-[linear-gradient(145deg,#1a1f2b_0%,#30435c_100%)]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.86)_10%,rgba(0,0,0,0.26)_56%,rgba(0,0,0,0.06)_100%)]" />
                      <div className="absolute right-5 top-5 border border-white/16 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                        {currentMuseum.isFeatured ? "Featured" : "Museum"}
                      </div>
                    <div className="absolute right-0 bottom-0 left-0 p-7 text-left md:p-9">
                      <h2 className="font-[var(--font-display)] text-5xl italic text-white md:text-6xl">
                        {currentMuseum.name}
                      </h2>
                      <p className="mt-3 text-sm uppercase tracking-[0.14em] text-white/70">{currentMuseum.ownerName}</p>
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/62 md:text-sm">
                        {currentMuseum.description || "큐레이션된 뮤지엄입니다. 입장 후 작품을 감상해보세요."}
                      </p>
                      <div className="mt-5 flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 border border-white/20 bg-white/12 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
                          <span className="material-symbols-outlined text-[16px]">museum</span>
                          Enter Gallery
                        </span>
                        <span className="text-xs text-white/64">
                          작품 {currentMuseum.artworkCount.toLocaleString("ko-KR")}점
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute right-[11%] -bottom-[6%] h-[9%] w-[50%] bg-black/58 blur-[12px]" />
                  <div className="pointer-events-none absolute right-[13%] -bottom-[9%] h-[11%] w-[44%] bg-white/10 blur-[20px]" />
                  {currentMuseum.coverImageUrl && (
                    <img
                      src={currentMuseum.coverImageUrl}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute left-0 -bottom-[102%] h-full w-full scale-y-[-1] object-cover opacity-[0.27] [mask-image:linear-gradient(transparent_42%,rgba(0,0,0,0.92))] blur-[1.6px]"
                    />
                  )}
                </motion.button>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="mr-[-2px] flex h-[72vh] w-[75%] items-center justify-center border border-white/16 bg-white/[0.03] text-sm text-slate-400">
            아직 공개된 전시관이 없습니다.
          </div>
        )}
      </main>

      {stageMuseums.length > 0 ? (
        <div className="pointer-events-none absolute bottom-40 left-10 z-30 flex flex-col items-center gap-3 opacity-40">
          <div className="h-2 w-2 bg-white" />
          <div className="relative h-14 w-1 overflow-hidden bg-white/20">
            <div
              className="absolute top-0 left-0 w-full bg-white/60 transition-[height] duration-300 ease-out"
              style={{ height: `${progressPercent}%` }}
            />
          </div>
          <div className="h-2 w-2 bg-white" />
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="absolute right-6 bottom-36 z-30 border border-rose-300/35 bg-rose-300/14 px-4 py-2 text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      <CinematicBottomNav activeTab="gallery" layout="fixed" />
    </section>
  );
}
