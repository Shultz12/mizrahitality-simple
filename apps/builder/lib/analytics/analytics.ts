// Pure, DB-free logic for the analytics ingest + aggregation endpoints. No Prisma, no Next — so it's
// exercised directly in vitest (mirroring `lib/site/published.ts`). `parseAnalyticsEventInput`
// validates + normalizes a POST /api/events body; `summarizeEvents` reduces stored rows into the
// `AnalyticsSummary` shape; `resolveAnalyticsSummaryResponse` / `resolveIngestResponse` make the
// not-found / validation branching so the route handlers stay thin.

import {
  ANALYTICS_EVENT_TYPES,
  apiErr,
  apiOk,
  type AnalyticsEventInput,
  type AnalyticsEventType,
  type AnalyticsSummary,
  type ApiResult,
} from "@mizrahitality/contracts";

/** A stored analytics row, reduced to the field the summary needs. */
export type StoredEvent = { type: string };

/**
 * Validate + normalize an incoming POST /api/events body. `type` must be one of ANALYTICS_EVENT_TYPES;
 * `slug` must be a non-empty string (trimmed, lower-cased to match how slugs are stored). Returns the
 * cleaned AnalyticsEventInput, or a stable {code, message} for the 400 response.
 */
export function parseAnalyticsEventInput(
  body: unknown,
): { ok: true; value: AnalyticsEventInput } | { ok: false; code: string; message: string } {
  if (typeof body !== "object" || body === null) {
    return {
      ok: false,
      code: "invalid_event",
      message: "Expected a JSON object with `slug` and `type`.",
    };
  }
  const rawSlug = (body as { slug?: unknown }).slug;
  const rawType = (body as { type?: unknown }).type;
  if (typeof rawSlug !== "string" || rawSlug.trim() === "") {
    return { ok: false, code: "invalid_event", message: "`slug` must be a non-empty string." };
  }
  if (typeof rawType !== "string" || !(ANALYTICS_EVENT_TYPES as readonly string[]).includes(rawType)) {
    return {
      ok: false,
      code: "invalid_event",
      message: `\`type\` must be one of: ${ANALYTICS_EVENT_TYPES.join(", ")}.`,
    };
  }
  return { ok: true, value: { slug: rawSlug.trim().toLowerCase(), type: rawType as AnalyticsEventType } };
}

/** Reduce a set of stored events into the AnalyticsSummary shape. Counts only the three known types. */
export function summarizeEvents(slug: string, events: StoredEvent[]): AnalyticsSummary {
  let visits = 0;
  let bookNowHovers = 0;
  let bookNowClicks = 0;
  for (const e of events) {
    if (e.type === "visit") visits++;
    else if (e.type === "book-now-hover") bookNowHovers++;
    else if (e.type === "book-now-click") bookNowClicks++;
    // any other value is ignored — can't happen via ingest; defensive only
  }
  return { slug, visits, bookNowHovers, bookNowClicks };
}

/** Decide the GET /api/sites/{slug}/analytics response. Unknown slug → 404 not_found; else 200 with the summary. */
export function resolveAnalyticsSummaryResponse(
  slug: string,
  site: { slug: string } | null,
  events: StoredEvent[],
): { status: number; body: ApiResult<AnalyticsSummary> } {
  if (!site) return { status: 404, body: apiErr("not_found", "No site with that web address.") };
  return { status: 200, body: apiOk(summarizeEvents(site.slug, events)) };
}

/**
 * Decide the POST /api/events response from a *valid* parsed input and whether the slug belongs to an
 * existing site. Caller does the insert iff `store`. (Parse failures are handled by the caller — they
 * never reach here.) Unknown slug → 404 not_found, nothing stored.
 */
export function resolveIngestResponse(
  parsed: { ok: true; value: AnalyticsEventInput },
  siteExists: boolean,
): { status: number; body: ApiResult<{ recorded: true }>; store: boolean } {
  void parsed; // present for symmetry / future use
  if (!siteExists) {
    return { status: 404, body: apiErr("not_found", "No site with that web address."), store: false };
  }
  return { status: 200, body: apiOk({ recorded: true } as const), store: true };
}
