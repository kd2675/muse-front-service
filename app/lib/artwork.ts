import { fetchJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type { ArtworkDetail } from "../types/artwork";

export const fallbackArtwork: ArtworkDetail = {
  id: 201,
  title: "Stillness of Air",
  artist: "Jiyoon Park",
  category: "Fine Art",
  description: "차분한 빛과 질감을 통해 공기의 움직임을 시각화한 작품.",
  colorFrom: "#1B1B1B",
  colorTo: "#C7B89A",
  exif: {
    camera: "Sony A7R V",
    lens: "FE 50mm F1.2 GM",
    focalLength: "50mm",
    aperture: "f/2.0",
    shutterSpeed: "1/160s",
    iso: "ISO 200",
  },
};

export type ArtworkDetailResult = {
  data: ArtworkDetail;
  isFallback: boolean;
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
      data: fallbackArtwork,
      isFallback: true,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data, isFallback: false };
}
