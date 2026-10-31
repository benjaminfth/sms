const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("sms_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("sms_token", token);
      } else {
        localStorage.removeItem("sms_token");
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("sms_token");
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});

    headers.set("Content-Type", "application/json");

    const token = this.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      const errorMsg = payload?.error?.message || response.statusText || "Request failed";
      throw new Error(errorMsg);
    }

    return payload.data as T;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== "") {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient();

export function formatMinor(amountMinor: string | number | bigint | undefined | null, currency = "INR"): string {
  if (amountMinor === undefined || amountMinor === null) return "₹0.00";
  const str = String(amountMinor);
  const isNegative = str.startsWith("-");
  const cleanStr = isNegative ? str.slice(1) : str;
  const padded = cleanStr.padStart(3, "0");
  const whole = padded.slice(0, -2) || "0";
  const fraction = padded.slice(-2);
  const numWhole = parseInt(whole, 10);
  const formattedWhole = isNaN(numWhole) ? whole : numWhole.toLocaleString("en-IN");
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${isNegative ? "-" : ""}${symbol}${formattedWhole}.${fraction}`;
}

