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
