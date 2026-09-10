"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import QueryState from "../components/QueryState";
import CinematicBottomNav from "../components/CinematicBottomNav";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import { searchDiscovery } from "../lib/discovery";

export default function SearchClient({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const result = useQuery({
    queryKey: ["discovery", query],
    queryFn: () => searchDiscovery(query),
    enabled: query.length >= 2,
  });
  const data = result.data?.data;
  const count = data ? data.artists.length + data.museums.length + data.artworks.length + data.contests.length : 0;

  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-6 pb-40 pt-8 md:px-8">
        <OverviewStyleHeader title="작품과 기록 찾기" subtitle="Discovery desk" />
        <form
          className="museum-panel mt-8 flex gap-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const nextQuery = draft.trim();
            setQuery(nextQuery);
            router.replace(`/search?q=${encodeURIComponent(nextQuery)}`);
          }}
        >
          <label htmlFor="muse-search" className="sr-only">검색어</label>
          <input
            id="muse-search"
            value={draft}
            maxLength={80}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="작가명, 작품명, 전시 또는 공모전"
            className="min-h-12 min-w-0 flex-1 border-b border-[var(--line)] bg-transparent px-2 outline-none focus:border-[var(--accent)]"
          />
          <button type="submit" disabled={draft.trim().length < 2} className="bg-[var(--accent)] px-6 text-sm text-[#111] disabled:opacity-40">
            찾기
          </button>
        </form>
        {!query ? (
          <p className="mt-16 text-center text-sm text-[var(--muted)]">두 글자 이상 입력하면 아카이브 전체를 탐색합니다.</p>
        ) : result.isLoading ? (
          <p className="mt-16 text-center text-sm text-[var(--muted)]">아카이브를 찾는 중입니다.</p>
        ) : result.data?.error || result.isError ? (
          <QueryState kind="error" title="검색 결과를 불러오지 못했습니다" description="연결을 확인한 뒤 다시 시도해 주세요." retry={() => void result.refetch()} retrying={result.isFetching} />
        ) : data && count === 0 ? (
          <QueryState title={`‘${query}’에 해당하는 기록이 없습니다`} description="작가명이나 작품 제목의 일부로 검색해 보세요." action={{ href: "/gallery", label: "전체 전시 둘러보기" }} />
        ) : data ? (
          <div className="mt-10 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4"><p role="status" className="text-sm text-[var(--muted)]">‘{query}’ 검색 결과 {count}건</p><Link href="/search" className="min-h-11 py-3 text-sm">검색 초기화</Link></div>
            <nav aria-label="검색 결과 종류" className="muse-section-nav">{[["all", "전체"], ["artists", "작가"], ["exhibitions", "전시·작품"], ["contests", "공모전"]].map(([value, label]) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`min-h-11 px-4 text-sm ${category === value ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}>{label}</button>)}</nav>
            {category === "all" || category === "artists" ? <ResultSection title="작가" count={data.artists.length}>
              {data.artists.map((artist) => (
                <Link key={artist.artistId} href={`/artists/${artist.artistId}`} className="museum-panel block p-5 transition hover:border-[var(--accent)]">
                  <span className="museum-kicker">Artist</span>
                  <strong className="mt-2 block font-[var(--font-display)] text-2xl">{artist.name}</strong>
                  <span className="mt-2 block text-sm text-[var(--muted)]">{artist.tagline || "작가 기록 보기"}</span>
                </Link>
              ))}
            </ResultSection> : null}
            {category === "all" || category === "exhibitions" ? <ResultSection title="전시와 작품" count={data.museums.length + data.artworks.length}>
              {[...data.museums.map((item) => ({ id: `m-${item.museumId}`, href: `/gallery/museums/${item.museumId}`, title: item.name, meta: item.ownerName, image: item.coverImageUrl })),
                ...data.artworks.map((item) => ({ id: `a-${item.museumArtworkId}`, href: `/gallery/museums/${item.museumId}?artworkId=${item.museumArtworkId}`, title: item.title, meta: item.artistName, image: item.imageUrl }))].map((item, index) => (
                <Link key={item.id} href={item.href} className="group block border-t border-[var(--line)] pt-4">
                  {item.image ? <div className="relative aspect-[4/3] overflow-hidden"><Image src={item.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" preload={index === 0} className="object-cover transition duration-500 group-hover:scale-[1.02]" /></div> : null}
                  <strong className="mt-3 block font-[var(--font-display)] text-xl">{item.title}</strong>
                  <span className="text-xs text-[var(--muted)]">{item.meta}</span>
                </Link>
              ))}
            </ResultSection> : null}
            {category === "all" || category === "contests" ? <ResultSection title="공모전" count={data.contests.length}>
              {data.contests.map((contest) => (
                <Link key={contest.contestId} href={`/contest/${contest.contestId}`} className="block border-t border-[var(--line)] py-5 hover:text-[var(--accent)]">
                  <strong className="font-[var(--font-display)] text-xl">{contest.theme}</strong>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{contest.period}</span>
                </Link>
              ))}
            </ResultSection> : null}
          </div>
        ) : <p className="mt-16 text-center text-sm text-[var(--muted)]">{result.data?.error ?? "검색 결과가 없습니다."}</p>}
      </main>
      <CinematicBottomNav activeTab="overview" layout="fixed" />
    </div>
  );
}

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between border-b border-[var(--line)] pb-3">
        <h2 className="font-[var(--font-display)] text-3xl">{title}</h2><span className="museum-kicker">{count}</span>
      </div>
      {count ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div> : <p className="text-sm text-[var(--muted)]">해당 기록이 없습니다.</p>}
    </section>
  );
}
