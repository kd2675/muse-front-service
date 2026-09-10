"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";

import CinematicBottomNav from "../components/CinematicBottomNav";
import MuseumAtmosphere from "../components/MuseumAtmosphere";
import QueryState from "../components/QueryState";
import SiteNavigation from "../components/SiteNavigation";
import { getHomeData } from "../lib/home";

const journey = [
  {
    step: "01",
    title: "당신의 시선을 출품하세요",
    description: "공모전의 주제와 일정을 살펴보고, 작품을 준비해 접수합니다.",
    label: "참여할 공모전 찾기",
    href: "/contest",
  },
  {
    step: "02",
    title: "다른 시선에 머물러 보세요",
    description:
      "공개된 작품을 감상하고, 투표 기간에 마음에 닿은 사진을 선택합니다.",
    label: "오늘의 전시 둘러보기",
    href: "/overview",
  },
  {
    step: "03",
    title: "작품을 오래 남겨두세요",
    description:
      "작가 기록을 쌓고, 사진의 순서와 해설을 담아 나만의 전시를 구성합니다.",
    label: "나의 전시 만들기",
    href: "/gallery/my",
  },
];

export default function HomeClient() {
  const query = useQuery({ queryKey: ["home"], queryFn: getHomeData });
  const payload = query.data?.data;
  const museum =
    payload?.featuredMuseums.find((item) => item.coverImageUrl) ??
    payload?.featuredMuseums[0];

  return (
    <div className="relative min-h-dvh bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <MuseumAtmosphere variant="lobby" />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto w-full max-w-[1600px] px-5 pb-28 md:px-10 xl:px-14"
      >
        <SiteNavigation />
        <section className="grid gap-8 py-8 lg:min-h-[72vh] lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-14 lg:py-14">
          <div>
            <p className="museum-kicker">사진이 전시가 되는 곳</p>
            <h1 className="mt-5 max-w-2xl break-keep text-balance font-[var(--font-display)] text-[clamp(2.5rem,4.4vw,4.5rem)] font-normal leading-[1.15]">
              한 장의 시선,
              <br />
              오래 남을 이야기.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--muted)] md:text-base md:leading-8">
              공모전에서 만난 사진이 작가의 기록이 되고,
              <br className="hidden sm:block" /> 누구나 찾아올 수 있는 전시로
              이어집니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/contest"
                className="museum-button-primary px-6 py-3 text-sm"
              >
                공모전 참여하기{" "}
                <span aria-hidden="true" className="ml-5">
                  ↗
                </span>
              </Link>
              <Link
                href="/gallery"
                className="museum-button-secondary px-6 py-3 text-sm"
              >
                전시 감상하기
              </Link>
            </div>
            <Link
              href="/overview"
              className="mt-6 inline-flex min-h-11 items-center text-xs text-[var(--muted)] hover:text-[var(--accent)]"
            >
              오늘의 MUSE 둘러보기{" "}
              <span aria-hidden="true" className="ml-3">
                →
              </span>
            </Link>
          </div>
          <div className="museum-stage min-w-0 bg-[var(--canvas-raised)]">
            {query.isPending ? (
              <div
                className="skeleton aspect-[5/4]"
                role="status"
                aria-label="오늘의 전시를 불러오는 중"
              />
            ) : query.data?.error || query.isError ? (
              <QueryState
                kind="error"
                title="전시 소식을 불러오지 못했습니다"
                description="잠시 후 다시 확인해 주세요. 공모전과 전시는 메뉴에서 둘러볼 수 있습니다."
                retry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            ) : museum ? (
              <Link
                href={`/gallery/museums/${museum.museumId}`}
                className="group block"
              >
                <div className="relative aspect-[5/4] overflow-hidden">
                  {museum.coverImageUrl ? (
                    <Image
                      src={museum.coverImageUrl}
                      alt={`${museum.name} 대표 작품`}
                      fill
                      preload
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-[var(--font-display)] text-4xl text-[var(--muted)]">
                      {museum.name}
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between gap-5 border-t border-[var(--line)] p-5 md:p-7">
                  <div>
                    <p className="museum-kicker">지금 만날 수 있는 전시</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-2xl md:text-3xl">
                      {museum.name}
                    </h2>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {museum.ownerName} · 작품 {museum.artworkCount}점
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-2xl text-[var(--accent)]"
                  >
                    ↗
                  </span>
                </div>
              </Link>
            ) : (
              <QueryState
                title="다음 전시를 준비하고 있습니다"
                description="공모전과 작가들의 기록을 먼저 둘러보세요."
                action={{ href: "/contest", label: "공모전 보기" }}
              />
            )}
          </div>
        </section>
        <section
          aria-labelledby="muse-journey"
          className="border-t border-[var(--line)] py-10 md:py-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="museum-kicker">처음 오셨나요?</p>
              <h2
                id="muse-journey"
                className="mt-3 font-[var(--font-display)] text-3xl"
              >
                사진을 만나는 세 가지 방법
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)]">
              감상은 누구나, 기록은 나의 작가실에서.
            </p>
          </div>
          <div className="mt-8 grid gap-7 md:grid-cols-3">
            {journey.map((item) => (
              <div key={item.step} className="muse-step">
                <span className="muse-step-number">{item.step}</span>
                <div>
                  <h3 className="font-[var(--font-display)] text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {item.description}
                  </p>
                  <Link
                    href={item.href}
                    className="mt-3 inline-flex min-h-11 items-center text-sm text-[var(--accent)]"
                  >
                    {item.label}{" "}
                    <span aria-hidden="true" className="ml-3">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
        <footer className="flex flex-wrap justify-between gap-4 border-t border-[var(--line)] py-6 text-xs text-[var(--muted)]">
          <span>MUSE · Photography lives on</span>
          <Link href="/search">작가·작품·전시 검색 →</Link>
        </footer>
      </main>
      <CinematicBottomNav activeTab="home" layout="fixed" />
    </div>
  );
}
