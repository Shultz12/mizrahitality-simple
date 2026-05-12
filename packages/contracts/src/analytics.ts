import type { VisitorType } from "./visitor-types";

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
  /** Who the visitor is (or `"neutral"` if the demo switcher hasn't picked a type). */
  visitorType: VisitorType;
}
