import { notFound } from "next/navigation";
import MuseumDetailClient from "./MuseumDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MuseumDetailPage({ params }: PageProps) {
  const { id } = await params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound();
  }

  return <MuseumDetailClient museumId={parsedId} />;
}
