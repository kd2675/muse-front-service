import { fetchJson, postJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type {
  ContestDetail,
  ContestEntry,
  ContestEntryCreditStatus,
  ContestSummary,
} from "../types/contest";

export type ContestListResult = {
  data: ContestSummary[];
  error?: string;
};

export async function getContestList(): Promise<ContestListResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestSummary[]>>("/api/muse/v1/contests");

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type ContestDetailResult = {
  data: ContestDetail | null;
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
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
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
