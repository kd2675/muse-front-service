"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import PageShell from "../../../components/PageShell";
import TopNav from "../../../components/TopNav";
import { getGalleryCategory } from "../../../lib/gallery";
import { Skeleton, SkeletonText } from "../../../components/Skeleton";

type CategoryClientProps = {
  categoryKey: string;
};

export default function CategoryClient({ categoryKey }: CategoryClientProps) {
  const [query, setQuery] = useState("");
  const [artistFilter, setArtistFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "category", categoryKey],
    queryFn: () => getGalleryCategory(categoryKey),
  });

  const category = data?.data?.category ?? null;
  const artworks = data?.data?.artworks ?? [];
  const error = data?.error;

  const artists = useMemo(() => {
    const unique = new Set(artworks.map((item) => item.artist));
    return ["all", ...Array.from(unique).sort()];
  }, [artworks]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let items = artworks.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.artist.toLowerCase().includes(normalizedQuery);
      const matchesArtist =
        artistFilter === "all" || item.artist === artistFilter;
      return matchesQuery && matchesArtist;
    });

    if (sortBy === "title") {
      items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "oldest") {
      items = [...items].sort((a, b) => a.id - b.id);
    } else {
      items = [...items].sort((a, b) => b.id - a.id);
    }

    return items;
  }, [artworks, query, artistFilter, sortBy]);

  return (
    <PageShell>
      <TopNav />
      {isLoading ? (
        <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="mt-3 h-8 w-48 rounded-[16px]" />
              <SkeletonText className="mt-3 max-w-md" lines={2} />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="ml-auto h-7 w-24 rounded-full" />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
              >
                <Skeleton className="h-28 w-full rounded-[18px]" />
                <Skeleton className="mt-3 h-4 w-24 rounded-full" />
                <Skeleton className="mt-2 h-6 w-2/3 rounded-[14px]" />
              </div>
            ))}
          </div>
        </section>
      ) : category ? (
        <>
          {category && (
            <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                    Gallery Category
                  </p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl">
                    {category.title}
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {category.description}
                  </p>
                </div>
                <span className="rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                  {category.itemCount} pieces
                </span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4 text-xs text-[color:var(--muted)]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="작품/작가 검색"
                  className="h-10 flex-1 rounded-full border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
                />
                <select
                  value={artistFilter}
                  onChange={(event) => setArtistFilter(event.target.value)}
                  className="h-10 rounded-full border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
                >
                  {artists.map((artist) => (
                    <option key={artist} value={artist}>
                      {artist === "all" ? "전체 작가" : artist}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="h-10 rounded-full border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
                >
                  <option value="recent">최근</option>
                  <option value="oldest">오래된</option>
                  <option value="title">제목순</option>
                </select>
                <button
                  className="h-10 rounded-full border border-[color:var(--line)] px-4 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  onClick={() => {
                    setQuery("");
                    setArtistFilter("all");
                    setSortBy("recent");
                  }}
                >
                  필터 초기화
                </button>
                <span className="ml-auto rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                  {filtered.length} results
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="mt-8 rounded-[20px] border border-[color:var(--line)] bg-white/80 p-6 text-sm text-[color:var(--muted)]">
                  조건에 맞는 작품이 없습니다.
                </div>
              ) : (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((artwork) => (
                      <Link
                      key={artwork.id}
                      href={`/gallery/artworks/${artwork.id}`}
                      className="block rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4 transition hover:border-[color:var(--accent)] hover:shadow-[var(--shadow)]"
                      >
                        {artwork.imageUrl ? (
                          <img
                            src={artwork.imageUrl}
                            alt={artwork.title}
                            className="h-28 w-full rounded-[18px] object-cover"
                          />
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center rounded-[18px] border border-dashed border-[color:var(--line)] bg-white text-xs text-[color:var(--muted)]">
                            이미지 없음
                          </div>
                        )}
                      <div className="mt-3 text-xs text-[color:var(--muted)]">
                        {artwork.artist}
                      </div>
                      <h3 className="mt-1 font-[var(--font-display)] text-lg">
                        {artwork.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <div className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 px-6 py-6 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
          카테고리 데이터를 불러오지 못했습니다.
          {error ? ` (${error})` : ""}
        </div>
      )}
    </PageShell>
  );
}
