"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminShell from "../../../components/AdminShell";
import AdminActionButton from "../../../components/AdminActionButton";
import { Skeleton } from "../../../components/Skeleton";
import {
  getAdminContestEntries,
  getAdminContestList,
  updateAdminContestEntryStatus,
} from "../../../lib/contest";
import { APP_ROUTES } from "../../../lib/router";
import {
  contestPhaseOrder,
  getContestEntryStatusLabel,
  getContestEntryStatusTone,
  getContestPhaseLabel,
  getContestPhaseTone,
} from "../../../lib/statusTheme";
import { getUserFromToken, isAdminRole } from "../../../lib/auth";
import { useAppDispatch } from "../../../store/hooks";
import { showToast } from "../../../store/uiSlice";
import Reveal from "../../../components/motion/Reveal";
import { staggeredFadeUpMotion } from "../../../lib/motion";
import type {
  AdminContest,
  AdminContestEntryReviewStatus,
  ContestPublicEntry,
} from "../../../types/contest";

type ReviewFilter = ContestPublicEntry["status"];

const filterOrder: ReviewFilter[] = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

function reviewActionVariant(status: AdminContestEntryReviewStatus): "neutral" | "success" | "danger" {
  if (status === "APPROVED") {
    return "success";
  }
  if (status === "REJECTED") {
    return "danger";
  }
  return "neutral";
}

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "http://localhost:8081";

function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR");
}

function formatSchedule(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatRange(start?: string | null, end?: string | null): string {
  if (!start || !end) {
    return "-";
  }
  return `${formatSchedule(start)} ~ ${formatSchedule(end)}`;
}

function calculateProgressPercent(
  start?: string | null,
  end?: string | null,
  nowMs: number = Date.now(),
): number | null {
  const startMs = parseTimestamp(start);
  const endMs = parseTimestamp(end);
  if (startMs === null || endMs === null || endMs <= startMs) {
    return null;
  }
  if (nowMs < startMs) {
    return 0;
  }
  if (nowMs >= endMs) {
    return 100;
  }
  const total = endMs - startMs;
  const elapsed = nowMs - startMs;
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

function normalizeImageUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = IMAGE_BASE.endsWith("/") ? IMAGE_BASE.slice(0, -1) : IMAGE_BASE;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path.startsWith("/images/")) {
    return `${base}${path}`;
  }
  return `${base}/images${path}`;
}

function parseTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return timestamp;
}

function isContestReviewWindow(contest: AdminContest): boolean {
  return contest.phase === "REVIEW";
}

type ReviewPriority = {
  code: "P1" | "P2" | "P3";
  rank: number;
  label: string;
};

function resolveReviewPriority(contest: AdminContest): ReviewPriority {
  if (contest.phase === "REVIEW") {
    return { code: "P1", rank: 1, label: "심사 최우선" };
  }
  if (contest.phase === "SUBMISSION" || contest.phase === "UPCOMING") {
    return { code: "P2", rank: 2, label: "심사 대기" };
  }
  if (contest.phase === "VOTING") {
    return { code: "P3", rank: 3, label: "전시 진행" };
  }
  return { code: "P3", rank: 4, label: "심사 완료" };
}

export default function AdminContestReviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const role = getUserFromToken()?.role;

  const [selectedContestId, setSelectedContestId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("SUBMITTED");
  const [updatingEntryId, setUpdatingEntryId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>("");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  useEffect(() => {
    const syncNow = () => setCurrentTimeMs(Date.now());
    syncNow();
    const timer = window.setInterval(syncNow, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contests"],
    queryFn: getAdminContestList,
  });

  const contests = useMemo(() => data?.data ?? [], [data?.data]);
  const contestListError = data?.error;
  const prioritizedContests = useMemo(() => {
    return [...contests].sort((a, b) => {
      const left = resolveReviewPriority(a);
      const right = resolveReviewPriority(b);
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      const phasePriorityDiff =
        contestPhaseOrder[a.phase] - contestPhaseOrder[b.phase];
      if (phasePriorityDiff !== 0) {
        return phasePriorityDiff;
      }
      return a.id - b.id;
    });
  }, [contests]);

  const requestedContestId = useMemo(() => {
    const contestId = Number(searchParams.get("contestId"));
    if (!Number.isFinite(contestId) || contestId <= 0) {
      return null;
    }
    return contestId;
  }, [searchParams]);

  const activeContestId = useMemo(() => {
    if (selectedContestId && contests.some((contest) => contest.id === selectedContestId)) {
      return selectedContestId;
    }
    if (requestedContestId && contests.some((contest) => contest.id === requestedContestId)) {
      return requestedContestId;
    }
    return prioritizedContests[0]?.id ?? null;
  }, [contests, prioritizedContests, requestedContestId, selectedContestId]);

  const selectedContest = useMemo<AdminContest | null>(
    () =>
      activeContestId === null
        ? null
        : contests.find((contest) => contest.id === activeContestId) ?? null,
    [activeContestId, contests],
  );
  const isSelectedContestReviewable = selectedContest
    ? isContestReviewWindow(selectedContest)
    : false;
  const reviewPeriodText =
    selectedContest?.submissionEndAt && selectedContest.votingStartAt
      ? `${formatSchedule(selectedContest.submissionEndAt)} ~ ${formatSchedule(selectedContest.votingStartAt)} (출품 종료 직후부터 전시 시작 전까지)`
      : "-";
  const submissionPeriodText = formatRange(selectedContest?.submissionStartAt, selectedContest?.submissionEndAt);
  const exhibitionPeriodText = formatRange(selectedContest?.votingStartAt, selectedContest?.votingEndAt);
  const totalPeriodText = formatRange(selectedContest?.submissionStartAt, selectedContest?.votingEndAt);
  const submissionProgress = calculateProgressPercent(
    selectedContest?.submissionStartAt,
    selectedContest?.submissionEndAt,
    currentTimeMs,
  );
  const reviewProgress = calculateProgressPercent(
    selectedContest?.submissionEndAt,
    selectedContest?.votingStartAt,
    currentTimeMs,
  );
  const exhibitionProgress = calculateProgressPercent(
    selectedContest?.votingStartAt,
    selectedContest?.votingEndAt,
    currentTimeMs,
  );
  const totalProgress = calculateProgressPercent(
    selectedContest?.submissionStartAt,
    selectedContest?.votingEndAt,
    currentTimeMs,
  );

  const {
    data: entriesData,
    isLoading: entriesLoading,
    error: entriesQueryError,
  } = useQuery({
    queryKey: ["admin", "contestEntries", activeContestId],
    queryFn: () => getAdminContestEntries(activeContestId as number),
    enabled: activeContestId !== null,
  });

  const entries = useMemo(() => entriesData?.data ?? [], [entriesData?.data]);
  const entriesError =
    entriesData?.error ?? (entriesQueryError instanceof Error ? entriesQueryError.message : undefined);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.status === filter),
    [entries, filter],
  );

  const statusCountMap = useMemo(() => {
    return entries.reduce<Record<ReviewFilter, number>>(
      (acc, entry) => {
        acc[entry.status] += 1;
        return acc;
      },
      {
        SUBMITTED: 0,
        APPROVED: 0,
        REJECTED: 0,
      },
    );
  }, [entries]);

  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      contestId: number;
      entryId: string;
      status: AdminContestEntryReviewStatus;
    }) => {
      setUpdatingEntryId(payload.entryId);
      return updateAdminContestEntryStatus(payload.contestId, payload.entryId, payload.status);
    },
    onSuccess: (result, payload) => {
      if (result.error || !result.data) {
        dispatch(showToast(result.error ?? "출품 상태 변경에 실패했습니다."));
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["admin", "contestEntries", payload.contestId],
      });
      queryClient.invalidateQueries({ queryKey: ["contest", payload.contestId, "entries"] });
      dispatch(showToast("출품 상태가 변경되었습니다."));
    },
    onError: () => {
      dispatch(showToast("출품 상태 변경 중 오류가 발생했습니다."));
    },
    onSettled: () => {
      setUpdatingEntryId(null);
    },
  });

  if (!isAdminRole(role)) {
    return (
      <AdminShell
        section="contest-review"
        title="출품 심사"
        description="콘테스트별 출품 심사 큐를 상태 기반으로 관리합니다."
      >
        <section className=" border border-[color:var(--line)] bg-[rgba(34,34,40,0.72)] p-8 shadow-[var(--shadow)]">
          <p className="text-sm text-[color:var(--muted)]">관리자 권한이 필요합니다.</p>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      section="contest-review"
      title="출품 심사"
      description="출품 심사 가능 시간대와 상태별 필터를 기준으로 빠르게 운영합니다."
    >
      <Reveal index={0}>
      <section className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border border-[color:var(--line)] bg-[rgba(18,18,24,0.86)] p-7 shadow-[var(--shadow)] xl:sticky xl:top-24 xl:max-h-[calc(100vh-8.5rem)] xl:overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Admin</p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl">심사 대상</h2>
            </div>
            <AdminActionButton
              variant="secondary"
              size="sm"
              onClick={() => router.push(APP_ROUTES.adminContestManage)}
            >
              관리 화면
            </AdminActionButton>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-3">
              <Skeleton className="h-20 " />
              <Skeleton className="h-20 " />
              <Skeleton className="h-20 " />
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {prioritizedContests.map((contest, index) => {
                const priority = resolveReviewPriority(contest);
                const tone = getContestPhaseTone(contest.phase);
                return (
                  <motion.button
                    key={contest.id}
                    {...staggeredFadeUpMotion(index + 1, reduceMotion)}
                    className={`border px-4 py-4 text-left transition ${
                      activeContestId === contest.id
                        ? "border-[color:var(--accent)] bg-[color:var(--chip)]"
                        : tone.cardClass
                    }`}
                    onClick={() => setSelectedContestId(contest.id)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      #{contest.id} · {getContestPhaseLabel(contest.phase)}
                    </p>
                    <p className="mt-1 font-medium">{contest.theme}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{contest.period}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[color:var(--muted)]">
                      <span className={` border px-2 py-1 ${tone.badgeClass}`}>
                        {priority.code} · {priority.label}
                      </span>
                      <span className=" border border-[color:var(--line)] px-2 py-1">
                        참여 {formatNumber(contest.participationCount)}
                      </span>
                      <span
                        className={` border px-2 py-1 ${
                          isContestReviewWindow(contest)
                            ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                            : "border-[color:var(--line)] text-[color:var(--muted)]"
                        }`}
                      >
                        {isContestReviewWindow(contest) ? "심사 가능" : "심사 불가"}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
              {!isLoading && prioritizedContests.length === 0 && (
                <p className="border border-[color:var(--line)] bg-[rgba(18,18,24,0.88)] px-4 py-3 text-sm text-[color:var(--muted)]">
                  등록된 콘테스트가 없습니다.
                </p>
              )}
            </div>
          )}

          {contestListError && (
            <p className="mt-4 text-xs text-[color:var(--accent-2)]">목록 조회 실패: {contestListError}</p>
          )}
        </aside>

        <section className="min-w-0 border border-[color:var(--line)] bg-[rgba(18,18,24,0.86)] p-7 shadow-[var(--shadow)] md:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Entry Review</p>
          <h2 className="mt-2 border-b border-[color:var(--line)] pb-4 font-[var(--font-display)] text-4xl">
            출품 심사 전용
          </h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            출품 상태를 대기, 승인, 반려 기준으로 분리해서 대량 심사합니다.
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            심사는 출품 종료 후 전시 시작 전(여분 시간대)에만 가능합니다.
          </p>
          {selectedContest && !isSelectedContestReviewable && (
            <p className="mt-3 border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-3 py-2 text-xs text-[color:var(--accent-2)]">
              현재 선택한 콘테스트는 심사 가능 시간대가 아닙니다. 목록 조회는 가능하지만 상태 변경은 비활성화됩니다.
            </p>
          )}

          {selectedContest && (
            <div className="mt-3 grid gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--canvas-ink)]">
                <p>
                  현재 콘테스트: <strong>#{selectedContest.id}</strong> · {selectedContest.theme}
                </p>
                <span className=" border border-[color:var(--line)] px-2 py-0.5 text-xs text-[color:var(--muted)]">
                  참여 {formatNumber(selectedContest.participationCount)}
                </span>
              </div>
              <div className="border border-[color:var(--line)] bg-[rgba(18,18,24,0.9)] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Contest Schedule</p>
                <div className="mt-3 grid gap-2 text-sm text-[color:var(--canvas-ink)]">
                  <p>
                    <span className="font-semibold">심사 기간</span>: {reviewPeriodText}
                  </p>
                  <p>
                    <span className="font-semibold">출품 기간</span>: {submissionPeriodText}
                  </p>
                  <p>
                    <span className="font-semibold">전시 기간</span>: {exhibitionPeriodText}
                  </p>
                  <p>
                    <span className="font-semibold">전체 기간</span>: {totalPeriodText}
                  </p>
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    { label: "심사 기간 진행 비율", value: reviewProgress },
                    { label: "출품 기간 진행 비율", value: submissionProgress },
                    { label: "전시 기간 진행 비율", value: exhibitionProgress },
                    { label: "전체 기간 진행 비율", value: totalProgress },
                  ].map((item) => (
                    <div key={`progress-${item.label}`} className="grid gap-1.5">
                      <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                        <span>{item.label}</span>
                        <span>{item.value === null ? "-" : `${item.value}%`}</span>
                      </div>
                      <div className="h-2 bg-[color:var(--chip)]">
                        <div
                          className="h-full bg-[color:var(--accent)] transition-[width] duration-500"
                          style={{ width: `${item.value ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedContest ? (
            <>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {filterOrder.map((value) => (
                  <button
                    key={`review-filter-${value}`}
                    className={`border px-3 py-3 text-left transition ${
                      filter === value
                        ? `${getContestEntryStatusTone(value).chipClass}`
                        : "border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] hover:border-[color:var(--accent)]"
                    }`}
                    onClick={() => setFilter(value)}
                  >
                    <p className="text-xs text-[color:var(--muted)]">{getContestEntryStatusLabel(value)}</p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--canvas-ink)]">
                      {statusCountMap[value]}
                    </p>
                  </button>
                ))}
              </div>

              {entriesLoading ? (
                <div className="mt-5 grid gap-3">
                  <Skeleton className="h-16 " />
                  <Skeleton className="h-16 " />
                  <Skeleton className="h-16 " />
                </div>
              ) : (
                <div className="mt-5 grid max-h-[calc(100vh-22rem)] gap-3 overflow-y-auto pr-1">
                {filteredEntries.map((entry, index) => (
                    <motion.article
                      key={entry.entryId}
                      {...staggeredFadeUpMotion(index + 8, reduceMotion)}
                      className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap">
                          {normalizeImageUrl(entry.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={normalizeImageUrl(entry.imageUrl) ?? ""}
                              alt={entry.title ?? "contest entry"}
                              className="h-24 w-36 border border-[color:var(--line)] object-cover sm:h-28 sm:w-44"
                            />
                          ) : (
                            <div className="flex h-24 w-36 items-center justify-center border border-dashed border-[color:var(--line)] bg-[color:var(--chip)] text-xs text-[color:var(--muted)] sm:h-28 sm:w-44">
                              이미지 없음
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{entry.title ?? "Untitled"}</p>
                            <p className="text-xs text-[color:var(--muted)]">
                              {entry.artistName} · {entry.submittedAt}
                            </p>
                            {normalizeImageUrl(entry.imageUrl) && (
                              <AdminActionButton
                                variant="secondary"
                                size="sm"
                                className="mt-2 inline-flex text-[11px]"
                                onClick={() => {
                                  const resolvedUrl = normalizeImageUrl(entry.imageUrl);
                                  if (!resolvedUrl) {
                                    dispatch(showToast("원본 이미지를 열 수 없습니다."));
                                    return;
                                  }
                                  setPreviewImageTitle(entry.title ?? "Untitled");
                                  setPreviewImageUrl(resolvedUrl);
                                }}
                              >
                                원본 보기
                              </AdminActionButton>
                            )}
                          </div>
                        </div>
                        <span
                          className={`border px-2 py-1 text-xs ${
                            getContestEntryStatusTone(entry.status).chipClass
                          }`}
                        >
                          {getContestEntryStatusLabel(entry.status)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["APPROVED", "REJECTED"] as AdminContestEntryReviewStatus[]).map((nextStatus) => (
                          <AdminActionButton
                            key={`${entry.entryId}-${nextStatus}`}
                            variant={reviewActionVariant(nextStatus)}
                            size="sm"
                            active={entry.status === nextStatus}
                            disabled={
                              !selectedContest ||
                              !isSelectedContestReviewable ||
                              entry.status === nextStatus ||
                              (reviewMutation.isPending && updatingEntryId === entry.entryId)
                            }
                            onClick={() => {
                              if (!selectedContest) {
                                return;
                              }
                              reviewMutation.mutate({
                                contestId: selectedContest.id,
                                entryId: entry.entryId,
                                status: nextStatus,
                              });
                            }}
                          >
                            {getContestEntryStatusLabel(nextStatus)}
                          </AdminActionButton>
                        ))}
                      </div>
                    </motion.article>
                  ))}

                  {filteredEntries.length === 0 && (
                    <div className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3 text-sm text-[color:var(--muted)]">
                      {getContestEntryStatusLabel(filter)} 상태 출품이 없습니다.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3 text-sm text-[color:var(--muted)]">
              등록된 콘테스트가 없습니다.
            </div>
          )}

          {entriesError && (
            <p className="mt-3 text-xs text-[color:var(--accent-2)]">출품 목록 조회 실패: {entriesError}</p>
          )}
        </section>
      </section>
      </Reveal>
      {previewImageUrl && (
        <section className="fixed inset-0 z-[120] bg-[rgba(9,16,24,0.82)] p-4 md:p-8">
          <div className="mx-auto flex h-full w-full max-w-[1120px] flex-col border border-white/20 bg-[rgba(7,11,18,0.94)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3">
              <h2 className="truncate text-sm font-semibold text-white">{previewImageTitle}</h2>
              <div className="flex items-center gap-2">
                <AdminActionButton
                  variant="secondary"
                  size="sm"
                  className="border-white/30 bg-white/8 text-white/90 hover:border-white hover:text-white"
                  onClick={() => {
                    setPreviewImageUrl(null);
                    setPreviewImageTitle("");
                  }}
                >
                  닫기
                </AdminActionButton>
              </div>
            </div>
            <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageUrl}
                alt={previewImageTitle}
                className="max-h-full w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </section>
      )}
    </AdminShell>
  );
}
