import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CurateMuseumClient from "./CurateMuseumClient";

export const metadata: Metadata = { title: "전시 큐레이션", robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ id: string }> };
export default async function CurateMuseumPage({ params }: PageProps) {
  const { id } = await params;
  const museumId = Number(id);
  if (!Number.isInteger(museumId) || museumId <= 0) notFound();
  return <CurateMuseumClient museumId={museumId} />;
}
