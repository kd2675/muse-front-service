import { deleteJson, fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ContestEntrySummary } from "../types/contest";

export type EntriesResult = {
  data: ContestEntrySummary[];
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
