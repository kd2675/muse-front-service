import { fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { GalleryLobby, GalleryCategoryDetail } from "../types/gallery";

export const fallbackLobby: GalleryLobby = {
  highlights: [
    {
      id: 201,
      title: "Stillness of Air",
      artist: "Jiyoon Park",
      category: "Fine Art",
      colorFrom: "#1B1B1B",
      colorTo: "#C7B89A",
    },
    {
      id: 202,
      title: "Golden Horizon",
      artist: "Noah Kim",
      category: "Landscape",
      colorFrom: "#4B3B2F",
      colorTo: "#E2C08D",
    },
    {
      id: 203,
      title: "City Pulse",
      artist: "Arin Lee",
      category: "Urban",
      colorFrom: "#1E2A35",
      colorTo: "#6B7C93",
    },
  ],
  categories: [
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
};

export type GalleryLobbyResult = {
  data: GalleryLobby;
  isFallback: boolean;
  error?: string;
};

export async function getGalleryLobby(): Promise<GalleryLobbyResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<GalleryLobby>>("/api/muse/v1/gallery/lobby");

  if (!data?.data) {
    return {
      data: fallbackLobby,
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
}

export const fallbackCategoryDetail: GalleryCategoryDetail = {
  category: {
    key: "nature",
    title: "Nature",
    description: "고요한 자연의 리듬",
    itemCount: 312,
  },
  artworks: [
    {
      id: 301,
      title: "Nature Echo",
      artist: "Hanna Lee",
      colorFrom: "#3C2C2C",
      colorTo: "#D9B08C",
    },
    {
      id: 302,
      title: "Nature Layer",
      artist: "Minho Park",
      colorFrom: "#1F2A44",
      colorTo: "#6AA1B8",
    },
    {
      id: 303,
      title: "Nature Silence",
      artist: "Sora Kim",
      colorFrom: "#1C1B1F",
      colorTo: "#8C6FF0",
    },
    {
      id: 304,
      title: "Nature Frame",
      artist: "Yuna Cho",
      colorFrom: "#2F3A2F",
      colorTo: "#F1C6B3",
    },
  ],
};

export type GalleryCategoryResult = {
  data: GalleryCategoryDetail;
  isFallback: boolean;
  error?: string;
};

export async function getGalleryCategory(
  key: string,
): Promise<GalleryCategoryResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<GalleryCategoryDetail>>(
      `/api/muse/v1/gallery/categories/${key}`,
    );

  if (!data?.data) {
    return {
      data: { ...fallbackCategoryDetail, category: { ...fallbackCategoryDetail.category, key } },
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
}
