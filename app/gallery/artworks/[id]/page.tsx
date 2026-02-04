import ArtworkClient from "./ArtworkClient";

type PageProps = {
  params: { id: string };
};

export default function ArtworkPage({ params }: PageProps) {
  const parsedId = Number(params.id);

  if (Number.isNaN(parsedId)) {
    return <ArtworkClient id={201} />;
  }

  return <ArtworkClient id={parsedId} />;
}
