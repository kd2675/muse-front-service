"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import CinematicBottomNav from "../../../components/CinematicBottomNav";
import QueryState from "../../../components/QueryState";
import OverviewStyleHeader from "../../../components/OverviewStyleHeader";
import { getContestResult } from "../../../lib/contest";

export default function ContestResultsClient({ contestId }: { contestId: number }) {
  const query = useQuery({ queryKey: ["contest", contestId, "results"], queryFn: () => getContestResult(contestId), retry: false });
  const result = query.data?.data;
  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-6 pb-40 pt-8 md:px-8">
        <OverviewStyleHeader title={result?.theme ?? "수상 결과"} subtitle="Jury selection archive" />
        {result ? (
          <>
            <dl className="mt-8 grid border-y border-[var(--line)] py-6 sm:grid-cols-3">
              <Fact label="결과 확정" value={new Date(result.finalizedAt).toLocaleDateString("ko-KR")} />
              <Fact label="총 상금" value={`${result.prizePool.toLocaleString("ko-KR")}원`} />
              <Fact label="공모 기간" value={result.period} />
            </dl>
            <section className="mt-14 space-y-16">
              {result.winners.length === 0 ? <QueryState title="이번 공모전은 수상작 없이 마무리되었습니다" description="다음 공모전에서 새로운 시선을 만나 보세요." action={{ href: "/contest", label: "다른 공모전 보기" }} /> : null}
              {result.winners.map((winner, index) => (
                <article key={winner.entryId} className={`grid items-center gap-8 ${index % 2 ? "lg:grid-cols-[0.8fr_1.2fr]" : "lg:grid-cols-[1.2fr_0.8fr]"}`}>
                  <div className={`relative aspect-[4/3] overflow-hidden ${index % 2 ? "lg:order-2" : ""}`}>
                    <Image src={winner.imageUrl} alt={winner.title || `${winner.rank}위 수상작`} fill sizes="(min-width:1024px) 60vw, 100vw" className="object-contain" preload={index === 0} />
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
        ) : query.isLoading ? <QueryState kind="loading" title="수상 기록을 불러오는 중입니다" /> : query.data?.pending ? <QueryState title="최종 결과를 준비하고 있습니다" description="운영진이 결과를 확정하면 수상작과 심사 기록이 공개됩니다." retry={() => void query.refetch()} /> : <QueryState kind="error" title="수상 기록을 불러오지 못했습니다" description={query.data?.error} retry={() => void query.refetch()} />}
        <div className="mt-10 flex flex-wrap gap-4 border-t border-[var(--line)] pt-6 text-sm"><Link className="museum-link-line" href={`/contest/${contestId}`}>공모전 상세로 돌아가기</Link><Link className="museum-link-line" href="/gallery">영구 전시 둘러보기 →</Link></div>
      </main>
      <CinematicBottomNav activeTab="contest" layout="fixed" />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="border-r border-[var(--line)] px-5 py-2 last:border-r-0"><dt className="museum-kicker">{label}</dt><dd className="mt-2 font-[var(--font-display)] text-xl">{value}</dd></div>;
}
