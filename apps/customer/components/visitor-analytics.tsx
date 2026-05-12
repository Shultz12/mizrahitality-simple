"use client";

import { useEffect } from "react";
import { postEventOnce } from "@/lib/analytics-client";

/**
 * Renders nothing — its only job is to post exactly one `visit` event per page load once the page
 * mounts in the browser. The module-scoped guard in `lib/analytics-client.ts` makes it
 * StrictMode-safe (the effect can run twice in dev). Rendered for the published-page and
 * "coming soon" placeholder views (the Builder accepts a `visit` for an existing-but-unpublished
 * slug), but not for unknown slugs or API errors.
 */
export function VisitorAnalytics({ slug, builderApiUrl }: { slug: string; builderApiUrl: string }) {
  useEffect(() => {
    postEventOnce(builderApiUrl, { slug, type: "visit" });
  }, [slug, builderApiUrl]);
  return null;
}
