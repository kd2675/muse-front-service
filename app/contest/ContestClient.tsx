"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
import TopNav from "../components/TopNav";
import { setPendingPath, showToast } from "../store/uiSlice";
import { useAppDispatch } from "../store/hooks";
import { getContestList, purchaseEntryCredit } from "../lib/contest";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { getAccessToken } from "../lib/auth";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

const statusLabel: Record<string, string> = {
  ACTIVE: "진행중",
  ENDED: "종료",
  UPCOMING: "예정",
};
const phaseLabel: Record<string, string> = {
  UPCOMING: "출품 대기",
  SUBMISSION: "출품 진행 중",
  VOTING: "전시 중",
  ENDED: "종료",
};

export default function ContestClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [paymentStep, setPaymentStep] = useState<
    "closed" | "payment" | "confirm"
  >("closed");
  const [selectedContestId, setSelectedContestId] = useState<number | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState("card");
  useBodyScrollLock(paymentStep !== "closed");
  const { data, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: getContestList,
  });

  const contests = useMemo(() => data?.data ?? [], [data?.data]);
  const exhibitionCount = useMemo(
    () => contests.filter((contest) => contest.phase === "VOTING").length,
    [contests],
  );
  const error = data?.error;
  const selectedContest = useMemo(
    () => contests.find((contest) => contest.id === selectedContestId) ?? null,
    [contests, selectedContestId],
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
    if (contests.length === 0) {
      dispatch(showToast("참가 가능한 콘테스트가 없습니다."));
      return;
    }
    const submissionContest = contests.find(
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

          <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 p-10 shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-[var(--font-display)] text-3xl">
                  Contest
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  진행 중인 테마와 상금풀을 확인하고 참여하세요.
                </p>
                {exhibitionCount > 0 && (
                  <p className="mt-2 text-xs text-[color:var(--accent)]">
                    전시 중인 콘테스트 {exhibitionCount}개
                  </p>
                )}
              </div>
            <button
              className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm text-white shadow-[var(--shadow)]"
              onClick={openPayment}
            >
              새 콘테스트 참가
            </button>
            </div>

            <div className="mt-8 grid gap-4">
              {contests.map((contest) => (
                <article
                  key={contest.id}
                  className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                        Contest
                      </p>
                      <h3 className="mt-2 font-[var(--font-display)] text-2xl">
                        {contest.theme}
                      </h3>
                      <p className="mt-2 text-xs text-[color:var(--muted)]">
                        {contest.period}
                      </p>
                    </div>
                    <span className="rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                      {phaseLabel[contest.phase] ??
                        statusLabel[contest.status] ??
                        contest.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
                    <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                      참가비 {formatNumber(contest.entryFee)}원
                    </span>
                    <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                      상금풀 {formatNumber(contest.prizePool)}원
                    </span>
                    {contest.phase === "VOTING" ? (
                      <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                        전시 중
                      </span>
                    ) : contest.daysLeft > 0 ? (
                      <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                        {contest.daysLeft}일 남음
                      </span>
                    ) : (
                      <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                        마감됨
                      </span>
                    )}
                    <Link
                      href={`/contest/${contest.id}`}
                      className="ml-auto rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    >
                      {contest.phase === "VOTING"
                        ? "전시 보기"
                        : "상세 보기"}
                    </Link>
                  </div>
                </article>
              ))}
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
                    {contests
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
