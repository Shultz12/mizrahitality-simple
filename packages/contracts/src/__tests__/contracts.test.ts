import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ANALYTICS_EVENT_TYPES,
  analyticsEventsPath,
  analyticsSummaryPath,
  type AnalyticsSummary,
  apiOk,
  createApiClient,
  type PublishedPage,
  publishedPagePath,
} from "../index";

describe("analytics vocabulary", () => {
  it("lists the three event types", () => {
    expect([...ANALYTICS_EVENT_TYPES].sort()).toEqual(["book-now-click", "book-now-hover", "visit"]);
  });
});

describe("published-page contract", () => {
  it("builds the endpoint path for a slug", () => {
    expect(publishedPagePath("cafemizrahi")).toBe("/api/sites/cafemizrahi");
  });

  it("encodes a slug with unusual characters", () => {
    expect(publishedPagePath("a b")).toBe("/api/sites/a%20b");
  });

  it("wraps a PublishedPage in the success envelope (type smoke)", () => {
    const page: PublishedPage = {
      slug: "cafemizrahi",
      name: "Cafe Mizrahi",
      blocks: [
        { id: "1", type: "rich-text", html: "<p>Hi</p>" },
        { id: "2", type: "image", imageUrl: "/stock/cafe.svg", alt: "Café" },
        { id: "3", type: "book-now" },
      ],
    };
    const result = apiOk(page);
    expect(result.ok).toBe(true);
    expect(result.data.blocks[0]?.type).toBe("rich-text");
    expect(result.data.blocks).toHaveLength(3);
  });
});

describe("analytics-summary contract", () => {
  it("builds the ingest endpoint path", () => {
    expect(analyticsEventsPath()).toBe("/api/events");
  });

  it("builds the per-slug summary path", () => {
    expect(analyticsSummaryPath("cafemizrahi")).toBe("/api/sites/cafemizrahi/analytics");
  });

  it("encodes a slug with unusual characters", () => {
    expect(analyticsSummaryPath("a b")).toBe("/api/sites/a%20b/analytics");
  });

  it("wraps an AnalyticsSummary in the success envelope (type smoke)", () => {
    const summary: AnalyticsSummary = {
      slug: "cafemizrahi",
      visits: 3,
      bookNowHovers: 1,
      bookNowClicks: 0,
    };
    const result = apiOk(summary);
    expect(result.ok).toBe(true);
    expect(typeof result.data.visits).toBe("number");
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
