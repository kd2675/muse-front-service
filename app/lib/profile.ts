import { fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ProfileSummary } from "../types/profile";

export const fallbackProfile: ProfileSummary = {
  artist: {
    id: 501,
    name: "Minji Han",
    tagline: "빛과 질감을 탐구하는 사진가",
    profileColor: "#2B2A28",
  },
  stats: {
    totalWorks: 42,
    totalAwards: 5,
    totalEarnings: 1530000,
    followers: 1280,
  },
  portfolio: [
    {
      id: 901,
      title: "Silk City",
      category: "Urban",
      colorFrom: "#1E2A35",
      colorTo: "#6B7C93",
    },
    {
      id: 902,
      title: "Midnight Bloom",
      category: "Night",
      colorFrom: "#1B1D2E",
      colorTo: "#5A7AA6",
    },
    {
      id: 903,
      title: "Quiet Spring",
      category: "Nature",
      colorFrom: "#4C5B3C",
      colorTo: "#C6D19C",
    },
  ],
  awards: [
    {
      id: 701,
      contest: "빛의 레이어",
      rank: "1st",
      prize: "500,000원",
      period: "2026.01",
    },
    {
      id: 702,
      contest: "도시의 숨",
      rank: "2nd",
      prize: "300,000원",
      period: "2025.12",
    },
  ],
};

export type ProfileSummaryResult = {
  data: ProfileSummary;
  isFallback: boolean;
  error?: string;
};

export async function getProfileSummary(): Promise<ProfileSummaryResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ProfileSummary>>(
      "/api/muse/v1/profile/summary",
    );

  if (!data?.data) {
    return {
      data: fallbackProfile,
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
}
