import type { Metadata } from "next";
import LibraryClient from "./LibraryClient";

export const metadata: Metadata = { title: "나의 관람 기록", robots: { index: false, follow: false } };
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const view = tab === "payments" || tab === "history" ? tab : "bookmarks";
  return <LibraryClient key={view} initialTab={view} />;
}
