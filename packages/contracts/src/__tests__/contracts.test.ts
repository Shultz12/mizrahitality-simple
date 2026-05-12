import { describe, it, expect, vi, afterEach } from "vitest";
import { ANALYTICS_EVENT_TYPES, apiOk, createApiClient } from "../index";

describe("analytics vocabulary", () => {
  it("lists the three event types", () => {
    expect([...ANALYTICS_EVENT_TYPES].sort()).toEqual(["book-now-click", "book-now-hover", "visit"]);
  });
});

describe("createApiClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("joins baseUrl + path without doubled slashes and returns the parsed envelope", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(apiOk({ hello: "world" })), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient({ baseUrl: "http://localhost:5111/" });
    const result = await client.get<{ hello: string }>("/api/ping");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5111/api/ping",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual({ ok: true, data: { hello: "world" } });
  });

  it("returns an ApiError with code 'network_error' when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const client = createApiClient({ baseUrl: "http://localhost:5111" });
    const result = await client.post("/api/events", { type: "visit" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("network_error");
  });

  it("returns an ApiError with code 'bad_response' when the body is not an envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ surprise: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const client = createApiClient({ baseUrl: "http://localhost:5111" });
    const result = await client.get("/api/ping");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("bad_response");
  });
});
