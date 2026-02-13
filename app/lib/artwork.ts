import { fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ArtworkDetail } from "../types/artwork";

export type ArtworkDetailResult = {
  data: ArtworkDetail | null;
  error?: string;
};

export async function getArtworkDetail(
  id: number,
): Promise<ArtworkDetailResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<ArtworkDetail>>(
      `/api/muse/v1/artworks/${id}`,
    );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}
