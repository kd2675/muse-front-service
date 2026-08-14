import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="museum-grain flex min-h-screen flex-col items-center justify-center bg-[var(--canvas)] px-6 text-center text-[var(--canvas-ink)]">
      <p className="museum-kicker">404 · Empty wall</p>
      <h1 className="mt-5 font-[var(--font-display)] text-5xl md:text-7xl">이 벽에는 아직 작품이 없습니다.</h1>
      <p className="mt-5 text-sm leading-7 text-[var(--muted)]">주소가 바뀌었거나 공개가 종료된 전시일 수 있습니다.</p>
      <Link href="/overview" className="mt-9 border-b border-[var(--accent)] pb-1 text-sm text-[var(--accent)]">
        오늘의 전시로 돌아가기
      </Link>
    </main>
  );
}
