import axios, { type AxiosError } from "axios";

export const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "http://localhost:8081";

const imageClient = axios.create({
  baseURL: IMAGE_BASE,
  timeout: 15000,
});

export type ImageUploadErrorKind = "HTTP" | "NETWORK" | "TIMEOUT" | "UNKNOWN";

export type ImageUploadResult = {
  fileName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  path?: string;
  error?: string;
  status?: number;
  errorKind?: ImageUploadErrorKind;
};

export async function uploadImage(
  file: File,
  options?: { onProgress?: (percent: number) => void },
): Promise<ImageUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await imageClient.post<{
      fileName?: string;
      imageUrl?: string;
      thumbnailUrl?: string;
      temporary?: boolean;
    }>("/upload/temp", formData, {
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
    if (!response.data?.fileName || !response.data?.imageUrl) {
      return {
        error: "Image upload response invalid",
        status: response.status,
        errorKind: "HTTP",
      };
    }
    return {
      fileName: response.data.fileName,
      path: response.data.fileName,
      imageUrl: response.data.imageUrl,
      thumbnailUrl: response.data.thumbnailUrl,
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
