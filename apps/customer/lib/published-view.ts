// Pure, framework-light view-model for the public per-venue page. Mirrors the builder's
// `apps/builder/lib/analytics/dashboard-view.ts` pattern: a discriminated union plus a pure
// resolver that the Server Component (`app/[slug]/page.tsx`) branches on, so the routing logic is
// unit-tested without touching Next. `loadPublishedView` is the one piece that touches I/O — wrapped
// in React `cache()` so the page and `generateMetadata` share a single round-trip per request.

import { cache } from "react";
import {
  publishedPagePath,
  type ApiResult,
  type PublishedPage,
} from "@mizrahitality/contracts";
import { apiClient } from "@/lib/env";

/** What `app/[slug]/page.tsx` should render for a slug. */
export type PublishedView =
  | { kind: "page"; page: PublishedPage }
  | { kind: "placeholder" } // slug exists but was never published — "coming soon"
  | { kind: "not-found" } // unknown slug — Next's notFound()
  | { kind: "error"; message: string }; // API unreachable / unexpected — "temporarily unavailable", HTTP 200

/**
 * Map the `GET /api/sites/{slug}` envelope to a {@link PublishedView}. `apiClient.get` already
 * synthesises an `apiErr` (`network_error` / `bad_response`) when the request throws or the body
 * isn't an envelope, so no try/catch is needed here — anything that isn't `ok`, `"unpublished"`, or
 * `"not_found"` degrades to `error`.
 */
export function resolvePublishedView(result: ApiResult<PublishedPage>): PublishedView {
  if (result.ok) return { kind: "page", page: result.data };
  switch (result.error.code) {
    case "unpublished":
      return { kind: "placeholder" };
    case "not_found":
      return { kind: "not-found" };
    default:
      return { kind: "error", message: result.error.message };
  }
}

/**
 * Resolve an image block's `imageUrl` (a path relative to the Builder origin, e.g.
 * `/uploads/<file>` or `/stock/<name>.svg`) against the Builder base URL. Already-absolute or
 * `data:` URLs and empty strings pass through untouched.
 */
export function absoluteImageUrl(url: string, base: string): string {
  if (!url) return url;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${base.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

/**
 * Fetch + resolve the published page for a slug. SSR per request (`cache: "no-store"`); React
 * `cache()` dedupes the call within a single request so `generateMetadata` and the page body don't
 * each round-trip.
 */
export const loadPublishedView = cache(async (slug: string): Promise<PublishedView> => {
  const result = await apiClient.get<PublishedPage>(publishedPagePath(slug), { cache: "no-store" });
  return resolvePublishedView(result);
});
