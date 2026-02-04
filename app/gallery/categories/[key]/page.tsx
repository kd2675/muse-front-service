import CategoryClient from "./CategoryClient";

type PageProps = {
  params: { key: string };
};

export default function CategoryPage({ params }: PageProps) {
  return <CategoryClient categoryKey={params.key} />;
}
