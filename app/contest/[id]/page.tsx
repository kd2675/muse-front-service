import ContestDetailClient from "./ContestDetailClient";

type PageProps = {
  params: { id: string };
};

export default function ContestDetailPage({ params }: PageProps) {
  const parsedId = Number(params.id);

  if (Number.isNaN(parsedId)) {
    return <ContestDetailClient id={101} />;
  }

  return <ContestDetailClient id={parsedId} />;
}
