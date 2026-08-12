import type { Metadata } from "next";

import ContestClient from "./ContestClient";

export const metadata: Metadata = {
  title: "사진 공모전",
  description: "작품 접수, 큐레이터 심사, 관객 투표를 거쳐 영구 전시로 이어지는 사진 공모전입니다.",
};

export default function ContestPage() {
  return <ContestClient />;
}
