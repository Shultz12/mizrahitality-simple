import { describe, it, expect } from "vitest";

import {
  parseAnalyticsEventInput,
  resolveAnalyticsSummaryResponse,
  resolveIngestResponse,
  summarizeEvents,
  type StoredEvent,
} from "@/lib/analytics/analytics";

describe("parseAnalyticsEventInput", () => {
  it("accepts a valid body, trimming + lower-casing the slug", () => {
    expect(parseAnalyticsEventInput({ slug: "CafeMizrahi ", type: "visit" })).toEqual({
      ok: true,
      value: { slug: "cafemizrahi", type: "visit" },
    });
  });

  it("accepts the other two event types", () => {
    expect(parseAnalyticsEventInput({ slug: "x", type: "book-now-hover" })).toEqual({
      ok: true,
      value: { slug: "x", type: "book-now-hover" },
    });
    expect(parseAnalyticsEventInput({ slug: "x", type: "book-now-click" })).toEqual({
      ok: true,
      value: { slug: "x", type: "book-now-click" },
    });
  });

  it("rejects an unknown / mis-cased / non-string / missing type", () => {
    for (const type of ["click", "VISIT", 42, undefined]) {
      const r = parseAnalyticsEventInput({ slug: "x", type });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("invalid_event");
        expect(r.message).toMatch(/visit/);
      }
    }
  });

  it("rejects a missing / empty / whitespace / non-string slug", () => {
    for (const slug of ["", "  ", undefined, 123]) {
      const r = parseAnalyticsEventInput({ slug, type: "visit" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("invalid_event");
    }
  });

  it("rejects a non-object body", () => {
    for (const body of [null, "hi", [], 7, undefined]) {
      const r = parseAnalyticsEventInput(body);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("invalid_event");
    }
  });
});

describe("summarizeEvents", () => {
  const ev = (type: string): StoredEvent => ({ type });

  it("returns all zeros for an empty list", () => {
    expect(summarizeEvents("cafemizrahi", [])).toEqual({
      slug: "cafemizrahi",
      visits: 0,
      bookNowHovers: 0,
      bookNowClicks: 0,
    });
  });

  it("counts a mixed set, preserving the passed slug", () => {
    const events = [
      ev("visit"),
      ev("visit"),
      ev("visit"),
      ev("book-now-hover"),
      ev("book-now-click"),
      ev("book-now-click"),
    ];
    expect(summarizeEvents("cafemizrahi", events)).toEqual({
      slug: "cafemizrahi",
      visits: 3,
      bookNowHovers: 1,
      bookNowClicks: 2,
    });
  });

  it("does NOT dedup visits — three `visit` rows count as 3", () => {
    expect(summarizeEvents("c", [ev("visit"), ev("visit"), ev("visit")]).visits).toBe(3);
  });

  it("ignores rows with an unknown type", () => {
    expect(summarizeEvents("c", [ev("visit"), ev("scroll"), ev("book-now-click")])).toEqual({
      slug: "c",
      visits: 1,
      bookNowHovers: 0,
      bookNowClicks: 1,
    });
  });
});

describe("resolveAnalyticsSummaryResponse", () => {
  it("404 not_found when no site has the slug", () => {
    expect(resolveAnalyticsSummaryResponse("ghost", null, [])).toEqual({
      status: 404,
      body: { ok: false, error: { code: "not_found", message: expect.any(String) } },
    });
  });

  it("200 all-zeros when the site exists but has no events", () => {
    expect(resolveAnalyticsSummaryResponse("cafemizrahi", { slug: "cafemizrahi" }, [])).toEqual({
      status: 200,
      body: { ok: true, data: { slug: "cafemizrahi", visits: 0, bookNowHovers: 0, bookNowClicks: 0 } },
    });
  });

  it("200 with counts, using site.slug (not the raw arg) in the output", () => {
    const events: StoredEvent[] = [
      { type: "visit" },
      { type: "visit" },
      { type: "book-now-hover" },
    ];
    expect(resolveAnalyticsSummaryResponse("CAFEMIZRAHI", { slug: "cafemizrahi" }, events)).toEqual({
      status: 200,
      body: { ok: true, data: { slug: "cafemizrahi", visits: 2, bookNowHovers: 1, bookNowClicks: 0 } },
    });
  });
});

describe("resolveIngestResponse", () => {
  const parsed = { ok: true as const, value: { slug: "cafemizrahi", type: "visit" as const } };

  it("404 not_found and store:false when the slug doesn't belong to a site", () => {
    expect(resolveIngestResponse(parsed, false)).toEqual({
      status: 404,
      body: { ok: false, error: { code: "not_found", message: expect.any(String) } },
      store: false,
    });
  });

  it("200 recorded and store:true when the slug exists", () => {
    expect(resolveIngestResponse(parsed, true)).toEqual({
      status: 200,
      body: { ok: true, data: { recorded: true } },
      store: true,
    });
  });
});
