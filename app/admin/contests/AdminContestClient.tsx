"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import PageShell from "../../components/PageShell";
import TopNav from "../../components/TopNav";
import { Skeleton } from "../../components/Skeleton";
import {
  createAdminContest,
  finalizeContest,
  getAdminContestList,
  updateAdminContest,
} from "../../lib/contest";
import { getUserFromToken, isAdminRole } from "../../lib/auth";
import { adminContestReviewRoute } from "../../lib/router";
import { useAppDispatch } from "../../store/hooks";
import { showToast } from "../../store/uiSlice";
import type {
  AdminContest,
  AdminContestStatus,
  AdminContestUpsertRequest,
  ContestFinalizeResult,
  ContestPhase,
} from "../../types/contest";

const phaseLabel: Record<ContestPhase, string> = {
  UPCOMING: "출품 대기",
  SUBMISSION: "출품 진행",
  REVIEW: "심사 중",
  VOTING: "전시 중",
  ENDED: "종료",
};

function phaseDisplayPriority(phase: ContestPhase): number {
  if (phase === "VOTING") {
    return 0;
  }
  if (phase === "REVIEW") {
    return 1;
  }
  if (phase === "SUBMISSION") {
    return 2;
  }
  if (phase === "UPCOMING") {
    return 3;
  }
  return 4;
}

const statusOptions: AdminContestStatus[] = ["UPCOMING", "ACTIVE", "ENDED"];

type FormState = {
  theme: string;
  description: string;
  entryFee: string;
  prizePool: string;
  submissionStartAt: string;
  submissionEndAt: string;
  votingStartAt: string;
  votingEndAt: string;
  status: AdminContestStatus;
  rulesText: string;
};

const defaultForm: FormState = {
  theme: "",
  description: "",
  entryFee: "3000",
  prizePool: "0",
  submissionStartAt: "",
  submissionEndAt: "",
  votingStartAt: "",
  votingEndAt: "",
  status: "ACTIVE",
  rulesText:
    "해당 콘테스트 출품권 1개당 1회 출품 가능 (보유 시 횟수 제한 없음)\n출품권은 콘테스트별로 별도 관리되며 다른 콘테스트로 이전 불가\n타인의 권리를 침해하는 작품 금지",
};

function toDateTimeLocal(value?: string | null): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 16);
}

function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR");
}

function toForm(contest: AdminContest): FormState {
  return {
    theme: contest.theme,
    description: contest.description ?? "",
    entryFee: String(contest.entryFee),
    prizePool: String(contest.prizePool),
    submissionStartAt: toDateTimeLocal(contest.submissionStartAt),
    submissionEndAt: toDateTimeLocal(contest.submissionEndAt),
    votingStartAt: toDateTimeLocal(contest.votingStartAt),
    votingEndAt: toDateTimeLocal(contest.votingEndAt),
    status: contest.status,
    rulesText: contest.rules.join("\n"),
  };
}

function toPayload(form: FormState): AdminContestUpsertRequest {
  const rules = form.rulesText
    .split("\n")
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0);

  return {
    theme: form.theme.trim(),
    description: form.description.trim() || undefined,
    entryFee: Number(form.entryFee),
    prizePool: Number(form.prizePool),
    submissionStartAt: form.submissionStartAt,
    submissionEndAt: form.submissionEndAt,
    votingStartAt: form.votingStartAt,
    votingEndAt: form.votingEndAt,
    status: form.status,
    rules,
  };
}

function validateForm(form: FormState): string | null {
  if (!form.theme.trim()) {
    return "테마를 입력해주세요.";
  }
  if (!form.submissionStartAt || !form.submissionEndAt || !form.votingStartAt || !form.votingEndAt) {
    return "출품/전시 기간을 모두 입력해주세요.";
  }

  const submissionStart = new Date(form.submissionStartAt);
  const submissionEnd = new Date(form.submissionEndAt);
  const votingStart = new Date(form.votingStartAt);
  const votingEnd = new Date(form.votingEndAt);

  if (!(submissionStart < submissionEnd)) {
    return "출품 시작은 출품 종료보다 빨라야 합니다.";
  }
  if (submissionEnd > votingStart) {
    return "출품 종료는 전시 시작보다 늦을 수 없습니다.";
  }
  if (!(votingStart < votingEnd)) {
    return "전시 시작은 전시 종료보다 빨라야 합니다.";
  }

  const entryFee = Number(form.entryFee);
  const prizePool = Number(form.prizePool);

  if (!Number.isFinite(entryFee) || entryFee <= 0) {
    return "참가비는 0보다 커야 합니다.";
  }
  if (!Number.isFinite(prizePool) || prizePool < 0) {
    return "상금 풀은 0 이상이어야 합니다.";
  }

  const hasRule = form.rulesText
    .split("\n")
    .some((rule) => rule.trim().length > 0);
  if (!hasRule) {
    return "최소 1개의 규칙을 입력해주세요.";
  }

  return null;
}

export default function AdminContestClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedContestId, setSelectedContestId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [finalizeResult, setFinalizeResult] = useState<ContestFinalizeResult | null>(null);

  const role = getUserFromToken()?.role;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contests"],
    queryFn: getAdminContestList,
  });

  const contests = useMemo(() => data?.data ?? [], [data?.data]);
  const sortedContests = useMemo(
    () =>
      [...contests].sort((a, b) => {
        const priorityDiff =
          phaseDisplayPriority(a.phase) - phaseDisplayPriority(b.phase);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return a.id - b.id;
      }),
    [contests],
  );
  const loadError = data?.error;

  const selectedContest = useMemo(
    () =>
      mode === "edit" && selectedContestId !== null
        ? contests.find((contest) => contest.id === selectedContestId) ?? null
        : null,
    [contests, mode, selectedContestId],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (mode === "create" || selectedContestId === null) {
        return createAdminContest(payload);
      }
      return updateAdminContest(selectedContestId, payload);
    },
    onSuccess: (result) => {
      if (result.error || !result.data) {
        dispatch(showToast(result.error ?? "저장에 실패했습니다."));
        return;
      }
      setMode("edit");
      setSelectedContestId(result.data.id);
      setForm(toForm(result.data));
      queryClient.invalidateQueries({ queryKey: ["admin", "contests"] });
      dispatch(showToast("콘테스트 설정이 저장되었습니다."));
    },
    onError: () => {
      dispatch(showToast("저장 중 오류가 발생했습니다."));
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (contestId: number) => finalizeContest(contestId),
    onSuccess: (result) => {
      if (result.error || !result.data) {
        dispatch(showToast(result.error ?? "결과 확정에 실패했습니다."));
        return;
      }
      setFinalizeResult(result.data);
      queryClient.invalidateQueries({ queryKey: ["admin", "contests"] });
      dispatch(showToast("결과 확정이 완료되었습니다."));
    },
    onError: () => {
      dispatch(showToast("결과 확정 중 오류가 발생했습니다."));
    },
  });

  if (!isAdminRole(role)) {
    return (
      <PageShell>
        <TopNav />
        <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/75 p-8 shadow-[var(--shadow)]">
          <p className="text-sm text-[color:var(--muted)]">
            관리자 권한이 필요합니다.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopNav />
      <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="rounded-[28px] border border-[color:var(--line)] bg-white/75 p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                Admin
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl">Contest Schedule</h2>
            </div>
            <button
              className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              onClick={() => {
                setMode("create");
                setSelectedContestId(null);
                setForm(defaultForm);
                setFinalizeResult(null);
              }}
            >
              + 새 콘테스트
            </button>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-3">
              <Skeleton className="h-20 rounded-[18px]" />
              <Skeleton className="h-20 rounded-[18px]" />
              <Skeleton className="h-20 rounded-[18px]" />
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {sortedContests.map((contest) => {
                const isSelected = contest.id === selectedContestId;
                return (
                  <button
                    key={contest.id}
                    className={`rounded-[18px] border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-[color:var(--accent)] bg-[color:var(--chip)]"
                        : "border-[color:var(--line)] bg-white/80 hover:border-[color:var(--accent)]"
                    }`}
                    onClick={() => {
                      setMode("edit");
                      setSelectedContestId(contest.id);
                      setForm(toForm(contest));
                      setFinalizeResult(null);
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      #{contest.id} · {phaseLabel[contest.phase]}
                    </p>
                    <p className="mt-1 font-medium">{contest.theme}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{contest.period}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[color:var(--muted)]">
                      <span className="rounded-full border border-[color:var(--line)] px-2 py-1">
                        참가비 {formatNumber(contest.entryFee)}원
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] px-2 py-1">
                        참여 {formatNumber(contest.participationCount)}
                      </span>
                    </div>
                  </button>
                );
              })}
              {!isLoading && sortedContests.length === 0 && (
                <p className="rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--muted)]">
                  등록된 콘테스트가 없습니다.
                </p>
              )}
            </div>
          )}

          {loadError && (
            <p className="mt-4 text-sm text-[color:var(--accent-2)]">
              목록 조회 실패: {loadError}
            </p>
          )}

          {selectedContest && (
            <button
              className="mt-6 w-full rounded-full bg-[color:var(--accent-2)] px-4 py-3 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
              onClick={() => finalizeMutation.mutate(selectedContest.id)}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending
                ? "결과 확정 중..."
                : `결과 확정 실행 (#${selectedContest.id})`}
            </button>
          )}

          {finalizeResult && (
            <div className="mt-6 rounded-[18px] border border-[color:var(--line)] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Finalized #{finalizeResult.contestId}
              </p>
              <ul className="mt-3 grid gap-2 text-sm">
                {finalizeResult.winners.map((winner) => (
                  <li
                    key={winner.entryId}
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-3 py-2"
                  >
                    <p className="font-medium">
                      {winner.rank}등 · {winner.artistName}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {winner.title ?? "Untitled"} · {winner.voteCount}표 · {formatNumber(winner.prize)}원
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="rounded-[28px] border border-[color:var(--line)] bg-white/75 p-8 shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
            {mode === "create" ? "Create" : "Update"}
          </p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl">
            콘테스트 관리
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-[#1d4ed8] bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition hover:bg-[#1d4ed8]"
              onClick={() => router.push(adminContestReviewRoute(selectedContest?.id))}
            >
              출품 심사 페이지로 이동
            </button>
            <p className="self-center text-xs text-[color:var(--muted)]">
              대량 출품 심사는 전용 화면에서 상태 필터로 처리합니다.
            </p>
          </div>

          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const validationMessage = validateForm(form);
              if (validationMessage) {
                dispatch(showToast(validationMessage));
                return;
              }
              saveMutation.mutate();
            }}
          >
            <label className="grid gap-2 text-sm">
              <span>테마</span>
              <input
                className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                value={form.theme}
                onChange={(event) => setForm((prev) => ({ ...prev, theme: event.target.value }))}
                placeholder="예: 빛의 결"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span>설명</span>
              <textarea
                className="min-h-24 rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="콘테스트 설명"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>참가비(원)</span>
                <input
                  type="number"
                  min={1}
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.entryFee}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, entryFee: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>상금 풀(원)</span>
                <input
                  type="number"
                  min={0}
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.prizePool}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, prizePool: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>출품 시작</span>
                <input
                  type="datetime-local"
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.submissionStartAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, submissionStartAt: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>출품 종료</span>
                <input
                  type="datetime-local"
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.submissionEndAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, submissionEndAt: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>전시 시작</span>
                <input
                  type="datetime-local"
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.votingStartAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, votingStartAt: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>전시 종료</span>
                <input
                  type="datetime-local"
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.votingEndAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, votingEndAt: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span>상태</span>
              <select
                className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as AdminContestStatus }))
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span>규칙(줄바꿈으로 구분)</span>
              <textarea
                className="min-h-32 rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                value={form.rulesText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rulesText: event.target.value }))
                }
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm text-white shadow-[var(--shadow)] transition hover:opacity-90 disabled:opacity-60"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "저장 중..."
                  : mode === "create"
                    ? "콘테스트 생성"
                    : "콘테스트 수정"}
              </button>
              <button
                type="button"
                className="rounded-full border border-[color:var(--line)] px-6 py-3 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => {
                  if (selectedContest) {
                    setForm(toForm(selectedContest));
                  } else {
                    setForm(defaultForm);
                  }
                }}
              >
                입력 초기화
              </button>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
