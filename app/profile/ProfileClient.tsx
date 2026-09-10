"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import ConfirmDialog from "../components/ConfirmDialog";
import QueryState from "../components/QueryState";
import WorkspaceNavigation from "../components/WorkspaceNavigation";
import ProfileEditor from "./ProfileEditor";
import MyExhibitions from "./MyExhibitions";
import useLogoutAction from "../hooks/useLogoutAction";
import { useRouter } from "next/navigation";
import { getContestList } from "../lib/contest";
import { deleteEntry, getMyEntriesPage } from "../lib/entries";
import { staggeredFadeUpMotion } from "../lib/motion";
import { getProfileSummary } from "../lib/profile";
import {
  getContestEntryStatusLabel,
  getContestEntryStatusTone,
} from "../lib/statusTheme";
import AdminActionButton from "../components/AdminActionButton";
import CinematicBottomNav from "../components/CinematicBottomNav";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const ENTRY_PAGE_SIZE = 5;

function buildPaginationTokens(totalPages: number, currentPage: number): number[] {
  const chunkSize = 5;
  const start = Math.floor((currentPage - 1) / chunkSize) * chunkSize + 1;
  const end = Math.min(start + chunkSize - 1, totalPages);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function ProfileClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { signOut, isSigningOut } = useLogoutAction();
  const [entriesPage, setEntriesPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profile", "summary"],
    queryFn: getProfileSummary,
  });
  const { data: entriesData, isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ["entries", "page", entriesPage, ENTRY_PAGE_SIZE],
    queryFn: () => getMyEntriesPage({ page: entriesPage, size: ENTRY_PAGE_SIZE }),
  });
  const { data: contestsData } = useQuery({
    queryKey: ["contests"],
    queryFn: getContestList,
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteEntry(entryId),
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      setDeleting(null);
      if (entriesData?.data.items.length === 1 && entriesPage > 1) setEntriesPage(entriesPage - 1);
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["contest"] });
      dispatch(showToast("출품이 삭제되었습니다."));
    },
    onError: () => {
      dispatch(showToast("출품 삭제에 실패했습니다."));
    },
  });

  const profile = data?.data ?? null;
  const error = data?.error;
  const entriesPageData = entriesData?.data;
  const entries = entriesPageData?.items ?? [];
  const entriesError = entriesData?.error;
  const contests = contestsData?.data ?? [];
  const totalEntryPages = Math.max(entriesPageData?.totalPages ?? 1, 1);
  const currentEntryPage = Math.min(Math.max(entriesPageData?.page ?? entriesPage, 1), totalEntryPages);
  const paginationTokens = useMemo(
    () => buildPaginationTokens(totalEntryPages, currentEntryPage),
    [currentEntryPage, totalEntryPages],
  );
  const renderEntriesPagination = (extraClassName = "") => (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 border-t border-[color:var(--line)] px-3 py-3 ${extraClassName}`.trim()}
    >
      <button
        type="button"
        className="min-h-10 border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--line-strong)] hover:text-white disabled:opacity-40"
        onClick={() => setEntriesPage(Math.max(1, currentEntryPage - 1))}
        disabled={currentEntryPage <= 1}
      >
        이전
      </button>
      {paginationTokens.map((token, index) =>
        <button
          key={`page-${token}-${index}`}
          type="button"
          aria-current={token === currentEntryPage ? "page" : undefined}
          className={`min-h-10 min-w-10 px-3 py-1.5 text-xs transition ${
            token === currentEntryPage
              ? "bg-[color:var(--accent)] font-bold text-[#111]"
              : "border border-[color:var(--line)] text-[color:var(--muted)] hover:text-white"
          }`}
          onClick={() => setEntriesPage(token)}
        >
          {token}
        </button>,
      )}
      <button
        type="button"
        className="min-h-10 border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--line-strong)] hover:text-white disabled:opacity-40"
        onClick={() => setEntriesPage(Math.min(totalEntryPages, currentEntryPage + 1))}
        disabled={currentEntryPage >= totalEntryPages}
      >
        다음
      </button>
    </div>
  );

  const handleNewEntry = () => {
    const submissionContest = contests.find((contest) => contest.phase === "SUBMISSION");
    if (submissionContest) {
      router.push(`/contest/${submissionContest.id}?tab=contest`);
      return;
    }
    dispatch(showToast("현재 출품 가능한 콘테스트가 없습니다. 목록으로 이동합니다."));
    router.push("/contest?tab=contest");
  };

  return (
    <div className="museum-grain relative min-h-screen overflow-x-hidden bg-[var(--canvas)] text-[color:var(--canvas-ink)]">

      <main id="main-content" tabIndex={-1} className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-40 pt-8 md:px-8">
        <motion.div className="mb-10" {...staggeredFadeUpMotion(0, reduceMotion)}>
          <OverviewStyleHeader title="나의 작가실" subtitle="Artist workspace" headingAs="p" />
        </motion.div>

        <WorkspaceNavigation />
        {isLoading ? (
          <section className="space-y-8">
            <div className="museum-panel p-7 md:p-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 " />
                <div className="grid gap-2">
                  <Skeleton className="h-8 w-40 " />
                  <Skeleton className="h-4 w-48 " />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="border-t border-[color:var(--line)] p-4">
                    <Skeleton className="h-3 w-16 " />
                    <Skeleton className="mt-3 h-6 w-20 " />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="museum-panel p-7 md:p-8">
                <Skeleton className="h-7 w-32 " />
                <SkeletonText className="mt-3 max-w-sm" lines={2} />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="border border-[color:var(--line)] p-4">
                      <Skeleton className="h-24 w-full " />
                      <Skeleton className="mt-3 h-4 w-24 " />
                      <Skeleton className="mt-2 h-6 w-2/3 " />
                    </div>
                  ))}
                </div>
              </div>

              <div className="museum-panel p-7 md:p-8">
                <Skeleton className="h-7 w-32 " />
                <SkeletonText className="mt-3 max-w-sm" lines={2} />
                <div className="mt-6 grid gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="border border-[color:var(--line)] p-4">
                      <Skeleton className="h-3 w-24 " />
                      <Skeleton className="mt-2 h-5 w-40 " />
                      <Skeleton className="mt-2 h-3 w-28 " />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : profile ? (
          <div className="space-y-8 pt-8">
            <motion.section
              className="museum-panel border-x-0 p-7 md:p-8"
              {...staggeredFadeUpMotion(1, reduceMotion)}
            >
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 "
                    style={{
                      background: `linear-gradient(135deg, ${profile.artist.profileColor}, #d8cbb4)`,
                    }}
                  />
                  <div>
                    <p className="museum-kicker">등록 작가</p>
                    <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[color:var(--canvas-ink)]">
                      {profile.artist.name}
                    </h1>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{profile.artist.tagline}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button type="button" onClick={() => setEditing(!editing)} className="museum-button-secondary px-4 py-2 text-xs">{editing ? "편집 닫기" : "프로필 편집"}</button>
                  {profile.artist.id > 0 ? <Link href={`/artists/${profile.artist.id}`} className="museum-button-secondary px-4 py-2 text-xs">공개 작가 페이지 ↗</Link> : null}
                  <AdminActionButton
                    variant="primary"
                    onClick={handleNewEntry}
                    className="text-xs"
                  >
                    새 출품하기
                  </AdminActionButton>
                  <AdminActionButton
                    variant="secondary"
                    onClick={() => router.push("/library?tab=history")}
                    className="text-xs"
                  >
                    관람 기록
                  </AdminActionButton>
                </div>
              </div>

              {editing ? <ProfileEditor artist={profile.artist} onSaved={() => setEditing(false)} /> : null}
              <dl className="mt-8 grid grid-cols-2 border-y border-[color:var(--line)] md:grid-cols-4">
                <div className="border-r border-[color:var(--line)] p-4 first:pl-0">
                  <dt className="text-xs text-[color:var(--muted)]">출품 작품</dt>
                  <dd className="mt-2 font-[var(--font-display)] text-2xl">
                    {formatNumber(profile.stats.totalWorks)}
                  </dd>
                </div>
                <div className="border-r border-[color:var(--line)] p-4">
                  <dt className="text-xs text-[color:var(--muted)]">수상</dt>
                  <dd className="mt-2 font-[var(--font-display)] text-2xl">
                    {formatNumber(profile.stats.totalAwards)}
                  </dd>
                </div>
                <div className="border-r border-[color:var(--line)] p-4">
                  <dt className="text-xs text-[color:var(--muted)]">누적 상금</dt>
                  <dd className="mt-2 font-[var(--font-display)] text-2xl">
                    {formatNumber(profile.stats.totalEarnings)}원
                  </dd>
                </div>
                <div className="p-4 pr-0">
                  <dt className="text-xs text-[color:var(--muted)]">팔로워</dt>
                  <dd className="mt-2 font-[var(--font-display)] text-2xl">
                    {formatNumber(profile.stats.followers)}
                  </dd>
                </div>
              </dl>
            </motion.section>

            <div className="grid gap-8 lg:grid-cols-2">
              <MyExhibitions />

              <motion.section
                className="museum-panel p-7 md:p-8"
                {...staggeredFadeUpMotion(3, reduceMotion)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="museum-kicker">Submission ledger</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-3xl">출품 기록</h2>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">제출한 작품과 심사 상태를 확인합니다.</p>
                  </div>
                  <div className="flex w-full flex-col items-end gap-2 sm:w-auto">
                    <div className="text-xs text-[color:var(--muted)]">
                      총 {formatNumber(entriesPageData?.totalElements ?? 0)}개 · 페이지 {currentEntryPage}/
                      {totalEntryPages}
                    </div>
                    {renderEntriesPagination("w-full sm:w-auto")}
                  </div>
                </div>

                {entriesLoading ? (
                  <div className="mt-6 grid gap-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="border border-[color:var(--line)] p-4">
                        <Skeleton className="h-14 w-14 " />
                        <Skeleton className="mt-3 h-4 w-40 " />
                        <Skeleton className="mt-2 h-3 w-28 " />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {entriesError ? <QueryState kind="error" title="출품 기록을 불러오지 못했습니다" retry={() => void refetchEntries()} /> : entries.length === 0 ? (
                      <div className="mt-6 border border-dashed border-[color:var(--line)] p-6 text-sm text-[color:var(--muted)]">
                        아직 제출한 출품이 없습니다.
                      </div>
                    ) : (
                      <div className="mt-6 grid gap-4">
                        {entries.map((entry, index) => (
                          <motion.div
                            key={entry.entryId}
                            {...staggeredFadeUpMotion(index + 6, reduceMotion)}
                            className="flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--line)] py-4"
                          >
                            <div className="flex items-center gap-4">
                              {entry.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={entry.imageUrl}
                                  alt={entry.title ?? entry.contestTheme}
                                  className="h-14 w-14  object-cover"
                                />
                              ) : (
                                <div className="h-14 w-14  bg-white/16" />
                              )}
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--accent)]">
                                  {entry.contestTheme}
                                </p>
                                <p className="mt-1 text-sm font-semibold">
                                  {entry.title ?? "Untitled"}
                                </p>
                                <p className="mt-1 text-xs text-[color:var(--muted)]">제출일 {entry.submittedAt}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
                              <span
                                className={` border px-3 py-1 text-xs ${
                                  getContestEntryStatusTone(entry.status).chipClass
                                }`}
                              >
                                {getContestEntryStatusLabel(entry.status)}
                              </span>
                              <Link href={`/contest/${entry.contestId}`} className="min-h-11 py-3 text-[var(--accent)]">공모전 보기</Link>
                              {entry.status === "SUBMITTED" && contests.some((item) => item.id === entry.contestId && item.phase === "SUBMISSION") ? <button
                                type="button"
                                className="min-h-10 border border-[color:var(--line)] px-3 py-1 text-xs transition hover:border-[color:var(--danger)] hover:text-[color:var(--danger)] disabled:opacity-60"
                                onClick={() => setDeleting(entry.entryId)}
                                disabled={deleteMutation.isPending}
                              >
                                출품 취소
                              </button> : null}
                            </div>
                          </motion.div>
                        ))}

                        {renderEntriesPagination("mt-2")}
                      </div>
                    )}
                  </>
                )}
              </motion.section>
            </div>

            <motion.section
              className="museum-panel p-7 md:p-8"
              {...staggeredFadeUpMotion(4, reduceMotion)}
            >
              <p className="museum-kicker">Distinctions</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl">수상 기록</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">콘테스트에서 남긴 공식 기록입니다.</p>
              <div className="mt-6 grid gap-4">
                {profile.awards.length === 0 ? <p className="py-6 text-sm text-[var(--muted)]">확정된 수상 결과가 이곳에 쌓입니다.</p> : null}
                {profile.awards.map((award, index) => (
                  <motion.div
                    key={award.id}
                    {...staggeredFadeUpMotion(index + 12, reduceMotion)}
                    className="flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--line)] py-4"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)]">{award.rank}</p>
                      <p className="mt-2 font-semibold">{award.contest}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">{award.period}</p>
                    </div>
                    <span className="border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)]">
                      {award.prize}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        ) : (
          <QueryState kind="error" title="작가 기록을 불러오지 못했습니다" description={error} retry={() => void refetch()} />
        )}
        <div className="mt-8 flex justify-end border-t border-[var(--line)] pt-4"><button type="button" onClick={() => void signOut()} disabled={isSigningOut} className="min-h-11 text-sm text-[var(--muted)]">{isSigningOut ? "로그아웃 중" : "로그아웃"}</button></div>
      </main>

      <CinematicBottomNav activeTab="profile" layout="fixed" />
      <ConfirmDialog open={deleting !== null} title="출품을 취소할까요?" description="접수 기간의 심사 전 작품만 취소할 수 있습니다. 사용한 출품권 1개가 돌아오며, 결제 환불은 결제 내역에서 별도로 진행할 수 있습니다." confirmLabel="출품 취소" busy={deleteMutation.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting)} />
    </div>
  );
}
