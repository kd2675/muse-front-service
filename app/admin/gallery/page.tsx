import type { Metadata } from "next";

import AdminGalleryClient from "./AdminGalleryClient";

export const metadata: Metadata = {
  title: "전시 운영",
  robots: { index: false, follow: false },
};

export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<{ museumId?: string }> }) {
  const id = Number((await searchParams).museumId);
  return <AdminGalleryClient key={id || "list"} initialMuseumId={Number.isSafeInteger(id) && id > 0 ? id : undefined} />;
}
