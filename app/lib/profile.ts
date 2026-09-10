import { fetchJson, postJson, putJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ProfileSummary } from "../types/profile";

export type ProfileSummaryResult = {
  data: ProfileSummary | null;
  error?: string;
};

export async function updateProfile(payload: { name: string; tagline: string; profileColor: string }): Promise<ProfileSummaryResult> {
  const result = await putJson<ResponseEnvelope<ProfileSummary>>("/api/muse/v1/profile", payload);
  return result.data?.data
    ? { data: result.data.data }
    : { data: null, error: result.backendMapped ?? result.backendMessage ?? result.error ?? "프로필을 저장하지 못했습니다." };
}

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
