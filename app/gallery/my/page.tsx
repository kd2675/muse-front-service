import type { Metadata } from "next";

import MyMuseumClient from "./MyMuseumClient";

export const metadata: Metadata = {
  title: "내 전시실",
  robots: { index: false, follow: false },
};

export default function MyMuseumPage() {
  return <MyMuseumClient />;
}
