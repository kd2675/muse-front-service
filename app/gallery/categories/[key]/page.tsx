import CategoryClient from "./CategoryClient";

type PageProps = {
  params: Promise<{ key: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const { key } = await params;
  return <CategoryClient categoryKey={key} />;
}
