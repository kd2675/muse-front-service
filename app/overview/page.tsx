import type { Metadata } from "next";

import OverviewClient from "./OverviewClient";

export const metadata: Metadata = {
  title: "오늘의 전시",
  description: "현재 진행 중인 사진 공모전과 MUSE 큐레이션을 한눈에 살펴보세요.",
};

export default function OverviewPage() {
  return <OverviewClient />;
}
