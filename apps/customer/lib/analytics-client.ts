// Browser-side analytics emission for the public venue page. Best-effort: every POST swallows its
// errors (analytics must never break the page). "Exactly one X per page load" is enforced by a
// module-scoped Set rather than a React ref — a ref is recreated on each mount, so React StrictMode's
// double effect-invoke in dev would post twice; a module-scoped Set survives it. This module is
// imported only from `"use client"` components, so the Set lives in the browser bundle (one per tab
// / page load).

import { analyticsEventsPath, type AnalyticsEventInput } from "@mizrahitality/contracts";

const sent = new Set<string>();

const key = (input: AnalyticsEventInput) => `${input.slug}|${input.type}`;

/** POST one analytics event to the Builder API (cross-origin, CORS-friendly). Never throws. */
export async function postEvent(builderApiUrl: string, input: AnalyticsEventInput): Promise<void> {
  try {
    await fetch(`${builderApiUrl.replace(/\/+$/, "")}${analyticsEventsPath()}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Best-effort: ignore network failures, non-2xx, etc.
  }
}

/**
 * POST an event at most once per page load (keyed by `slug|type`). Returns `true` if this call
 * actually fired the request, `false` if it was de-duplicated. Fire-and-forget — the POST itself
 * runs in the background.
 */
export function postEventOnce(builderApiUrl: string, input: AnalyticsEventInput): boolean {
  const k = key(input);
  if (sent.has(k)) return false;
  sent.add(k);
  void postEvent(builderApiUrl, input);
  return true;
}

/** Test-only: clear the once-guard between cases. Not used by app code. */
export function __resetAnalyticsGuard(): void {
  sent.clear();
}
