"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import CinematicBottomNav from "../../../components/CinematicBottomNav";
import OverviewStyleHeader from "../../../components/OverviewStyleHeader";
import { getContestResult } from "../../../lib/contest";

export default function ContestResultsClient({ contestId }: { contestId: number }) {
  const query = useQuery({ queryKey: ["contest", contestId, "results"], queryFn: () => getContestResult(contestId), retry: false });
  const result = query.data?.data;
  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main className="mx-auto w-full max-w-6xl px-6 pb-40 pt-8 md:px-8">
        <OverviewStyleHeader title={result?.theme ?? "수상 결과"} subtitle="Jury selection archive" />
        {result ? (
          <>
            <section className="mt-8 grid border-y border-[var(--line)] py-6 sm:grid-cols-3">
              <Fact label="Finalized" value={new Date(result.finalizedAt).toLocaleDateString("ko-KR")} />
              <Fact label="Prize pool" value={`${result.prizePool.toLocaleString("ko-KR")}원`} />
              <Fact label="Season" value={result.period} />
            </section>
            <section className="mt-14 space-y-16">
              {result.winners.map((winner, index) => (
                <article key={winner.entryId} className={`grid items-center gap-8 ${index % 2 ? "lg:grid-cols-[0.8fr_1.2fr]" : "lg:grid-cols-[1.2fr_0.8fr]"}`}>
                  <div className={`relative aspect-[4/3] overflow-hidden ${index % 2 ? "lg:order-2" : ""}`}>
                    <Image src={winner.imageUrl} alt={winner.title || `${winner.rank}위 수상작`} fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" preload={index === 0} />
                  </div>
                  <div className={index % 2 ? "lg:order-1" : ""}>
                    <p className="museum-kicker">Prize {String(winner.rank).padStart(2, "0")}</p>
                    <h2 className="mt-3 font-[var(--font-display)] text-4xl md:text-5xl">{winner.title || "Untitled"}</h2>
                    <Link href={`/artists/${winner.artistId}`} className="museum-link-line mt-4 inline-block text-sm text-[var(--accent)]">{winner.artistName} 작가</Link>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--muted)]">{winner.description || "작품 설명은 작가의 공개 기록에서 이어집니다."}</p>
                    <p className="mt-5 text-sm">{winner.prize}</p>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : <p className="mt-16 text-center text-sm text-[var(--muted)]">{query.isLoading ? "심사 기록을 불러오는 중입니다." : query.data?.error ?? "아직 최종 결과가 공개되지 않았습니다."}</p>}
      </main>
      <CinematicBottomNav activeTab="contest" layout="fixed" />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="border-r border-[var(--line)] px-5 py-2 last:border-r-0"><dt className="museum-kicker">{label}</dt><dd className="mt-2 font-[var(--font-display)] text-xl">{value}</dd></div>;
}
