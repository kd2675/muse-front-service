"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CinematicBottomNav from "../../../components/CinematicBottomNav";
import OverviewStyleHeader from "../../../components/OverviewStyleHeader";
import { Skeleton, SkeletonText } from "../../../components/Skeleton";
import { getAccessToken } from "../../../lib/auth";
import { getContestDetail, getContestEntries, voteContestEntry } from "../../../lib/contest";
import { overlayFadeMotion, popInMotion, staggeredFadeUpMotion } from "../../../lib/motion";
import { navigateBack } from "../../../lib/navigation";
import { getContestPhaseLabel, getContestPhaseTone } from "../../../lib/statusTheme";
import { useBodyScrollLock } from "../../../hooks/useBodyScrollLock";
import { useDialogAccessibility } from "../../../hooks/useDialogAccessibility";
import { useAppDispatch } from "../../../store/hooks";
import { setPendingPath, showToast } from "../../../store/uiSlice";

type ContestGalleryClientProps = {
  id: number;
};

export default function ContestGalleryClient({ id }: ContestGalleryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const requestedEntryId = searchParams.get("entryId");
  const hasToken = Boolean(getAccessToken());

  const [pendingVoteEntryId, setPendingVoteEntryId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(requestedEntryId);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxDialogRef = useDialogAccessibility(
    isLightboxOpen,
    () => setIsLightboxOpen(false),
    false,
  );

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

  useEffect(() => {
    setSelectedEntryId(requestedEntryId);
  }, [requestedEntryId]);

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
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
        return;
      }
      if (isLightboxOpen) {
        return;
      }
      if (event.key === "ArrowLeft") {
        goPrev();
      }
      if (event.key === "ArrowRight") {
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  });

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
    router.push("/login");
  };

  const goBackToDetail = () => {
    navigateBack(router, `/contest/${id}?tab=contest`);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_9%_8%,rgba(110,132,162,0.2),transparent_35%),radial-gradient(circle_at_86%_14%,rgba(157,128,82,0.18),transparent_40%),radial-gradient(circle_at_56%_82%,rgba(90,87,84,0.2),transparent_42%)]" />

      <main id="main-content" tabIndex={-1} className="relative mx-auto w-full max-w-5xl px-6 pb-44 pt-8">
        <motion.div className="mb-4" {...staggeredFadeUpMotion(0, reduceMotion)}>
          <OverviewStyleHeader title="공모전 전시" subtitle="Focused viewing" headingAs="p" />
        </motion.div>

        <motion.div
          className="mb-5 flex items-center justify-between"
          {...staggeredFadeUpMotion(1, reduceMotion)}
        >
          <button
            type="button"
            onClick={goBackToDetail}
            className="flex h-10 w-10 items-center justify-center  border border-white/14 text-slate-400 transition hover:border-white/28 hover:text-white"
            aria-label="상세로 돌아가기"
          >
            <span aria-hidden="true" className="text-xl">←</span>
          </button>

          <div className=" border border-[#c0a062]/45 bg-[#c0a062]/18 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#f8e6be]">
            Exhibition Focus
          </div>

        </motion.div>

        {(contestLoading || entriesLoading) && (
          <section className="space-y-6">
            <div className=" border border-white/10 bg-white/6 p-8">
              <Skeleton className="h-8 w-2/5 " />
              <SkeletonText className="mt-4 max-w-xl" lines={2} />
            </div>
            <div className=" border border-white/10 bg-white/6 p-5">
              <Skeleton className="h-[34rem] w-full " />
              <Skeleton className="mt-4 h-5 w-1/3 " />
            </div>
          </section>
        )}

        {!contestLoading && !entriesLoading && (
          <>
            {!contest && (
              <section className=" border border-rose-300/35 bg-rose-300/10 px-5 py-4 text-sm text-rose-100">
                콘테스트 정보를 불러오지 못했습니다. {contestError ?? ""}
              </section>
            )}

            {contest && !isVoting && (
              <motion.section
                className=" border border-white/10 bg-[rgba(18,18,18,0.74)] p-7 shadow-[0_24px_56px_rgba(0,0,0,0.34)] backdrop-blur-md md:p-9"
                {...staggeredFadeUpMotion(1, reduceMotion)}
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#c0a062]">Curated Exhibition</p>
                <h2 className="mt-4 font-[var(--font-display)] text-4xl text-slate-100">전시 세션 준비 중</h2>
                <p className="mt-3 text-sm text-slate-300">
                  현재 상태는 <strong>{getContestPhaseLabel(contest.phase)}</strong> 입니다. 전시 상태에서 작품 집중 관람 페이지가 열립니다.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href={`/contest/${id}?tab=contest`}
                    className=" border border-white/20 bg-white/6 px-5 py-3 text-sm text-slate-200 transition hover:bg-white/12"
                  >
                    상세로 돌아가기
                  </Link>
                  <Link
                    href="/contest?tab=contest"
                    className=" border border-white/16 px-5 py-3 text-sm text-slate-300 transition hover:border-white/28 hover:text-white"
                  >
                    콘테스트 목록
                  </Link>
                </div>
              </motion.section>
            )}

            {contest && isVoting && (
              <>
                <motion.section
                  className=" border border-white/10 bg-[rgba(18,18,18,0.74)] p-7 shadow-[0_24px_56px_rgba(0,0,0,0.34)] backdrop-blur-md md:p-9"
                  {...staggeredFadeUpMotion(1, reduceMotion)}
                >
                  <p
                    className={`inline-flex  border px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${
                      getContestPhaseTone("VOTING").chipClass
                    }`}
                  >
                    Curated Exhibition
                  </p>
                  <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight text-slate-100 md:text-5xl">
                    {contest.theme}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm text-slate-300">
                    한 작품에 집중해 감상하고, 좌우 이동으로 다음 작품을 비교할 수 있습니다.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 text-xs">
                    <span className=" border border-white/18 bg-white/[0.03] px-3 py-1.5 text-slate-300">
                      Work {entries.length === 0 ? "0/0" : `${safeCurrentIndex + 1}/${entries.length}`}
                    </span>
                    <span className=" border border-white/18 bg-white/[0.03] px-3 py-1.5 text-slate-300">
                      전시 기간 {formatSchedule(contest.votingStartAt)} - {formatSchedule(contest.votingEndAt)}
                    </span>
                  </div>
                </motion.section>

                {entriesError && (
                  <section className="mt-6  border border-rose-300/35 bg-rose-300/10 px-5 py-3 text-xs text-rose-100">
                    작품 목록을 불러오지 못했습니다. {entriesError}
                  </section>
                )}

                {entries.length === 0 ? (
                  <section className="mt-8  border border-white/12 bg-white/[0.03] px-6 py-5 text-sm text-slate-300">
                    전시 중인 작품이 아직 없습니다.
                  </section>
                ) : (
                  <section className="mt-8">
                    {currentEntry && (
                      <motion.article
                        key={currentEntry.entryId}
                        {...staggeredFadeUpMotion(2, reduceMotion)}
                        className=" border border-white/12 bg-[rgba(20,20,22,0.92)] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
                      >
                        <button
                          type="button"
                          onClick={() => setIsLightboxOpen(true)}
                          className="group block w-full  border border-white/12 bg-black/20 p-2 text-left"
                        >
                          <div className="overflow-hidden ">
                            {currentEntry.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={currentEntry.imageUrl}
                                alt={currentEntry.title ?? "contest entry"}
                                className="h-[62vh] min-h-[420px] w-full object-cover transition duration-500 group-hover:scale-[1.01]"
                              />
                            ) : (
                              <div className="h-[62vh] min-h-[420px] w-full bg-[linear-gradient(160deg,rgba(32,32,34,0.9),rgba(24,24,26,0.92))]" />
                            )}
                          </div>
                        </button>

                        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-[#c0a062]">
                              Work {String(safeCurrentIndex + 1).padStart(2, "0")}
                            </p>
                            <h3 className="mt-1 text-3xl text-slate-100">{currentEntry.title ?? "Untitled"}</h3>
                            <p className="mt-2 text-sm text-slate-300">{currentEntry.artistName}</p>
                            <p className="mt-2 text-xs text-slate-500">이미지를 클릭하면 전체 화면으로 감상합니다.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className=" border border-white/18 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
                              onClick={goPrev}
                            >
                              이전 작품
                            </button>
                            <button
                              type="button"
                              className=" border border-white/18 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
                              onClick={goNext}
                            >
                              다음 작품
                            </button>
                          </div>
                        </div>

                        <div className="mt-5">
                          {canVote ? (
                            <button
                              type="button"
                              className="w-full  border border-[#c0a062]/40 bg-[#c0a062]/14 px-4 py-3 text-sm text-[#f3dba5] transition hover:bg-[#c0a062]/22 disabled:opacity-60"
                              onClick={() => voteMutation.mutate(currentEntry.entryId)}
                              disabled={Boolean(pendingVoteEntryId)}
                            >
                              {pendingVoteEntryId === currentEntry.entryId ? "선택 중..." : "이 작품 선택"}
                            </button>
                          ) : (
                            <div className="grid gap-2">
                              <button
                                type="button"
                                className="w-full  border border-white/18 bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
                                onClick={requestLoginForVote}
                              >
                                로그인 후 선택 가능
                              </button>
                              <Link
                                href="/login"
                                className="w-full  border border-white/18 px-4 py-2 text-center text-xs text-slate-400 transition hover:border-white/30 hover:text-slate-200"
                              >
                                로그인하러 가기
                              </Link>
                            </div>
                          )}
                        </div>

                      </motion.article>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>

      <CinematicBottomNav activeTab="contest" layout="fixed" />

      <AnimatePresence>
        {isLightboxOpen && currentEntry && (
          <motion.div
            {...overlayFadeMotion(reduceMotion)}
            className="fixed inset-0 z-50 bg-[rgba(12,12,14,0.94)] p-4 md:p-8"
          >
            <motion.div
              ref={lightboxDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="contest-lightbox-title"
              tabIndex={-1}
              {...popInMotion(reduceMotion)}
              className="mx-auto flex h-full w-full max-w-7xl flex-col"
            >
              <div className="mb-4 flex items-center justify-between gap-3 text-slate-100">
                <p id="contest-lightbox-title" className="text-xs uppercase tracking-[0.28em] text-slate-300">Full Screen View</p>
                <button
                  type="button"
                  className=" border border-white/20 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  닫기
                </button>
              </div>

              <div className="relative flex-1 overflow-hidden  border border-white/16 bg-black/40">
                {currentEntry.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentEntry.imageUrl} alt={currentEntry.title ?? "contest entry"} className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(160deg,rgba(32,32,34,0.9),rgba(24,24,26,0.92))]" />
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-slate-200">
                <div>
                  <p className="text-sm font-semibold">{currentEntry.title ?? "Untitled"}</p>
                  <p className="text-xs text-slate-400">{currentEntry.artistName}</p>
                </div>
                <span className=" border border-white/20 px-3 py-1 text-xs text-slate-300">
                  {entries.length === 0 ? "0/0" : `${safeCurrentIndex + 1}/${entries.length}`}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatSchedule(value?: string | null): string {
  if (!value) {
    return "TBD";
  }
  return value.replace("T", " ").slice(0, 16);
}
