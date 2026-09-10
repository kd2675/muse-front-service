import type { Metadata } from "next";

import AdminDashboardClient from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "운영 현황",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
