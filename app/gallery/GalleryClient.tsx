"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import PageShell from "../components/PageShell";
import TopNav from "../components/TopNav";
import { getGalleryLobby } from "../lib/gallery";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export default function GalleryClient() {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "lobby"],
    queryFn: getGalleryLobby,
  });

  const lobby = data?.data;
  const isFallback = data?.isFallback ?? false;
  const error = data?.error;

  return (
    <PageShell>
      <TopNav />
      {isLoading ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-44 rounded-[18px]" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <SkeletonText className="mt-4 max-w-md" lines={2} />
            <div className="mt-6 grid gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5"
                >
                  <Skeleton className="h-32 w-full rounded-[18px]" />
                  <Skeleton className="mt-4 h-4 w-24 rounded-full" />
                  <Skeleton className="mt-3 h-6 w-2/3 rounded-[14px]" />
                  <Skeleton className="mt-2 h-4 w-1/2 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-36 rounded-[18px]" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            <SkeletonText className="mt-4 max-w-md" lines={2} />
            <div className="mt-6 grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="flex items-center justify-between rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-[16px]" />
                    <div className="grid gap-2">
                      <Skeleton className="h-4 w-28 rounded-full" />
                      <Skeleton className="h-3 w-40 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          {isFallback && (
            <div className="mt-10 rounded-2xl border border-[color:var(--line)] bg-white/70 px-5 py-3 text-xs text-[color:var(--muted)]">
              갤러리 데이터를 불러오지 못해 임시 콘텐츠를 표시하고 있습니다.
              {error ? ` (${error})` : ""}
            </div>
          )}

          <section className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between">
                <h2 className="font-[var(--font-display)] text-3xl">
                  Gallery Lobby
                </h2>
                <span className="rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                  Today’s Highlights
                </span>
              </div>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                오늘의 하이라이트 작품을 먼저 만나보세요.
              </p>
              <div className="mt-6 grid gap-4">
                {(lobby?.highlights ?? []).map((item) => (
                  <Link
                    key={item.id}
                    href={`/gallery/artworks/${item.id}`}
                    className="block rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5 transition hover:border-[color:var(--accent)] hover:shadow-[var(--shadow)]"
                  >
                    <div
                      className="h-32 w-full rounded-[18px]"
                      style={{
                        background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})`,
                      }}
                    />
                    <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--muted)]">
                      <span>{item.category}</span>
                      <span>Featured</span>
                    </div>
                    <h3 className="mt-3 font-[var(--font-display)] text-xl">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {item.artist}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between">
                <h2 className="font-[var(--font-display)] text-3xl">
                  Categories
                </h2>
                <button
                  className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  onClick={() =>
                    dispatch(showToast("전체 카테고리 보기 기능은 준비 중입니다."))
                  }
                >
                  전체 보기
                </button>
              </div>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                전시실을 선택해 영구 전시 작품을 감상하세요.
              </p>
              <div className="mt-6 grid gap-4">
                {(lobby?.categories ?? []).map((category) => (
                  <Link
                    key={category.key}
                    href={`/gallery/categories/${category.key}`}
                    className="flex items-center justify-between rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4 transition hover:border-[color:var(--accent)] hover:shadow-[var(--shadow)]"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-[16px]"
                        style={{
                          background: `linear-gradient(135deg, ${category.colorFrom}, ${category.colorTo})`,
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold">{category.title}</p>
                        <p className="text-xs text-[color:var(--muted)]">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[color:var(--muted)]">
                      {formatNumber(category.itemCount)} pieces
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}
