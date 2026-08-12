import { notFound } from "next/navigation";
import MuseumDetailClient from "./MuseumDetailClient";
import type { Metadata } from "next";
import type { PublicMuseumDetail } from "../../../types/museum";
import type { ResponseEnvelope } from "../../../types/response";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const fallback = { title: `영구 전시 ${id}`, description: "MUSE 작가의 영구 전시를 감상합니다." };
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const response = await fetch(`${base}/api/muse/v1/gallery/museums/${id}`, { next: { revalidate: 300 } });
    if (!response.ok) return fallback;
    const payload = await response.json() as ResponseEnvelope<PublicMuseumDetail>;
    if (!payload.data) return fallback;
    const image = payload.data.artworks[0]?.imageUrl;
    return {
      title: `${payload.data.name} · ${payload.data.ownerName}`,
      description: payload.data.description || payload.data.curatorNote || fallback.description,
      openGraph: { title: payload.data.name, description: payload.data.description || fallback.description, images: image ? [image] : undefined },
    };
  } catch { return fallback; }
}

export default async function MuseumDetailPage({ params }: PageProps) {
  const { id } = await params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound();
  }

  return <MuseumDetailClient museumId={parsedId} />;
}
