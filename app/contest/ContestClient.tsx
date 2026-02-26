"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { setPendingPath, showToast } from "../store/uiSlice";
import { useAppDispatch } from "../store/hooks";
import {
  getContestEntries,
  getContestList,
  purchaseEntryCredit,
} from "../lib/contest";
import { getAccessToken, getUserFromToken, isAdminRole } from "../lib/auth";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { APP_ROUTES } from "../lib/router";
import {
  overlayFadeMotion,
  popInMotion,
  staggeredFadeUpMotion,
} from "../lib/motion";
import CinematicBottomNav from "../components/CinematicBottomNav";
import type { ContestPhase, ContestSummary } from "../types/contest";

const phaseLabel: Record<ContestPhase, string> = {
  UPCOMING: "출품 대기",
  SUBMISSION: "출품 진행 중",
  REVIEW: "심사 중",
  VOTING: "전시 중",
  ENDED: "종료",
};

const phaseOrder: Record<ContestPhase, number> = {
  VOTING: 0,
  SUBMISSION: 1,
  REVIEW: 2,
  UPCOMING: 3,
  ENDED: 4,
};

const phaseTone: Record<ContestPhase, { chip: string; dot: string }> = {
  VOTING: {
    chip: "border-emerald-300/35 bg-emerald-300/15 text-emerald-100",
    dot: "bg-emerald-400",
  },
  SUBMISSION: {
    chip: "border-cyan-300/35 bg-cyan-300/15 text-cyan-100",
    dot: "bg-cyan-300",
  },
  REVIEW: {
    chip: "border-amber-300/35 bg-amber-300/15 text-amber-100",
    dot: "bg-amber-300",
  },
  UPCOMING: {
    chip: "border-slate-300/25 bg-slate-300/12 text-slate-200",
    dot: "bg-slate-400",
  },
  ENDED: {
    chip: "border-slate-500/30 bg-slate-700/30 text-slate-300",
    dot: "bg-slate-500",
  },
};

const livePalettes = [
  "linear-gradient(150deg, rgba(16,26,38,0.86), rgba(46,76,102,0.72)), radial-gradient(circle at 78% 18%, rgba(188,217,238,0.35), transparent 48%)",
  "linear-gradient(160deg, rgba(25,20,34,0.88), rgba(65,56,104,0.72)), radial-gradient(circle at 84% 22%, rgba(219,193,248,0.32), transparent 52%)",
  "linear-gradient(160deg, rgba(19,29,29,0.9), rgba(37,87,79,0.72)), radial-gradient(circle at 80% 20%, rgba(174,238,212,0.3), transparent 52%)",
];

function subscribeHydration(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const id = window.requestAnimationFrame(callback);
  return () => window.cancelAnimationFrame(id);
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function contestHref(id: number) {
  return `/contest/${id}?tab=contest`;
}

function archiveStamp(contest: ContestSummary) {
  const source = contest.votingEndAt ?? contest.submissionEndAt;
  if (!source) {
    return "ARCHIVE";
  }
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return "ARCHIVE";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}.${month}`;
}

function formatDate(raw?: string | null) {
  if (!raw) {
    return "-";
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function deadlineText(contest: ContestSummary) {
  if (contest.phase === "VOTING") {
    return "전시 진행 중";
  }
  if (contest.daysLeft > 0) {
    return `D-${contest.daysLeft}`;
  }
  return "일정 확인";
}

export default function ContestClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [paymentStep, setPaymentStep] = useState<
    "closed" | "payment" | "confirm"
  >("closed");
  const [selectedContestId, setSelectedContestId] = useState<number | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState("card");
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  useBodyScrollLock(paymentStep !== "closed");

  const authUser = isHydrated ? getUserFromToken() : null;
  const isAdmin = isAdminRole(authUser?.role);
  const isLoggedIn = isHydrated && Boolean(getAccessToken());

  const { data, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: getContestList,
  });

  const contests = useMemo(() => data?.data ?? [], [data?.data]);
  const sortedContests = useMemo(
    () =>
      [...contests].sort((a, b) => {
        const phaseDiff = phaseOrder[a.phase] - phaseOrder[b.phase];
        if (phaseDiff !== 0) {
          return phaseDiff;
        }
        return b.id - a.id;
      }),
    [contests],
  );
  const error = data?.error;

  const liveContests = useMemo(
    () => sortedContests.filter((contest) => contest.phase === "VOTING"),
    [sortedContests],
  );
  const submissionContests = useMemo(
    () => sortedContests.filter((contest) => contest.phase === "SUBMISSION"),
    [sortedContests],
  );
  const queueContests = useMemo(
    () =>
      sortedContests.filter(
        (contest) => contest.phase === "REVIEW" || contest.phase === "UPCOMING",
      ),
    [sortedContests],
  );
  const endedContests = useMemo(
    () => sortedContests.filter((contest) => contest.phase === "ENDED"),
    [sortedContests],
  );
  const liveEntryQueries = useQueries({
    queries: liveContests.map((contest) => ({
      queryKey: ["contest", contest.id, "entries", "bg"],
      queryFn: () => getContestEntries(contest.id),
      staleTime: 30_000,
    })),
  });

  const selectedContest = useMemo(
    () => sortedContests.find((contest) => contest.id === selectedContestId) ?? null,
    [selectedContestId, sortedContests],
  );
  const liveBackgroundByContestId = useMemo(() => {
    const mapping: Record<number, string> = {};
    liveContests.forEach((contest, index) => {
      const entries = liveEntryQueries[index]?.data?.data ?? [];
      const imageCandidates = entries
        .map((entry) => entry.imageUrl)
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
      if (imageCandidates.length === 0) {
        return;
      }
      const seedSource = `${contest.id}:${imageCandidates.join("|")}`;
      let hash = 0;
      for (let charIndex = 0; charIndex < seedSource.length; charIndex += 1) {
        hash = (hash * 31 + seedSource.charCodeAt(charIndex)) | 0;
      }
      const pickIndex = Math.abs(hash) % imageCandidates.length;
      mapping[contest.id] = imageCandidates[pickIndex];
    });
    return mapping;
  }, [liveContests, liveEntryQueries]);

  const openPayment = (contestId?: number) => {
    if (!getAccessToken()) {
      dispatch(setPendingPath("/contest?tab=contest"));
      dispatch(showToast("로그인 후 결제할 수 있습니다."));
      router.push("/login");
      return;
    }
    const candidate =
      submissionContests.find((contest) => contest.id === contestId) ??
      submissionContests[0];
    if (!candidate) {
      dispatch(showToast("출품 가능한 콘테스트가 없습니다."));
      return;
    }
    setSelectedContestId(candidate.id);
    setPaymentMethod("card");
    setPaymentStep("payment");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(103,129,161,0.16),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(93,112,151,0.12),transparent_40%),radial-gradient(circle_at_50%_82%,rgba(113,88,65,0.14),transparent_42%)]" />

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-40 pt-8 md:px-8">
        <motion.header
          className="mb-10 flex flex-wrap items-start justify-between gap-4"
          {...staggeredFadeUpMotion(0, reduceMotion)}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
              Artium Contest
            </p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl italic text-slate-100 md:text-5xl">
              Curated Seasons
            </h1>
            <p className="mt-3 text-sm text-slate-300/80">
              전시와 출품의 흐름을 상태별로 나눠 확인하고 즉시 참여하세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <button
                  className="rounded-full border border-blue-300/35 bg-blue-400/25 px-4 py-2 text-xs font-semibold text-blue-100 transition hover:bg-blue-400/34"
                  onClick={() => router.push(APP_ROUTES.adminContestManage)}
                >
                  관리 콘솔
                </button>
                <button
                  className="rounded-full border border-blue-200/35 bg-transparent px-4 py-2 text-xs font-semibold text-blue-100 transition hover:bg-blue-300/14"
                  onClick={() => router.push(APP_ROUTES.adminContestReview)}
                >
                  출품 심사
                </button>
              </>
            )}
            {isLoggedIn ? (
              <span className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-xs text-slate-200">
                {authUser?.name ?? authUser?.email ?? "Signed in"}
              </span>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/25 bg-white/8 px-4 py-2 text-xs text-slate-200 transition hover:bg-white/14"
              >
                Sign in
              </Link>
            )}
          </div>
        </motion.header>

        {isLoading ? (
          <section className="space-y-8">
            <div className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-white/6" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-52 animate-pulse rounded-[24px] border border-white/10 bg-white/6" />
              <div className="h-52 animate-pulse rounded-[24px] border border-white/10 bg-white/6" />
            </div>
            <div className="h-80 animate-pulse rounded-[24px] border border-white/10 bg-white/6" />
          </section>
        ) : (
          <div className="space-y-12">
            {error && (
              <div className="rounded-[18px] border border-rose-300/30 bg-rose-300/12 px-4 py-3 text-sm text-rose-100">
                콘테스트 데이터를 불러오지 못했습니다. {error}
              </div>
            )}

            <motion.section
              className="space-y-5"
              {...staggeredFadeUpMotion(1, reduceMotion)}
            >
              <div className="flex items-end justify-between">
                <h2 className="text-2xl text-slate-100">
                  Exhibiting
                  <span className="ml-3 rounded-full border border-emerald-300/35 bg-emerald-300/18 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                    전시 중
                  </span>
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Live Gallery
                </p>
              </div>

              {liveContests.length > 0 ? (
                <Swiper
                  className="!overflow-visible"
                  spaceBetween={16}
                  slidesPerView={1.06}
                  breakpoints={{
                    640: { slidesPerView: 1.18 },
                    1024: { slidesPerView: 1.32 },
                  }}
                >
                  {liveContests.map((contest, index) => (
                    <SwiperSlide key={contest.id} className="!h-auto">
                      {(() => {
                        const liveBackground = liveBackgroundByContestId[contest.id];
                        const hasArtworkBackground = Boolean(liveBackground);
                        const backgroundStyle = hasArtworkBackground
                          ? {
                              backgroundImage: `url(${liveBackground})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : {
                              background:
                                livePalettes[(contest.id + index) % livePalettes.length],
                            };
                        return (
                      <Link
                        href={contestHref(contest.id)}
                        className="group relative block h-[420px] overflow-hidden rounded-[26px] border border-white/12"
                        style={backgroundStyle}
                      >
                        <div
                          className={`absolute inset-0 ${
                            hasArtworkBackground
                              ? "bg-[linear-gradient(0deg,rgba(10,11,15,0.9)_0%,rgba(10,11,15,0.26)_58%,rgba(10,11,15,0.1)_100%)]"
                              : "bg-[linear-gradient(0deg,rgba(10,11,15,0.88)_0%,rgba(10,11,15,0.18)_60%,rgba(10,11,15,0)_100%)]"
                          }`}
                        />
                        <div className="absolute right-6 bottom-6 left-6">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                            <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/90">
                              Live Now
                            </span>
                          </div>
                          <h3 className="font-[var(--font-display)] text-4xl leading-[1.08] text-white transition group-hover:translate-y-[-2px]">
                            {contest.theme}
                          </h3>
                          <div className="mt-4 h-px w-10 bg-white/55" />
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/82">
                            {contest.period}
                          </p>
                        </div>
                      </Link>
                        );
                      })()}
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="rounded-[22px] border border-white/12 bg-white/6 px-5 py-8 text-sm text-slate-300/76">
                  현재 전시 중인 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <motion.section
              className="rounded-[26px] border border-white/10 bg-[rgba(18,18,18,0.68)] p-6 backdrop-blur-md md:p-8"
              {...staggeredFadeUpMotion(2, reduceMotion)}
            >
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-2xl text-slate-100">
                  Submission Open
                  <span className="ml-3 rounded-full border border-cyan-300/35 bg-cyan-300/16 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                    출품 진행 중
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => openPayment()}
                  className="rounded-full border border-cyan-300/35 bg-cyan-300/16 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/24"
                >
                  출품권 결제
                </button>
              </div>

              {submissionContests.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {submissionContests.map((contest, index) => (
                    <motion.article
                      key={contest.id}
                      {...staggeredFadeUpMotion(index + 3, reduceMotion)}
                      className="rounded-[22px] border border-cyan-300/22 bg-[linear-gradient(160deg,rgba(11,31,37,0.72)_0%,rgba(17,44,58,0.56)_100%)] p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full border px-3 py-1 text-[11px] ${phaseTone.SUBMISSION.chip}`}>
                          {phaseLabel.SUBMISSION}
                        </span>
                        <span className="text-xs text-cyan-100/80">
                          {deadlineText(contest)}
                        </span>
                      </div>
                      <h3 className="mt-3 font-[var(--font-display)] text-3xl leading-tight text-cyan-50">
                        {contest.theme}
                      </h3>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-cyan-100/74">
                        {contest.period}
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-cyan-100/86">
                        <span className="rounded-full border border-cyan-300/22 bg-cyan-300/12 px-3 py-1.5">
                          참가비 {formatNumber(contest.entryFee)}원
                        </span>
                        <span className="rounded-full border border-cyan-300/22 bg-cyan-300/12 px-3 py-1.5">
                          상금풀 {formatNumber(contest.prizePool)}원
                        </span>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-2">
                        <Link
                          href={contestHref(contest.id)}
                          className="rounded-full border border-cyan-200/30 bg-white/8 px-3 py-2 text-center text-xs text-cyan-50 transition hover:bg-white/14"
                        >
                          상세 보기
                        </Link>
                        <button
                          type="button"
                          onClick={() => openPayment(contest.id)}
                          className="rounded-full border border-cyan-300/35 bg-cyan-300/18 px-3 py-2 text-xs text-cyan-50 transition hover:bg-cyan-300/28"
                        >
                          출품권 결제
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-white/12 bg-white/6 px-4 py-6 text-sm text-slate-300/76">
                  현재 출품 가능한 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <motion.section
              className="rounded-[26px] border border-white/10 bg-[rgba(18,18,18,0.62)] p-6 backdrop-blur-md md:p-8"
              {...staggeredFadeUpMotion(3, reduceMotion)}
            >
              <div className="mb-5 flex items-end justify-between">
                <h2 className="text-2xl text-slate-100">
                  Review & Queue
                  <span className="ml-3 rounded-full border border-amber-300/30 bg-amber-300/14 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                    심사 · 대기
                  </span>
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Curator Desk
                </p>
              </div>

              {queueContests.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {queueContests.map((contest, index) => {
                    const tone = phaseTone[contest.phase];
                    return (
                      <motion.div
                        key={contest.id}
                        {...staggeredFadeUpMotion(index + 4, reduceMotion)}
                        className="group grid gap-3 py-4 md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {phaseLabel[contest.phase]}
                            </span>
                          </div>
                          <h3 className="font-[var(--font-display)] text-2xl text-slate-200 transition group-hover:text-white">
                            {contest.theme}
                          </h3>
                          <p className="mt-2 text-xs text-slate-400">{contest.period}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            출품 시작 {formatDate(contest.submissionStartAt)} · 전시 시작{" "}
                            {formatDate(contest.votingStartAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[11px] ${tone.chip}`}>
                            {contest.phase === "REVIEW" ? "심사 큐 운영" : "오픈 대기"}
                          </span>
                          <Link
                            href={contestHref(contest.id)}
                            className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/14"
                          >
                            상세 보기
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[20px] border border-white/12 bg-white/6 px-4 py-6 text-sm text-slate-300/76">
                  심사 중 또는 대기 중인 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <motion.section
              className="rounded-[26px] border border-white/10 bg-[rgba(14,14,16,0.6)] p-6 backdrop-blur-md md:p-8"
              {...staggeredFadeUpMotion(4, reduceMotion)}
            >
              <div className="mb-5 flex items-end justify-between">
                <h2 className="text-2xl text-slate-100">
                  Ended
                  <span className="ml-3 rounded-full border border-slate-400/30 bg-slate-500/14 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                    종료
                  </span>
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                  Archive
                </p>
              </div>

              {endedContests.length > 0 ? (
                <div className="space-y-1">
                  {endedContests.map((contest, index) => (
                    <motion.div
                      key={contest.id}
                      {...staggeredFadeUpMotion(index + 5, reduceMotion)}
                      className="group flex items-baseline justify-between gap-4 rounded-[14px] px-2 py-3 transition hover:bg-white/[0.04]"
                    >
                      <div className="flex min-w-0 items-baseline gap-5">
                        <span className="w-14 shrink-0 text-xs text-slate-600">
                          {archiveStamp(contest)}
                        </span>
                        <h4 className="truncate font-[var(--font-display)] text-xl text-slate-300 transition group-hover:text-white">
                          {contest.theme}
                        </h4>
                      </div>
                      <Link
                        href={contestHref(contest.id)}
                        className="rounded-full border border-slate-400/24 bg-white/5 px-3 py-1 text-[11px] text-slate-300 transition hover:bg-white/12"
                      >
                        보기
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-white/12 bg-white/6 px-4 py-6 text-sm text-slate-300/76">
                  종료된 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <p className="pb-2 text-center text-[11px] uppercase tracking-[0.22em] text-slate-600">
              Artium Contest Collection
            </p>
          </div>
        )}
      </main>

      <CinematicBottomNav activeTab="contest" layout="fixed" />

      <AnimatePresence>
        {paymentStep !== "closed" && (
          <motion.div
            {...overlayFadeMotion(reduceMotion)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div
              {...popInMotion(reduceMotion)}
              className="w-full max-w-lg rounded-[28px] border border-white/14 bg-[rgba(15,15,18,0.96)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            >
              {paymentStep === "payment" && (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">
                        Test Payment
                      </p>
                      <h2 className="mt-2 font-[var(--font-display)] text-3xl text-slate-100">
                        출품권 결제
                      </h2>
                      <p className="mt-2 text-sm text-slate-300/74">
                        현재는 테스트 결제 UI입니다. 실제 청구는 발생하지 않습니다.
                      </p>
                    </div>
                    <button
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                      onClick={() => setPaymentStep("closed")}
                    >
                      닫기
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4">
                    <label className="text-xs uppercase tracking-[0.26em] text-slate-500">
                      Contest
                    </label>
                    <select
                      value={selectedContestId ?? undefined}
                      onChange={(event) => setSelectedContestId(Number(event.target.value))}
                      className="h-11 rounded-[14px] border border-white/14 bg-black/25 px-4 text-sm text-slate-100 focus:border-cyan-300/50 focus:outline-none"
                    >
                      {submissionContests.map((contest) => (
                        <option key={contest.id} value={contest.id}>
                          {contest.theme}
                        </option>
                      ))}
                    </select>

                    <div className="rounded-[14px] border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-200">
                      참가비{" "}
                      <strong>
                        {selectedContest ? formatNumber(selectedContest.entryFee) : 0}원
                      </strong>
                    </div>

                    <div className="grid gap-2">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                        Payment Method
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "card", label: "카드 결제" },
                          { id: "account", label: "계좌 이체" },
                          { id: "simple", label: "간편 결제" },
                        ].map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            className={`rounded-full border px-4 py-2 text-xs transition ${
                              paymentMethod === method.id
                                ? "border-cyan-300/45 bg-cyan-300/18 text-cyan-100"
                                : "border-white/18 bg-transparent text-slate-300 hover:bg-white/10"
                            }`}
                            onClick={() => setPaymentMethod(method.id)}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      className="rounded-full border border-cyan-300/45 bg-cyan-300/20 px-4 py-3 text-sm text-cyan-100 transition hover:bg-cyan-300/30"
                      onClick={() => setPaymentStep("confirm")}
                    >
                      테스트 결제 진행
                    </button>
                    <button
                      className="rounded-full border border-white/18 bg-transparent px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10"
                      onClick={() => setPaymentStep("closed")}
                    >
                      취소
                    </button>
                  </div>
                </>
              )}

              {paymentStep === "confirm" && (
                <>
                  <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">
                    Payment Complete
                  </p>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl text-slate-100">
                    결제가 완료되었습니다.
                  </h2>
                  <p className="mt-2 text-sm text-slate-300/74">
                    테스트 결제이므로 실제 결제는 진행되지 않습니다.
                  </p>
                  <div className="mt-6 rounded-[14px] border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-200">
                    {selectedContest?.theme ?? "선택된 콘테스트"} 출품권 구매가 완료되었습니다.
                  </div>
                  <button
                    className="mt-6 w-full rounded-full border border-cyan-300/45 bg-cyan-300/20 px-5 py-3 text-sm text-cyan-100 transition hover:bg-cyan-300/30 disabled:opacity-60"
                    disabled={!selectedContest?.id}
                    onClick={async () => {
                      if (!selectedContest?.id) {
                        return;
                      }
                      const result = await purchaseEntryCredit(selectedContest.id);
                      if (result.error) {
                        dispatch(showToast(`결제 처리에 실패했습니다. (${result.error})`));
                        return;
                      }
                      setPaymentStep("closed");
                      router.push(contestHref(selectedContest.id));
                    }}
                  >
                    확인
                  </button>
                  {selectedContest?.id && (
                    <Link
                      href={contestHref(selectedContest.id)}
                      className="mt-3 block text-center text-xs text-cyan-100/86 hover:underline"
                    >
                      바로 출품하러 가기
                    </Link>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
