import { describe, it, expect } from "vitest";

import { type StoredEvent } from "@/lib/analytics/analytics";
import {
  getAnalyticsSummary,
  recordEvent,
  type ReadAnalyticsDeps,
  type RecordEventDeps,
} from "@/lib/analytics/events";

// A fake RecordEventDeps: slug "cafemizrahi" exists; every insert(...) is pushed onto `inserted`.
function makeRecordDeps() {
  const inserted: { slug: string; type: string }[] = [];
  const deps: RecordEventDeps = {
    siteExists: async (slug) => slug === "cafemizrahi",
    insert: async (event) => {
      inserted.push({ slug: event.slug, type: event.type });
    },
  };
  return { deps, inserted };
}

// A fake ReadAnalyticsDeps: configurable site lookup + in-memory event list.
function makeReadDeps(site: { slug: string } | null, events: StoredEvent[]): ReadAnalyticsDeps {
  return {
    findSite: async () => site,
    listEvents: async () => events,
  };
}

describe("recordEvent", () => {
  it("happy path: 200 recorded, exactly one insert with the normalized slug", async () => {
    const { deps, inserted } = makeRecordDeps();
    const r = await recordEvent({ slug: "CafeMizrahi", type: "visit" }, deps);
    expect(r).toEqual({ status: 200, body: { ok: true, data: { recorded: true } } });
    expect(inserted).toEqual([{ slug: "cafemizrahi", type: "visit" }]);
  });

  it("400 invalid_event with no insert when the slug is missing", async () => {
    const { deps, inserted } = makeRecordDeps();
    const r = await recordEvent({ type: "visit" }, deps);
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ ok: false, error: { code: "invalid_event", message: expect.any(String) } });
    expect(inserted).toHaveLength(0);
  });

  it("400 invalid_event with no insert when the type is unknown", async () => {
    const { deps, inserted } = makeRecordDeps();
    const r = await recordEvent({ slug: "x", type: "bogus" }, deps);
    expect(r.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("404 not_found with no insert when the slug doesn't belong to a site", async () => {
    const { deps, inserted } = makeRecordDeps();
    const r = await recordEvent({ slug: "ghost", type: "visit" }, deps);
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ ok: false, error: { code: "not_found", message: expect.any(String) } });
    expect(inserted).toHaveLength(0);
  });

  it("does NOT dedup — three identical posts produce three inserts", async () => {
    const { deps, inserted } = makeRecordDeps();
    await recordEvent({ slug: "cafemizrahi", type: "visit" }, deps);
    await recordEvent({ slug: "cafemizrahi", type: "visit" }, deps);
    await recordEvent({ slug: "cafemizrahi", type: "visit" }, deps);
    expect(inserted).toEqual([
      { slug: "cafemizrahi", type: "visit" },
      { slug: "cafemizrahi", type: "visit" },
      { slug: "cafemizrahi", type: "visit" },
    ]);
  });
});

describe("getAnalyticsSummary", () => {
  it("happy path: 200 with the aggregated counts", async () => {
    const deps = makeReadDeps({ slug: "cafemizrahi" }, [
      { type: "visit" },
      { type: "visit" },
      { type: "book-now-click" },
    ]);
    const r = await getAnalyticsSummary("cafemizrahi", deps);
    expect(r).toEqual({
      status: 200,
      body: { ok: true, data: { slug: "cafemizrahi", visits: 2, bookNowHovers: 0, bookNowClicks: 1 } },
    });
  });

  it("404 not_found when the slug doesn't belong to a site", async () => {
    const r = await getAnalyticsSummary("ghost", makeReadDeps(null, []));
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ ok: false, error: { code: "not_found", message: expect.any(String) } });
  });

  it("200 all-zeros when the site exists but has no events", async () => {
    const r = await getAnalyticsSummary("cafemizrahi", makeReadDeps({ slug: "cafemizrahi" }, []));
    expect(r).toEqual({
      status: 200,
      body: { ok: true, data: { slug: "cafemizrahi", visits: 0, bookNowHovers: 0, bookNowClicks: 0 } },
    });
  });
});
