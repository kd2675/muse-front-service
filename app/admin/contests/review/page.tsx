import type { Metadata } from "next";

import AdminContestReviewClient from "./AdminContestReviewClient";

export const metadata: Metadata = {
  title: "출품 심사",
  robots: { index: false, follow: false },
};

export default function AdminContestReviewPage() {
  return <AdminContestReviewClient />;
}
