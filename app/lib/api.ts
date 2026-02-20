import axios, { type AxiosRequestConfig, type AxiosError } from "axios";
import {
  refreshAccessToken,
  getAccessToken,
  clearAccessToken,
  notifyAuthExpired,
} from "./auth";
import type { ResponseEnvelope } from "../types/response";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];
let authExpiredNotified = false;

function enqueueRefresh(cb: (token: string | null) => void) {
  refreshQueue.push(cb);
}

function resolveRefreshQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

function handleAuthExpired(reason: "expired" | "refresh_failed") {
  if (authExpiredNotified) {
    return;
  }
  authExpiredNotified = true;
  clearAccessToken();
  notifyAuthExpired(reason);
}

export type ApiResult<T> = {
  data: T | null;
  status?: number;
  error?: string;
  backendCode?: string | number;
  backendMessage?: string;
  backendMapped?: string;
  errorKind?: "BACKEND" | "HTTP" | "NETWORK" | "TIMEOUT" | "UNKNOWN";
  durationMs?: number;
};

type BackendEnvelope = ResponseEnvelope<unknown>;

const backendCodeMap: Record<string, string> = {
  RESOURCE_NOT_FOUND: "요청한 리소스를 찾을 수 없습니다.",
  VALIDATION_ERROR: "요청 값 검증에 실패했습니다.",
  UNAUTHORIZED: "인증이 필요합니다.",
  FORBIDDEN: "접근 권한이 없습니다.",
  CONFLICT: "요청이 충돌했습니다.",
  INTERNAL_SERVER_ERROR: "서버 오류가 발생했습니다.",
  "4000000": "잘못된 요청입니다.",
  "4030000": "접근 권한이 없습니다.",
  "4040000": "리소스를 찾을 수 없습니다.",
  "4090000": "요청이 충돌했습니다.",
  "5000000": "서버 오류가 발생했습니다.",
  "4000300": "요청 값 검증에 실패했습니다.",
  "4010200": "인증이 필요합니다.",
  "4010201": "토큰 서명이 올바르지 않습니다.",
  "4010202": "토큰 형식이 올바르지 않습니다.",
  "4010203": "토큰이 만료되었습니다.",
  "4010204": "지원하지 않는 토큰입니다.",
  "4010205": "토큰 값이 올바르지 않습니다.",
  "4090206": "이미 사용된 인증 코드입니다.",
  "4010301": "인증 정보가 올바르지 않습니다.",
  "4040302": "사용자를 찾을 수 없습니다.",
  "4090303": "포인트가 부족합니다.",
  "4040304": "주문 정보를 찾을 수 없습니다.",
};

function mapBackendCode(code?: string | number): string | undefined {
  if (code === undefined || code === null) {
    return undefined;
  }
  return backendCodeMap[String(code)];
}

function resolveErrorKind(error: AxiosError): ApiResult<unknown>["errorKind"] {
  if (error.code === "ECONNABORTED") {
    return "TIMEOUT";
  }
  if (!error.response) {
    return "NETWORK";
  }
  return "HTTP";
}

function shouldLogSuccess(): boolean {
  const level = process.env.NEXT_PUBLIC_API_LOG_LEVEL ?? "info";
  return level === "info" || level === "debug";
}

function shouldLogError(): boolean {
  const level = process.env.NEXT_PUBLIC_API_LOG_LEVEL ?? "info";
  return level !== "silent";
}

function summarizePayload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return "null";
  }
  if (Array.isArray(payload)) {
    return `Array(${payload.length})`;
  }
  if (typeof payload === "object") {
    return `Object(${Object.keys(payload as Record<string, unknown>).join(", ")})`;
  }
  return String(payload);
}

async function requestJson<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  retryCount = 0,
): Promise<ApiResult<T>> {
  const startedAt = Date.now();
  try {
    const response = await apiClient.request<T>({
      method,
      url: path,
      data,
      ...config,
    });
    const durationMs = Date.now() - startedAt;
    const envelope = response.data as BackendEnvelope;
    const mapped = mapBackendCode(envelope?.code);
    if (envelope?.success === false) {
      if (shouldLogError()) {
        console.warn(`[api] ${method} backend error`, {
          path,
          status: response.status,
          durationMs,
          backendCode: envelope?.code,
          backendMessage: envelope?.message,
          backendMapped: mapped,
        });
      }
      return {
        data: null,
        status: response.status,
        error: envelope?.message ?? "Backend error",
        backendCode: envelope?.code,
        backendMessage: envelope?.message,
        backendMapped: mapped,
        errorKind: "BACKEND",
        durationMs,
      };
    }
    if (shouldLogSuccess()) {
      console.info(`[api] ${method} ok`, {
        path,
        status: response.status,
        durationMs,
        backendCode: envelope?.code,
        backendMessage: envelope?.message,
        backendMapped: mapped,
        success: envelope?.success,
        dataSummary: summarizePayload(response.data),
      });
    }
    return { data: response.data, status: response.status, durationMs };
  } catch (error) {
    const err = error as AxiosError;
    const status = err.response?.status;
    const message =
      err.response?.statusText ??
      err.message ??
      "Unknown network error";
    const errorData = err.response?.data as BackendEnvelope | undefined;
    const durationMs = Date.now() - startedAt;
    const backendCodeValue = errorData?.code;
    const mapped = mapBackendCode(backendCodeValue);
    const errorKind = resolveErrorKind(err);
    const isRefreshCall = path.startsWith("/auth/refresh");
    if (status === 401 && !isRefreshCall && retryCount < 1) {
      if (isRefreshing) {
        const token = await new Promise<string | null>((resolve) => {
          enqueueRefresh(resolve);
        });
        if (token) {
          authExpiredNotified = false;
          return requestJson<T>(method, path, data, config, retryCount + 1);
        }
      } else {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        resolveRefreshQueue(newToken);
        isRefreshing = false;
        if (newToken) {
          authExpiredNotified = false;
          return requestJson<T>(method, path, data, config, retryCount + 1);
        }
      }
      handleAuthExpired("refresh_failed");
    }
    if (shouldLogError()) {
      console.error(`[api] ${method} failed`, {
        path,
        status,
        durationMs,
        message,
        backendCode: backendCodeValue,
        backendMessage: errorData?.message,
        backendMapped: mapped,
        errorKind,
      });
    }
    return {
      data: null,
      status,
      error: message,
      backendCode: errorData?.code,
      backendMessage: errorData?.message,
      backendMapped: mapped,
      errorKind,
      durationMs,
    };
  }
}

export async function fetchJson<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return requestJson("GET", path, undefined, config);
}

export async function postJson<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return requestJson("POST", path, body, config);
}

export async function putJson<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return requestJson("PUT", path, body, config);
}

export async function postForm<T>(
  path: string,
  form: FormData,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return requestJson("POST", path, form, config);
}

export async function deleteJson<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return requestJson("DELETE", path, undefined, config);
}
