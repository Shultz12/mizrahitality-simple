// Pure, DB-free view-model for the owner analytics dashboard. No Prisma, no Next, no React —
// only type imports from `@mizrahitality/contracts` — so it's trivially unit-tested and safe to
// import from a `"use client"` file. The page Server Component and the `<AnalyticsMetrics>` client
// component both just render what these functions return.

import type { AnalyticsSummary, ApiResult } from "@mizrahitality/contracts";

/** One metric tile on the dashboard. `key` is stable; `label`/`hint` are plain-English copy. */
export type MetricTile = {
  key: "visits" | "bookNowHovers" | "bookNowClicks";
  label: string;
  value: number;
  hint: string;
};

/** What the dashboard renders: a no-site empty state, an error card, or the live metrics. */
export type DashboardView =
  | { kind: "no-site" }
  | { kind: "error"; message: string }
  | { kind: "ready"; slug: string; summary: AnalyticsSummary; metrics: MetricTile[] };

/** The three tiles for a summary, in display order (visits, then Book Now hovers, then clicks). */
export function metricTiles(summary: AnalyticsSummary): MetricTile[] {
  return [
    {
      key: "visits",
      label: "Visits",
      value: summary.visits,
      hint: "Total times your published page has loaded.",
    },
    {
      key: "bookNowHovers",
      label: "Book Now hovers",
      value: summary.bookNowHovers,
      hint: "Times a visitor hovered over the Book Now button.",
    },
    {
      key: "bookNowClicks",
      label: "Book Now clicks",
      value: summary.bookNowClicks,
      hint: "Times a visitor clicked Book Now.",
    },
  ];
}

/**
 * Decide what the dashboard renders from the owner's site (or `null` when they haven't created one)
 * and the analytics aggregation result (`null` when there's no site, so we didn't fetch). A `!ok`
 * envelope degrades to an error card surfacing its message — can't happen for the owner's own site,
 * defensive only.
 */
export function buildDashboardView(
  site: { slug: string } | null,
  summaryResult: ApiResult<AnalyticsSummary> | null,
): DashboardView {
  if (!site) return { kind: "no-site" };
  if (!summaryResult || summaryResult.ok === false) {
    return {
      kind: "error",
      message:
        summaryResult && summaryResult.ok === false
          ? summaryResult.error.message
          : "We couldn't load your analytics just now — try refreshing.",
    };
  }
  return {
    kind: "ready",
    slug: site.slug,
    summary: summaryResult.data,
    metrics: metricTiles(summaryResult.data),
  };
}
