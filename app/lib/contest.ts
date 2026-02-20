import { fetchJson, postJson, putJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type {
  AdminContest,
  AdminContestUpsertRequest,
  ContestDetail,
  ContestEntry,
  ContestEntryCreditStatus,
  ContestFinalizeResult,
  ContestPublicEntry,
  ContestRankingItem,
  ContestSummary,
  AdminContestEntryReviewStatus,
  ContestVoteResponse,
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
  data: ContestEntry | null;
  error?: string;
};

export async function submitContestEntry(
  id: number,
  payload: {
    title?: string;
    description?: string;
    fileName: string;
    imageUrl: string;
    fileSizeBytes: number;
    imageWidthPx: number;
    imageHeightPx: number;
  },
): Promise<ContestEntryResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<ContestEntry>>(
      `/api/muse/v1/contests/${id}/entries`,
      payload,
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type ContestEntriesResult = {
  data: ContestPublicEntry[];
  error?: string;
};

export async function getContestEntries(
  id: number,
): Promise<ContestEntriesResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestPublicEntry[]>>(
      `/api/muse/v1/contests/${id}/entries`,
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type ContestVoteResult = {
  data: ContestVoteResponse | null;
  error?: string;
};

export async function voteContestEntry(
  id: number,
  payload: { entryId: string },
): Promise<ContestVoteResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<ContestVoteResponse>>(
      `/api/muse/v1/contests/${id}/votes`,
      payload,
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type ContestRankingResult = {
  data: ContestRankingItem[];
  error?: string;
};

export async function getContestRanking(
  id: number,
): Promise<ContestRankingResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestRankingItem[]>>(
      `/api/muse/v1/contests/${id}/ranking`,
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminContestListResult = {
  data: AdminContest[];
  error?: string;
};

export async function getAdminContestList(): Promise<AdminContestListResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<AdminContest[]>>(
      "/api/muse/v1/admin/contests",
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminContestResult = {
  data: AdminContest | null;
  error?: string;
};

export async function createAdminContest(
  payload: AdminContestUpsertRequest,
): Promise<AdminContestResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<AdminContest>>(
      "/api/muse/v1/admin/contests",
      payload,
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export async function updateAdminContest(
  id: number,
  payload: AdminContestUpsertRequest,
): Promise<AdminContestResult> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<AdminContest>>(
      `/api/muse/v1/admin/contests/${id}`,
      payload,
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type ContestFinalizeApiResult = {
  data: ContestFinalizeResult | null;
  error?: string;
};

export async function finalizeContest(
  id: number,
): Promise<ContestFinalizeApiResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<ContestFinalizeResult>>(
      `/api/muse/v1/admin/contests/${id}/finalize`,
      {},
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminContestEntriesResult = {
  data: ContestPublicEntry[];
  error?: string;
};

export async function getAdminContestEntries(
  id: number,
): Promise<AdminContestEntriesResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestPublicEntry[]>>(
      `/api/muse/v1/admin/contests/${id}/entries`,
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminContestEntryUpdateResult = {
  data: ContestPublicEntry | null;
  error?: string;
};

export async function updateAdminContestEntryStatus(
  contestId: number,
  entryId: string,
  status: AdminContestEntryReviewStatus,
): Promise<AdminContestEntryUpdateResult> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<ContestPublicEntry>>(
      `/api/muse/v1/admin/contests/${contestId}/entries/${entryId}/status`,
      { status },
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}
