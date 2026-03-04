import { fetchJson } from "./api";
import type { OverviewPayload } from "../types/overview";
import type { ResponseEnvelope } from "../types/response";

export type OverviewResult = {
  data: OverviewPayload | null;
  error?: string;
};

export async function getOverviewData(): Promise<OverviewResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<OverviewPayload>>("/api/muse/v1/overview");

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}
