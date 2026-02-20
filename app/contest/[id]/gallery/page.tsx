import { notFound } from "next/navigation";
import ContestGalleryClient from "./ContestGalleryClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContestGalleryPage({ params }: PageProps) {
  const { id } = await params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound();
  }

  return <ContestGalleryClient id={parsedId} />;
}

