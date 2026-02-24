"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getHomeData } from "../lib/home";
import TopNav from "../components/TopNav";
import PageShell from "../components/PageShell";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { APP_ROUTES, galleryMuseumDetailRoute } from "../lib/router";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const contestDetailRoute = (contestId: number) => `/contest/${contestId}?tab=contest`;
const museumDetailRoute = (museumId: number) =>
  `${galleryMuseumDetailRoute(museumId)}?tab=gallery`;

export default function HomeClient() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["home"],
    queryFn: getHomeData,
  });

  const payload = data?.data ?? null;
  const error = data?.error;
  const todaysPick = payload?.todaysPick ?? [];
  const heroPick = todaysPick[0] ?? null;
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
        <main className="mt-12 grid gap-7">
          <section className="rounded-[36px] border border-[color:var(--line)] bg-white/80 p-8 shadow-[var(--shadow)]">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="mt-6 h-16 w-3/4 rounded-[22px]" />
            <SkeletonText className="mt-5" lines={3} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-[20px]" />
              <Skeleton className="h-24 rounded-[20px]" />
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Skeleton className="h-80 rounded-[30px]" />
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-[20px]" />
              ))}
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-[28px]" />
            ))}
          </section>
        </main>
      ) : payload ? (
        <main className="mt-12 space-y-16">
          <section className="relative overflow-hidden rounded-[38px] border border-[rgba(28,26,22,0.12)] bg-[linear-gradient(140deg,#f8f3ea_0%,#fbf8f2_55%,#f0ece2_100%)] p-8 shadow-[var(--shadow)] md:p-10">
            <div className="pointer-events-none absolute -top-32 -left-14 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(37,88,180,0.17)_0%,_rgba(37,88,180,0)_70%)]" />
            <div className="pointer-events-none absolute -bottom-36 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(194,123,77,0.15)_0%,_rgba(194,123,77,0)_72%)]" />
            <div className="relative z-10">
              <div>
                <p className="inline-flex items-center rounded-full border border-[rgba(37,88,180,0.28)] bg-white/80 px-4 py-1 text-[11px] uppercase tracking-[0.32em] text-[#214b9a]">
                  {payload.hero.badge}
                </p>
                <h2 className="mt-6 max-w-4xl font-[var(--font-display)] text-4xl leading-[1.05] text-[#1d1712] md:text-6xl">
                  {payload.hero.headline}
                </h2>
                <p className="mt-4 max-w-3xl text-base text-[color:var(--muted)] md:text-lg">
                  {payload.hero.subheadline}
                </p>
                <p className="mt-6 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
                  {payload.hero.description}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-full bg-[#1d4da7] px-6 py-3 text-sm text-white shadow-[0_12px_30px_rgba(29,77,167,0.32)] transition hover:brightness-95"
                    onClick={() => router.push(APP_ROUTES.contestList)}
                  >
                    콘테스트 바로 참여
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[rgba(29,77,167,0.28)] bg-white/75 px-6 py-3 text-sm text-[#1d4da7] transition hover:bg-white"
                    onClick={() => router.push(APP_ROUTES.galleryLobby)}
                  >
                    전시 큐레이션 보기
                  </button>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <article className="rounded-[18px] border border-[rgba(28,26,22,0.1)] bg-white/85 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Active Contest
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#1f1913]">
                      {activeContests.length}
                    </p>
                  </article>
                  <article className="rounded-[18px] border border-[rgba(28,26,22,0.1)] bg-white/85 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Featured Museum
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#1f1913]">
                      {featuredMuseums.length}
                    </p>
                  </article>
                  <article className="rounded-[18px] border border-[rgba(28,26,22,0.1)] bg-white/85 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Works Curated
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#1f1913]">
                      {formatNumber(totalFeaturedWorks)}
                    </p>
                  </article>
                  <article className="rounded-[18px] border border-[rgba(28,26,22,0.1)] bg-white/85 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Nearest Event
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#1f1913]">
                      {nearestContestDays === null
                        ? "-"
                        : nearestContestDays <= 0
                          ? "LIVE"
                          : `D-${nearestContestDays}`}
                    </p>
                  </article>
                  <article className="rounded-[18px] border border-[rgba(28,26,22,0.1)] bg-white/85 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Quick Access
                    </p>
                    <button
                      type="button"
                      className="mt-2 rounded-full border border-[rgba(29,77,167,0.34)] px-3 py-1.5 text-xs text-[#1d4da7] transition hover:bg-[rgba(29,77,167,0.08)]"
                      onClick={() => router.push(APP_ROUTES.galleryMyMuseums)}
                    >
                      내 뮤지엄
                    </button>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-[rgba(28,26,22,0.14)] bg-white/90 px-7 py-10 shadow-[var(--shadow)] md:px-10">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#4d6288]">
                  Creative Loop
                </p>
                <h3 className="mt-3 font-[var(--font-display)] text-3xl text-[#1b2233]">
                  작품 등록부터 전시 감상까지 한 번에 연결됩니다.
                </h3>
                <p className="mt-3 text-sm text-[#5b6476]">
                  출품, 심사, 전시, 아카이빙까지 모든 단계를 한 화면 흐름으로
                  이어보세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-[#1d4da7] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                  onClick={() => router.push(APP_ROUTES.contestList)}
                >
                  콘테스트 시작하기
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[rgba(29,77,167,0.3)] px-6 py-3 text-sm text-[#1d4da7] transition hover:bg-[rgba(29,77,167,0.08)]"
                  onClick={() => router.push(APP_ROUTES.galleryMyMuseums)}
                >
                  내 뮤지엄 열기
                </button>
              </div>
            </div>
          </section>

          <section>
            <article className="overflow-hidden rounded-[34px] border border-[rgba(28,26,22,0.12)] bg-white/90 shadow-[var(--shadow)]">
              {heroPick ? (
                <div
                  className="relative h-full min-h-80 p-7 text-white md:p-9"
                  style={{
                    background: `linear-gradient(145deg, ${heroPick.colorFrom}, ${heroPick.colorTo})`,
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.34em] text-white/70">
                    Curator Sequence
                  </p>
                  <h3 className="mt-5 max-w-xl font-[var(--font-display)] text-4xl leading-tight">
                    {heroPick.title}
                  </h3>
                  <p className="mt-2 text-lg text-white/90">{heroPick.artist}</p>
                  <p className="mt-5 max-w-md text-sm leading-7 text-white/80">
                    오늘의 메인 전시는 한 작품에 집중해서 감상하는 방식으로
                    큐레이션되었습니다.
                  </p>
                  <button
                    type="button"
                    className="mt-8 rounded-full border border-white/45 bg-white/12 px-5 py-2.5 text-sm text-white transition hover:bg-white/20"
                    onClick={() => router.push(APP_ROUTES.galleryLobby)}
                  >
                    전시실로 이동
                  </button>
                </div>
              ) : (
                <div className="flex min-h-80 items-center justify-center p-8 text-sm text-[color:var(--muted)]">
                  전시 큐레이션 데이터가 아직 없습니다.
                </div>
              )}
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.03fr_0.97fr]">
            <article className="rounded-[32px] border border-[rgba(28,26,22,0.12)] bg-white/85 p-7 shadow-[var(--shadow)] md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Museum Program
                  </p>
                  <h3 className="mt-2 font-[var(--font-display)] text-3xl text-[#1d1712]">
                    Featured Museums
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-[rgba(29,77,167,0.28)] px-4 py-2 text-xs text-[#1d4da7] transition hover:bg-[rgba(29,77,167,0.08)]"
                  onClick={() => router.push(APP_ROUTES.galleryLobby)}
                >
                  전체 뮤지엄 보기
                </button>
              </div>
              <div className="mt-6 grid gap-4">
                {featuredMuseums.length > 0 ? (
                  featuredMuseums.map((museum, index) => (
                    <button
                      key={museum.museumId}
                      type="button"
                      className="group flex cursor-pointer items-center justify-between rounded-[20px] border border-[rgba(28,26,22,0.1)] bg-white px-4 py-4 text-left transition hover:border-[rgba(29,77,167,0.34)] hover:shadow-[0_10px_24px_rgba(29,77,167,0.12)]"
                      onClick={() => router.push(museumDetailRoute(museum.museumId))}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(29,77,167,0.1)] text-xs font-semibold text-[#1d4da7]">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#211b15]">
                            {museum.name}
                          </p>
                          <p className="text-xs text-[color:var(--muted)]">
                            {museum.ownerName}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-[color:var(--muted)]">
                        {formatNumber(museum.artworkCount)} works
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[color:var(--line)] bg-white/60 px-5 py-6 text-sm text-[color:var(--muted)]">
                    노출 중인 뮤지엄이 없습니다.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[32px] border border-[rgba(23,57,119,0.24)] bg-[linear-gradient(160deg,#f3f7ff_0%,#eef3fd_55%,#e8eefb_100%)] p-7 shadow-[0_18px_44px_rgba(23,57,119,0.14)] md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[#34569a]">
                    Contest Program
                  </p>
                  <h3 className="mt-2 font-[var(--font-display)] text-3xl text-[#1b2a4f]">
                    Active Contests
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-[rgba(29,77,167,0.34)] bg-white/80 px-4 py-2 text-xs text-[#1d4da7] transition hover:bg-white"
                  onClick={() => router.push(APP_ROUTES.contestList)}
                >
                  콘테스트 전체 보기
                </button>
              </div>
              <div className="mt-6 grid gap-4">
                {activeContests.length > 0 ? (
                  activeContests.map((contest) => (
                    <button
                      key={contest.id}
                      type="button"
                      className="group cursor-pointer rounded-[20px] border border-[rgba(23,57,119,0.16)] bg-white/90 p-5 text-left transition hover:border-[rgba(29,77,167,0.42)] hover:shadow-[0_10px_26px_rgba(23,57,119,0.17)]"
                      onClick={() => router.push(contestDetailRoute(contest.id))}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.32em] text-[#486ab0]">
                            Contest
                          </p>
                          <h4 className="mt-2 font-[var(--font-display)] text-2xl text-[#1d2437]">
                            {contest.theme}
                          </h4>
                          <p className="mt-2 text-xs text-[#5a6481]">{contest.period}</p>
                        </div>
                        <span className="rounded-full border border-[rgba(29,77,167,0.34)] bg-[rgba(29,77,167,0.08)] px-3 py-1 text-xs text-[#1d4da7]">
                          {contest.daysLeft <= 0 ? "진행 중" : `${contest.daysLeft}일 남음`}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <p className="rounded-full border border-[rgba(23,57,119,0.14)] px-3 py-1 text-xs text-[#4e5f8b]">
                          참가비 {formatNumber(contest.entryFee)}원
                        </p>
                        <p className="rounded-full border border-[rgba(23,57,119,0.14)] px-3 py-1 text-xs text-[#4e5f8b]">
                          상금풀 {formatNumber(contest.prizePool)}원
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <article
                    className="rounded-[20px] border border-dashed border-[rgba(23,57,119,0.24)] bg-white/70 px-5 py-6 text-sm text-[#5a6481]"
                  >
                    현재 진행 중인 콘테스트가 없습니다.
                  </article>
                )}
              </div>
            </article>
          </section>

        </main>
      ) : (
        <div className="mt-12 rounded-[28px] border border-[color:var(--line)] bg-white/80 px-6 py-8 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
          홈 데이터를 불러오지 못했습니다.
          {error ? ` (${error})` : ""}
        </div>
      )}
    </PageShell>
  );
}
