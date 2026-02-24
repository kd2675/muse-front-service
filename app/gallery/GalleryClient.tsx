"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Mousewheel } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import PageShell from "../components/PageShell";
import TopNav from "../components/TopNav";
import { Skeleton } from "../components/Skeleton";
import { getUserFromToken, isAdminRole } from "../lib/auth";
import { getPublicMuseums } from "../lib/museum";
import { APP_ROUTES, galleryMuseumDetailRoute } from "../lib/router";

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const shuffle = <T,>(source: T[]): T[] => {
  const copied = [...source];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }
  return copied;
};

export default function GalleryClient() {
  const router = useRouter();
  const swiperRef = useRef<SwiperType | null>(null);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const authUser = isHydrated ? getUserFromToken() : null;
  const isAdmin = isAdminRole(authUser?.role);
  const isLoggedIn = !!authUser;

  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "museums"],
    queryFn: getPublicMuseums,
  });

  const museums = useMemo(() => data?.data ?? [], [data?.data]);
  const error = data?.error;

  const featuredMuseums = useMemo(
    () => museums.filter((museum) => museum.isFeatured),
    [museums],
  );

  const totalArtworkCount = useMemo(
    () => museums.reduce((sum, museum) => sum + museum.artworkCount, 0),
    [museums],
  );

  const showcaseMuseums = useMemo(() => {
    const base = featuredMuseums.length > 0 ? featuredMuseums : museums;
    if (!isHydrated) {
      return base;
    }
    return shuffle(base);
  }, [featuredMuseums, museums, isHydrated]);

  const sliderMuseums = useMemo(() => {
    if (showcaseMuseums.length > 0) {
      return showcaseMuseums;
    }
    return museums;
  }, [showcaseMuseums, museums]);

  return (
    <PageShell>
      <TopNav />

      <section className="relative mt-8 overflow-hidden rounded-[34px] border border-[rgba(37,31,26,0.14)] bg-[linear-gradient(145deg,#faf7f1_0%,#f6f1e8_48%,#efe8dc_100%)] p-8 shadow-[var(--shadow)] md:p-10">
        <div className="pointer-events-none absolute -top-20 -left-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(156,117,64,0.2)_0%,_rgba(156,117,64,0)_72%)]" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(31,87,130,0.14)_0%,_rgba(31,87,130,0)_72%)]" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.34em] text-[#7a5b2e]">
              Museum Lobby
            </p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl leading-tight text-[#221912] md:text-5xl">
              큐레이션된 유저 뮤지엄 전시관
            </h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted)] md:text-base">
              입장 후 바로 전시 집중 모드로 이동할 수 있도록, 공개 뮤지엄을
              미술관 동선처럼 정리했습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => router.push(APP_ROUTES.galleryMyMuseums)}
                className="rounded-full border border-[rgba(34,25,18,0.22)] bg-white/80 px-4 py-2 text-xs font-semibold text-[#3c322a] transition hover:bg-white"
              >
                내 뮤지엄 관리
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push(APP_ROUTES.adminGalleryManage)}
                className="rounded-full border border-[#1d4ed8] bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] transition hover:bg-[#1d4ed8]"
              >
                어드민 모더레이션
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3">
          <article className="rounded-[18px] border border-[rgba(34,25,18,0.12)] bg-white/85 p-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--muted)]">
              공개 뮤지엄
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#241c16]">
              {formatNumber(museums.length)}
            </p>
          </article>
          <article className="rounded-[18px] border border-[rgba(34,25,18,0.12)] bg-white/85 p-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--muted)]">
              전시 작품
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#241c16]">
              {formatNumber(totalArtworkCount)}
            </p>
          </article>
          <article className="rounded-[18px] border border-[rgba(34,25,18,0.12)] bg-white/85 p-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--muted)]">
              메인 큐레이션
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#241c16]">
              {formatNumber(featuredMuseums.length)}
            </p>
          </article>
        </div>
      </section>

      {isLoading ? (
        <section className="mt-8 grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <article className="rounded-[28px] border border-[color:var(--line)] bg-white/85 p-5">
            <Skeleton className="h-72 w-full rounded-[20px]" />
            <Skeleton className="mt-4 h-7 w-1/2 rounded-full" />
            <Skeleton className="mt-3 h-4 w-3/4 rounded-full" />
          </article>
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <article
                key={index}
                className="rounded-[20px] border border-[color:var(--line)] bg-white/85 p-4"
              >
                <Skeleton className="h-14 w-full rounded-[14px]" />
                <Skeleton className="mt-3 h-4 w-2/3 rounded-full" />
              </article>
            ))}
          </div>
        </section>
      ) : museums.length > 0 ? (
        <>
          <section className="mt-8 rounded-[34px] border border-[rgba(34,25,18,0.16)] bg-[linear-gradient(160deg,#fcfaf5_0%,#f6efe4_52%,#efe6d8_100%)] p-6 shadow-[var(--shadow)] md:p-8">
            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <article className="rounded-[24px] border border-[rgba(34,25,18,0.14)] bg-white/86 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a5b2e]">
                  Welcome
                </p>
                <h3 className="mt-3 font-[var(--font-display)] text-4xl leading-tight text-[#231a13]">
                  Current Exhibitions
                  <br />
                  & Museum Programs
                </h3>
                <p className="mt-5 text-sm leading-7 text-[color:var(--muted)]">
                  유저가 직접 운영하는 전시관을 큐레이션 형태로 탐색하세요.
                  오른쪽 전시 스트립은 휠 스크롤과 좌우 버튼으로 이동할 수
                  있습니다.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const section = document.getElementById("gallery-exhibition-strip");
                      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="rounded-full border border-[rgba(123,91,52,0.32)] bg-[rgba(255,246,230,0.9)] px-4 py-2 text-xs text-[#7f5c34] transition hover:bg-[rgba(250,236,211,0.95)]"
                  >
                    현재 전시 바로가기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const section = document.getElementById("gallery-collection-floor");
                      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="rounded-full border border-[rgba(34,25,18,0.18)] bg-white/80 px-4 py-2 text-xs text-[#5f5448] transition hover:bg-white"
                  >
                    전체 전시관 바로가기
                  </button>
                </div>
              </article>

              <div id="gallery-exhibition-strip" className="rounded-[24px] border border-[rgba(34,25,18,0.14)] bg-white/88 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#8b6742]">
                      Curated Strip
                    </p>
                    <p className="mt-1 font-[var(--font-display)] text-xl text-[#2a2018]">
                      전시 스트립
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => swiperRef.current?.slidePrev()}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(123,91,52,0.3)] bg-[rgba(255,246,230,0.9)] text-[#7f5c34] transition hover:bg-[rgba(250,236,211,0.95)]"
                      aria-label="이전 전시"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => swiperRef.current?.slideNext()}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(123,91,52,0.3)] bg-[rgba(255,246,230,0.9)] text-[#7f5c34] transition hover:bg-[rgba(250,236,211,0.95)]"
                      aria-label="다음 전시"
                    >
                      →
                    </button>
                  </div>
                </div>

                <Swiper
                  modules={[Mousewheel]}
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                  }}
                  mousewheel={{
                    forceToAxis: false,
                    releaseOnEdges: true,
                    sensitivity: 0.8,
                  }}
                  spaceBetween={16}
                  slidesPerView={1.16}
                  breakpoints={{
                    560: { slidesPerView: 1.5 },
                    768: { slidesPerView: 1.85 },
                    1024: { slidesPerView: 2.15 },
                    1280: { slidesPerView: 2.5 },
                  }}
                  className="mt-4"
                >
                  {sliderMuseums.map((museum) => (
                    <SwiperSlide key={museum.museumId} className="!h-auto">
                      <article className="overflow-hidden rounded-[18px] border border-[rgba(34,25,18,0.14)] bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(galleryMuseumDetailRoute(museum.museumId, { focus: true }))
                          }
                          className="w-full text-left"
                        >
                          {museum.coverImageUrl ? (
                            <div className="relative">
                              <img
                                src={museum.coverImageUrl}
                                alt={museum.name}
                                className="h-52 w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(21,17,14,0.56)_0%,rgba(21,17,14,0.08)_60%)]" />
                            </div>
                          ) : (
                            <div className="flex h-52 items-center justify-center bg-[linear-gradient(140deg,#d9d2c6_0%,#f2ece1_100%)] text-xs text-[#6a6156]">
                              대표 이미지 없음
                            </div>
                          )}
                          <div className="p-4">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-[#8b6742]">
                              Exhibitions
                            </p>
                            <h4 className="mt-1 font-[var(--font-display)] text-2xl leading-tight text-[#2a2018]">
                              {museum.name}
                            </h4>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                              {museum.ownerName}
                            </p>
                          </div>
                        </button>
                      </article>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          </section>

          <section id="gallery-collection-floor" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a5b2e]">
                  Collection Floor
                </p>
                <h3 className="mt-2 font-[var(--font-display)] text-3xl text-[#211811]">
                  All Public Museums
                </h3>
              </div>
              <span className="rounded-full border border-[rgba(34,25,18,0.14)] bg-white/75 px-4 py-2 text-xs text-[color:var(--muted)]">
                총 {formatNumber(museums.length)}개 전시관
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {museums.map((museum) => (
                <button
                  type="button"
                  key={museum.museumId}
                  onClick={() =>
                    router.push(galleryMuseumDetailRoute(museum.museumId, { focus: true }))
                  }
                  className="group overflow-hidden rounded-[22px] border border-[rgba(34,25,18,0.12)] bg-white text-left transition hover:border-[rgba(54,98,167,0.4)] hover:shadow-[0_14px_30px_rgba(34,63,111,0.14)]"
                >
                  {museum.coverImageUrl ? (
                    <div className="relative">
                      <img
                        src={museum.coverImageUrl}
                        alt={museum.name}
                        className="h-44 w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(16,14,12,0.52)_0%,rgba(16,14,12,0)_58%)]" />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-[linear-gradient(140deg,#d9d2c6_0%,#f2ece1_100%)] text-xs text-[#6a6156]">
                      대표 이미지 없음
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-[var(--font-display)] text-2xl leading-tight text-[#231a13]">
                        {museum.name}
                      </h4>
                      {museum.isFeatured && (
                        <span className="rounded-full border border-[rgba(54,98,167,0.3)] bg-[rgba(54,98,167,0.08)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#365a9d]">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{museum.ownerName}</p>
                    <p className="mt-3 line-clamp-2 text-sm text-[color:var(--muted)]">
                      {museum.description || "뮤지엄 소개가 없습니다."}
                    </p>
                    <p className="mt-3 text-xs text-[color:var(--muted)]">
                      작품 {formatNumber(museum.artworkCount)}점
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-8 rounded-[28px] border border-[rgba(34,25,18,0.16)] bg-white/85 px-6 py-12 text-center shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.32em] text-[#7a5b2e]">
            Empty Gallery
          </p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl text-[#241c16]">
            아직 공개된 전시관이 없습니다.
          </h3>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            첫 번째 뮤지엄이 공개되면 이곳이 메인 전시 동선으로 채워집니다.
          </p>
        </section>
      )}

      {!isLoading && error && museums.length === 0 && (
        <p className="mt-4 text-xs text-red-500">{error}</p>
      )}
    </PageShell>
  );
}
