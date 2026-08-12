"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import AdminActionButton from "../../components/AdminActionButton";
import { Skeleton } from "../../components/Skeleton";
import {
  createAdminContest,
  finalizeContest,
  getAdminContestList,
  updateAdminContest,
} from "../../lib/contest";
import { getUserFromToken, isAdminRole } from "../../lib/auth";
import { adminContestReviewRoute } from "../../lib/router";
import {
  contestPhaseOrder,
  getContestPhaseLabel,
  getContestPhaseTone,
} from "../../lib/statusTheme";
import { useAppDispatch } from "../../store/hooks";
import { showToast } from "../../store/uiSlice";
import Reveal from "../../components/motion/Reveal";
import { staggeredFadeUpMotion } from "../../lib/motion";
import type {
  AdminContest,
  AdminContestUpsertRequest,
  ContestFinalizeResult,
} from "../../types/contest";

type FormState = {
  theme: string;
  description: string;
  entryFee: string;
  prizePool: string;
  submissionStartAt: string;
  submissionEndAt: string;
  votingStartAt: string;
  votingEndAt: string;
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
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
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
          contestPhaseOrder[a.phase] - contestPhaseOrder[b.phase];
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
  const canFinalizeSelectedContest = selectedContest?.phase === "ENDED";

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
      <AdminShell
        section="contest-manage"
        title="공모전 운영"
        description="콘테스트 생성/수정/결과 확정을 한 화면에서 관리합니다."
      >
        <section className=" border border-[color:var(--line)] bg-[rgba(34,34,40,0.72)] p-8 shadow-[var(--shadow)]">
          <p className="text-sm text-[color:var(--muted)]">
            관리자 권한이 필요합니다.
          </p>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      section="contest-manage"
      title="공모전 운영"
      description="출품·심사·전시 흐름을 기준으로 콘테스트를 운영합니다."
    >
      <Reveal index={0}>
      <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="border border-[color:var(--line)] bg-[rgba(22,22,28,0.8)] p-7 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                Admin
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl">공모전 일정</h2>
            </div>
            <AdminActionButton
              variant="secondary"
              onClick={() => {
                setMode("create");
                setSelectedContestId(null);
                setForm(defaultForm);
                setFinalizeResult(null);
              }}
            >
              + 새 콘테스트
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
              {sortedContests.map((contest, index) => {
                const isSelected = contest.id === selectedContestId;
                const tone = getContestPhaseTone(contest.phase);
                return (
                  <motion.button
                    key={contest.id}
                    {...staggeredFadeUpMotion(index + 1, reduceMotion)}
                    className={`border px-4 py-4 text-left transition ${
                      isSelected
                        ? `${tone.cardClass} ring-2 ring-[#2563eb]/35`
                        : tone.cardClass
                    }`}
                    onClick={() => {
                      setMode("edit");
                      setSelectedContestId(contest.id);
                      setForm(toForm(contest));
                      setFinalizeResult(null);
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      #{contest.id}
                    </p>
                    <p className="mt-1 font-medium">{contest.theme}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{contest.period}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[color:var(--muted)]">
                      <span className={` border px-2 py-1 ${tone.badgeClass}`}>
                        {getContestPhaseLabel(contest.phase)}
                      </span>
                      <span className=" border border-[color:var(--line)] px-2 py-1">
                        참가비 {formatNumber(contest.entryFee)}원
                      </span>
                      <span className=" border border-[color:var(--line)] px-2 py-1">
                        참여 {formatNumber(contest.participationCount)}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
              {!isLoading && sortedContests.length === 0 && (
                <p className=" border border-[color:var(--line)] bg-[rgba(18,18,24,0.82)] px-4 py-3 text-sm text-[color:var(--muted)]">
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
            <AdminActionButton
              variant="warning"
              size="md"
              fullWidth
              className="mt-6 py-3 text-sm"
              onClick={() => finalizeMutation.mutate(selectedContest.id)}
              disabled={finalizeMutation.isPending || !canFinalizeSelectedContest}
            >
              {finalizeMutation.isPending
                ? "결과 확정 중..."
                : canFinalizeSelectedContest
                  ? `결과 확정 실행 (#${selectedContest.id})`
                  : `종료 후 확정 가능 (#${selectedContest.id})`}
            </AdminActionButton>
          )}

          {selectedContest && !canFinalizeSelectedContest && (
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              현재 상태: {getContestPhaseLabel(selectedContest.phase)} · 전시 종료 이후에만 결과 확정이 가능합니다.
            </p>
          )}

          {finalizeResult && (
            <div className="mt-6 border border-[color:var(--line)] bg-[rgba(18,18,24,0.86)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Finalized #{finalizeResult.contestId}
              </p>
              {finalizeResult.winners.length === 0 ? (
                <p className="mt-3 border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-3 py-2 text-sm text-[color:var(--muted)]">
                  확정 완료: 대상 출품작이 없어 수상자 없이 종료 처리되었습니다.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 text-sm">
                  {finalizeResult.winners.map((winner) => (
                    <li
                      key={winner.entryId}
                      className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-3 py-2"
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
              )}
            </div>
          )}
        </aside>

        <div className="border border-[color:var(--line)] bg-[rgba(22,22,28,0.8)] p-8 shadow-[var(--shadow)] md:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
            {mode === "create" ? "Create" : "Update"}
          </p>
          <h2 className="mt-2 border-b border-[color:var(--line)] pb-4 font-[var(--font-display)] text-4xl">
            콘테스트 관리
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminActionButton
              variant="primary"
              onClick={() => router.push(adminContestReviewRoute(selectedContest?.id))}
            >
              출품 심사 페이지로 이동
            </AdminActionButton>
            <p className="self-center text-xs text-[color:var(--muted)]">
              대량 출품 심사는 전용 화면에서 상태 필터로 처리합니다.
            </p>
          </div>

          <form
            className="mt-7 grid gap-5"
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
                className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
                value={form.theme}
                onChange={(event) => setForm((prev) => ({ ...prev, theme: event.target.value }))}
                placeholder="예: 빛의 결"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span>설명</span>
              <textarea
                className="min-h-24 border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
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
                  className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
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
                  className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
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
                  className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
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
                  className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
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
                  className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
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
                  className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
                  value={form.votingEndAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, votingEndAt: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span>규칙(줄바꿈으로 구분)</span>
              <textarea
                className="min-h-32 border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-3"
                value={form.rulesText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rulesText: event.target.value }))
                }
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <AdminActionButton
                type="submit"
                variant="primary"
                className="px-6 py-3 text-sm"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "저장 중..."
                  : mode === "create"
                    ? "콘테스트 생성"
                    : "콘테스트 수정"}
              </AdminActionButton>
              <AdminActionButton
                variant="secondary"
                className="px-6 py-3 text-sm"
                onClick={() => {
                  if (selectedContest) {
                    setForm(toForm(selectedContest));
                  } else {
                    setForm(defaultForm);
                  }
                }}
              >
                입력 초기화
              </AdminActionButton>
            </div>
          </form>
        </div>
      </section>
      </Reveal>
    </AdminShell>
  );
}
