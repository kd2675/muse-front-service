import axios, { type AxiosError } from "axios";

export const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "http://localhost:8081";

const imageClient = axios.create({
  baseURL: IMAGE_BASE,
  timeout: 15000,
});

export type ImageUploadErrorKind = "HTTP" | "NETWORK" | "TIMEOUT" | "UNKNOWN";

export type ImageUploadResult = {
  imageUrl?: string;
  path?: string;
  error?: string;
  status?: number;
  errorKind?: ImageUploadErrorKind;
};

const SUCCESS_PREFIX = "File uploaded successfully:";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function stripLeadingSlash(value: string) {
  return value.startsWith("/") ? value.slice(1) : value;
}

function extractPath(responseBody?: string): string | undefined {
  if (!responseBody) {
    return undefined;
  }
  const trimmed = responseBody.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith(SUCCESS_PREFIX)) {
    return stripLeadingSlash(trimmed.slice(SUCCESS_PREFIX.length).trim());
  }
  return stripLeadingSlash(trimmed);
}

export async function uploadImage(
  file: File,
  options?: { onProgress?: (percent: number) => void },
): Promise<ImageUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await imageClient.post<string>("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!event.total || !options?.onProgress) {
          return;
        }
        const percent = Math.min(
          100,
          Math.round((event.loaded / event.total) * 100),
        );
        options.onProgress(percent);
      },
    });
    const path = extractPath(response.data);
    if (!path) {
      return {
        error: "Image upload response invalid",
        status: response.status,
        errorKind: "HTTP",
      };
    }
    const base = normalizeBaseUrl(IMAGE_BASE);
    return {
      path,
      imageUrl: `${base}/images/${path}`,
      status: response.status,
    };
  } catch (error) {
    const err = error as AxiosError;
    const status = err.response?.status;
    const errorKind: ImageUploadErrorKind = err.code === "ECONNABORTED"
      ? "TIMEOUT"
      : err.response
        ? "HTTP"
        : "NETWORK";
    return {
      error: err.message ?? "Image upload failed",
      status,
      errorKind,
    };
  }
}
