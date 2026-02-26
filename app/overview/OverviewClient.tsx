"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import CinematicBottomNav from "../components/CinematicBottomNav";
import {
  clearAccessToken,
  logout,
} from "../lib/auth";
import { getContestList } from "../lib/contest";
import { getHomeData } from "../lib/home";
import { canAccessPath } from "../lib/routeGuard";
import { staggeredFadeUpMotion } from "../lib/motion";
import { APP_ROUTES, galleryMuseumDetailRoute } from "../lib/router";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";
import useAuthSession from "../hooks/useAuthSession";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const contestDetailRoute = (contestId: number) => `/contest/${contestId}?tab=contest`;
const museumDetailRoute = (museumId: number) =>
  `${galleryMuseumDetailRoute(museumId)}?tab=gallery`;

export default function OverviewClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const { isHydrated, authStatus, userLabel } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["home", "overview"],
    queryFn: getHomeData,
  });
  const { data: contestListData, isLoading: contestListLoading } = useQuery({
    queryKey: ["contest-list", "overview"],
    queryFn: getContestList,
  });

  const payload = data?.data ?? null;
  const error = data?.error;
  const contests = contestListData?.data ?? [];
  const contestError = contestListData?.error;
  const exhibitingContests = contests.filter((contest) => contest.phase === "VOTING");
  const upcomingContests = contests.filter((contest) => contest.phase === "UPCOMING");
  const todaysPick = payload?.todaysPick ?? [];
  const spotlightPick = todaysPick[0] ?? null;
  const featuredMuseums = payload?.featuredMuseums ?? [];
  const spotlightMuseum = featuredMuseums.find((museum) => museum.coverImageUrl) ?? featuredMuseums[0];
  const spotlightContest = payload?.activeContests?.[0] ?? null;
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
      clearAccessToken();
      dispatch(showToast("로그아웃 되었습니다."));
      router.push(APP_ROUTES.homeOverview);
    } catch {
      clearAccessToken();
      dispatch(showToast("로그아웃 처리 중 오류가 발생했습니다."));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(84,90,111,0.22),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(73,108,115,0.18),transparent_36%),radial-gradient(circle_at_52%_82%,rgba(120,86,64,0.14),transparent_38%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-24 pt-6 md:px-8">
        {isLoading ? (
          <div className="flex min-h-screen flex-col justify-center gap-4">
            <div className="h-8 w-36 rounded-full   bg-white/10" />
            <div className="h-[46vh] rounded-[26px]   bg-white/6" />
            <div className="h-40 rounded-[22px]   bg-white/6" />
          </div>
        ) : payload ? (
          <div className="space-y-10">
            <motion.header
              className="flex w-full items-center justify-between"
              {...staggeredFadeUpMotion(0, reduceMotion)}
            >
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">Museum Hub</p>
                <h1 className="mt-1 font-[var(--font-display)] text-2xl italic text-slate-200">
                  The Overview
                </h1>
              </div>

              {!isHydrated ? (
                <div className="h-9 w-24 rounded-full   bg-white/8" />
              ) : authStatus === "in" ? (
                <div className="flex items-center gap-2">
                  {userLabel ? (
                    <span className="hidden rounded-full   bg-white/6 px-3 py-1 text-xs text-slate-200/85 md:inline-flex">
                      {userLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="rounded-full   bg-white/8 px-4 py-2 text-xs text-slate-200/88 transition  hover:bg-white/14 disabled:opacity-60"
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-full   bg-white/8 px-4 py-2 text-xs text-slate-200/88 transition  hover:bg-white/14"
                >
                  Sign in
                </button>
              )}
            </motion.header>

            <motion.section {...staggeredFadeUpMotion(1, reduceMotion)}>
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  spotlightContest
                    ? router.push(contestDetailRoute(spotlightContest.id))
                    : spotlightMuseum
                    ? router.push(museumDetailRoute(spotlightMuseum.museumId))
                    : navigateWithGuard("/gallery", "gallery")
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (spotlightContest) {
                      router.push(contestDetailRoute(spotlightContest.id));
                      return;
                    }
                    if (spotlightMuseum) {
                      router.push(museumDetailRoute(spotlightMuseum.museumId));
                      return;
                    }
                    navigateWithGuard("/gallery", "gallery");
                  }
                }}
                className="group relative block h-[420px] overflow-hidden rounded-[26px]"
                style={
                  spotlightMuseum?.coverImageUrl
                    ? {
                        backgroundImage: `url(${spotlightMuseum.coverImageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center center",
                      }
                    : {
                        background: "linear-gradient(145deg,#2e3647_0%,#4a576d_100%)",
                      }
                }
              >
                <div className="absolute inset-[2px] rounded-[24px] bg-[linear-gradient(0deg,rgba(10,11,15,0.9)_0%,rgba(10,11,15,0.26)_58%,rgba(10,11,15,0.1)_100%)]" />
                <div className="absolute right-6 bottom-6 left-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/90">
                      Live Now
                    </span>
                  </div>
                  <h3 className="font-[var(--font-display)] text-4xl leading-[1.08] text-white transition group-hover:translate-y-[-2px]">
                    {spotlightContest?.theme ?? spotlightPick?.title ?? spotlightMuseum?.name ?? "Curated Spotlight"}
                  </h3>
                  <div className="mt-4 h-px w-10 bg-white/55" />
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/82">
                    {spotlightContest?.period ??
                      (spotlightMuseum ? `${spotlightMuseum.ownerName} · ${formatNumber(spotlightMuseum.artworkCount)} WORKS` : "MUSEUM SPOTLIGHT")}
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.section {...staggeredFadeUpMotion(2, reduceMotion)}>
              <div className="mb-6 flex items-end justify-between">
                <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400">Contests</h3>
                <button
                  type="button"
                  onClick={() => navigateWithGuard("/contest", "contest")}
                  className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-300"
                >
                  View All
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#c0a062]">전시중</p>
                  <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {contestListLoading ? (
                      <div className="h-44 w-[280px] rounded-[18px]   bg-white/6" />
                    ) : exhibitingContests.length > 0 ? (
                      exhibitingContests.map((contest) => (
                        <button
                          type="button"
                          key={contest.id}
                          onClick={() => router.push(contestDetailRoute(contest.id))}
                          className="flex h-44 w-[280px] flex-none flex-col justify-between rounded-[18px]   bg-[linear-gradient(160deg,rgba(192,160,98,0.08),rgba(255,255,255,0.03))] p-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="rounded-full   bg-[#c0a062]/14 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#f8e6be]">
                                전시 중
                              </span>
                              <span className="text-[10px] text-white/58">
                                {contest.daysLeft <= 0 ? "Live now" : `${contest.daysLeft}d left`}
                              </span>
                            </div>
                            <h4 className="mt-3 line-clamp-2 font-[var(--font-display)] text-xl italic text-slate-100">
                              {contest.theme}
                            </h4>
                            <p className="mt-2 text-xs text-slate-400">{contest.period}</p>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Prize Pool</p>
                              <p className="text-sm text-slate-200">{formatNumber(contest.prizePool)}원</p>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.12em] text-[#f8e6be]/85">상세 보기</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="w-full rounded-[18px]   bg-white/6 px-5 py-8 text-sm text-slate-300/75">
                        현재 전시중인 콘테스트가 없습니다.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">출품대기중</p>
                  <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {contestListLoading ? (
                      <div className="h-44 w-[280px] rounded-[18px]   bg-white/6" />
                    ) : upcomingContests.length > 0 ? (
                      upcomingContests.map((contest) => (
                        <button
                          type="button"
                          key={contest.id}
                          onClick={() => router.push(contestDetailRoute(contest.id))}
                          className="flex h-44 w-[280px] flex-none flex-col justify-between rounded-[18px]   bg-white/6 p-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="rounded-full bg-slate-300/14 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-200">
                                출품 대기
                              </span>
                              <span className="text-[10px] text-white/50">
                                {contest.daysLeft <= 0 ? "Soon" : `D-${contest.daysLeft}`}
                              </span>
                            </div>
                            <h4 className="mt-3 line-clamp-2 font-[var(--font-display)] text-xl italic text-slate-100">
                              {contest.theme}
                            </h4>
                            <p className="mt-2 text-xs text-slate-400">{contest.period}</p>
                          </div>
                          <div className="flex justify-end">
                            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-300/85">일정 확인</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="w-full rounded-[18px]   bg-white/6 px-5 py-8 text-sm text-slate-300/75">
                        현재 출품대기중인 콘테스트가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!contestListLoading && contestError ? (
                <p className="mt-4 text-xs text-rose-200/90">
                  콘테스트 목록을 불러오지 못했습니다. ({contestError})
                </p>
              ) : null}
            </motion.section>

            <motion.section {...staggeredFadeUpMotion(3, reduceMotion)}>
              <div className="mb-6 flex items-end justify-between">
                <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400">Trending Halls</h3>
                <button
                  type="button"
                  onClick={() => navigateWithGuard("/gallery", "gallery")}
                  className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-300"
                >
                  Explore
                </button>
              </div>
              {featuredMuseums.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3">
                  {featuredMuseums.map((museum) => (
                    <button
                      key={museum.museumId}
                      type="button"
                      onClick={() => router.push(museumDetailRoute(museum.museumId))}
                      className="group text-left"
                    >
                      <div className="overflow-hidden rounded-[18px]   bg-white/6 shadow-[0_18px_36px_rgba(0,0,0,0.34)]">
                        {museum.coverImageUrl ? (
                          <img
                            src={museum.coverImageUrl}
                            alt={museum.name}
                            className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="aspect-[3/4] w-full bg-[linear-gradient(145deg,#2f3340_0%,#4b5262_100%)]" />
                        )}
                      </div>
                      <div className="px-1 pt-3">
                        <p className="line-clamp-1 text-sm font-[var(--font-display)] italic text-slate-200">
                          {museum.name}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          {museum.ownerName} · {formatNumber(museum.artworkCount)} works
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px]   bg-white/6 px-5 py-8 text-sm text-slate-300/75">
                  노출 중인 뮤지엄이 없습니다.
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
