"use client";

import { useQuery } from "@tanstack/react-query";
import { getHomeData } from "../lib/home";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";
import TopNav from "../components/TopNav";
import PageShell from "../components/PageShell";
import { Skeleton, SkeletonText } from "../components/Skeleton";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export default function HomeClient() {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useQuery({
    queryKey: ["home"],
    queryFn: getHomeData,
  });

  const payload = data?.data ?? null;
  const error = data?.error;

  return (
    <PageShell>
      <TopNav />
      {isLoading ? (
        <div className="mt-12 grid gap-10">
          <div className="rounded-[32px] border border-[color:var(--line)] bg-white/70 p-10 shadow-[var(--shadow)] backdrop-blur">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="mt-6 h-10 w-4/5 rounded-[18px]" />
            <SkeletonText className="mt-4" lines={3} />
            <div className="mt-8 flex flex-wrap gap-3">
              <Skeleton className="h-12 w-40 rounded-full" />
              <Skeleton className="h-12 w-36 rounded-full" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-36 rounded-[28px]" />
            <Skeleton className="h-36 rounded-[28px]" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="h-52 rounded-[24px]"
              />
            ))}
          </div>
        </div>
      ) : payload ? (
        <>
          <section className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[32px] border border-[color:var(--line)] bg-white/70 p-10 shadow-[var(--shadow)] backdrop-blur">
              <span className="inline-flex items-center rounded-full bg-[color:var(--chip)] px-4 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)]">
                {payload.hero.badge}
              </span>
              <h2 className="mt-6 font-[var(--font-display)] text-4xl leading-tight text-[color:var(--canvas-ink)] md:text-5xl">
                {payload.hero.headline}
              </h2>
              <p className="mt-4 text-lg text-[color:var(--muted)]">
                {payload.hero.subheadline}
              </p>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
                {payload.hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-[color:var(--canvas-ink)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] transition hover:opacity-90"
                  onClick={() =>
                    dispatch(showToast("콘테스트 참여 기능은 준비 중입니다."))
                  }
                >
                  이번 콘테스트 참여하기
                </button>
                <button
                  className="rounded-full border border-[color:var(--line)] px-5 py-3 text-sm text-[color:var(--canvas-ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  onClick={() =>
                    dispatch(showToast("갤러리 이동 기능은 준비 중입니다."))
                  }
                >
                  갤러리 감상하기
                </button>
              </div>
            </div>
            <div className="grid gap-4">
              {payload.todaysPick.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-[28px] p-6 text-white shadow-[var(--shadow)]"
                  style={{
                    background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})`,
                  }}
                >
                  <div className="text-xs uppercase tracking-[0.4em] opacity-80">
                    {item.category}
                  </div>
                  <h3 className="mt-6 font-[var(--font-display)] text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm opacity-90">{item.artist}</p>
                  <p className="mt-6 text-xs opacity-80">{item.camera}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-[var(--font-display)] text-2xl">
                  Today’s Pick
                </h3>
                <p className="text-sm text-[color:var(--muted)]">
                  AI가 선별한 오늘의 감상 컬렉션
                </p>
              </div>
            <button
              className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              onClick={() =>
                dispatch(showToast("전체 보기 기능은 준비 중입니다."))
              }
            >
              전체 보기
            </button>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {payload.todaysPick.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5 shadow-[var(--shadow)]"
                >
                  <div
                    className="h-28 w-full rounded-[18px]"
                    style={{
                      background: `linear-gradient(140deg, ${item.colorFrom}, ${item.colorTo})`,
                    }}
                  />
                  <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>{item.category}</span>
                    <span>{item.camera}</span>
                  </div>
                  <h4 className="mt-3 font-[var(--font-display)] text-lg">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {item.artist}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-16 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <h3 className="font-[var(--font-display)] text-2xl">
                Gallery Categories
              </h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                영구 전시로 이어지는 테마별 전시실
              </p>
              <div className="mt-6 grid gap-4">
                {payload.galleryCategories.map((category) => (
                  <div
                    key={category.key}
                    className="flex items-center justify-between rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-[16px]"
                        style={{
                          background: `linear-gradient(135deg, ${category.colorFrom}, ${category.colorTo})`,
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          {category.title}
                        </p>
                        <p className="text-xs text-[color:var(--muted)]">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[color:var(--muted)]">
                      {formatNumber(category.itemCount)} pieces
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between">
                <h3 className="font-[var(--font-display)] text-2xl">
                  Active Contests
                </h3>
                <button
                  className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  onClick={() =>
                    dispatch(showToast("참가 기능은 준비 중입니다."))
                  }
                >
                  참가하기
                </button>
              </div>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                경쟁과 보상이 동시에 진행되는 주간/월간 테마
              </p>
              <div className="mt-6 grid gap-4">
                {payload.activeContests.map((contest) => (
                  <article
                    key={contest.id}
                    className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                          Contest
                        </p>
                        <h4 className="mt-2 font-[var(--font-display)] text-xl">
                          {contest.theme}
                        </h4>
                        <p className="mt-2 text-xs text-[color:var(--muted)]">
                          {contest.period}
                        </p>
                      </div>
                      <span className="rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                        {contest.daysLeft}일 남음
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
                      <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                        참가비 {formatNumber(contest.entryFee)}원
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                        상금풀 {formatNumber(contest.prizePool)}원
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-16 rounded-[32px] border border-[color:var(--line)] bg-[color:var(--canvas-ink)] px-8 py-10 text-white shadow-[var(--shadow)]">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] opacity-70">
                  Curated + Rewarded
                </p>
                <h3 className="mt-3 font-[var(--font-display)] text-3xl">
                  당신의 작품을 경쟁과 전시로 증명하세요.
                </h3>
                <p className="mt-3 text-sm opacity-80">
                  참가비는 품질을 보장하고, 상금은 창작 동기를 보상합니다.
                </p>
              </div>
            <button
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[color:var(--canvas-ink)]"
              onClick={() =>
                dispatch(showToast("시작하기 기능은 준비 중입니다."))
              }
            >
              지금 시작하기
            </button>
            </div>
          </section>
        </>
      ) : (
        <div className="mt-12 rounded-[28px] border border-[color:var(--line)] bg-white/70 px-6 py-8 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
          홈 데이터를 불러오지 못했습니다.
          {error ? ` (${error})` : ""}
        </div>
      )}
    </PageShell>
  );
}
