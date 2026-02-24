import { deleteJson, fetchJson, postJson, putJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type {
  AdminGalleryArtwork,
  AdminGalleryCategory,
  AdminGalleryHighlight,
  GalleryLobby,
  GalleryCategoryDetail,
} from "../types/gallery";

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

export type AdminGalleryCategoryListResult = {
  data: AdminGalleryCategory[];
  error?: string;
};

export async function getAdminGalleryCategories(): Promise<AdminGalleryCategoryListResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<AdminGalleryCategory[]>>(
      "/api/muse/v1/admin/gallery/categories",
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminGalleryCategoryCreateResult = {
  data: AdminGalleryCategory | null;
  error?: string;
};

export async function createAdminGalleryCategory(payload: {
  key: string;
  title: string;
  description?: string;
}): Promise<AdminGalleryCategoryCreateResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<AdminGalleryCategory>>(
      "/api/muse/v1/admin/gallery/categories",
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

export type AdminGalleryCategoryUpdateResult = {
  data: AdminGalleryCategory | null;
  error?: string;
};

export async function updateAdminGalleryCategory(
  key: string,
  payload: {
    title: string;
    description?: string;
    itemCount: number;
  },
): Promise<AdminGalleryCategoryUpdateResult> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<AdminGalleryCategory>>(
      `/api/muse/v1/admin/gallery/categories/${key}`,
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

export async function deleteAdminGalleryCategory(key: string): Promise<{ error?: string }> {
  const { error, backendMapped, backendMessage } =
    await deleteJson<ResponseEnvelope<null>>(
      `/api/muse/v1/admin/gallery/categories/${encodeURIComponent(key)}`,
    );

  if (error || backendMapped || backendMessage) {
    return {
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return {};
}

export type AdminGalleryHighlightListResult = {
  data: AdminGalleryHighlight[];
  error?: string;
};

export async function getAdminGalleryHighlights(): Promise<AdminGalleryHighlightListResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<AdminGalleryHighlight[]>>(
      "/api/muse/v1/admin/gallery/highlights",
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminGalleryHighlightUpdateResult = {
  data: AdminGalleryHighlight[];
  error?: string;
};

export async function replaceAdminGalleryHighlights(
  artworkIds: number[],
): Promise<AdminGalleryHighlightUpdateResult> {
  const { data, error, backendMapped, backendMessage } =
    await putJson<ResponseEnvelope<AdminGalleryHighlight[]>>(
      "/api/muse/v1/admin/gallery/highlights",
      { artworkIds },
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminGalleryArtworkListResult = {
  data: AdminGalleryArtwork[];
  error?: string;
};

export async function getAdminGalleryArtworks(): Promise<AdminGalleryArtworkListResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<AdminGalleryArtwork[]>>(
      "/api/muse/v1/admin/gallery/artworks",
    );

  if (!data?.data) {
    return {
      data: [],
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}

export type AdminGalleryArtworkCreateResult = {
  data: AdminGalleryArtwork | null;
  error?: string;
};

export async function createAdminGalleryArtwork(payload: {
  title: string;
  artist: string;
  categoryKey: string;
  fileName: string;
  imageUrl: string;
  description?: string;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
}): Promise<AdminGalleryArtworkCreateResult> {
  const { data, error, backendMapped, backendMessage } =
    await postJson<ResponseEnvelope<AdminGalleryArtwork>>(
      "/api/muse/v1/admin/gallery/artworks",
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

export async function deleteAdminGalleryArtwork(artworkId: number): Promise<{ error?: string }> {
  const { error, backendMapped, backendMessage } =
    await deleteJson<ResponseEnvelope<null>>(
      `/api/muse/v1/admin/gallery/artworks/${artworkId}`,
    );

  if (error || backendMapped || backendMessage) {
    return {
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return {};
}
