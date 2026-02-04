import { fetchJson } from "./api";
import type { HomePayload } from "../types/home";
import type { ResponseEnvelope } from "../types/response";

export const fallbackHome: HomePayload = {
  hero: {
    badge: "TODAY'S PICK",
    headline: "경쟁과 감상이 공존하는 디지털 미술관",
    subheadline: "참여형 사진 콘테스트와 영구 전시를 하나의 경험으로",
    description: "엄선된 작품만 전시되는 갤러리에서 오늘의 감동을 만나보세요.",
  },
  todaysPick: [
    {
      id: 1,
      title: "Glass River",
      artist: "Hanna Lee",
      category: "Urban",
      camera: "Leica Q3 · 28mm",
      colorFrom: "#3C2C2C",
      colorTo: "#D9B08C",
    },
    {
      id: 2,
      title: "Echoes of Fog",
      artist: "Minho Park",
      category: "Nature",
      camera: "Canon R5 · 70mm",
      colorFrom: "#1F2A44",
      colorTo: "#6AA1B8",
    },
    {
      id: 3,
      title: "Velvet Night",
      artist: "Sora Kim",
      category: "Night",
      camera: "Sony A7 IV · 50mm",
      colorFrom: "#1C1B1F",
      colorTo: "#8C6FF0",
    },
    {
      id: 4,
      title: "Bloomline",
      artist: "Yuna Cho",
      category: "Macro",
      camera: "Fujifilm X-T5 · 80mm",
      colorFrom: "#2F3A2F",
      colorTo: "#F1C6B3",
    },
  ],
  galleryCategories: [
    {
      key: "nature",
      title: "Nature",
      description: "고요한 자연의 리듬",
      itemCount: 312,
      colorFrom: "#4C5B3C",
      colorTo: "#C6D19C",
    },
    {
      key: "urban",
      title: "Urban",
      description: "도시의 질감과 빛",
      itemCount: 245,
      colorFrom: "#2E2E38",
      colorTo: "#BFA7A0",
    },
    {
      key: "people",
      title: "People",
      description: "인물의 서사",
      itemCount: 198,
      colorFrom: "#3A2E2A",
      colorTo: "#E3B587",
    },
    {
      key: "abstract",
      title: "Abstract",
      description: "형태의 실험",
      itemCount: 154,
      colorFrom: "#2B3A4A",
      colorTo: "#C7A7E5",
    },
    {
      key: "fineart",
      title: "Fine Art",
      description: "작품성 중심",
      itemCount: 221,
      colorFrom: "#2E2A25",
      colorTo: "#D7C7A8",
    },
    {
      key: "night",
      title: "Night",
      description: "밤의 색감",
      itemCount: 176,
      colorFrom: "#1B1D2E",
      colorTo: "#5A7AA6",
    },
  ],
  activeContests: [
    {
      id: 101,
      theme: "빛의 레이어",
      period: "2026.02.01 - 2026.02.07",
      entryFee: 3000,
      prizePool: 420000,
      daysLeft: 4,
    },
    {
      id: 102,
      theme: "도시의 숨",
      period: "2026.02.01 - 2026.02.14",
      entryFee: 3000,
      prizePool: 680000,
      daysLeft: 11,
    },
    {
      id: 103,
      theme: "완벽한 정적",
      period: "2026.02.01 - 2026.02.28",
      entryFee: 3000,
      prizePool: 1250000,
      daysLeft: 25,
    },
  ],
};

export type HomeResult = {
  data: HomePayload;
  isFallback: boolean;
  error?: string;
};

export async function getHomeData(): Promise<HomeResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<HomePayload>>(
    "/api/muse/v1/home",
  );

  if (!data?.data) {
    return {
      data: fallbackHome,
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
}
