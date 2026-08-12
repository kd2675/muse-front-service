import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogClient from "./CatalogClient";

type PageProps = { params: Promise<{ id: string }> };
export const metadata: Metadata = { title: "전시 도록", robots: { index: false, follow: false } };
export default async function CatalogPage({ params }: PageProps) {
  const { id } = await params;
  const museumId = Number(id);
  if (!Number.isInteger(museumId) || museumId <= 0) notFound();
  return <CatalogClient museumId={museumId} />;
}
