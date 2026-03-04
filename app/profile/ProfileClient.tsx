"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
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
  const [entriesPage, setEntriesPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", "summary"],
    queryFn: getProfileSummary,
  });
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["entries", "page"] });
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
      className={`flex flex-wrap items-center justify-center gap-2  bg-white/[0.05] px-3 py-3 ${extraClassName}`.trim()}
    >
      <button
        type="button"
        className=" bg-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/16 disabled:opacity-40"
        onClick={() => setEntriesPage(Math.max(1, currentEntryPage - 1))}
        disabled={currentEntryPage <= 1}
      >
        이전
      </button>
      {paginationTokens.map((token, index) =>
        <button
          key={`page-${token}-${index}`}
          type="button"
          className={`min-w-8  px-3 py-1.5 text-xs transition ${
            token === currentEntryPage
              ? "bg-white text-black"
              : "bg-white/10 text-slate-200 hover:bg-white/16"
          }`}
          onClick={() => setEntriesPage(token)}
        >
          {token}
        </button>,
      )}
      <button
        type="button"
        className=" bg-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/16 disabled:opacity-40"
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(84,90,111,0.22),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(73,108,115,0.18),transparent_36%),radial-gradient(circle_at_52%_82%,rgba(120,86,64,0.14),transparent_38%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-40 pt-8 md:px-8">
        <motion.div className="mb-8" {...staggeredFadeUpMotion(0, reduceMotion)}>
          <OverviewStyleHeader title="The Profile" />
        </motion.div>

        {isLoading ? (
          <section className="space-y-8">
            <div className=" bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 " />
                <div className="grid gap-2">
                  <Skeleton className="h-8 w-40 " />
                  <Skeleton className="h-4 w-48 " />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className=" bg-white/10 p-4">
                    <Skeleton className="h-3 w-16 " />
                    <Skeleton className="mt-3 h-6 w-20 " />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className=" bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8">
                <Skeleton className="h-7 w-32 " />
                <SkeletonText className="mt-3 max-w-sm" lines={2} />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className=" bg-white/10 p-4">
                      <Skeleton className="h-24 w-full " />
                      <Skeleton className="mt-3 h-4 w-24 " />
                      <Skeleton className="mt-2 h-6 w-2/3 " />
                    </div>
                  ))}
                </div>
              </div>

              <div className=" bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8">
                <Skeleton className="h-7 w-32 " />
                <SkeletonText className="mt-3 max-w-sm" lines={2} />
                <div className="mt-6 grid gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className=" bg-white/10 p-4">
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
          <div className="space-y-8">
            <motion.section
              className=" bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
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
                    <h2 className="font-[var(--font-display)] text-3xl text-slate-100">
                      {profile.artist.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300/84">{profile.artist.tagline}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AdminActionButton
                    variant="primary"
                    onClick={handleNewEntry}
                    className="text-xs"
                  >
                    새 출품하기
                  </AdminActionButton>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className=" bg-white/10 p-4">
                  <p className="text-xs text-slate-400">작품 수</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.totalWorks)}
                  </p>
                </div>
                <div className=" bg-white/10 p-4">
                  <p className="text-xs text-slate-400">수상</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.totalAwards)}
                  </p>
                </div>
                <div className=" bg-white/10 p-4">
                  <p className="text-xs text-slate-400">누적 상금</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.totalEarnings)}원
                  </p>
                </div>
                <div className=" bg-white/10 p-4">
                  <p className="text-xs text-slate-400">팔로워</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.followers)}
                  </p>
                </div>
              </div>
            </motion.section>

            <div className="grid gap-8 lg:grid-cols-2">
              <motion.section
                className=" bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
                {...staggeredFadeUpMotion(2, reduceMotion)}
              >
                <h3 className="font-[var(--font-display)] text-2xl text-slate-100">Portfolio</h3>
                <p className="mt-2 text-sm text-slate-300/84">대표 작품을 확인하세요.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {profile.portfolio.map((item, index) => (
                    <motion.article
                      key={item.id}
                      {...staggeredFadeUpMotion(index + 3, reduceMotion)}
                      className=" bg-white/10 p-4"
                    >
                      <div
                        className="h-24 w-full "
                        style={{
                          background: `linear-gradient(140deg, ${item.colorFrom}, ${item.colorTo})`,
                        }}
                      />
                      <div className="mt-3 text-xs text-slate-400">{item.category}</div>
                      <h4 className="mt-1 font-[var(--font-display)] text-lg text-slate-100">
                        {item.title}
                      </h4>
                    </motion.article>
                  ))}
                </div>
              </motion.section>

              <motion.section
                className=" bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
                {...staggeredFadeUpMotion(3, reduceMotion)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-[var(--font-display)] text-2xl text-slate-100">My Entries</h3>
                    <p className="mt-2 text-sm text-slate-300/84">제출한 출품을 관리하세요.</p>
                  </div>
                  <div className="flex w-full flex-col items-end gap-2 sm:w-auto">
                    <div className="text-xs text-slate-300/84">
                      총 {formatNumber(entriesPageData?.totalElements ?? 0)}개 · 페이지 {currentEntryPage}/
                      {totalEntryPages}
                    </div>
                    {renderEntriesPagination("w-full sm:w-auto")}
                  </div>
                </div>

                {entriesLoading ? (
                  <div className="mt-6 grid gap-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className=" bg-white/10 p-4">
                        <Skeleton className="h-14 w-14 " />
                        <Skeleton className="mt-3 h-4 w-40 " />
                        <Skeleton className="mt-2 h-3 w-28 " />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {entriesError && (
                      <div className="mt-4  bg-rose-300/18 px-4 py-2 text-xs text-rose-100">
                        출품 데이터를 불러오지 못했습니다.
                        {entriesError ? ` (${entriesError})` : ""}
                      </div>
                    )}
                    {entries.length === 0 ? (
                      <div className="mt-6  bg-white/10 p-6 text-sm text-slate-300/84">
                        아직 제출한 출품이 없습니다.
                      </div>
                    ) : (
                      <div className="mt-6 grid gap-4">
                        {entries.map((entry, index) => (
                          <motion.div
                            key={entry.entryId}
                            {...staggeredFadeUpMotion(index + 6, reduceMotion)}
                            className="flex flex-wrap items-center justify-between gap-4  bg-white/10 p-4"
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
                                <p className="text-xs uppercase tracking-[0.25em] text-cyan-100">
                                  {entry.contestTheme}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-100">
                                  {entry.title ?? "Untitled"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">제출일 {entry.submittedAt}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-300">
                              <span
                                className={` border px-3 py-1 text-xs ${
                                  getContestEntryStatusTone(entry.status).chipClass
                                }`}
                              >
                                {getContestEntryStatusLabel(entry.status)}
                              </span>
                              <button
                                type="button"
                                className=" bg-white/14 px-3 py-1 text-xs text-slate-200 transition hover:bg-rose-300/24 hover:text-rose-100 disabled:opacity-60"
                                onClick={() => deleteMutation.mutate(entry.entryId)}
                                disabled={deleteMutation.isPending}
                              >
                                삭제
                              </button>
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
              className=" bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
              {...staggeredFadeUpMotion(4, reduceMotion)}
            >
              <h3 className="font-[var(--font-display)] text-2xl text-slate-100">Awards</h3>
              <p className="mt-2 text-sm text-slate-300/84">콘테스트 수상 이력을 확인하세요.</p>
              <div className="mt-6 grid gap-4">
                {profile.awards.map((award, index) => (
                  <motion.div
                    key={award.id}
                    {...staggeredFadeUpMotion(index + 12, reduceMotion)}
                    className="flex flex-wrap items-center justify-between gap-4  bg-white/10 p-4"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">{award.rank}</p>
                      <p className="mt-2 font-semibold text-slate-100">{award.contest}</p>
                      <p className="mt-1 text-xs text-slate-400">{award.period}</p>
                    </div>
                    <span className=" bg-white/16 px-3 py-1 text-xs text-slate-200">
                      {award.prize}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        ) : (
          <div className=" bg-rose-300/18 px-6 py-6 text-sm text-rose-100">
            프로필 데이터를 불러오지 못했습니다.
            {error ? ` (${error})` : ""}
          </div>
        )}
      </main>

      <CinematicBottomNav activeTab="profile" layout="fixed" />
    </div>
  );
}
