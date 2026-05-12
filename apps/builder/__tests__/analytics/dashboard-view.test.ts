import { describe, it, expect } from "vitest";

import { apiErr, apiOk, type AnalyticsSummary } from "@mizrahitality/contracts";

import { buildDashboardView, metricTiles } from "@/lib/analytics/dashboard-view";

describe("metricTiles", () => {
  it("returns the three tiles in display order with the summary's values", () => {
    const tiles = metricTiles({ slug: "cafemizrahi", visits: 3, bookNowHovers: 1, bookNowClicks: 2 });
    expect(tiles.map((t) => t.key)).toEqual(["visits", "bookNowHovers", "bookNowClicks"]);
    expect(tiles.map((t) => t.value)).toEqual([3, 1, 2]);
    for (const tile of tiles) {
      expect(typeof tile.label).toBe("string");
      expect(tile.label.length).toBeGreaterThan(0);
      expect(typeof tile.hint).toBe("string");
      expect(tile.hint.length).toBeGreaterThan(0);
    }
  });

  it("renders an all-zeros summary as all-zero tiles", () => {
    const tiles = metricTiles({ slug: "x", visits: 0, bookNowHovers: 0, bookNowClicks: 0 });
    expect(tiles.map((t) => t.value)).toEqual([0, 0, 0]);
  });
});

describe("buildDashboardView", () => {
  it("no site → kind 'no-site'", () => {
    expect(buildDashboardView(null, null)).toEqual({ kind: "no-site" });
  });

  it("a site but no aggregation result → kind 'error' with a non-empty message", () => {
    const view = buildDashboardView({ slug: "x" }, null);
    expect(view.kind).toBe("error");
    if (view.kind === "error") expect(view.message).toEqual(expect.any(String));
    if (view.kind === "error") expect(view.message.length).toBeGreaterThan(0);
  });

  it("an !ok envelope → kind 'error' surfacing the envelope's message", () => {
    expect(
      buildDashboardView({ slug: "x" }, apiErr("not_found", "No site with that web address.")),
    ).toEqual({ kind: "error", message: "No site with that web address." });
  });

  it("an ok envelope → kind 'ready' with the summary and its tiles", () => {
    const summary: AnalyticsSummary = { slug: "x", visits: 5, bookNowHovers: 2, bookNowClicks: 1 };
    const view = buildDashboardView({ slug: "x" }, apiOk(summary));
    expect(view.kind).toBe("ready");
    if (view.kind === "ready") {
      expect(view.slug).toBe("x");
      expect(view.summary).toEqual(summary);
      expect(view.metrics.map((t) => t.value)).toEqual([5, 2, 1]);
    }
  });

  it("a published-but-no-traffic site → kind 'ready' with all-zero tiles", () => {
    const summary: AnalyticsSummary = { slug: "x", visits: 0, bookNowHovers: 0, bookNowClicks: 0 };
    const view = buildDashboardView({ slug: "x" }, apiOk(summary));
    expect(view.kind).toBe("ready");
    if (view.kind === "ready") expect(view.metrics.map((t) => t.value)).toEqual([0, 0, 0]);
  });
});
