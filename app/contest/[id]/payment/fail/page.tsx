import type { Metadata } from "next";
import Link from "next/link";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ code?: string; message?: string }> };
export const metadata: Metadata = { title: "결제 미완료", robots: { index: false, follow: false } };

const paymentFailureMessages: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제가 취소되었습니다. 원하실 때 다시 시도할 수 있습니다.",
  PAY_PROCESS_ABORTED: "결제 승인이 중단되었습니다. 결제 수단을 확인한 뒤 다시 시도해주세요.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 승인하지 않았습니다. 다른 결제 수단을 이용해주세요.",
};

export default async function PaymentFailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const message = query.code
    ? paymentFailureMessages[query.code] ?? "결제 승인 과정에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
    : "결제를 취소했거나 승인 과정에서 문제가 발생했습니다.";
  return (
    <main id="main-content" tabIndex={-1} className="museum-grain flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6 text-[var(--canvas-ink)]">
      <section className="museum-panel w-full max-w-xl border-x-0 p-8 text-center md:p-12">
        <p className="museum-kicker">Payment interrupted</p>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl">결제가 완료되지 않았습니다</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{message}</p>
        {query.code ? <p className="mt-2 text-xs text-[var(--muted)]">오류 코드 {query.code}</p> : null}
        <Link href={`/contest/${id}`} className="mt-8 inline-block border border-[var(--line)] px-7 py-3 text-sm">공모전으로 돌아가기</Link>
      </section>
    </main>
  );
}
