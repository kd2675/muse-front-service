import type { Metadata } from "next";

import AdminContestClient from "./AdminContestClient";

export const metadata: Metadata = {
  title: "공모전 운영",
  robots: { index: false, follow: false },
};

export default function AdminContestPage() {
  return <AdminContestClient />;
}
