"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
import TopNav from "../components/TopNav";
import { getGalleryLobby } from "../lib/gallery";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { getUserFromToken, isAdminRole } from "../lib/auth";
import {
  APP_ROUTES,
  galleryArtworkDetailRoute,
  galleryCategoryRoute,
} from "../lib/router";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export default function GalleryClient() {
  const router = useRouter();
  const isAdmin = isAdminRole(getUserFromToken()?.role);
  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "lobby"],
    queryFn: getGalleryLobby,
  });

  const lobby = data?.data ?? null;
  const error = data?.error;
  const highlightCount = lobby?.highlights?.length ?? 0;
  const totalCategoryPieces = (lobby?.categories ?? []).reduce(
    (sum, category) => sum + category.itemCount,
    0,
  );
  const hasAnyArtwork = highlightCount > 0 || totalCategoryPieces > 0;

  return (
    <PageShell>
      <TopNav />
      {isAdmin && (
        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-[#1d4ed8] bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] ring-2 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-[0_14px_28px_rgba(29,78,216,0.34)]"
            onClick={() => router.push(APP_ROUTES.adminGalleryManage)}
          >
            <span className="rounded-full border border-white/45 px-2 py-0.5 text-[10px] tracking-[0.2em]">ADMIN</span>
            <span>갤러리 관리</span>
          </button>
        </div>
      )}
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
      ) : lobby ? (
        <>
          {!hasAnyArtwork ? (
            <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 p-10 text-center shadow-[var(--shadow)]">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                Gallery Empty
              </p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl">전시 중인 작품이 없습니다</h2>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                아직 등록된 갤러리 작품이 없습니다. 작품이 추가되면 여기에서 바로 확인할 수 있습니다.
              </p>
            </section>
          ) : (
            <section className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
                <div className="flex items-center justify-between">
                  <h2 className="font-[var(--font-display)] text-3xl">
                    Gallery Lobby
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                      Today’s Highlights
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  오늘의 하이라이트 작품을 먼저 만나보세요.
                </p>
                <div className="mt-6 grid gap-4">
                  {highlightCount === 0 ? (
                    <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 px-4 py-5 text-sm text-[color:var(--muted)]">
                      하이라이트 작품이 아직 없습니다.
                    </div>
                  ) : (
                    (lobby?.highlights ?? []).map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => router.push(galleryArtworkDetailRoute(item.id))}
                        className="block w-full rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5 text-left transition hover:border-[color:var(--accent)] hover:shadow-[var(--shadow)]"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-32 w-full rounded-[18px] object-cover"
                          />
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center rounded-[18px] border border-dashed border-[color:var(--line)] bg-white text-xs text-[color:var(--muted)]">
                            이미지 없음
                          </div>
                        )}
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
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div
                id="categories"
                className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-[var(--font-display)] text-3xl">
                    Categories
                  </h2>
                  <button
                    type="button"
                    className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    onClick={() =>
                      router.push(APP_ROUTES.galleryCategoriesSection)
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
                    <button
                      type="button"
                      key={category.key}
                      onClick={() =>
                        router.push(galleryCategoryRoute(category.key))
                      }
                      className="flex w-full items-center justify-between rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4 text-left transition hover:border-[color:var(--accent)] hover:shadow-[var(--shadow)]"
                    >
                      <div>
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
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 px-6 py-6 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
          갤러리 데이터를 불러오지 못했습니다.
          {error ? ` (${error})` : ""}
        </div>
      )}
    </PageShell>
  );
}
