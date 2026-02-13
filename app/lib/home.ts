import { fetchJson } from "./api";
import type { HomePayload } from "../types/home";
import type { ResponseEnvelope } from "../types/response";

export type HomeResult = {
  data: HomePayload | null;
  error?: string;
};

export async function getHomeData(): Promise<HomeResult> {
  const { data, error, backendMapped, backendMessage } =
    await fetchJson<ResponseEnvelope<HomePayload>>(
    "/api/muse/v1/home",
  );

  if (!data?.data) {
    return {
      data: null,
      error: backendMapped ?? backendMessage ?? error,
    };
  }

  return { data: data.data };
}
