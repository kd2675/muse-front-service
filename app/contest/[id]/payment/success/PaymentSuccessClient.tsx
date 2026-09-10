"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { confirmPayment } from "../../../../lib/payment";

export default function PaymentSuccessClient() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const paymentKey = search.get("paymentKey");
  const orderId = search.get("orderId");
  const amount = Number(search.get("amount"));
  const valid = Boolean(
    paymentKey && orderId && Number.isSafeInteger(amount) && amount > 0,
  );
  const queryClient = useQueryClient();
  // ProtectedContent restores the authenticated session before this component mounts.
  // Confirmation is idempotent on the server. Never automatically retry a provider approval.
  const query = useQuery({
    queryKey: ["payment", "confirmation", orderId, amount],
    queryFn: async () => {
      const result = await confirmPayment({
        paymentKey: paymentKey!,
        orderId: orderId!,
        amount,
      });
      if (result.error || !result.data || result.data.status !== "DONE")
        throw new Error(result.error || "결제 승인을 완료하지 못했습니다.");
      return result.data;
    },
    enabled: valid,
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const order = query.data;
  useEffect(() => {
    if (!order) return;
    void queryClient.invalidateQueries({
      queryKey: ["contest", order.contestId, "entryCredits"],
    });
    void queryClient.invalidateQueries({ queryKey: ["library", "payments"] });
  }, [order, queryClient]);
  const failed = !valid || query.isError;
  const message = !valid
    ? "결제 승인 정보가 올바르지 않습니다. 보관함에서 결제 상태를 확인해 주세요."
    : query.error?.message ||
      (order
        ? "결제가 승인되고 출품권 1개가 지급되었습니다."
        : "결제 승인과 출품권 지급을 확인하고 있습니다.");
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="museum-grain flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6 text-[var(--canvas-ink)]"
    >
      <section className="museum-panel w-full max-w-xl p-6 text-center md:p-12">
        <p className="museum-kicker">
          {order
            ? "결제 완료"
            : failed
              ? "결제 상태 확인 필요"
              : "승인 확인 중"}
        </p>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl">
          {order ? "출품 준비가 끝났습니다" : "결제 확인"}
        </h1>
        <p
          role={failed ? "alert" : "status"}
          className="mt-5 text-sm leading-7 text-[var(--muted)]"
        >
          {message}
        </p>
        {order ? (
          <p className="mt-3 text-sm">
            {order.amount.toLocaleString("ko-KR")}원 · 출품권 1개
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/contest/${order?.contestId ?? params.id}#entry-workspace`}
            className="museum-button-primary px-6 py-3 text-sm"
          >
            공모전으로 돌아가기
          </Link>
          <Link
            href="/library?tab=payments"
            className="museum-button-secondary px-6 py-3 text-sm"
          >
            결제 내역 확인
          </Link>
        </div>
        {failed ? (
          <p className="mt-5 text-xs leading-6 text-[var(--muted)]">
            결제 내역을 확인하기 전에 같은 출품권을 다시 결제하지 마세요.
          </p>
        ) : null}
      </section>
    </main>
  );
}
