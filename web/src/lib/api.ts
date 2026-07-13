import type { ApiErrorBody, PaginationMeta } from "../types/api";

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

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function parseError(res: Response): Promise<ApiClientError> {
  try {
    const json = (await res.json()) as ApiErrorBody;
    return new ApiClientError(
      res.status,
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? res.statusText,
      json.error?.details,
    );
  } catch {
    return new ApiClientError(res.status, "UNKNOWN", res.statusText);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
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

  const res = await fetch(`${getApiBaseUrl()}/api/v1${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  const json = (await res.json()) as { data: T };
  return json.data;
}

export async function apiList<T>(
  path: string,
): Promise<{ data: T[]; meta?: PaginationMeta }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}/api/v1${path}`, { headers });
  if (!res.ok) {
    throw await parseError(res);
  }
  return res.json() as Promise<{ data: T[]; meta?: PaginationMeta }>;
}
