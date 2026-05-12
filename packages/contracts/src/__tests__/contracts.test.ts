import { describe, it, expect, vi, afterEach } from "vitest";
import {
  VISITOR_TYPES,
  GENDERS,
  AGE_GROUPS,
  isNeutral,
  visitorTypeKey,
  parseVisitorTypeKey,
  ANALYTICS_EVENT_TYPES,
  apiOk,
  createApiClient,
} from "../index";

describe("visitor-type vocabulary", () => {
  it("has exactly 7 visitor types (2 genders × 3 age groups + neutral)", () => {
    expect(GENDERS).toHaveLength(2);
    expect(AGE_GROUPS).toHaveLength(3);
    expect(VISITOR_TYPES).toHaveLength(7);
    expect(VISITOR_TYPES.filter(isNeutral)).toHaveLength(1);
  });

  it("round-trips every visitor type through its key", () => {
    for (const vt of VISITOR_TYPES) {
      expect(parseVisitorTypeKey(visitorTypeKey(vt))).toEqual(vt);
    }
  });

  it("produces stable, readable keys", () => {
    expect(visitorTypeKey("neutral")).toBe("neutral");
    expect(visitorTypeKey({ gender: "male", ageGroup: "18-30" })).toBe("male-18-30");
    expect(visitorTypeKey({ gender: "female", ageGroup: "50+" })).toBe("female-50+");
  });

  it("rejects unrecognised keys", () => {
    expect(parseVisitorTypeKey("")).toBeNull();
    expect(parseVisitorTypeKey("male")).toBeNull();
    expect(parseVisitorTypeKey("alien-99")).toBeNull();
    expect(parseVisitorTypeKey("male-99")).toBeNull();
  });
});

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
