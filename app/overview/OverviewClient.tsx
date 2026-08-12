"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import CinematicBottomNav from "../components/CinematicBottomNav";
import MuseumAtmosphere from "../components/MuseumAtmosphere";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import Reveal from "../components/motion/Reveal";
import { getOverviewData } from "../lib/overview";
import { galleryMuseumDetailRoute } from "../lib/router";
import type { ContestPhase, ContestSummary } from "../types/contest";

const phaseLabels: Record<ContestPhase, string> = {
  UPCOMING: "예정",
  SUBMISSION: "작품 접수",
  REVIEW: "심사",
  VOTING: "관객 투표",
  ENDED: "종료",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "일정 확인 중";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "일정 확인 중"
    : new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(date);
}

function contestEndLabel(contest: ContestSummary) {
  if (contest.phase === "SUBMISSION") {
    return `접수 마감 ${formatDate(contest.submissionEndAt)}`;
  }
  if (contest.phase === "VOTING") {
    return `투표 마감 ${formatDate(contest.votingEndAt)}`;
  }
  return contest.period;
}

export default function OverviewClient() {
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["overview", "page"],
    queryFn: getOverviewData,
  });

  const payload = data?.data ?? null;
  const activeContests = useMemo(
    () => payload?.contests.filter((contest) => contest.phase !== "ENDED") ?? [],
    [payload?.contests],
  );
  const leadContest = activeContests.find((contest) => contest.phase === "SUBMISSION")
    ?? activeContests.find((contest) => contest.phase === "VOTING")
    ?? activeContests[0]
    ?? null;
  const leadMuseum = payload?.featuredMuseums.find((museum) => museum.coverImageUrl)
    ?? payload?.featuredMuseums[0]
    ?? null;

  return (
    <div className="museum-grain relative min-h-screen overflow-hidden bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <MuseumAtmosphere variant="lobby" />
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-32 pt-4 md:px-10 md:pt-6 xl:px-14">
        <OverviewStyleHeader title="오늘의 MUSE" subtitle="Now on view" />

        {isLoading ? (
          <div className="grid gap-8 py-12 lg:grid-cols-[1.25fr_0.75fr]" aria-live="polite">
            <div className="skeleton h-[58vh] min-h-[420px]" />
            <div className="space-y-4">
              <div className="skeleton h-32" />
              <div className="skeleton h-32" />
              <div className="skeleton h-32" />
            </div>
          </div>
        ) : payload ? (
          <div className="py-10 md:py-16">
            <Reveal>
              <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:gap-10">
                <button
                  type="button"
                  onClick={() => leadMuseum && router.push(galleryMuseumDetailRoute(leadMuseum.museumId))}
                  disabled={!leadMuseum}
                  className="museum-stage group relative min-h-[58vh] overflow-hidden bg-[var(--canvas-soft)] text-left disabled:cursor-default"
                >
                  {leadMuseum?.coverImageUrl ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-cover bg-center transition duration-700 ease-out group-hover:scale-[1.025]"
                      style={{ backgroundImage: `url(${leadMuseum.coverImageUrl})` }}
                    />
                  ) : (
                    <span className="absolute inset-0 bg-[linear-gradient(145deg,#1a1c1c,#302d28)]" />
                  )}
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,6,0.08),rgba(5,6,6,0.78))]" />
                  <span className="absolute inset-x-0 bottom-0 p-6 md:p-9">
                    <span className="museum-kicker text-white/70">Featured permanent exhibition</span>
                    <span className="mt-3 block font-[var(--font-display)] text-4xl leading-tight text-white md:text-6xl">
                      {leadMuseum?.name ?? "새 전시를 준비하고 있습니다"}
                    </span>
                    {leadMuseum ? (
                      <span className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/65">
                        <span>{leadMuseum.ownerName}</span>
                        <span>작품 {formatNumber(leadMuseum.artworkCount)}점</span>
                      </span>
                    ) : null}
                  </span>
                </button>

                <aside className="flex flex-col border-t border-[var(--line)] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <p className="museum-kicker">Open call</p>
                  {leadContest ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/contest/${leadContest.id}`)}
                      className="group flex flex-1 flex-col justify-between py-6 text-left lg:py-4"
                    >
                      <span>
                        <span className="text-xs text-[var(--accent)]">{phaseLabels[leadContest.phase]}</span>
                        <span className="mt-4 block font-[var(--font-display)] text-4xl leading-[1.08] md:text-5xl">
                          {leadContest.theme}
                        </span>
                        <span className="mt-5 block max-w-md text-sm leading-7 text-[var(--muted)]">
                          한 장의 사진을 출품하고, 심사와 관객 투표를 거쳐 MUSE의 영구 기록에 참여하세요.
                        </span>
                      </span>
                      <span className="mt-10 border-t border-[var(--line)] pt-5">
                        <span className="flex justify-between gap-4 text-xs text-[var(--muted)]">
                          <span>{contestEndLabel(leadContest)}</span>
                          <span>총상금 {formatNumber(leadContest.prizePool)}원</span>
                        </span>
                        <span className="mt-8 flex items-center justify-between text-sm">
                          공모전 자세히 보기
                          <span aria-hidden="true" className="text-xl text-[var(--accent)] transition group-hover:translate-x-1">→</span>
                        </span>
                      </span>
                    </button>
                  ) : (
                    <p className="py-10 text-sm leading-7 text-[var(--muted)]">현재 접수 중인 공모전이 없습니다.</p>
                  )}
                </aside>
              </section>
            </Reveal>

            <Reveal className="mt-[var(--space-section)]" index={1}>
              <section>
                <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
                  <div>
                    <p className="museum-kicker">Contest calendar</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-3xl">진행 중인 공모전</h2>
                  </div>
                  <button type="button" onClick={() => router.push("/contest")} className="text-xs text-[var(--muted)] hover:text-white">
                    전체 보기
                  </button>
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {activeContests.slice(0, 5).map((contest, index) => (
                    <button
                      key={contest.id}
                      type="button"
                      onClick={() => router.push(`/contest/${contest.id}`)}
                      className="grid w-full gap-3 py-5 text-left transition hover:bg-white/[0.025] md:grid-cols-[60px_1fr_auto_auto] md:items-center md:gap-6 md:px-2"
                    >
                      <span className="text-xs text-[var(--muted-deep)]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="font-[var(--font-display)] text-2xl">{contest.theme}</span>
                      <span className="text-xs text-[var(--accent)]">{phaseLabels[contest.phase]}</span>
                      <span className="text-xs text-[var(--muted)]">{contestEndLabel(contest)}</span>
                    </button>
                  ))}
                  {activeContests.length === 0 ? (
                    <p className="py-8 text-sm text-[var(--muted)]">새 공모전 일정을 준비하고 있습니다.</p>
                  ) : null}
                </div>
              </section>
            </Reveal>

            <Reveal className="mt-[var(--space-section)]" index={2}>
              <section>
                <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
                  <div>
                    <p className="museum-kicker">Permanent collection</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-3xl">영구 전시관</h2>
                  </div>
                  <button type="button" onClick={() => router.push("/gallery")} className="text-xs text-[var(--muted)] hover:text-white">
                    모든 전시관
                  </button>
                </div>
                <div className="grid gap-x-5 gap-y-10 pt-7 sm:grid-cols-2 lg:grid-cols-3">
                  {payload.featuredMuseums.slice(0, 6).map((museum, index) => (
                    <button
                      key={museum.museumId}
                      type="button"
                      onClick={() => router.push(galleryMuseumDetailRoute(museum.museumId))}
                      className={`group text-left ${index === 0 ? "sm:col-span-2" : ""}`}
                    >
                      <span className={`block overflow-hidden bg-[var(--canvas-soft)] ${index === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
                        {museum.coverImageUrl ? (
                          <span
                            role="img"
                            aria-label={`${museum.name} 대표 작품`}
                            className="block h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-[1.025]"
                            style={{ backgroundImage: `url(${museum.coverImageUrl})` }}
                          />
                        ) : null}
                      </span>
                      <span className="mt-4 flex items-start justify-between gap-4">
                        <span>
                          <span className="block font-[var(--font-display)] text-2xl">{museum.name}</span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">{museum.ownerName}</span>
                        </span>
                        <span className="text-[10px] text-[var(--muted-deep)]">{museum.artworkCount} works</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </Reveal>
          </div>
        ) : (
          <section className="flex min-h-[65vh] flex-col items-center justify-center text-center" aria-live="polite">
            <p className="museum-kicker">Connection interrupted</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl">오늘의 전시 정보를 불러오지 못했습니다.</h2>
            <p className="mt-4 text-sm text-[var(--muted)]">{data?.error ?? "잠시 후 다시 시도해 주세요."}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-7 border border-[var(--line-strong)] px-6 py-3 text-sm hover:border-[var(--accent)] disabled:opacity-50"
            >
              {isFetching ? "다시 연결 중" : "다시 시도"}
            </button>
          </section>
        )}
      </main>
      <CinematicBottomNav activeTab="overview" layout="fixed" />
    </div>
  );
}
