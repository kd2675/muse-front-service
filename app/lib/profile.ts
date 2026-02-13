import { fetchJson } from "./api";
import { postJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ProfileSummary } from "../types/profile";

export type ProfileSummaryResult = {
  data: ProfileSummary | null;
  error?: string;
};

export async function getProfileSummary(): Promise<ProfileSummaryResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ProfileSummary>>(
      "/api/muse/v1/profile/summary",
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type ProfileInitializeResult = {
  data: ProfileSummary | null;
  error?: string;
};

export async function initializeProfile(): Promise<ProfileInitializeResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<ProfileSummary>>(
      "/api/muse/v1/profile/initialize",
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
