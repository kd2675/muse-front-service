import ContestDetailClient from "./ContestDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ResponseEnvelope } from "../../types/response";
import type { ContestDetail } from "../../types/contest";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const fallback = { title: `공모전 ${id}`, description: "MUSE 사진 공모전의 일정과 출품작을 확인합니다." };
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const response = await fetch(`${base}/api/muse/v1/contests/${id}`, { next: { revalidate: 300 } });
    if (!response.ok) return fallback;
    const payload = await response.json() as ResponseEnvelope<ContestDetail>;
    if (!payload.data) return fallback;
    return { title: payload.data.theme, description: payload.data.description, openGraph: { title: payload.data.theme, description: payload.data.description } };
  } catch { return fallback; }
}

export default async function ContestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound();
  }

  return <ContestDetailClient id={parsedId} />;
}
