"use client";

import { useEffect } from "react";

import CinematicBottomNav from "./components/CinematicBottomNav";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Muse page error", error);
  }, [error]);

  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main id="main-content" className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 pb-32">
        <p className="museum-kicker">Exhibition interrupted</p>
        <h1 className="mt-4 font-[var(--font-display)] text-5xl">전시를 잠시 이어갈 수 없습니다.</h1>
        <p className="mt-5 max-w-xl leading-7 text-[var(--muted)]">
          페이지를 구성하는 중 문제가 발생했습니다. 입력하던 내용이 있다면 그대로 둔 채 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 w-fit border border-[var(--line-strong)] px-6 py-3 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          다시 시도
        </button>
      </main>
      <CinematicBottomNav activeTab="home" layout="fixed" />
    </div>
  );
}
