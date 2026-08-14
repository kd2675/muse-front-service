"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import CinematicBottomNav from "../components/CinematicBottomNav";
import MuseumAtmosphere from "../components/MuseumAtmosphere";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import Reveal from "../components/motion/Reveal";
import { getContestEntries, getContestList } from "../lib/contest";
import { contestPhaseOrder, getContestPhaseLabel } from "../lib/statusTheme";
import type { ContestPhase, ContestSummary } from "../types/contest";

const phaseDescription: Record<ContestPhase, string> = {
  UPCOMING: "작품 접수 전",
  SUBMISSION: "작품을 접수하고 있습니다",
  REVIEW: "큐레이터 심사 중",
  VOTING: "관객 투표 전시 중",
  ENDED: "결과 기록 보관 중",
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
    : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function deadline(contest: ContestSummary) {
  if (contest.phase === "SUBMISSION") {
    return `접수 마감 ${formatDate(contest.submissionEndAt)}`;
  }
  if (contest.phase === "VOTING") {
    return `투표 마감 ${formatDate(contest.votingEndAt)}`;
  }
  if (contest.phase === "UPCOMING") {
    return `접수 시작 ${formatDate(contest.submissionStartAt)}`;
  }
  return contest.period;
}

function phaseGroups(contests: ContestSummary[]) {
  return (["SUBMISSION", "VOTING", "REVIEW", "UPCOMING", "ENDED"] as ContestPhase[])
    .map((phase) => ({ phase, contests: contests.filter((contest) => contest.phase === phase) }))
    .filter((group) => group.contests.length > 0);
}

export default function ContestClient() {
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["contests"],
    queryFn: getContestList,
  });
  const contests = useMemo(
    () => [...(data?.data ?? [])].sort((left, right) => {
      const phaseDifference = contestPhaseOrder[left.phase] - contestPhaseOrder[right.phase];
      return phaseDifference === 0 ? right.id - left.id : phaseDifference;
    }),
    [data?.data],
  );
  const exhibitContests = useMemo(
    () => contests.filter((contest) => contest.phase === "VOTING"),
    [contests],
  );
  const entryQueries = useQueries({
    queries: exhibitContests.map((contest) => ({
      queryKey: ["contest", contest.id, "entries", "cover"],
      queryFn: () => getContestEntries(contest.id),
      staleTime: 30_000,
    })),
  });
  const coverByContestId = useMemo(() => {
    const covers = new Map<number, string>();
    exhibitContests.forEach((contest, index) => {
      const cover = entryQueries[index]?.data?.data.find((entry) => entry.imageUrl)?.imageUrl;
      if (cover) {
        covers.set(contest.id, cover);
      }
    });
    return covers;
  }, [entryQueries, exhibitContests]);
  const leadContest = contests.find((contest) => contest.phase === "SUBMISSION")
    ?? contests.find((contest) => contest.phase === "VOTING")
    ?? contests[0]
    ?? null;

  return (
    <div className="museum-grain relative min-h-screen overflow-hidden bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <MuseumAtmosphere variant="program" />
      <main id="main-content" tabIndex={-1} className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-32 pt-4 md:px-10 md:pt-6 xl:px-14">
        <OverviewStyleHeader title="사진 공모전" subtitle="Open calls & exhibitions" />

        {isLoading ? (
          <div className="grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr]" aria-live="polite">
            <div className="skeleton h-[520px]" />
            <div className="space-y-5"><div className="skeleton h-40" /><div className="skeleton h-40" /></div>
          </div>
        ) : contests.length > 0 ? (
          <div className="py-10 md:py-14">
            {leadContest ? (
              <Reveal>
                <section className="museum-stage grid min-h-[520px] overflow-hidden bg-[var(--canvas-raised)] lg:grid-cols-[1.2fr_0.8fr]">
                  <button
                    type="button"
                    onClick={() => router.push(`/contest/${leadContest.id}`)}
                    className="group relative min-h-[360px] overflow-hidden bg-[var(--canvas-soft)] text-left"
                  >
                    {coverByContestId.get(leadContest.id) ? (
                      <span
                        role="img"
                        aria-label={`${leadContest.theme} 출품작`}
                        className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.025]"
                        style={{ backgroundImage: `url(${coverByContestId.get(leadContest.id)})` }}
                      />
                    ) : (
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(197,168,117,0.24),transparent_30%),linear-gradient(145deg,#15191a,#25231f)]" />
                    )}
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,5,0.06),rgba(4,5,5,0.76))]" />
                    <span className="absolute inset-x-0 bottom-0 p-7 md:p-10">
                      <span className="museum-kicker text-white/70">Current program</span>
                      <span className="mt-4 block font-[var(--font-display)] text-4xl leading-tight text-white md:text-6xl">{leadContest.theme}</span>
                    </span>
                  </button>
                  <div className="flex flex-col justify-between p-7 md:p-10">
                    <div>
                      <p className="museum-kicker">{getContestPhaseLabel(leadContest.phase)}</p>
                      <h2 className="mt-5 font-[var(--font-display)] text-4xl leading-tight">당신의 한 장이 다음 전시가 됩니다.</h2>
                      <p className="mt-5 text-sm leading-8 text-[var(--muted)]">
                        작품 접수, 큐레이터 심사, 관객 투표를 거쳐 선정된 사진은 작가의 영구 전시 기록으로 이어집니다.
                      </p>
                    </div>
                    <div className="mt-10 border-t border-[var(--line)] pt-5">
                      <dl className="grid grid-cols-2 gap-5 text-xs">
                        <div><dt className="text-[var(--muted-deep)]">현재 단계</dt><dd className="mt-2 text-[var(--accent)]">{phaseDescription[leadContest.phase]}</dd></div>
                        <div><dt className="text-[var(--muted-deep)]">총상금</dt><dd className="mt-2">{formatNumber(leadContest.prizePool)}원</dd></div>
                      </dl>
                      <p className="mt-5 text-xs text-[var(--muted)]">{deadline(leadContest)}</p>
                      <button
                        type="button"
                        onClick={() => router.push(`/contest/${leadContest.id}`)}
                        className="mt-8 flex w-full items-center justify-between text-sm"
                      >
                        공모전 상세와 참여 방법
                        <span aria-hidden="true" className="text-xl text-[var(--accent)]">→</span>
                      </button>
                    </div>
                  </div>
                </section>
              </Reveal>
            ) : null}

            <div className="mt-[var(--space-section)] space-y-20">
              {phaseGroups(contests).map((group, groupIndex) => (
                <Reveal key={group.phase} index={groupIndex + 1}>
                  <section>
                    <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
                      <div>
                        <p className="museum-kicker">{phaseDescription[group.phase]}</p>
                        <h2 className="mt-2 font-[var(--font-display)] text-3xl">{getContestPhaseLabel(group.phase)}</h2>
                      </div>
                      <span className="text-xs text-[var(--muted-deep)]">{group.contests.length} programs</span>
                    </div>
                    <div className="divide-y divide-[var(--line)]">
                      {group.contests.map((contest, index) => (
                        <button
                          key={contest.id}
                          type="button"
                          onClick={() => router.push(`/contest/${contest.id}`)}
                          className="group grid w-full gap-4 py-6 text-left transition hover:bg-white/[0.02] md:grid-cols-[64px_minmax(0,1fr)_180px_140px] md:items-center md:px-2"
                        >
                          <span className="text-xs text-[var(--muted-deep)]">{String(index + 1).padStart(2, "0")}</span>
                          <span>
                            <span className="block font-[var(--font-display)] text-2xl transition group-hover:text-[var(--accent)]">{contest.theme}</span>
                            <span className="mt-1 block text-xs text-[var(--muted)]">{contest.period}</span>
                          </span>
                          <span className="text-xs text-[var(--muted)]">{deadline(contest)}</span>
                          <span className="text-xs md:text-right">{formatNumber(contest.prizePool)}원</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </Reveal>
              ))}
            </div>
          </div>
        ) : (
          <section className="flex min-h-[65vh] flex-col items-center justify-center text-center" aria-live="polite">
            <p className="museum-kicker">No program</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl">공모전 일정을 준비하고 있습니다.</h2>
            <p className="mt-4 text-sm text-[var(--muted)]">{data?.error ?? "새로운 주제와 참여 일정을 곧 공개합니다."}</p>
            {data?.error ? (
              <button type="button" onClick={() => void refetch()} disabled={isFetching} className="mt-7 border border-[var(--line-strong)] px-6 py-3 text-sm hover:border-[var(--accent)] disabled:opacity-50">
                {isFetching ? "다시 연결 중" : "다시 시도"}
              </button>
            ) : null}
          </section>
        )}
      </main>
      <CinematicBottomNav activeTab="contest" layout="fixed" />
    </div>
  );
}
