import ArtworkClient from "./ArtworkClient";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArtworkPage({ params }: PageProps) {
  const { id } = await params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound();
  }

  return <ArtworkClient id={parsedId} />;
}
