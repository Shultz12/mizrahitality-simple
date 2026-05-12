import { apiErr, type ApiResult } from "./envelope";

export interface ApiClient {
  get<T>(path: string, init?: RequestInit): Promise<ApiResult<T>>;
  post<T>(path: string, body: unknown, init?: RequestInit): Promise<ApiResult<T>>;
}

export interface CreateApiClientOptions {
  /** Base URL of the Builder REST API, e.g. `http://localhost:5111`. */
  baseUrl: string;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function request<T>(url: string, init: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (cause) {
    return apiErr("network_error", cause instanceof Error ? cause.message : "Network request failed");
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    return apiErr("bad_response", `Expected a JSON response from ${url} (status ${res.status})`);
  }

  if (parsed !== null && typeof parsed === "object" && "ok" in parsed) {
    return parsed as ApiResult<T>;
  }
  return apiErr("bad_response", `Response from ${url} is not an API envelope`);
}

/**
 * Tiny `fetch` wrapper that always resolves to an {@link ApiResult}: it parses the JSON
 * envelope on success and synthesises an {@link ApiError} (`network_error` / `bad_response`)
 * when the request throws or the body isn't a valid envelope. The only channel between the
 * Customer app and the Builder API.
 */
export function createApiClient({ baseUrl }: CreateApiClientOptions): ApiClient {
  return {
    get<T>(path: string, init?: RequestInit) {
      return request<T>(joinUrl(baseUrl, path), { ...init, method: "GET" });
    },
    post<T>(path: string, body: unknown, init?: RequestInit) {
      return request<T>(joinUrl(baseUrl, path), {
        ...init,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  };
}
