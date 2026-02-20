"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
import TopNav from "../components/TopNav";
import { getProfileSummary } from "../lib/profile";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { deleteEntry, getMyEntries } from "../lib/entries";
import { getContestList } from "../lib/contest";
import { showToast } from "../store/uiSlice";
import { useAppDispatch } from "../store/hooks";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export default function ProfileClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["profile", "summary"],
    queryFn: getProfileSummary,
  });
  const {
    data: entriesData,
    isLoading: entriesLoading,
  } = useQuery({
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
    const submissionContest = contests.find(
      (contest) => contest.phase === "SUBMISSION",
    );
    if (submissionContest) {
      router.push(`/contest/${submissionContest.id}?tab=contest`);
      return;
    }
    dispatch(showToast("현재 출품 가능한 콘테스트가 없습니다. 목록으로 이동합니다."));
    router.push("/contest?tab=contest");
  };

  return (
    <PageShell>
      <TopNav />
      {isLoading ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-[20px]" />
              <div className="grid gap-2">
                <Skeleton className="h-8 w-40 rounded-[16px]" />
                <Skeleton className="h-4 w-48 rounded-full" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
                >
                  <Skeleton className="h-3 w-16 rounded-full" />
                  <Skeleton className="mt-3 h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-8">
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-7 w-32 rounded-[16px]" />
              <SkeletonText className="mt-3 max-w-sm" lines={2} />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <Skeleton className="h-24 w-full rounded-[18px]" />
                    <Skeleton className="mt-3 h-4 w-24 rounded-full" />
                    <Skeleton className="mt-2 h-6 w-2/3 rounded-[14px]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-7 w-32 rounded-[16px]" />
              <SkeletonText className="mt-3 max-w-sm" lines={2} />
              <div className="mt-6 grid gap-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-[14px]" />
                      <div className="grid gap-2">
                        <Skeleton className="h-4 w-40 rounded-full" />
                        <Skeleton className="h-3 w-28 rounded-full" />
                      </div>
                    </div>
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-7 w-28 rounded-[16px]" />
              <SkeletonText className="mt-3 max-w-sm" lines={2} />
              <div className="mt-6 grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <div className="grid gap-2">
                      <Skeleton className="h-3 w-24 rounded-full" />
                      <Skeleton className="h-5 w-40 rounded-full" />
                      <Skeleton className="h-3 w-28 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : profile ? (
        <>
          {profile && (
            <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 rounded-[20px]"
                    style={{
                      background: `linear-gradient(135deg, ${profile.artist.profileColor}, #d8cbb4)`,
                    }}
                  />
                  <div>
                    <h2 className="font-[var(--font-display)] text-3xl">
                      {profile.artist.name}
                    </h2>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {profile.artist.tagline}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">
                      작품 수
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatNumber(profile.stats.totalWorks)}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">수상</p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatNumber(profile.stats.totalAwards)}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">
                      누적 상금
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatNumber(profile.stats.totalEarnings)}원
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">
                      팔로워
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatNumber(profile.stats.followers)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-8">
                <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
                  <h3 className="font-[var(--font-display)] text-2xl">
                    Portfolio
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    대표 작품을 확인하세요.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {profile.portfolio.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                      >
                        <div
                          className="h-24 w-full rounded-[18px]"
                          style={{
                            background: `linear-gradient(140deg, ${item.colorFrom}, ${item.colorTo})`,
                          }}
                        />
                        <div className="mt-3 text-xs text-[color:var(--muted)]">
                          {item.category}
                        </div>
                        <h4 className="mt-1 font-[var(--font-display)] text-lg">
                          {item.title}
                        </h4>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-[var(--font-display)] text-2xl">
                        My Entries
                      </h3>
                      <p className="mt-2 text-sm text-[color:var(--muted)]">
                        제출한 출품을 관리하세요.
                      </p>
                    </div>
                    <button
                      className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                      onClick={handleNewEntry}
                    >
                      새 출품하기
                    </button>
                  </div>

                  {entriesLoading ? (
                    <div className="mt-6 grid gap-4">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div
                          key={index}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
                        >
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-14 w-14 rounded-[14px]" />
                            <div className="grid gap-2">
                              <Skeleton className="h-4 w-40 rounded-full" />
                              <Skeleton className="h-3 w-28 rounded-full" />
                            </div>
                          </div>
                          <Skeleton className="h-7 w-20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {entriesError && (
                        <div className="mt-4 rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-2 text-xs text-[color:var(--muted)]">
                          출품 데이터를 불러오지 못했습니다.
                          {entriesError ? ` (${entriesError})` : ""}
                        </div>
                      )}
                      {entries.length === 0 ? (
                        <div className="mt-6 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-6 text-sm text-[color:var(--muted)]">
                          아직 제출한 출품이 없습니다.
                        </div>
                      ) : (
                        <div className="mt-6 grid gap-4">
                          {entries.map((entry) => (
                            <div
                              key={entry.entryId}
                              className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
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
                                  <div className="h-14 w-14 rounded-[14px] bg-[color:var(--chip)]" />
                                )}
                                <div>
                                  <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--accent)]">
                                    {entry.contestTheme}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold">
                                    {entry.title ?? "Untitled"}
                                  </p>
                                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                                    제출일 {entry.submittedAt}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
                                <span className="rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                                  {statusLabel[entry.status] ?? entry.status}
                                </span>
                                <button
                                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-red-300 hover:text-red-500 disabled:opacity-60"
                                  onClick={() =>
                                    deleteMutation.mutate(entry.entryId)
                                  }
                                  disabled={deleteMutation.isPending}
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
                  <h3 className="font-[var(--font-display)] text-2xl">
                    Awards
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    콘테스트 수상 이력을 확인하세요.
                  </p>
                  <div className="mt-6 grid gap-4">
                    {profile.awards.map((award) => (
                      <div
                        key={award.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
                      >
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)]">
                            {award.rank}
                          </p>
                          <p className="mt-2 font-semibold">
                            {award.contest}
                          </p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">
                            {award.period}
                          </p>
                        </div>
                        <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)]">
                          {award.prize}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 px-6 py-6 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
          프로필 데이터를 불러오지 못했습니다.
          {error ? ` (${error})` : ""}
        </div>
      )}
    </PageShell>
  );
}
