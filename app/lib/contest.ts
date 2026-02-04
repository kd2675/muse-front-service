import { fetchJson, postJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type {
  ContestDetail,
  ContestEntry,
  ContestEntryCreditStatus,
  ContestSummary,
} from "../types/contest";

export const fallbackContests: ContestSummary[] = [
  {
    id: 101,
    theme: "빛의 레이어",
    period: "2026.02.01 - 2026.02.07",
    entryFee: 3000,
    prizePool: 420000,
    daysLeft: 4,
    status: "ACTIVE",
  },
  {
    id: 102,
    theme: "도시의 숨",
    period: "2026.02.01 - 2026.02.14",
    entryFee: 3000,
    prizePool: 680000,
    daysLeft: 11,
    status: "ACTIVE",
  },
  {
    id: 103,
    theme: "완벽한 정적",
    period: "2026.02.01 - 2026.02.28",
    entryFee: 3000,
    prizePool: 1250000,
    daysLeft: 25,
    status: "ACTIVE",
  },
];

export type ContestListResult = {
  data: ContestSummary[];
  isFallback: boolean;
  error?: string;
};

export async function getContestList(): Promise<ContestListResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestSummary[]>>("/api/muse/v1/contests");

  if (!data?.data) {
    return {
      data: fallbackContests,
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
}

const defaultRules = [
  "1인 1작품만 제출 가능",
  "최소 3000px 이상의 해상도",
  "과도한 합성/AI 생성 금지",
  "투표는 A/B 방식으로 진행",
];

const fallbackContestDetail: ContestDetail = {
  id: 101,
  theme: "빛의 레이어",
  description:
    "도시와 자연의 경계에서 빛이 어떻게 층을 이루는지 기록해보세요.",
  period: "2026.02.01 - 2026.02.07",
  entryFee: 3000,
  prizePool: 420000,
  daysLeft: 4,
  status: "ACTIVE",
  participationCount: 128,
  rules: defaultRules,
};

export type ContestDetailResult = {
  data: ContestDetail;
  isFallback: boolean;
  error?: string;
};

export async function getContestDetail(
  id: number,
): Promise<ContestDetailResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestDetail>>(
      `/api/muse/v1/contests/${id}`,
    );

  if (!data?.data) {
    return {
      data: { ...fallbackContestDetail, id },
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
}

export type ContestEntryCreditStatusResult = {
  data: ContestEntryCreditStatus;
  error?: string;
};

export async function getMyEntryCredits(
  id: number,
): Promise<ContestEntryCreditStatusResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestEntryCreditStatus>>(
      `/api/muse/v1/me/contests/${id}/entry-credits`,
    );

  if (!data?.data) {
    return {
      data: {
        contestId: id,
        credits: 0,
        status: "NONE",
      },
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export async function purchaseEntryCredit(
  id: number,
): Promise<ContestEntryCreditStatusResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<ContestEntryCreditStatus>>(
      `/api/muse/v1/contests/${id}/entry-credits/purchase`,
      {},
    );

  if (!data?.data) {
    return {
      data: {
        contestId: id,
        credits: 0,
        status: "NONE",
      },
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type ContestEntryResult = {
  data: ContestEntry;
  error?: string;
};

export async function submitContestEntry(
  id: number,
  payload: {
    title?: string;
    description?: string;
    fileName: string;
    imageUrl: string;
  },
): Promise<ContestEntryResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<ContestEntry>>(
      `/api/muse/v1/contests/${id}/entries`,
      payload,
    );

  if (!data?.data) {
    return {
      data: {
        contestId: id,
        entryId: "temp",
        fileName: payload.fileName ?? "unknown",
        imageUrl: payload.imageUrl,
        status: "SUBMITTED",
      },
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}
