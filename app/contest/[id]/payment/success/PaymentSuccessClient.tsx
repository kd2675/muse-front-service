"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { confirmPayment } from "../../../../lib/payment";

export default function PaymentSuccessClient() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const paymentKey = search.get("paymentKey");
  const orderId = search.get("orderId");
  const amount = Number(search.get("amount"));
  const invalidRequest = !paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0;
  const [state, setState] = useState<"checking" | "done" | "error">(invalidRequest ? "error" : "checking");
  const [message, setMessage] = useState(invalidRequest ? "결제 승인 정보가 올바르지 않습니다." : "결제 승인과 출품권 지급을 확인하고 있습니다.");

  useEffect(() => {
    if (invalidRequest || !paymentKey || !orderId) return;
    confirmPayment({ paymentKey, orderId, amount }).then((result) => {
      if (result.error || !result.data) { setState("error"); setMessage(result.error ?? "결제 승인을 완료하지 못했습니다."); }
      else { setState("done"); setMessage("결제가 승인되고 출품권 1개가 지급되었습니다."); }
    });
  }, [amount, invalidRequest, orderId, paymentKey]);

  return (
    <main className="museum-grain flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6 text-[var(--canvas-ink)]">
      <section className="museum-panel w-full max-w-xl border-x-0 p-8 text-center md:p-12">
        <p className="museum-kicker">{state === "done" ? "Payment complete" : state === "error" ? "Approval needs attention" : "Verifying"}</p>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl">{state === "done" ? "출품 준비가 끝났습니다" : "결제 확인"}</h1>
        <p aria-live="polite" className="mt-5 text-sm leading-7 text-[var(--muted)]">{message}</p>
        <Link href={`/contest/${params.id}`} className="mt-8 inline-block bg-[var(--accent)] px-7 py-3 text-sm text-[#111]">공모전으로 돌아가기</Link>
      </section>
    </main>
  );
}
