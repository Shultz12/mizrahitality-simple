/** The analytics events the Customer site posts to the Builder API. */
export type AnalyticsEventType = "visit" | "book-now-hover" | "book-now-click";

export const ANALYTICS_EVENT_TYPES: readonly AnalyticsEventType[] = [
  "visit",
  "book-now-hover",
  "book-now-click",
];

/** Request body for the analytics-event ingest endpoint. */
export interface AnalyticsEventInput {
  /** The published site's slug. */
  slug: string;
  type: AnalyticsEventType;
}

/**
 * Aggregated analytics for one slug, as returned by GET /api/sites/{slug}/analytics inside the
 * ApiSuccess envelope. Lifetime counts over all stored events for the slug (no time window). A slug
 * that exists but has no events yet → all zeros; an unknown slug → ApiError "not_found" (not zeros).
 */
export interface AnalyticsSummary {
  slug: string;
  visits: number; // count of "visit" events
  bookNowHovers: number; // count of "book-now-hover" events
  bookNowClicks: number; // count of "book-now-click" events
}

/** Path of the analytics-event ingest endpoint. `POST` body `AnalyticsEventInput` → `ApiResult<{ recorded: true }>`. */
export function analyticsEventsPath(): string {
  return "/api/events";
}

/** Path of the per-slug analytics-summary endpoint. `GET` → `ApiResult<AnalyticsSummary>`. */
export function analyticsSummaryPath(slug: string): string {
  return `/api/sites/${encodeURIComponent(slug)}/analytics`;
}
