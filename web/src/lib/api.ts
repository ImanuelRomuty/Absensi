import type { ApiErrorBody, PaginationMeta } from "../types/api";
import { pushApiLog } from "./apiDebugLog";

const TOKEN_KEY = "masarif_access_token";
const REFRESH_KEY = "masarif_refresh_token";

export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!base) {
    return "http://localhost:3000";
  }
  return base.replace(/\/$/, "");
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly responseBody?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    responseBody?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.responseBody = responseBody;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function parseErrorFromBody(status: number, body: unknown): ApiClientError {
  if (body && typeof body === "object" && "error" in body) {
    const json = body as ApiErrorBody;
    return new ApiClientError(
      status,
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? "Request failed",
      json.error?.details,
      body,
    );
  }
  return new ApiClientError(status, "UNKNOWN", `HTTP ${status}`, undefined, body);
}

function toNetworkError(err: unknown): ApiClientError {
  const raw = err instanceof Error ? err.message : "Network error";
  const friendly =
    /failed to fetch|networkerror|load failed|network request failed/i.test(raw)
      ? "Tidak bisa hubungi API (CORS / cold start / offline). Coba lagi sebentar."
      : raw;
  return new ApiClientError(0, "NETWORK_ERROR", friendly);
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? (options.body ? "POST" : "GET");
  const url = `${getApiBaseUrl()}/api/v1${path}`;
  const started = performance.now();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const responseBody = await readJsonSafe(res);
    const durationMs = Math.round(performance.now() - started);

    pushApiLog({
      method,
      url,
      requestBody: options.body ?? null,
      status: res.status,
      ok: res.ok,
      responseBody,
      durationMs,
      errorMessage: res.ok ? undefined : `HTTP ${res.status}`,
    });

    if (!res.ok) {
      throw parseErrorFromBody(res.status, responseBody);
    }

    const json = responseBody as { data: T };
    return json.data;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    const durationMs = Math.round(performance.now() - started);
    const networkErr = toNetworkError(err);
    pushApiLog({
      method,
      url,
      requestBody: options.body ?? null,
      status: null,
      ok: false,
      responseBody: null,
      errorMessage: networkErr.message,
      durationMs,
    });
    throw networkErr;
  }
}

export async function apiList<T>(
  path: string,
): Promise<{ data: T[]; meta?: PaginationMeta }> {
  const method = "GET";
  const url = `${getApiBaseUrl()}/api/v1${path}`;
  const started = performance.now();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { headers });
    const responseBody = await readJsonSafe(res);
    const durationMs = Math.round(performance.now() - started);

    pushApiLog({
      method,
      url,
      requestBody: null,
      status: res.status,
      ok: res.ok,
      responseBody,
      durationMs,
      errorMessage: res.ok ? undefined : `HTTP ${res.status}`,
    });

    if (!res.ok) {
      throw parseErrorFromBody(res.status, responseBody);
    }

    return responseBody as { data: T[]; meta?: PaginationMeta };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    const durationMs = Math.round(performance.now() - started);
    const networkErr = toNetworkError(err);
    pushApiLog({
      method,
      url,
      requestBody: null,
      status: null,
      ok: false,
      responseBody: null,
      errorMessage: networkErr.message,
      durationMs,
    });
    throw networkErr;
  }
}
