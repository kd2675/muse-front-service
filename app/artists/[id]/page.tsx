import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArtistClient from "./ArtistClient";
import type { PublicArtist } from "../../types/discovery";
import type { ResponseEnvelope } from "../../types/response";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const fallback = { title: `작가 기록 ${id}`, description: "MUSE 작가의 공개 전시와 수상 기록을 확인합니다." };
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const response = await fetch(`${base}/api/muse/v1/artists/${id}`, { next: { revalidate: 300 } });
    if (!response.ok) return fallback;
    const payload = await response.json() as ResponseEnvelope<PublicArtist>;
    if (!payload.data) return fallback;
    return { title: payload.data.name, description: payload.data.tagline || fallback.description, openGraph: { title: payload.data.name, description: payload.data.tagline || fallback.description } };
  } catch { return fallback; }
}

export default async function ArtistPage({ params }: PageProps) {
  const { id } = await params;
  const artistId = Number(id);
  if (!Number.isInteger(artistId) || artistId <= 0) notFound();
  return <ArtistClient artistId={artistId} />;
}
