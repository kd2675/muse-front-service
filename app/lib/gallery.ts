import { fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { GalleryLobby, GalleryCategoryDetail } from "../types/gallery";

export type GalleryLobbyResult = {
  data: GalleryLobby | null;
  error?: string;
};

export async function getGalleryLobby(): Promise<GalleryLobbyResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<GalleryLobby>>("/api/muse/v1/gallery/lobby");

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type GalleryCategoryResult = {
  data: GalleryCategoryDetail | null;
  error?: string;
};

export async function getGalleryCategory(
  key: string,
): Promise<GalleryCategoryResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<GalleryCategoryDetail>>(
      `/api/muse/v1/gallery/categories/${key}`,
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}
