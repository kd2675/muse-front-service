import { deleteJson, fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ContestEntrySummary, ContestEntrySummaryPage } from "../types/contest";

export type EntriesResult = {
  data: ContestEntrySummary[];
  error?: string;
};

export type EntriesPageResult = {
  data: ContestEntrySummaryPage;
  error?: string;
};

export async function getMyEntries(): Promise<EntriesResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestEntrySummary[]>>(
      "/api/muse/v1/me/entries",
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export async function getMyEntriesPage(params?: {
  page?: number;
  size?: number;
}): Promise<EntriesPageResult> {
  const page = params?.page ?? 1;
  const size = params?.size ?? 10;
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestEntrySummaryPage>>(
      `/api/muse/v1/me/entries/page?${query.toString()}`,
    );

  if (!data?.data) {
    return {
      data: {
        items: [],
        page,
        size,
        totalElements: 0,
        totalPages: 1,
        hasNext: false,
      },
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export async function deleteEntry(entryId: string): Promise<{
  error?: string;
}> {
  const { data, error, backendMapped, backendMessage } =
    await deleteJson<ResponseEnvelope<null>>(
      `/api/muse/v1/me/entries/${entryId}`,
    );

  if (!data?.success) {
    return { error: backendMapped ?? backendMessage ?? error };
  }

  return {};
}
