// frontend/lib/api.ts
// Lightweight fetch-based API client (replaces axios) — works reliably with ngrok.

type ApiConfig = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
};

function buildUrl(base: string, path: string, params?: Record<string, any>) {
  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("xentra_token") ||
    sessionStorage.getItem("xentra_token")
  );
}

async function request<T = any>(
  path: string,
  config: ApiConfig = {}
): Promise<{ data: T; status: number; headers: Headers }> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const url = buildUrl(base, path, config.params);

  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
    ...(config.headers || {}),
  };

  const token = getAuthToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let body: any = config.body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: config.method || "GET",
    headers,
    body,
  });

  // Parse response
  let data: any;
  const rt = config.responseType || "json";
  try {
    if (rt === "json") {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    } else if (rt === "blob") {
      data = await res.blob();
    } else if (rt === "arraybuffer") {
      data = await res.arrayBuffer();
    } else {
      data = await res.text();
    }
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err: any = new Error(
      (data && (data.detail || data.message)) || `HTTP ${res.status}`
    );
    err.response = { status: res.status, data, headers: res.headers };
    err.config = { url, ...config };

    // Special 402 handling (same as before)
    if (res.status === 402) {
      const detail = data?.detail;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("limit:reached", { detail }));
      }
    }
    throw err;
  }

  return { data, status: res.status, headers: res.headers };
}

// ─── Public API (drop-in replacement for axios) ────────────────────
const api = {
  get: <T = any>(path: string, config?: ApiConfig) =>
    request<T>(path, { ...config, method: "GET" }),

  post: <T = any>(path: string, body?: any, config?: ApiConfig) =>
    request<T>(path, { ...config, method: "POST", body }),

  put: <T = any>(path: string, body?: any, config?: ApiConfig) =>
    request<T>(path, { ...config, method: "PUT", body }),

  patch: <T = any>(path: string, body?: any, config?: ApiConfig) =>
    request<T>(path, { ...config, method: "PATCH", body }),

  delete: <T = any>(path: string, config?: ApiConfig) =>
    request<T>(path, { ...config, method: "DELETE" }),
};

export default api;