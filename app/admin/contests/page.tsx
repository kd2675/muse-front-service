import type { Metadata } from "next";

import AdminContestClient from "./AdminContestClient";

export const metadata: Metadata = {
  title: "공모전 운영",
  robots: { index: false, follow: false },
};

export default async function AdminContestPage({ searchParams }: { searchParams: Promise<{ contestId?: string }> }) {
  const id = Number((await searchParams).contestId);
  return <AdminContestClient key={id || "list"} initialContestId={Number.isSafeInteger(id) && id > 0 ? id : undefined} />;
}
