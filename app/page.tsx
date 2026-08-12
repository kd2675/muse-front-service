import type { Metadata } from "next";

import HomeClient from "./home/HomeClient";

export const metadata: Metadata = {
  title: "입구",
  description: "사진 공모전과 작가의 영구 전시가 이어지는 MUSE의 입구입니다.",
};

export default function HomePage() {
  return <HomeClient />;
}
