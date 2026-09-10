"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import QueryState from "../components/QueryState";
import { getMyMuseums } from "../lib/museum";

export default function MyExhibitions() {
  const query = useQuery({
    queryKey: ["my", "museums"],
    queryFn: getMyMuseums,
  });
  const museums = query.data?.data ?? [];
  return (
    <section className="museum-panel p-7 md:p-8">
      <p className="museum-kicker">My exhibitions</p>
      <h2 className="mt-2 font-[var(--font-display)] text-3xl">나의 전시</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
        작품의 순서와 해설을 담아 나만의 전시를 구성하세요.
      </p>
      {query.isPending ? (
        <QueryState kind="loading" title="전시를 불러오고 있습니다" />
      ) : query.data?.error ? (
        <QueryState
          kind="error"
          title="전시 목록을 확인하지 못했습니다"
          retry={() => void query.refetch()}
        />
      ) : museums.length ? (
        <div className="mt-6 divide-y divide-[var(--line)]">
          {museums.slice(0, 5).map((museum) => (
            <Link
              key={museum.museumId}
              href={`/gallery/my/${museum.museumId}/curate`}
              className="flex items-center justify-between gap-4 py-5"
            >
              <span>
                <strong className="font-[var(--font-display)] text-xl">
                  {museum.name}
                </strong>
                <span className="mt-2 block text-xs text-[var(--muted)]">
                  작품 {museum.artworkCount}점 ·{" "}
                  {museum.publishStatus === "DRAFT"
                    ? "초안"
                    : museum.publishStatus === "SCHEDULED"
                      ? "예약 전시"
                      : "공개 중"}
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <QueryState
          title="첫 전시를 시작하세요"
          description="작품 등록, 심사, 공개 설정을 차례로 진행할 수 있습니다."
        />
      )}
      <Link
        href="/gallery/my"
        className="museum-button-secondary mt-3 w-full px-4 py-3 text-sm"
      >
        전시 만들기·관리하기 →
      </Link>
    </section>
  );
}
