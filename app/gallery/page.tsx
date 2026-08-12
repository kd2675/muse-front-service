import type { Metadata } from "next";

import GalleryClient from "./GalleryClient";

export const metadata: Metadata = {
  title: "영구 전시관",
  description: "공모전 이후에도 이어지는 작가별 사진 전시와 큐레이터 기록을 감상하세요.",
};

export default function GalleryPage() {
  return <GalleryClient />;
}
