import type { Metadata } from "next";

import MyMuseumClient from "./MyMuseumClient";

export const metadata: Metadata = {
  title: "내 전시실",
  robots: { index: false, follow: false },
};

export default async function MyMuseumPage({ searchParams }: { searchParams: Promise<{ museumId?: string }> }) {
  const query = await searchParams;
  const id = Number(query.museumId);
  return <MyMuseumClient key={query.museumId || "default"} initialMuseumId={Number.isSafeInteger(id) && id > 0 ? id : undefined} />;
}
