"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import PageShell from "../components/PageShell";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { getHomeData } from "../lib/home";
import { staggeredFadeUpMotion } from "../lib/motion";
import { galleryMuseumDetailRoute } from "../lib/router";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const contestDetailRoute = (contestId: number) => `/contest/${contestId}?tab=contest`;
const museumDetailRoute = (museumId: number) =>
  `${galleryMuseumDetailRoute(museumId)}?tab=gallery`;

export default function OverviewClient() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const { data, isLoading } = useQuery({
    queryKey: ["home", "overview"],
    queryFn: getHomeData,
  });

  const payload = data?.data ?? null;
  const error = data?.error;
  const featuredMuseums = payload?.featuredMuseums ?? [];
  const activeContests = payload?.activeContests ?? [];
  const totalFeaturedWorks = featuredMuseums.reduce(
    (sum, museum) => sum + museum.artworkCount,
    0,
  );
  const nearestContestDays =
    activeContests.length > 0
      ? Math.min(...activeContests.map((contest) => contest.daysLeft))
      : null;

  return (
    <PageShell>
      <TopNav />
      {isLoading ? (
        <main className="mt-8 grid gap-6">
          <section className="rounded-[34px] border border-[color:var(--line)] bg-white/75 p-8 shadow-[var(--shadow)]">
            <Skeleton className="h-8 w-48 rounded-full" />
            <Skeleton className="mt-5 h-16 w-2/3 rounded-[20px]" />
            <SkeletonText className="mt-4 max-w-xl" lines={3} />
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-20 rounded-[16px]" />
              <Skeleton className="h-20 rounded-[16px]" />
              <Skeleton className="h-20 rounded-[16px]" />
            </div>
          </section>
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Skeleton className="h-80 rounded-[26px]" />
            <Skeleton className="h-80 rounded-[26px]" />
          </section>
        </main>
      ) : payload ? (
        <main className="mt-8">
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="rounded-[28px] border border-[rgba(27,23,19,0.14)] bg-white/88 p-6 shadow-[var(--shadow)] md:p-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#7a5e3e]">Curated Museums</p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[#21160d]">Featured Museums</h2>
                </div>
                <span className="rounded-full border border-[rgba(82,66,48,0.2)] bg-[rgba(250,246,239,0.92)] px-3 py-1 text-xs text-[#70583b]">
                  {formatNumber(featuredMuseums.length)} halls
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {featuredMuseums.length > 0 ? (
                  featuredMuseums.map((museum, index) => (
                    <motion.button
                      key={museum.museumId}
                      type="button"
                      {...staggeredFadeUpMotion(index + 3, reduceMotion)}
                      onClick={() => router.push(museumDetailRoute(museum.museumId))}
                      className="group flex cursor-pointer items-center justify-between rounded-[16px] border border-[rgba(40,30,20,0.14)] bg-[rgba(255,252,247,0.94)] px-4 py-4 text-left transition hover:border-[rgba(31,66,130,0.32)] hover:shadow-[0_10px_24px_rgba(31,66,130,0.12)]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#21170e]">{museum.name}</p>
                        <p className="mt-1 text-xs text-[#746453]">{museum.ownerName}</p>
                      </div>
                      <span className="rounded-full border border-[rgba(31,66,130,0.2)] bg-[rgba(31,66,130,0.06)] px-3 py-1 text-xs text-[#36558a]">
                        {formatNumber(museum.artworkCount)} works
                      </span>
                    </motion.button>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-dashed border-[color:var(--line)] bg-white/80 px-4 py-5 text-sm text-[color:var(--muted)]">
                    노출 중인 뮤지엄이 없습니다.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[28px] border border-[rgba(24,42,82,0.2)] bg-[linear-gradient(165deg,#0f1828_0%,#162944_52%,#1f3556_100%)] p-6 text-[#f1f4fa] shadow-[0_20px_44px_rgba(15,24,40,0.3)] md:p-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#a8bfe4]">Contest Pulse</p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl">Active Contests</h2>
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-[#dbe7fb]">
                  {nearestContestDays === null
                    ? "No live"
                    : nearestContestDays <= 0
                      ? "Live now"
                      : `D-${nearestContestDays}`}
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {activeContests.length > 0 ? (
                  activeContests.map((contest, index) => (
                    <motion.button
                      key={contest.id}
                      type="button"
                      {...staggeredFadeUpMotion(index + 8, reduceMotion)}
                      onClick={() => router.push(contestDetailRoute(contest.id))}
                      className="group cursor-pointer rounded-[16px] border border-white/16 bg-white/8 p-4 text-left transition hover:border-white/32 hover:bg-white/14"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-[#afc5e8]">Contest</p>
                          <h3 className="mt-2 font-[var(--font-display)] text-2xl text-white">{contest.theme}</h3>
                          <p className="mt-2 text-xs text-[#c5d3eb]">{contest.period}</p>
                        </div>
                        <span className="rounded-full border border-white/24 bg-white/10 px-3 py-1 text-xs text-[#dbe7fb]">
                          {contest.daysLeft <= 0 ? "진행 중" : `${contest.daysLeft}일`}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <span className="rounded-full border border-white/18 px-3 py-1 text-xs text-[#d0ddf4]">
                          참가비 {formatNumber(contest.entryFee)}원
                        </span>
                        <span className="rounded-full border border-white/18 px-3 py-1 text-xs text-[#d0ddf4]">
                          상금풀 {formatNumber(contest.prizePool)}원
                        </span>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-white/16 bg-white/8 px-4 py-5 text-sm text-[#cedbf1]">
                    현재 진행 중인 콘테스트가 없습니다.
                  </div>
                )}
              </div>
              <div className="mt-6 rounded-[14px] border border-white/16 bg-white/8 px-4 py-3 text-xs text-[#d6e2f7]">
                Curated Works {formatNumber(totalFeaturedWorks)} · Lobby Access {formatNumber(featuredMuseums.length)}
              </div>
            </article>
          </section>
        </main>
      ) : (
        <div className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/80 px-6 py-8 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
          홈 데이터를 불러오지 못했습니다.
          {error ? ` (${error})` : ""}
        </div>
      )}
    </PageShell>
  );
}
