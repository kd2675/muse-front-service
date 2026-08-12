import type { Metadata } from "next";

import AdminGalleryClient from "./AdminGalleryClient";

export const metadata: Metadata = {
  title: "전시 운영",
  robots: { index: false, follow: false },
};

export default function AdminGalleryPage() {
  return <AdminGalleryClient />;
}
