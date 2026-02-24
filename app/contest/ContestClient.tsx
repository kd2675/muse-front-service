"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
import TopNav from "../components/TopNav";
import { setPendingPath, showToast } from "../store/uiSlice";
import { useAppDispatch } from "../store/hooks";
import { getContestList, purchaseEntryCredit } from "../lib/contest";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { getAccessToken, getUserFromToken, isAdminRole } from "../lib/auth";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { APP_ROUTES } from "../lib/router";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

const phaseLabel: Record<string, string> = {
  UPCOMING: "출품 대기",
  SUBMISSION: "출품 진행 중",
  REVIEW: "심사 중",
  VOTING: "전시 중",
  ENDED: "종료",
};

const phaseTheme: Record<
  string,
  {
    railCard: string;
    railBadge: string;
    railTone: string;
    recordCard: string;
    recordBadge: string;
    metaPill: string;
    actionButton: string;
  }
> = {
  UPCOMING: {
    railCard:
      "border-[rgba(176,121,76,0.24)] bg-[linear-gradient(160deg,rgba(255,250,243,0.98)_0%,rgba(251,243,232,0.94)_100%)]",
    railBadge:
      "border-[rgba(176,121,76,0.32)] bg-[rgba(255,245,228,0.92)] text-[#7f5c34]",
    railTone: "text-[#6f4f2d]",
    recordCard:
      "border-[rgba(176,121,76,0.24)] bg-[linear-gradient(160deg,rgba(255,250,243,0.98)_0%,rgba(251,243,232,0.94)_100%)]",
    recordBadge:
      "border-[rgba(176,121,76,0.32)] bg-[rgba(255,245,228,0.92)] text-[#7f5c34]",
    metaPill:
      "border-[rgba(176,121,76,0.26)] bg-[rgba(255,255,255,0.72)] text-[#72553a]",
    actionButton:
      "border-[rgba(176,121,76,0.34)] bg-[rgba(255,245,228,0.94)] text-[#6f4f2d] hover:bg-[rgba(250,236,211,0.96)]",
  },
  SUBMISSION: {
    railCard:
      "border-[rgba(10,111,103,0.25)] bg-[linear-gradient(160deg,rgba(245,255,252,0.98)_0%,rgba(236,251,247,0.94)_100%)]",
    railBadge:
      "border-[rgba(10,111,103,0.32)] bg-[rgba(234,252,247,0.92)] text-[#0f6e64]",
    railTone: "text-[#155f58]",
    recordCard:
      "border-[rgba(10,111,103,0.24)] bg-[linear-gradient(160deg,rgba(245,255,252,0.98)_0%,rgba(236,251,247,0.94)_100%)]",
    recordBadge:
      "border-[rgba(10,111,103,0.32)] bg-[rgba(234,252,247,0.92)] text-[#0f6e64]",
    metaPill:
      "border-[rgba(10,111,103,0.25)] bg-[rgba(255,255,255,0.72)] text-[#1c645d]",
    actionButton:
      "border-[rgba(10,111,103,0.34)] bg-[rgba(234,252,247,0.92)] text-[#0f6e64] hover:bg-[rgba(219,246,238,0.96)]",
  },
  REVIEW: {
    railCard:
      "border-[rgba(153,127,48,0.24)] bg-[linear-gradient(160deg,rgba(255,252,238,0.98)_0%,rgba(250,245,220,0.94)_100%)]",
    railBadge:
      "border-[rgba(153,127,48,0.34)] bg-[rgba(255,248,222,0.94)] text-[#715b19]",
    railTone: "text-[#6a5518]",
    recordCard:
      "border-[rgba(153,127,48,0.24)] bg-[linear-gradient(160deg,rgba(255,252,238,0.98)_0%,rgba(250,245,220,0.94)_100%)]",
    recordBadge:
      "border-[rgba(153,127,48,0.34)] bg-[rgba(255,248,222,0.94)] text-[#715b19]",
    metaPill:
      "border-[rgba(153,127,48,0.24)] bg-[rgba(255,255,255,0.7)] text-[#6b5721]",
    actionButton:
      "border-[rgba(153,127,48,0.34)] bg-[rgba(255,248,222,0.94)] text-[#715b19] hover:bg-[rgba(247,233,179,0.95)]",
  },
  VOTING: {
    railCard:
      "border-[rgba(123,91,52,0.26)] bg-[linear-gradient(160deg,rgba(255,252,247,0.98)_0%,rgba(250,243,232,0.94)_100%)]",
    railBadge:
      "border-[rgba(123,91,52,0.34)] bg-[rgba(255,246,230,0.92)] text-[#7f5c34]",
    railTone: "text-[#6f4f2d]",
    recordCard:
      "border-[rgba(123,91,52,0.28)] bg-[linear-gradient(160deg,rgba(255,251,245,0.98)_0%,rgba(250,243,232,0.94)_100%)]",
    recordBadge:
      "border-[rgba(123,91,52,0.34)] bg-[rgba(255,246,230,0.92)] text-[#7f5c34]",
    metaPill:
      "border-[rgba(123,91,52,0.26)] bg-[rgba(255,255,255,0.72)] text-[#6f5437]",
    actionButton:
      "border-[rgba(123,91,52,0.34)] bg-[rgba(255,246,230,0.92)] text-[#6f4f2d] hover:bg-[rgba(250,236,211,0.95)]",
  },
  ENDED: {
    railCard:
      "border-[rgba(104,88,70,0.24)] bg-[linear-gradient(160deg,rgba(250,248,244,0.98)_0%,rgba(241,237,230,0.94)_100%)]",
    railBadge:
      "border-[rgba(104,88,70,0.32)] bg-[rgba(243,240,234,0.92)] text-[#5c544b]",
    railTone: "text-[#544c44]",
    recordCard:
      "border-[rgba(104,88,70,0.24)] bg-[linear-gradient(160deg,rgba(250,248,244,0.98)_0%,rgba(241,237,230,0.94)_100%)]",
    recordBadge:
      "border-[rgba(104,88,70,0.32)] bg-[rgba(243,240,234,0.92)] text-[#5c544b]",
    metaPill:
      "border-[rgba(104,88,70,0.24)] bg-[rgba(255,255,255,0.72)] text-[#5d544a]",
    actionButton:
      "border-[rgba(104,88,70,0.32)] bg-[rgba(243,240,234,0.92)] text-[#5c544b] hover:bg-[rgba(236,232,224,0.95)]",
  },
};

function getPhaseTheme(phase: string) {
  return phaseTheme[phase] ?? phaseTheme.UPCOMING;
}

function phaseDisplayPriority(phase: string): number {
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

export default function ContestClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [listTab, setListTab] = useState<"LIVE" | "ARCHIVE">("LIVE");
  const [paymentStep, setPaymentStep] = useState<
    "closed" | "payment" | "confirm"
  >("closed");
  const [selectedContestId, setSelectedContestId] = useState<number | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState("card");
  useBodyScrollLock(paymentStep !== "closed");
  const authUser = isHydrated ? getUserFromToken() : null;
  const isAdmin = isAdminRole(authUser?.role);
  const { data, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: getContestList,
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
  const error = data?.error;
  const selectedContest = useMemo(
    () =>
      sortedContests.find((contest) => contest.id === selectedContestId) ??
      null,
    [selectedContestId, sortedContests],
  );
  const filteredContests = useMemo(
    () =>
      listTab === "ARCHIVE"
        ? sortedContests.filter((contest) => contest.phase === "ENDED")
        : sortedContests.filter((contest) => contest.phase !== "ENDED"),
    [listTab, sortedContests],
  );

  const openPayment = () => {
    if (!getAccessToken()) {
      dispatch(setPendingPath("/contest?tab=contest"));
      dispatch(showToast("로그인 후 결제할 수 있습니다."));
      router.push("/login");
      return;
    }
    if (isLoading) {
      dispatch(showToast("콘테스트 목록을 불러오는 중입니다."));
      return;
    }
    if (sortedContests.length === 0) {
      dispatch(showToast("참가 가능한 콘테스트가 없습니다."));
      return;
    }
    const submissionContest = sortedContests.find(
      (contest) => contest.phase === "SUBMISSION",
    );
    if (!submissionContest) {
      dispatch(showToast("출품 가능한 콘테스트가 없습니다."));
      return;
    }
    setSelectedContestId(submissionContest.id);
    setPaymentMethod("card");
    setPaymentStep("payment");
  };

  return (
    <PageShell>
      <TopNav />
      {isAdmin && (
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-[#1d4ed8] bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] ring-2 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-[0_14px_28px_rgba(29,78,216,0.34)]"
            onClick={() => router.push(APP_ROUTES.adminContestManage)}
          >
            <span className="rounded-full border border-white/45 px-2 py-0.5 text-[10px] tracking-[0.2em]">ADMIN</span>
            <span>콘테스트 관리</span>
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-[#1d4ed8] bg-white px-4 py-2 text-xs font-semibold text-[#1d4ed8] shadow-[0_8px_20px_rgba(37,99,235,0.15)] transition hover:-translate-y-0.5 hover:bg-blue-50"
            onClick={() => router.push(APP_ROUTES.adminContestReview)}
          >
            <span>출품 심사</span>
          </button>
        </div>
      )}
      {isLoading ? (
        <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 p-10 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Skeleton className="h-8 w-40 rounded-[18px]" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
          <SkeletonText className="mt-4 max-w-md" lines={2} />
          <div className="mt-8 grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-5"
              >
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="mt-3 h-7 w-3/5 rounded-[16px]" />
                <SkeletonText className="mt-3" lines={2} />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          {error && (
            <div className="mt-10 rounded-2xl border border-[color:var(--line)] bg-white/70 px-5 py-3 text-xs text-[color:var(--muted)]">
              콘테스트 데이터를 불러오지 못했습니다.
              {error ? ` (${error})` : ""}
            </div>
          )}

          <section
            id="contest-records-section"
            className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 p-10 shadow-[var(--shadow)]"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-[var(--font-display)] text-3xl">
                  Contest Records
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  상태별 콘테스트 흐름을 기록 순서대로 확인하세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm text-white shadow-[var(--shadow)]"
                  onClick={openPayment}
                >
                  새 콘테스트 참가
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <button
                className={`rounded-full border px-4 py-2 transition ${
                  listTab === "LIVE"
                    ? "border-[color:var(--accent)] bg-[color:var(--chip)] text-[color:var(--accent)]"
                    : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                }`}
                onClick={() => setListTab("LIVE")}
              >
                진행
              </button>
              <button
                className={`rounded-full border px-4 py-2 transition ${
                  listTab === "ARCHIVE"
                    ? "border-[color:var(--accent)] bg-[color:var(--chip)] text-[color:var(--accent)]"
                    : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                }`}
                onClick={() => setListTab("ARCHIVE")}
              >
                아카이브
              </button>
            </div>

            <div className="mt-8 grid gap-4">
              {filteredContests.map((contest) => {
                const theme = getPhaseTheme(contest.phase);
                const cardClass = `rounded-[22px] border p-5 ${theme.recordCard}`;
                const phaseBadgeClass = `rounded-full border px-3 py-1 text-xs ${theme.recordBadge}`;
                const metaPillClass = `rounded-full border px-3 py-1 ${theme.metaPill}`;
                const detailLinkClass = `ml-auto rounded-full border px-3 py-1 text-xs transition ${theme.actionButton}`;
                return (
                  <article key={contest.id} className={cardClass}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
                          Contest
                        </p>
                        <h3 className={`mt-2 font-[var(--font-display)] text-2xl ${theme.railTone}`}>
                          {contest.theme}
                        </h3>
                        <p className="mt-2 text-xs text-[color:var(--muted)]">
                          {contest.period}
                        </p>
                      </div>
                      <span className={phaseBadgeClass}>
                        {phaseLabel[contest.phase] ?? contest.phase}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
                      <span className={metaPillClass}>
                        참가비 {formatNumber(contest.entryFee)}원
                      </span>
                      <span className={metaPillClass}>
                        상금풀 {formatNumber(contest.prizePool)}원
                      </span>
                      {contest.phase === "VOTING" ? (
                        <span className={metaPillClass}>
                          전시 중
                        </span>
                      ) : contest.daysLeft > 0 ? (
                        <span className={metaPillClass}>
                          {contest.daysLeft}일 남음
                        </span>
                      ) : (
                        <span className={metaPillClass}>
                          마감됨
                        </span>
                      )}
                      <Link
                        href={`/contest/${contest.id}`}
                        className={detailLinkClass}
                      >
                        {contest.phase === "VOTING" ? "전시관 입장" : "상세 보기"}
                      </Link>
                    </div>
                  </article>
                );
              })}
              {filteredContests.length === 0 && (
                <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 px-5 py-4 text-sm text-[color:var(--muted)]">
                  {listTab === "ARCHIVE"
                    ? "종료된 콘테스트가 없습니다."
                    : "진행 중인 콘테스트가 없습니다."}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {paymentStep !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-[color:var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            {paymentStep === "payment" && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                      Test Payment
                    </p>
                    <h2 className="mt-2 font-[var(--font-display)] text-2xl">
                      출품권 결제
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      실제 결제는 진행되지 않으며, 테스트 UI입니다.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-red-300 hover:text-red-500"
                    onClick={() => setPaymentStep("closed")}
                  >
                    닫기
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Contest
                  </label>
                  <select
                    value={selectedContestId ?? undefined}
                    onChange={(event) =>
                      setSelectedContestId(Number(event.target.value))
                    }
                    className="h-11 rounded-[18px] border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
                  >
                    {sortedContests
                      .filter((contest) => contest.phase === "SUBMISSION")
                      .map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.theme}
                      </option>
                      ))}
                  </select>

                  <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm text-[color:var(--canvas-ink)]">
                    참가비{" "}
                    <strong>
                      {selectedContest
                        ? selectedContest.entryFee.toLocaleString("ko-KR")
                        : 0}
                      원
                    </strong>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-xs text-[color:var(--muted)]">
                    출품권은 선택한 콘테스트에만 적립되며, 다른 콘테스트와 공유되지 않습니다.
                  </div>

                  <div className="grid gap-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Payment Method
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-[color:var(--muted)]">
                      {[
                        { id: "card", label: "카드 결제" },
                        { id: "account", label: "계좌 이체" },
                        { id: "simple", label: "간편 결제" },
                      ].map((method) => (
                        <button
                          key={method.id}
                          className={`rounded-full border px-4 py-2 transition ${
                            paymentMethod === method.id
                              ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                              : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                          }`}
                          onClick={() => setPaymentMethod(method.id)}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="flex-1 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)]"
                    onClick={() => setPaymentStep("confirm")}
                  >
                    테스트 결제 진행
                  </button>
                  <button
                    className="flex-1 rounded-full border border-[color:var(--line)] px-5 py-3 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    onClick={() => setPaymentStep("closed")}
                  >
                    취소
                  </button>
                </div>
              </>
            )}

            {paymentStep === "confirm" && (
              <>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                  Payment Complete
                </p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl">
                  결제가 완료되었습니다.
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  테스트 결제이므로 실제 승인/청구는 발생하지 않습니다.
                </p>
                <div className="mt-6 rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--muted)]">
                  {selectedContest?.theme ?? "선택된 콘테스트"} 출품권
                  구매가 완료되었습니다.
                </div>
                <button
                  className="mt-6 w-full rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                  disabled={!selectedContest?.id}
                  onClick={async () => {
                    if (!selectedContest?.id) {
                      return;
                    }
                    const result = await purchaseEntryCredit(
                      selectedContest.id,
                    );
                    if (result.error) {
                      dispatch(
                        showToast(
                          `결제 처리에 실패했습니다. (${result.error})`,
                        ),
                      );
                      return;
                    }
                    setPaymentStep("closed");
                    router.push(`/contest/${selectedContest.id}`);
                  }}
                >
                  확인
                </button>
                {selectedContest?.id && (
                  <Link
                    href={`/contest/${selectedContest.id}`}
                    className="mt-3 block text-center text-xs text-[color:var(--accent)] hover:underline"
                  >
                    바로 출품하러 가기
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
