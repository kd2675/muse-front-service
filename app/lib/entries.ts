import { deleteJson, fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ContestEntrySummary } from "../types/contest";

export const fallbackEntries: ContestEntrySummary[] = [
  {
    entryId: "EN-101-1700001",
    contestId: 101,
    contestTheme: "빛의 레이어",
    title: "Layered Dawn",
    imageUrl: null,
    status: "SUBMITTED",
    submittedAt: "2026-02-02 10:45",
  },
  {
    entryId: "EN-102-1700002",
    contestId: 102,
    contestTheme: "도시의 숨",
    title: "Urban Breath",
    imageUrl: null,
    status: "REVIEWING",
    submittedAt: "2026-02-01 22:10",
  },
];

export type EntriesResult = {
  data: ContestEntrySummary[];
  isFallback: boolean;
  error?: string;
};

export async function getMyEntries(): Promise<EntriesResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ContestEntrySummary[]>>(
      "/api/muse/v1/me/entries",
    );

  if (!data?.data) {
    return {
      data: fallbackEntries,
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
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
