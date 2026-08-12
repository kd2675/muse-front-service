import { deleteJson, fetchJson, postJson, putJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type {
  AdminMuseum,
  AdminMuseumArtwork,
  MyMuseum,
  MyMuseumArtwork,
  PublicMuseumDetail,
  PublicMuseumSummary,
} from "../types/museum";

type ApiResult<T> = {
  data: T;
  error?: string;
};

type NullableApiResult<T> = {
  data: T | null;
  error?: string;
};

function resolveError(payload: {
  error?: string;
  backendMapped?: string;
  backendMessage?: string;
}) {
  return payload.backendMapped ?? payload.backendMessage ?? payload.error;
}

export async function getPublicMuseums(): Promise<ApiResult<PublicMuseumSummary[]>> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<PublicMuseumSummary[]>>(
      "/api/muse/v1/gallery/museums",
    );
  if (!data?.data) {
    return { data: [], error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function getPublicMuseumDetail(
  museumId: number,
): Promise<NullableApiResult<PublicMuseumDetail>> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<PublicMuseumDetail>>(
      `/api/muse/v1/gallery/museums/${museumId}`,
    );
  if (!data?.data) {
    return { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function getMyMuseums(): Promise<ApiResult<MyMuseum[]>> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<MyMuseum[]>>("/api/muse/v1/me/museums");
  if (!data?.data) {
    return { data: [], error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function createMyMuseum(payload: {
  name: string;
  description?: string;
}): Promise<NullableApiResult<MyMuseum>> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<MyMuseum>>("/api/muse/v1/me/museums", payload);
  if (!data?.data) {
    return { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function updateMyMuseum(
  museumId: number,
  payload: {
    name: string;
    description?: string;
  },
): Promise<NullableApiResult<MyMuseum>> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<MyMuseum>>(
      `/api/muse/v1/me/museums/${museumId}`,
      payload,
    );
  if (!data?.data) {
    return { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function deleteMyMuseum(museumId: number): Promise<{ error?: string }> {
  const { error, backendMapped, backendMessage } =
    await deleteJson<ResponseEnvelope<null>>(`/api/muse/v1/me/museums/${museumId}`);
  if (error || backendMapped || backendMessage) {
    return { error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return {};
}

export async function getMyMuseumArtworks(
  museumId: number,
): Promise<ApiResult<MyMuseumArtwork[]>> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<MyMuseumArtwork[]>>(
      `/api/muse/v1/me/museums/${museumId}/artworks`,
    );
  if (!data?.data) {
    return { data: [], error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function createMyMuseumArtwork(
  museumId: number,
  payload: {
    title: string;
    description?: string;
    fileName: string;
  },
): Promise<NullableApiResult<MyMuseumArtwork>> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<MyMuseumArtwork>>(
      `/api/muse/v1/me/museums/${museumId}/artworks`,
      payload,
    );
  if (!data?.data) {
    return { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function deleteMyMuseumArtwork(
  museumId: number,
  museumArtworkId: number,
): Promise<{ error?: string }> {
  const { error, backendMapped, backendMessage } =
    await deleteJson<ResponseEnvelope<null>>(
      `/api/muse/v1/me/museums/${museumId}/artworks/${museumArtworkId}`,
    );
  if (error || backendMapped || backendMessage) {
    return { error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return {};
}

export async function updateMuseumCuration(
  museumId: number,
  payload: {
    publishStatus: "DRAFT" | "SCHEDULED" | "PUBLISHED";
    coverArtworkId?: number | null;
    openingAt?: string | null;
    curatorNote?: string;
    layoutPreset: "SALON" | "LINEAR" | "IMMERSIVE";
    lightingPreset: "WARM" | "NEUTRAL" | "DRAMATIC";
  },
): Promise<NullableApiResult<MyMuseum>> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<MyMuseum>>(
      `/api/muse/v1/me/museums/${museumId}/curation`,
      payload,
    );
  return data?.data
    ? { data: data.data }
    : { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
}

export async function updateMuseumArtwork(
  museumId: number,
  museumArtworkId: number,
  payload: {
    title: string;
    description?: string;
    sortOrder: number;
    roomLabel?: string;
    focalX: number;
    focalY: number;
    audioUrl?: string;
    audioTranscript?: string;
    lightingPreset: "WARM" | "NEUTRAL" | "DRAMATIC";
  },
): Promise<NullableApiResult<MyMuseumArtwork>> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<MyMuseumArtwork>>(
      `/api/muse/v1/me/museums/${museumId}/artworks/${museumArtworkId}`,
      payload,
    );
  return data?.data
    ? { data: data.data }
    : { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
}

export async function reorderMuseumArtworks(
  museumId: number,
  items: Array<{ museumArtworkId: number; sortOrder: number }>,
): Promise<ApiResult<MyMuseumArtwork[]>> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<MyMuseumArtwork[]>>(
      `/api/muse/v1/me/museums/${museumId}/artworks/order`,
      { items },
    );
  return data?.data
    ? { data: data.data }
    : { data: [], error: resolveError({ error, backendMapped, backendMessage }) };
}

export async function getAdminMuseums(): Promise<ApiResult<AdminMuseum[]>> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<AdminMuseum[]>>("/api/muse/v1/admin/gallery/museums");
  if (!data?.data) {
    return { data: [], error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function updateAdminMuseumFeatured(
  museumId: number,
  featured: boolean,
): Promise<NullableApiResult<AdminMuseum>> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<AdminMuseum>>(
      `/api/muse/v1/admin/gallery/museums/${museumId}/featured`,
      { featured },
    );
  if (!data?.data) {
    return { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function updateAdminMuseumVisibility(
  museumId: number,
  isPublic: boolean,
): Promise<NullableApiResult<AdminMuseum>> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<AdminMuseum>>(
      `/api/muse/v1/admin/gallery/museums/${museumId}/visibility`,
      { isPublic },
    );
  if (!data?.data) {
    return { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function getAdminMuseumArtworks(
  museumId: number,
): Promise<ApiResult<AdminMuseumArtwork[]>> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<AdminMuseumArtwork[]>>(
      `/api/muse/v1/admin/gallery/museums/${museumId}/artworks`,
    );
  if (!data?.data) {
    return { data: [], error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function updateAdminMuseumArtworkModeration(
  museumId: number,
  museumArtworkId: number,
  moderationStatus: "REVIEWING" | "VISIBLE" | "REMOVED",
): Promise<NullableApiResult<AdminMuseumArtwork>> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<AdminMuseumArtwork>>(
      `/api/muse/v1/admin/gallery/museums/${museumId}/artworks/${museumArtworkId}/moderation`,
      { moderationStatus },
    );
  if (!data?.data) {
    return { data: null, error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return { data: data.data };
}

export async function deleteAdminMuseumArtwork(
  museumId: number,
  museumArtworkId: number,
): Promise<{ error?: string }> {
  const { error, backendMapped, backendMessage } =
    await deleteJson<ResponseEnvelope<null>>(
      `/api/muse/v1/admin/gallery/museums/${museumId}/artworks/${museumArtworkId}`,
    );
  if (error || backendMapped || backendMessage) {
    return { error: resolveError({ error, backendMapped, backendMessage }) };
  }
  return {};
}
