import Link from "next/link";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ code?: string; message?: string }> };
export default async function PaymentFailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <main className="museum-grain flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6 text-[var(--canvas-ink)]">
      <section className="museum-panel w-full max-w-xl border-x-0 p-8 text-center md:p-12">
        <p className="museum-kicker">Payment interrupted</p>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl">결제가 완료되지 않았습니다</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{query.message || "결제를 취소했거나 승인 과정에서 문제가 발생했습니다."}</p>
        {query.code ? <p className="mt-2 text-xs text-[var(--muted)]">오류 코드 {query.code}</p> : null}
        <Link href={`/contest/${id}`} className="mt-8 inline-block border border-[var(--line)] px-7 py-3 text-sm">공모전으로 돌아가기</Link>
      </section>
    </main>
  );
}
