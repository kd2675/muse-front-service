import type { Metadata } from "next";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "작품과 작가 찾기",
  description: "MUSE의 작가, 전시, 공모전과 작품을 한 번에 탐색합니다.",
};

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: PageProps) {
  const candidate = (await searchParams).q?.trim() ?? "";
  const initialQuery = candidate.length >= 2 && candidate.length <= 80 ? candidate : "";
  return <SearchClient key={initialQuery} initialQuery={initialQuery} />;
}
