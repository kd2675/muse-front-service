"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../../components/PageShell";
import TopNav from "../../../components/TopNav";
import { Skeleton, SkeletonText } from "../../../components/Skeleton";
import { getAccessToken } from "../../../lib/auth";
import { getContestDetail, getContestEntries, voteContestEntry } from "../../../lib/contest";
import { useBodyScrollLock } from "../../../lib/useBodyScrollLock";
import { useAppDispatch } from "../../../store/hooks";
import { setPendingPath, showToast } from "../../../store/uiSlice";

type ContestGalleryClientProps = {
  id: number;
};

export default function ContestGalleryClient({ id }: ContestGalleryClientProps) {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const requestedEntryId = searchParams.get("entryId");
  const [pendingVoteEntryId, setPendingVoteEntryId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(requestedEntryId);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const hasToken = Boolean(getAccessToken());

  useBodyScrollLock(isLightboxOpen);

  const { data: contestData, isLoading: contestLoading } = useQuery({
    queryKey: ["contest", id],
    queryFn: () => getContestDetail(id),
  });
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["contest", id, "entries"],
    queryFn: () => getContestEntries(id),
  });

  const contest = contestData?.data;
  const contestError = contestData?.error;
  const entries = useMemo(() => entriesData?.data ?? [], [entriesData?.data]);
  const entriesError = entriesData?.error;
  const isVoting = contest?.phase === "VOTING";
  const canVote = Boolean(hasToken && isVoting);
  const focusEntryId = selectedEntryId ?? requestedEntryId;
  const requestedIndex = focusEntryId ? entries.findIndex((entry) => entry.entryId === focusEntryId) : -1;
  const safeCurrentIndex = entries.length === 0 ? 0 : requestedIndex >= 0 ? requestedIndex : 0;
  const currentEntry = entries[safeCurrentIndex] ?? null;

  const goPrev = () => {
    if (entries.length === 0) {
      return;
    }
    const nextIndex = safeCurrentIndex === 0 ? entries.length - 1 : safeCurrentIndex - 1;
    setSelectedEntryId(entries[nextIndex]?.entryId ?? null);
  };

  const goNext = () => {
    if (entries.length === 0) {
      return;
    }
    const nextIndex = safeCurrentIndex === entries.length - 1 ? 0 : safeCurrentIndex + 1;
    setSelectedEntryId(entries[nextIndex]?.entryId ?? null);
  };

  useEffect(() => {
    if (!isVoting) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        if (entries.length > 0) {
          const nextIndex = safeCurrentIndex === 0 ? entries.length - 1 : safeCurrentIndex - 1;
          setSelectedEntryId(entries[nextIndex]?.entryId ?? null);
        }
      }
      if (event.key === "ArrowRight") {
        if (entries.length > 0) {
          const nextIndex = safeCurrentIndex === entries.length - 1 ? 0 : safeCurrentIndex + 1;
          setSelectedEntryId(entries[nextIndex]?.entryId ?? null);
        }
      }
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [entries, isVoting, safeCurrentIndex]);

  const voteMutation = useMutation({
    mutationFn: (entryId: string) => voteContestEntry(id, { entryId }),
    onMutate: (entryId) => {
      setPendingVoteEntryId(entryId);
    },
    onSuccess: (result) => {
      if (result.error || !result.data) {
        dispatch(showToast(result.error ?? "투표에 실패했습니다."));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["contest", id, "entries"] });
      dispatch(showToast("선택이 반영되었습니다."));
    },
    onError: () => {
      dispatch(showToast("투표 중 오류가 발생했습니다."));
    },
    onSettled: () => {
      setPendingVoteEntryId(null);
    },
  });

  const requestLoginForVote = () => {
    dispatch(setPendingPath(`/contest/${id}/gallery?tab=contest`));
    dispatch(showToast("로그인 후 선택할 수 있습니다."));
  };

  return (
    <PageShell>
      <TopNav />

      {(contestLoading || entriesLoading) && (
        <section className="mt-10 rounded-[32px] border border-[rgba(149,128,102,0.22)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98)_0%,rgba(250,246,239,0.98)_100%)] p-8 shadow-[0_24px_48px_rgba(79,58,34,0.1)] md:p-10">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="mt-4 h-12 w-2/3 rounded-[16px]" />
          <SkeletonText className="mt-4 max-w-xl" lines={2} />
          <div className="mt-10 rounded-[24px] border border-[rgba(149,128,102,0.2)] bg-white/88 p-5">
            <Skeleton className="h-[34rem] w-full rounded-[16px]" />
            <Skeleton className="mt-4 h-4 w-1/3 rounded-full" />
            <Skeleton className="mt-2 h-3 w-1/2 rounded-full" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-12 rounded-full" />
              <Skeleton className="h-12 rounded-full" />
            </div>
          </div>
        </section>
      )}

      {!contestLoading && !entriesLoading && (
        <>
          {!contest && (
            <section className="mt-10 rounded-[24px] border border-[color:var(--line)] bg-white/85 px-6 py-5 text-sm text-[color:var(--muted)]">
              콘테스트 정보를 불러오지 못했습니다.
              {contestError ? ` (${contestError})` : ""}
            </section>
          )}

          {contest && !isVoting && (
            <section className="mt-10 rounded-[32px] border border-[rgba(149,128,102,0.22)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98)_0%,rgba(250,246,239,0.98)_100%)] p-8 shadow-[0_24px_48px_rgba(79,58,34,0.1)] md:p-10">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a6a47]">Curated Exhibition</p>
              <h2 className="mt-4 font-[var(--font-display)] text-4xl text-[#2c2014]">전시 세션 준비 중</h2>
              <p className="mt-3 text-sm text-[#5f4a35]">
                현재 상태는 <strong>{contest.phase}</strong> 입니다. 전시 중 상태에서 작품 집중 관람 페이지가 열립니다.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/contest/${id}?tab=contest`}
                  className="rounded-full border border-[rgba(149,128,102,0.32)] bg-white/92 px-5 py-3 text-sm text-[#5f4a35] transition hover:bg-[rgba(248,241,232,0.95)]"
                >
                  상세로 돌아가기
                </Link>
                <Link
                  href="/contest?tab=contest"
                  className="rounded-full border border-[rgba(149,128,102,0.28)] px-5 py-3 text-sm text-[#79614a] transition hover:border-[rgba(149,128,102,0.45)]"
                >
                  콘테스트 목록
                </Link>
              </div>
            </section>
          )}

          {contest && isVoting && (
            <>
              <section className="mt-10 rounded-[34px] border border-[rgba(149,128,102,0.22)] bg-[linear-gradient(180deg,rgba(255,253,249,0.99)_0%,rgba(250,246,239,0.99)_100%)] p-8 shadow-[0_28px_56px_rgba(79,58,34,0.12)] md:p-10">
                <p className="inline-flex rounded-full border border-[rgba(149,128,102,0.28)] bg-white/92 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#8a6a47]">
                  Curated Exhibition
                </p>
                <h1 className="mt-5 font-[var(--font-display)] text-4xl leading-tight text-[#23180f] md:text-6xl">{contest.theme}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5f4a35]">
                  한 작품에 집중해 감상하는 전시 모드입니다. 다음/이전으로 이동하며 작품을 비교한 뒤 원하는 작품을 선택하세요.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-xs text-[#6f5841]">
                  <span className="rounded-full border border-[rgba(149,128,102,0.28)] bg-white/90 px-3 py-1.5">
                    Work {entries.length === 0 ? "0/0" : `${safeCurrentIndex + 1}/${entries.length}`}
                  </span>
                  <span className="rounded-full border border-[rgba(149,128,102,0.28)] bg-white/90 px-3 py-1.5">
                    Session {formatSchedule(contest.votingStartAt)} - {formatSchedule(contest.votingEndAt)}
                  </span>
                  <Link
                    href={`/contest/${id}?tab=contest`}
                    className="rounded-full border border-[rgba(149,128,102,0.32)] bg-white/92 px-3 py-1.5 transition hover:bg-[rgba(248,241,232,0.95)]"
                  >
                    상세 화면
                  </Link>
                </div>
              </section>

              {entriesError && (
                <section className="mt-6 rounded-[18px] border border-[rgba(149,128,102,0.24)] bg-[rgba(255,250,244,0.95)] px-5 py-3 text-xs text-[#79614a]">
                  작품 목록을 불러오지 못했습니다.
                  {entriesError ? ` (${entriesError})` : ""}
                </section>
              )}

              {entries.length === 0 ? (
                <section className="mt-9 rounded-[20px] border border-[rgba(149,128,102,0.24)] bg-[rgba(255,250,244,0.95)] px-6 py-5 text-sm text-[#79614a]">
                  전시 중인 작품이 아직 없습니다.
                </section>
              ) : (
                <section className="mt-9">
                  {currentEntry && (
                    <article
                      key={currentEntry.entryId}
                      className="gallery-focus-stage rounded-[28px] border border-[rgba(149,128,102,0.24)] bg-[rgba(255,252,247,0.96)] p-6 shadow-[0_20px_42px_rgba(79,58,34,0.12)]"
                    >
                      <button
                        className="group block w-full rounded-[18px] border border-[rgba(149,128,102,0.2)] bg-white/90 p-2 text-left"
                        onClick={() => setIsLightboxOpen(true)}
                      >
                        <div className="gallery-focus-media overflow-hidden rounded-[14px]">
                          {currentEntry.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={currentEntry.imageUrl}
                              alt={currentEntry.title ?? "contest entry"}
                              className="h-[34rem] w-full object-cover transition duration-500 group-hover:scale-[1.012]"
                            />
                          ) : (
                            <div className="h-[34rem] w-full bg-[rgba(238,226,210,0.9)]" />
                          )}
                        </div>
                      </button>

                      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-[#8a6a47]">Work {String(safeCurrentIndex + 1).padStart(2, "0")}</p>
                          <h3 className="mt-1 text-2xl font-semibold text-[#23180f]">{currentEntry.title ?? "Untitled"}</h3>
                          <p className="mt-2 text-sm text-[#725b45]">{currentEntry.artistName}</p>
                          <p className="mt-2 text-xs text-[#8a6d52]">이미지를 클릭하면 전체화면으로 감상할 수 있습니다.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-[rgba(149,128,102,0.3)] bg-white/94 px-4 py-2.5 text-sm text-[#644d38] transition hover:bg-[rgba(248,241,232,0.95)]"
                            onClick={goPrev}
                          >
                            이전 작품
                          </button>
                          <button
                            className="rounded-full border border-[rgba(149,128,102,0.3)] bg-white/94 px-4 py-2.5 text-sm text-[#644d38] transition hover:bg-[rgba(248,241,232,0.95)]"
                            onClick={goNext}
                          >
                            다음 작품
                          </button>
                        </div>
                      </div>

                      <div className="mt-5">
                        {canVote ? (
                          <button
                            className="w-full rounded-full border border-[rgba(149,128,102,0.34)] bg-white/94 px-4 py-3 text-sm text-[#5f4a35] transition hover:bg-[rgba(248,241,232,0.96)] disabled:opacity-60"
                            onClick={() => voteMutation.mutate(currentEntry.entryId)}
                            disabled={Boolean(pendingVoteEntryId)}
                          >
                            {pendingVoteEntryId === currentEntry.entryId ? "선택 중..." : "이 작품 선택"}
                          </button>
                        ) : (
                          <div className="grid gap-2">
                            <button
                              className="w-full rounded-full border border-[rgba(149,128,102,0.3)] bg-white/92 px-4 py-3 text-sm text-[#6c5440]"
                              onClick={requestLoginForVote}
                            >
                              로그인 후 선택 가능
                            </button>
                            <Link
                              href="/login"
                              className="w-full rounded-full border border-[rgba(149,128,102,0.3)] px-4 py-2 text-center text-xs text-[#7f6650] transition hover:bg-[rgba(248,241,232,0.95)]"
                            >
                              로그인하러 가기
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}

      {isLightboxOpen && currentEntry && (
        <div className="lightbox-enter fixed inset-0 z-50 bg-[rgba(14,10,7,0.92)] p-4 md:p-8">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
            <div className="mb-4 flex items-center justify-between gap-3 text-[#efe5d7]">
              <p className="text-xs uppercase tracking-[0.28em]">Full Screen View</p>
              <button
                className="rounded-full border border-[rgba(240,223,199,0.45)] px-4 py-2 text-sm text-[#efe5d7] transition hover:bg-[rgba(240,223,199,0.12)]"
                onClick={() => setIsLightboxOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[22px] border border-[rgba(240,223,199,0.24)] bg-[rgba(23,17,12,0.7)]">
              {currentEntry.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentEntry.imageUrl} alt={currentEntry.title ?? "contest entry"} className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full bg-[rgba(59,45,31,0.66)]" />
              )}

              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-[rgba(240,223,199,0.42)] bg-[rgba(35,26,18,0.66)] px-3 py-2 text-sm text-[#efe5d7] transition hover:bg-[rgba(57,43,30,0.76)]"
                onClick={goPrev}
              >
                이전
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-[rgba(240,223,199,0.42)] bg-[rgba(35,26,18,0.66)] px-3 py-2 text-sm text-[#efe5d7] transition hover:bg-[rgba(57,43,30,0.76)]"
                onClick={goNext}
              >
                다음
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[#e3d3bf]">
              <div>
                <p className="text-sm font-semibold">{currentEntry.title ?? "Untitled"}</p>
                <p className="text-xs opacity-90">{currentEntry.artistName}</p>
              </div>
              <span className="rounded-full border border-[rgba(240,223,199,0.34)] px-3 py-1 text-xs">
                {entries.length === 0 ? "0/0" : `${safeCurrentIndex + 1}/${entries.length}`}
              </span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .gallery-focus-stage {
          animation: gallery-focus-enter 420ms ease both;
        }

        .gallery-focus-media {
          background: linear-gradient(180deg, rgba(255, 253, 249, 0.7) 0%, rgba(243, 234, 222, 0.6) 100%);
        }

        .lightbox-enter {
          animation: lightbox-fade 240ms ease both;
        }

        @keyframes gallery-focus-enter {
          from {
            opacity: 0;
            transform: translateY(8px);
            filter: blur(1.5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes lightbox-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gallery-focus-stage,
          .lightbox-enter {
            animation: none !important;
          }
        }
      `}</style>
    </PageShell>
  );
}

function formatSchedule(value?: string | null): string {
  if (!value) {
    return "TBD";
  }
  return value.replace("T", " ").slice(0, 16);
}
