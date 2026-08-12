import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContestResultsClient from "./ContestResultsClient";

type PageProps = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `공모전 수상 결과 ${id}`,
    description: "심사를 마친 MUSE 공모전의 수상작과 작가 기록을 공개합니다.",
    openGraph: { title: `MUSE Awards ${id}`, description: "공모전 수상작 공개 전시" },
  };
}
export default async function ContestResultsPage({ params }: PageProps) {
  const { id } = await params;
  const contestId = Number(id);
  if (!Number.isInteger(contestId) || contestId <= 0) notFound();
  return <ContestResultsClient contestId={contestId} />;
}
