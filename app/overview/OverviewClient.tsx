"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import CinematicBottomNav from "../components/CinematicBottomNav";
import { logout } from "../lib/auth";
import { staggeredFadeUpMotion } from "../lib/motion";
import { getOverviewData } from "../lib/overview";
import { canAccessPath } from "../lib/routeGuard";
import { APP_ROUTES, galleryMuseumDetailRoute } from "../lib/router";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";
import type { ContestSummary } from "../types/contest";
import useAuthSession from "../hooks/useAuthSession";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const contestDetailRoute = (contestId: number) => `/contest/${contestId}?tab=contest`;
const museumDetailRoute = (museumId: number) => `${galleryMuseumDetailRoute(museumId)}?tab=gallery`;
const galleryFallbackBackground =
  "linear-gradient(140deg, rgba(38,47,66,0.92), rgba(18,18,22,0.88)), radial-gradient(circle at 78% 24%, rgba(148,163,184,0.26), transparent 54%)";

function formatShortDate(value?: string | null) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function getContestDeadlineLabel(contest: ContestSummary) {
  const endAt = contest.submissionEndAt ?? contest.votingEndAt;
  const formattedEndAt = formatShortDate(endAt);
  if (formattedEndAt) {
    return formattedEndAt;
  }
  if (contest.daysLeft <= 0) {
    return "진행중";
  }
  return `D-${contest.daysLeft}`;
}

function getDateSortValue(value?: string | null) {
  if (!value) {
    return -1;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return -1;
  }
  return time;
}

function getSubmissionLeadCopy(contest: ContestSummary) {
  const start = formatShortDate(contest.submissionStartAt);
  const end = formatShortDate(contest.submissionEndAt);
  if (start && end) {
    return `${start}부터 ${end}까지 작품을 접수합니다. 콘테스트 상세에서 바로 출품을 진행할 수 있습니다.`;
  }
  return "현재 작품 접수가 진행 중입니다. 콘테스트 상세에서 바로 출품을 진행할 수 있습니다.";
}

export default function OverviewClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const { isHydrated, authStatus, userLabel } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["overview", "page"],
    queryFn: getOverviewData,
  });

  const payload = data?.data ?? null;
  const error = data?.error;
  const contests = useMemo(() => payload?.contests ?? [], [payload?.contests]);

  const submissionContests = useMemo(
    () => contests.filter((contest) => contest.phase === "SUBMISSION"),
    [contests],
  );
  const exhibitingContests = useMemo(
    () => contests.filter((contest) => contest.phase === "VOTING"),
    [contests],
  );
  const latestSubmissionContests = useMemo(
    () =>
      [...submissionContests].sort((left, right) => {
        const byStartAt =
          getDateSortValue(right.submissionStartAt) - getDateSortValue(left.submissionStartAt);
        if (byStartAt !== 0) {
          return byStartAt;
        }
        return right.id - left.id;
      }),
    [submissionContests],
  );
  const latestSubmissionContest = latestSubmissionContests[0] ?? null;

  const featuredMuseums = useMemo(() => payload?.featuredMuseums ?? [], [payload?.featuredMuseums]);
  const gallerySpotlight = featuredMuseums[0] ?? null;

  const navigateWithGuard = (
    path: string,
    tab: "home" | "overview" | "contest" | "gallery" | "profile",
  ) => {
    const guard = canAccessPath(path);
    if (!guard.allowed) {
      dispatch(setPendingPath(`${path}?tab=${tab}`));
      if (guard.reason === "ROLE") {
        dispatch(showToast("권한이 없습니다."));
        router.push(APP_ROUTES.home);
        return;
      }
      dispatch(showToast("로그인이 필요한 기능입니다."));
      router.push("/login");
      return;
    }
    router.push(`${path}?tab=${tab}`);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      dispatch(showToast("로그아웃 되었습니다."));
      router.push(APP_ROUTES.homeOverview);
    } catch {
      dispatch(showToast("로그아웃 처리 중 오류가 발생했습니다."));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(84,90,111,0.24),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(73,108,115,0.18),transparent_40%),radial-gradient(circle_at_52%_84%,rgba(120,86,64,0.14),transparent_42%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-36 pt-10 md:px-8">
        {isLoading ? (
          <div className="flex min-h-screen flex-col gap-8 pt-4">
            <div className="h-8 w-40  bg-white/10" />
            <div className="h-80  bg-white/6" />
            <div className="h-72  bg-white/6" />
          </div>
        ) : payload ? (
          <div className="space-y-14">
            <motion.header
              className="flex w-full items-center justify-between"
              {...staggeredFadeUpMotion(0, reduceMotion)}
            >
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.42em] text-slate-500">Overview Hub</p>
                <h1 className="mt-2 font-[var(--font-display)] text-3xl italic text-slate-100">
                  Curated Dashboard
                </h1>
              </div>

              {!isHydrated ? (
                <div className="h-9 w-24  bg-white/8" />
              ) : authStatus === "in" ? (
                <div className="flex items-center gap-2">
                  {userLabel ? (
                    <span className="hidden  bg-white/6 px-3 py-1 text-xs text-slate-200/85 md:inline-flex">
                      {userLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="border border-white/14 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-200/88 transition hover:bg-white/14 disabled:opacity-60"
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="border border-white/14 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-200/88 transition hover:bg-white/14"
                >
                  Sign in
                </button>
              )}
            </motion.header>

            <motion.section {...staggeredFadeUpMotion(1, reduceMotion)}>
              <div className="mb-6 flex items-center justify-between border-b border-white/16 pb-5">
                <h2 className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Contest Spotlight</h2>
                <button
                  type="button"
                  onClick={() => navigateWithGuard("/contest", "contest")}
                  className="text-[10px] uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-300"
                >
                  Explore
                </button>
              </div>

              {latestSubmissionContest ? (
                <div className="border border-white/16 bg-[rgba(255,255,255,0.025)] px-7 py-8 md:px-8">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="h-1.5 w-1.5  bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.65)]" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/95">
                      출품 진행중
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(contestDetailRoute(latestSubmissionContest.id))}
                    className="w-full text-left"
                  >
                    <h3 className="font-[var(--font-display)] text-5xl leading-[1.04] text-white italic">
                      {latestSubmissionContest.theme}
                    </h3>
                    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300/90">
                      {getSubmissionLeadCopy(latestSubmissionContest)}
                    </p>
                  </button>

                  <div className="mt-8 grid grid-cols-2 gap-6 border-t border-white/14 pt-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Prize Pool</p>
                      <p className="mt-1.5 font-[var(--font-display)] text-xl text-slate-200">
                        {formatNumber(latestSubmissionContest.prizePool)}원
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Entry Deadline</p>
                      <p className="mt-1.5 font-[var(--font-display)] text-xl text-slate-200">
                        {getContestDeadlineLabel(latestSubmissionContest)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-white/14 bg-white/[0.025] px-6 py-9 text-sm text-slate-300/80">
                  현재 출품 진행중인 콘테스트가 없습니다.
                </div>
              )}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between border-b border-white/12 pb-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#f8e6be]">전시중</p>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Swipe</span>
                </div>
                {exhibitingContests.length > 0 ? (
                  <div className="w-full overflow-hidden">
                    <Swiper className="w-full" spaceBetween={14} slidesPerView="auto">
                      {exhibitingContests.map((contest) => (
                        <SwiperSlide key={contest.id} className="!h-auto !w-[86%] sm:!w-[52%] lg:!w-[36%]">
                          <button
                            type="button"
                            onClick={() => router.push(contestDetailRoute(contest.id))}
                            className="flex h-44 w-full flex-col justify-between border border-white/14 bg-white/[0.03] px-5 py-5 text-left transition hover:border-white/24 hover:bg-white/[0.06]"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="border border-[#c0a062]/45 bg-[#c0a062]/16 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#f8e6be]">
                                  전시
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {contest.daysLeft <= 0 ? "Live now" : `${contest.daysLeft}d left`}
                                </span>
                              </div>
                              <h4 className="mt-3 line-clamp-2 font-[var(--font-display)] text-xl italic text-slate-100">
                                {contest.theme}
                              </h4>
                              <p className="mt-2 text-xs text-slate-400">{contest.period}</p>
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                              Prize Pool · {formatNumber(contest.prizePool)}원
                            </p>
                          </button>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>
                ) : (
                  <div className="border border-white/14 bg-white/[0.025] px-5 py-7 text-sm text-slate-300/75">
                    현재 전시중인 콘테스트가 없습니다.
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section {...staggeredFadeUpMotion(2, reduceMotion)}>
              <div className="mb-6 flex items-center justify-between border-b border-white/16 pb-5">
                <h2 className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Gallery Planner</h2>
                <button
                  type="button"
                  onClick={() => navigateWithGuard("/gallery", "gallery")}
                  className="text-[10px] uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-300"
                >
                  View Schedule
                </button>
              </div>

              {gallerySpotlight ? (
                <button
                  type="button"
                  onClick={() => router.push(museumDetailRoute(gallerySpotlight.museumId))}
                  className="group relative block h-64 w-full overflow-hidden border border-white/16 text-left"
                >
                  <div
                    className="absolute inset-0 transition duration-700 group-hover:scale-[1.03]"
                    style={
                      gallerySpotlight.coverImageUrl
                        ? {
                            backgroundImage: `url(${gallerySpotlight.coverImageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            background: galleryFallbackBackground,
                          }
                    }
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,10,14,0.84)_0%,rgba(10,10,14,0.34)_48%,rgba(10,10,14,0.16)_100%)]" />
                  <div className="absolute inset-0 flex flex-col justify-between p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="border border-white/16 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/90">
                        추천 전시관
                      </span>
                      <span className="border border-white/14 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/85">
                        작품 {formatNumber(gallerySpotlight.artworkCount)}점
                      </span>
                    </div>
                    <div>
                      <h3 className="font-[var(--font-display)] text-4xl italic text-white">
                        {gallerySpotlight.name}
                      </h3>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                        Curator · {gallerySpotlight.ownerName}
                      </p>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="border border-white/14 bg-white/[0.025] px-6 py-9 text-sm text-slate-300/80">
                  노출 중인 전시관이 없습니다.
                </div>
              )}
            </motion.section>
          </div>
        ) : (
          <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Overview</p>
            <p className="mt-4 text-sm text-slate-200/80">
              데이터를 불러오지 못했습니다.
              {error ? ` (${error})` : ""}
            </p>
          </div>
        )}
      </main>
      <CinematicBottomNav activeTab="overview" layout="fixed" />
    </div>
  );
}
