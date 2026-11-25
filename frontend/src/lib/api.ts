export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = `/api/v1${normalizedPath}`;

  if (typeof window === "undefined" && process.env.BACKEND_URL) {
    return new URL(apiPath, process.env.BACKEND_URL).toString();
  }

  const publicBase = process.env.NEXT_PUBLIC_API_URL;
  if (publicBase) {
    return `${publicBase.replace(/\/+$/, "")}${normalizedPath}`;
  }

  return apiPath;
}

function formatApiErrorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg).replace(/^Value error,\s*/i, "");
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(resolveApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = formatApiErrorDetail(data.detail ?? data.message, detail);
    } catch {
      // ignore json parse error
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(resolveApiUrl("/health"), { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
