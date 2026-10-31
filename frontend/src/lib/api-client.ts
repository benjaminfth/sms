import { APIResponse, PaginatedResponse } from "@sms/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// In-memory access token storage
let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

// Token refresh synchronization queue to prevent rotation race conditions
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

export class ApiError extends Error {
  public code: string;
  public details?: any;
  public status: number;

  constructor(message: string, code = "API_ERROR", details?: any, status = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Sends HttpOnly cookie
  });

  const json: APIResponse<{ accessToken: string; user: any }> = await res.json();

  if (!res.ok || !json.success || !json.data?.accessToken) {
    throw new ApiError(
      json.error?.message || "Failed to refresh authentication session",
      json.error?.code || "UNAUTHORIZED",
      json.error?.details,
      res.status
    );
  }

  setAccessToken(json.data.accessToken);
  return json.data.accessToken;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (inMemoryAccessToken) {
    headers["Authorization"] = `Bearer ${inMemoryAccessToken}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Ensure cookies are sent
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err: any) {
    throw new ApiError(err.message || "Network error. Please check your connection.", "NETWORK_ERROR", undefined, 0);
  }

  // Handle 401 Unauthorized by attempting token refresh
  if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
    if (isRefreshing) {
      // Queue requests while another request is refreshing the token
      return new Promise<APIResponse<T>>((resolve, reject) => {
        failedQueue.push({
          resolve: async (newAccessToken: string) => {
            headers["Authorization"] = `Bearer ${newAccessToken}`;
            try {
              const retryRes = await fetch(url, { ...fetchOptions, headers });
              const json = await retryRes.json();
              resolve(json);
            } catch (retryErr) {
              reject(retryErr);
            }
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();
      processQueue(null, newAccessToken);

      // Retry original request with new token
      headers["Authorization"] = `Bearer ${newAccessToken}`;
      const retryResponse = await fetch(url, { ...fetchOptions, headers });
      const retryJson: APIResponse<T> = await retryResponse.json();

      if (!retryResponse.ok || !retryJson.success) {
        throw new ApiError(
          retryJson.error?.message || "Request failed",
          retryJson.error?.code || "API_ERROR",
          retryJson.error?.details,
          retryResponse.status
        );
      }

      return retryJson;
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      setAccessToken(null);
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  const json: APIResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.error?.message || "Request failed",
      json.error?.code || "API_ERROR",
      json.error?.details,
      response.status
    );
  }

  return json;
}

// Convenience typed helper methods
export const api = {
  get: <T>(endpoint: string, query?: Record<string, any>) => {
    let url = endpoint;
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          params.append(k, String(v));
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return apiClient<T>(url, { method: "GET" });
  },

  post: <T>(endpoint: string, body?: any) =>
    apiClient<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any) =>
    apiClient<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any) =>
    apiClient<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    apiClient<T>(endpoint, { method: "DELETE" }),
};
