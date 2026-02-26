"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { getContestList } from "../lib/contest";
import { deleteEntry, getMyEntries } from "../lib/entries";
import { staggeredFadeUpMotion } from "../lib/motion";
import { getProfileSummary } from "../lib/profile";
import CinematicBottomNav from "../components/CinematicBottomNav";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export default function ProfileClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", "summary"],
    queryFn: getProfileSummary,
  });
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: getMyEntries,
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
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      dispatch(showToast("출품이 삭제되었습니다."));
    },
    onError: () => {
      dispatch(showToast("출품 삭제에 실패했습니다."));
    },
  });

  const profile = data?.data ?? null;
  const error = data?.error;
  const entries = entriesData?.data ?? [];
  const entriesError = entriesData?.error;
  const contests = contestsData?.data ?? [];

  const statusLabel: Record<string, string> = {
    SUBMITTED: "제출 완료",
    REVIEWING: "검토 중",
    APPROVED: "승인",
    REJECTED: "반려",
  };

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
            <div className="rounded-[28px] bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-[20px]" />
                <div className="grid gap-2">
                  <Skeleton className="h-8 w-40 rounded-[16px]" />
                  <Skeleton className="h-4 w-48 rounded-full" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-[20px] bg-white/10 p-4">
                    <Skeleton className="h-3 w-16 rounded-full" />
                    <Skeleton className="mt-3 h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-[28px] bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8">
                <Skeleton className="h-7 w-32 rounded-[16px]" />
                <SkeletonText className="mt-3 max-w-sm" lines={2} />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-[22px] bg-white/10 p-4">
                      <Skeleton className="h-24 w-full rounded-[18px]" />
                      <Skeleton className="mt-3 h-4 w-24 rounded-full" />
                      <Skeleton className="mt-2 h-6 w-2/3 rounded-[14px]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8">
                <Skeleton className="h-7 w-32 rounded-[16px]" />
                <SkeletonText className="mt-3 max-w-sm" lines={2} />
                <div className="mt-6 grid gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-[20px] bg-white/10 p-4">
                      <Skeleton className="h-3 w-24 rounded-full" />
                      <Skeleton className="mt-2 h-5 w-40 rounded-full" />
                      <Skeleton className="mt-2 h-3 w-28 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : profile ? (
          <div className="space-y-8">
            <motion.section
              className="rounded-[28px] bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
              {...staggeredFadeUpMotion(1, reduceMotion)}
            >
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 rounded-[20px]"
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
                <button
                  type="button"
                  onClick={handleNewEntry}
                  className="rounded-full bg-cyan-300/22 px-4 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/32"
                >
                  새 출품하기
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-[20px] bg-white/10 p-4">
                  <p className="text-xs text-slate-400">작품 수</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.totalWorks)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-white/10 p-4">
                  <p className="text-xs text-slate-400">수상</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.totalAwards)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-white/10 p-4">
                  <p className="text-xs text-slate-400">누적 상금</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.totalEarnings)}원
                  </p>
                </div>
                <div className="rounded-[20px] bg-white/10 p-4">
                  <p className="text-xs text-slate-400">팔로워</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {formatNumber(profile.stats.followers)}
                  </p>
                </div>
              </div>
            </motion.section>

            <div className="grid gap-8 lg:grid-cols-2">
              <motion.section
                className="rounded-[28px] bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
                {...staggeredFadeUpMotion(2, reduceMotion)}
              >
                <h3 className="font-[var(--font-display)] text-2xl text-slate-100">Portfolio</h3>
                <p className="mt-2 text-sm text-slate-300/84">대표 작품을 확인하세요.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {profile.portfolio.map((item, index) => (
                    <motion.article
                      key={item.id}
                      {...staggeredFadeUpMotion(index + 3, reduceMotion)}
                      className="rounded-[22px] bg-white/10 p-4"
                    >
                      <div
                        className="h-24 w-full rounded-[18px]"
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
                className="rounded-[28px] bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
                {...staggeredFadeUpMotion(3, reduceMotion)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-[var(--font-display)] text-2xl text-slate-100">My Entries</h3>
                    <p className="mt-2 text-sm text-slate-300/84">제출한 출품을 관리하세요.</p>
                  </div>
                </div>

                {entriesLoading ? (
                  <div className="mt-6 grid gap-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="rounded-[20px] bg-white/10 p-4">
                        <Skeleton className="h-14 w-14 rounded-[14px]" />
                        <Skeleton className="mt-3 h-4 w-40 rounded-full" />
                        <Skeleton className="mt-2 h-3 w-28 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {entriesError && (
                      <div className="mt-4 rounded-[18px] bg-rose-300/18 px-4 py-2 text-xs text-rose-100">
                        출품 데이터를 불러오지 못했습니다.
                        {entriesError ? ` (${entriesError})` : ""}
                      </div>
                    )}
                    {entries.length === 0 ? (
                      <div className="mt-6 rounded-[20px] bg-white/10 p-6 text-sm text-slate-300/84">
                        아직 제출한 출품이 없습니다.
                      </div>
                    ) : (
                      <div className="mt-6 grid gap-4">
                        {entries.map((entry, index) => (
                          <motion.div
                            key={entry.entryId}
                            {...staggeredFadeUpMotion(index + 6, reduceMotion)}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-white/10 p-4"
                          >
                            <div className="flex items-center gap-4">
                              {entry.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={entry.imageUrl}
                                  alt={entry.title ?? entry.contestTheme}
                                  className="h-14 w-14 rounded-[14px] object-cover"
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-[14px] bg-white/16" />
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
                              <span className="rounded-full bg-white/16 px-3 py-1 text-xs text-slate-200">
                                {statusLabel[entry.status] ?? entry.status}
                              </span>
                              <button
                                type="button"
                                className="rounded-full bg-white/14 px-3 py-1 text-xs text-slate-200 transition hover:bg-rose-300/24 hover:text-rose-100 disabled:opacity-60"
                                onClick={() => deleteMutation.mutate(entry.entryId)}
                                disabled={deleteMutation.isPending}
                              >
                                삭제
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.section>
            </div>

            <motion.section
              className="rounded-[28px] bg-[rgba(40,40,46,0.72)] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.34)] md:p-8"
              {...staggeredFadeUpMotion(4, reduceMotion)}
            >
              <h3 className="font-[var(--font-display)] text-2xl text-slate-100">Awards</h3>
              <p className="mt-2 text-sm text-slate-300/84">콘테스트 수상 이력을 확인하세요.</p>
              <div className="mt-6 grid gap-4">
                {profile.awards.map((award, index) => (
                  <motion.div
                    key={award.id}
                    {...staggeredFadeUpMotion(index + 12, reduceMotion)}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-white/10 p-4"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">{award.rank}</p>
                      <p className="mt-2 font-semibold text-slate-100">{award.contest}</p>
                      <p className="mt-1 text-xs text-slate-400">{award.period}</p>
                    </div>
                    <span className="rounded-full bg-white/16 px-3 py-1 text-xs text-slate-200">
                      {award.prize}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        ) : (
          <div className="rounded-[28px] bg-rose-300/18 px-6 py-6 text-sm text-rose-100">
            프로필 데이터를 불러오지 못했습니다.
            {error ? ` (${error})` : ""}
          </div>
        )}
      </main>

      <CinematicBottomNav activeTab="profile" layout="fixed" />
    </div>
  );
}
