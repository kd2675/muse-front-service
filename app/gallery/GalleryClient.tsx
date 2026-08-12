"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import CinematicBottomNav from "../components/CinematicBottomNav";
import MuseumAtmosphere from "../components/MuseumAtmosphere";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import Reveal from "../components/motion/Reveal";
import { getPublicMuseums } from "../lib/museum";
import { APP_ROUTES, galleryMuseumDetailRoute } from "../lib/router";
import { canAccessPath } from "../lib/routeGuard";
import { useAppDispatch } from "../store/hooks";
import { setPendingPath, showToast } from "../store/uiSlice";

export default function GalleryClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["gallery", "museums"],
    queryFn: getPublicMuseums,
  });

  const museums = useMemo(() => data?.data ?? [], [data?.data]);
  const leadMuseum = museums.find((museum) => museum.isFeatured && museum.coverImageUrl)
    ?? museums.find((museum) => museum.coverImageUrl)
    ?? museums[0]
    ?? null;
  const collection = leadMuseum
    ? museums.filter((museum) => museum.museumId !== leadMuseum.museumId)
    : museums;

  const moveToMyMuseum = () => {
    const targetPath = "/gallery/my";
    const guard = canAccessPath(targetPath);
    if (!guard.allowed) {
      dispatch(setPendingPath(`${targetPath}?tab=gallery`));
      dispatch(showToast(guard.reason === "ROLE" ? "이 메뉴에 접근할 권한이 없습니다." : "로그인 후 나의 전시관을 만들 수 있습니다."));
      router.push(guard.reason === "ROLE" ? APP_ROUTES.galleryLobby : "/login");
      return;
    }
    router.push(APP_ROUTES.galleryMyMuseums);
  };

  return (
    <div className="museum-grain relative min-h-screen overflow-hidden bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <MuseumAtmosphere variant="gallery" />
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-32 pt-4 md:px-10 md:pt-6 xl:px-14">
        <OverviewStyleHeader
          title="영구 전시관"
          subtitle="Permanent collection"
          rightSlot={
            <button
              type="button"
              onClick={moveToMyMuseum}
              className="border-b border-[var(--accent)] pb-1 text-xs text-[var(--accent)] transition hover:text-white"
            >
              나의 전시관 관리
            </button>
          }
        />

        {isLoading ? (
          <div className="grid gap-8 py-10 md:grid-cols-2" aria-live="polite">
            <div className="skeleton aspect-[4/5]" />
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton aspect-[4/5]" />)}
            </div>
          </div>
        ) : museums.length > 0 ? (
          <div className="py-10 md:py-14">
            {leadMuseum ? (
              <Reveal>
                <section className="grid gap-7 border-b border-[var(--line)] pb-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-12">
                  <button
                    type="button"
                    onClick={() => router.push(galleryMuseumDetailRoute(leadMuseum.museumId, { focus: true }))}
                    className="museum-stage group relative aspect-[5/4] overflow-hidden bg-[var(--canvas-soft)] text-left md:aspect-[16/10]"
                  >
                    {leadMuseum.coverImageUrl ? (
                      <span
                        role="img"
                        aria-label={`${leadMuseum.name} 대표 작품`}
                        className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.025]"
                        style={{ backgroundImage: `url(${leadMuseum.coverImageUrl})` }}
                      />
                    ) : null}
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(4,5,5,0.78))]" />
                    <span className="absolute inset-x-0 bottom-0 p-6 md:p-9">
                      <span className="museum-kicker text-white/70">Featured room</span>
                      <span className="mt-3 block font-[var(--font-display)] text-4xl text-white md:text-6xl">{leadMuseum.name}</span>
                    </span>
                  </button>
                  <div className="flex flex-col justify-between py-1">
                    <div>
                      <p className="museum-kicker">Curator&apos;s note</p>
                      <h2 className="mt-5 font-[var(--font-display)] text-4xl leading-tight md:text-5xl">한 작가의 시선이 오래 머무는 방</h2>
                      <p className="mt-6 max-w-lg text-sm leading-8 text-[var(--muted)]">
                        {leadMuseum.description || "공모전 이후에도 사라지지 않는 작품의 기록입니다. 전시관에 들어가 작가가 구성한 순서로 감상해 보세요."}
                      </p>
                    </div>
                    <div className="mt-10 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
                      <div className="flex justify-between gap-4">
                        <span>작가 · {leadMuseum.ownerName}</span>
                        <span>{leadMuseum.artworkCount.toLocaleString("ko-KR")} works</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(galleryMuseumDetailRoute(leadMuseum.museumId, { focus: true }))}
                        className="mt-8 flex w-full items-center justify-between text-sm text-[var(--canvas-ink)]"
                      >
                        전시관 입장
                        <span aria-hidden="true" className="text-xl text-[var(--accent)]">→</span>
                      </button>
                    </div>
                  </div>
                </section>
              </Reveal>
            ) : null}

            <Reveal className="pt-[var(--space-section)]" index={1}>
              <section>
                <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
                  <div>
                    <p className="museum-kicker">All rooms</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-3xl">전시관 목록</h2>
                  </div>
                  <p className="text-xs text-[var(--muted-deep)]">{museums.length} rooms</p>
                </div>
                <div className="grid gap-x-5 gap-y-12 pt-7 sm:grid-cols-2 lg:grid-cols-3">
                  {collection.map((museum, index) => (
                    <button
                      key={museum.museumId}
                      type="button"
                      onClick={() => router.push(galleryMuseumDetailRoute(museum.museumId, { focus: true }))}
                      className="group text-left"
                    >
                      <span className={`block overflow-hidden bg-[var(--canvas-soft)] ${index % 3 === 0 ? "aspect-[4/5]" : "aspect-[5/4]"}`}>
                        {museum.coverImageUrl ? (
                          <span
                            role="img"
                            aria-label={`${museum.name} 대표 작품`}
                            className="block h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-[1.025]"
                            style={{ backgroundImage: `url(${museum.coverImageUrl})` }}
                          />
                        ) : (
                          <span className="block h-full w-full bg-[linear-gradient(145deg,#171919,#2b2925)]" />
                        )}
                      </span>
                      <span className="mt-4 flex items-start justify-between gap-4 border-t border-[var(--line)] pt-3">
                        <span>
                          <span className="block font-[var(--font-display)] text-2xl">{museum.name}</span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">{museum.ownerName}</span>
                        </span>
                        <span className="text-[10px] text-[var(--muted-deep)]">{museum.artworkCount}점</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </Reveal>
          </div>
        ) : (
          <section className="flex min-h-[65vh] flex-col items-center justify-center text-center" aria-live="polite">
            <p className="museum-kicker">Empty collection</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl">아직 공개된 전시관이 없습니다.</h2>
            <p className="mt-4 text-sm text-[var(--muted)]">{data?.error ?? "첫 번째 영구 전시를 준비하고 있습니다."}</p>
            {data?.error ? (
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-7 border border-[var(--line-strong)] px-6 py-3 text-sm hover:border-[var(--accent)] disabled:opacity-50"
              >
                {isFetching ? "다시 연결 중" : "다시 시도"}
              </button>
            ) : null}
          </section>
        )}
      </main>
      <CinematicBottomNav activeTab="gallery" layout="fixed" />
    </div>
  );
}
