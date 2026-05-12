# Plan — Feature 7: analytics-dashboard

**Status:** done
**Order:** 7 of 9
**Depends on:** feature 1 (monorepo-foundation) — done; feature 2 (owner-auth) — done; feature 6 (analytics-api) — done.
**Satisfies (REQ-#):** REQ-9 (owner dashboard — total visits, Book Now click count, Book Now hover count; updates as events arrive), REQ-10 (technophobe-friendly UX — the dashboard page; shadcn/ui components & lucide-react icons, no raw/unstyled screens).
**Skills:** none (no Prisma/schema change — feature 6 already added `AnalyticsEvent` and the aggregation helper).

> Standing process (master plan §1): designed in Plan mode; on approval this file is copied verbatim to `plans/07-analytics-dashboard-plan.md` with `Status: in-progress`, then executed; on completion its status → `done` and the master plan §2 status table is ticked. No commit unless the user asks.

---

## Context

**Why this feature.** Feature 6 built the analytics ingest + aggregation API: `POST /api/events` stores rows and `GET /api/sites/{slug}/analytics` returns `AnalyticsSummary = { slug, visits, bookNowHovers, bookNowClicks }` (lifetime totals; `getAnalyticsSummary(slug)` is also exported from `apps/builder/lib/analytics/events.ts` for in-process use). Feature 8 will make the Customer site emit those events. But there is still nowhere for the **owner** to see the numbers: `apps/builder/app/(owner)/dashboard/page.tsx` is the post-sign-in landing page and is a placeholder Card carrying a `// TODO(feature-7)` note. Feature 7 turns that page into the real analytics dashboard — three metric tiles fed by the feature-6 aggregation, auto-refreshing as events arrive — finishing REQ-9 and the dashboard slice of REQ-10.

**What's already there (patterns to reuse).**
- `apps/builder/app/(owner)/layout.tsx` — the owner gate: a Server Component that `await requireOwner()` (redirects to `/sign-in` when no session) and renders a header (`Mizrahitality` brand + owner email + a `signOutAction` form button) over `<main className="mx-auto max-w-4xl p-6">{children}</main>`. Every owner page lives under this group, so the dashboard page can assume an authenticated owner.
- `apps/builder/app/(owner)/dashboard/page.tsx` — current placeholder: `requireOwner()` → a `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` with "Signed in as {email}", a sentence, and `<Button asChild><Link href="/builder">Open the site builder</Link></Button>`. Has `export const metadata = { title: "Dashboard — Mizrahitality" }`. This file is what feature 7 replaces.
- `apps/builder/app/(owner)/builder/page.tsx` — `requireOwner()` → `getOwnerSite(owner.id)`; `null` → a "Name your venue" Card with `<CreateSiteForm/>`; otherwise a `rounded-lg border bg-muted/40 p-4` info box showing `http://localhost:5112/<slug>` + `<SiteBuilder site={site} />`. (`CUSTOMER_ORIGIN = "http://localhost:5112"` is hard-coded there — mirror that.)
- `apps/builder/lib/site/site.ts` — `getOwnerSite(ownerId): Promise<BuilderSite | null>`. `BuilderSite = { id; name; slug; blocks; published: boolean; hasUnpublishedChanges: boolean; publishedAt: string | null }` (`apps/builder/lib/site/types.ts`).
- `apps/builder/lib/analytics/events.ts` — `getAnalyticsSummary(slug, deps?): Promise<{ status: number; body: ApiResult<AnalyticsSummary> }>` (real Prisma lazy-imported inside `defaultReadAnalyticsDeps()`). For the owner's own existing site it always resolves `200 apiOk(summary)` (all-zeros if no events); an unknown slug → `404 apiErr("not_found", …)` — handled defensively.
- `apps/builder/lib/analytics/analytics.ts` — pure helpers (`summarizeEvents`, `parseAnalyticsEventInput`, …). New pure view-model code in this feature mirrors its DB-free style.
- `apps/builder/app/api/sites/[slug]/analytics/route.ts` — `GET` handler (`dynamic = "force-dynamic"`, always an envelope body, **no CORS** — same-origin only). The client-side poll hits this from the dashboard (`:5111` → `:5111`, same origin — fine).
- `packages/contracts/src/analytics.ts` — `AnalyticsSummary`, `analyticsSummaryPath(slug)` (= `/api/sites/{slug}/analytics`), `ApiResult<T>`/`apiOk`/`apiErr`. Imported as raw TS in both apps. **No contract changes needed this feature.**
- shadcn UI in `apps/builder/components/ui/`: `button`, `card` (`Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`), `separator`, `tooltip`, `dialog`, `input`, `label`. `lucide-react` is already a dependency (shadcn uses it).
- `apps/builder/components/site/*` — precedent for a `components/<area>/` folder of feature components (`"use client"` ones like `site-builder.tsx`, plus the server-renderable `block-view.tsx`).
- Tests: Vitest per workspace, node env, `@/*` alias; `apps/builder/__tests__/{analytics,auth,site}/*.test.ts` + `__tests__/smoke.test.ts`. Established stance (features 5 & 6): **pure logic / injectable-deps functions get DB-free unit tests; Next route handlers and Server Components are not unit-tested** (covered by `next build` + manual verification). Smoke tests stay DB-independent.

**Decisions confirmed with the user (Plan mode).**
1. **Replace the `/dashboard` placeholder** — the existing post-sign-in landing page *becomes* the analytics dashboard. No new `/analytics` route.
2. **Auto-poll for "updates as events arrive"** — the metric tiles live in a small `"use client"` component that `fetch`es `GET /api/sites/{slug}/analytics` on an interval (default **10 s**) and live-updates the numbers; the server still renders the first paint with current counts. (Goes a touch beyond the charter's "refresh is fine" but the user asked for it; no realtime infra — just `setInterval` + `fetch`.)
3. **No-site state = a friendly empty-state Card with a CTA to `/builder`** (not a redirect) — the dashboard stays reachable.
4. **Testability via a pure view-model helper** — extract `lib/analytics/dashboard-view.ts` (`metricTiles(summary)` + `buildDashboardView(site, summaryResult)` → a discriminated union `no-site | error | ready`) and unit-test it DB-free; the page Server Component and the client component just render its output; both are covered by `next build`.

**Design calls (not user-facing forks; recorded for the executor).**
- **Data source = the in-process `getAnalyticsSummary(site.slug)`** for the server render (not an HTTP self-fetch) — it's already exported and DB-injectable; importing it is simpler than calling our own endpoint. The *client* poll necessarily uses the HTTP endpoint (it runs in the browser) — relative path `analyticsSummaryPath(slug)`, `fetch(..., { cache: "no-store" })`, branch on the parsed envelope's `ok`. Same origin, so no CORS concern (and the `GET` route deliberately has no CORS headers — that's fine for same-origin).
- **`export const dynamic = "force-dynamic"`** on the page — `requireOwner()` reads cookies (already forces dynamic) but stating it is explicit and matches the API routes' style; guarantees the first paint reflects current counts.
- **Metric copy** (the three tiles, in this order): **Visits** — "Total times your published page has loaded." · **Book Now hovers** — "Times a visitor hovered over the Book Now button." · **Book Now clicks** — "Times a visitor clicked Book Now." Optional lucide icons per tile (`Eye`, `Pointer`/`MousePointer2`, `MousePointerClick`) — purely decorative; keep if it reads cleanly.
- **Unpublished-site note** — if `site.published === false`, show a small inline note ("Your site isn't published yet — publish it in the builder so visitors see your real page.") with a link to `/builder`; the metrics still render (an unpublished slug can already accumulate `visit`s via feature 8's placeholder page).
- **Owner-layout header gets two text nav links** ("Dashboard" → `/dashboard`, "Site builder" → `/builder`) and the `Mizrahitality` brand becomes a `<Link href="/dashboard">` — tiny change, helps navigation between the only two owner pages (REQ-10 "operable without technical knowledge"). No active-state styling — keep it dead simple.
- **Poll hygiene** — `useEffect` sets up `setInterval(poll, 10_000)`, clears it on unmount, and ignores in-flight results after unmount (a `cancelled` flag); a failed/aborted fetch is swallowed (keep the last good numbers). Optional: skip the fetch when `document.hidden`. Show a muted "Updates automatically — last refreshed HH:MM:SS" line so the owner knows it's live.
- **No new dependencies, no new shadcn components, no Prisma/schema change, no contract change.**

**Intended outcome.** After `pnpm dev` (or `pnpm -F builder build && pnpm -F builder start` if `:5111` is held by the sibling project), an owner who signs in lands on `/dashboard` and sees three styled metric tiles (their site's lifetime `visits` / `bookNowHovers` / `bookNowClicks`), the live-site URL, and — if not yet published — a publish nudge; an owner with no site yet sees a friendly "create your site" card. POSTing events via `curl` to `/api/events` and waiting ≤10 s makes the numbers tick up without a manual reload. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` stay green across the workspace.

---

## Charter (master plan §3.7)

The owner's analytics dashboard page in the Builder app. Deliver: an authenticated dashboard (gated by owner-auth) for the owner's site showing total visits, Book Now click count, and Book Now hover count — sourced from the analytics-api aggregation — with the view reflecting events as they arrive (server component re-fetch / refresh is fine; no realtime needed). Clean shadcn/ui layout, no raw/unstyled screens. Tests: light — the aggregation math is already covered in analytics-api; here, mostly a smoke test that the page renders with mocked aggregates. **Out of scope:** analytics ingestion/aggregation logic (feature 6), any new metrics beyond the listed three.

---

## In scope

- Replace `apps/builder/app/(owner)/dashboard/page.tsx` with the real analytics dashboard: `requireOwner()` → `getOwnerSite(owner.id)` → (if a site) `getAnalyticsSummary(site.slug)` → `buildDashboardView(...)` → render the no-site card, an error card, or the live dashboard (header with the venue name + live URL + optional publish nudge, the three metric tiles via the client poll component, and an "Open the site builder" link).
- New pure helper `apps/builder/lib/analytics/dashboard-view.ts` — `metricTiles(summary)`, `buildDashboardView(site, summaryResult)`, the `DashboardView` / `MetricTile` types. DB-free; importable from both the Server Component and the client component (only imports types from `@mizrahitality/contracts`).
- New client component `apps/builder/components/analytics/analytics-metrics.tsx` (`"use client"`) — renders the three `Card` tiles from a `summary` state seeded with the server-rendered `initialSummary`, polls `analyticsSummaryPath(slug)` every 10 s and updates on success, shows a muted "updates automatically / last refreshed" line.
- Update `apps/builder/app/(owner)/layout.tsx` — brand → `<Link href="/dashboard">`; add "Dashboard" / "Site builder" nav links in the header.
- New test `apps/builder/__tests__/analytics/dashboard-view.test.ts` (DB-independent) — covers `metricTiles` and all `buildDashboardView` branches with mocked `ApiResult<AnalyticsSummary>` values.
- `CLAUDE.md` Layout section updated (the dashboard page is now the analytics dashboard; `lib/analytics/dashboard-view.ts`; `components/analytics/analytics-metrics.tsx`; the new test); `plans/00-master-plan.md` §2 status table ticked; `plans/07-analytics-dashboard-plan.md` (this file copied verbatim).

## Out of scope

- The analytics ingest/aggregation logic and endpoints (feature 6 — done); the `AnalyticsEvent` model (feature 6).
- Emitting events — the Customer app's `visit`/`book-now-hover`/`book-now-click` posting and the once-per-load guarantee (feature 8).
- Any metric beyond the three (`visits`, `bookNowHovers`, `bookNowClicks`) — no time windows, per-day breakdowns, funnels, cohorts, charts, CSV export (PRD non-goals). Lifetime totals only (matches REQ-9 and `AnalyticsSummary`).
- Realtime transport (WebSocket/SSE) — the client poll is the chosen mechanism.
- Any Prisma/schema change, any `@mizrahitality/contracts` change, any new dependency or shadcn component.
- Touching `lib/site/*`, `lib/auth/*`, the builder UI, the published-page or events endpoints, or the seed (feature 9 owns adding sample events to make the dashboard non-empty out of the box).

---

## Approach

### 1. Pure view-model — `apps/builder/lib/analytics/dashboard-view.ts` (new)

No Prisma, no Next, no React — only type imports from `@mizrahitality/contracts`, so it's trivially unit-tested and safely importable from a `"use client"` file. Shape (illustrative — final names/copy can be tightened in execution):

```ts
import type { AnalyticsSummary, ApiResult } from "@mizrahitality/contracts";

export type MetricTile = {
  key: "visits" | "bookNowHovers" | "bookNowClicks";
  label: string;
  value: number;
  hint: string;
};

export type DashboardView =
  | { kind: "no-site" }
  | { kind: "error"; message: string }
  | { kind: "ready"; slug: string; summary: AnalyticsSummary; metrics: MetricTile[] };

export function metricTiles(summary: AnalyticsSummary): MetricTile[] {
  return [
    { key: "visits", label: "Visits", value: summary.visits, hint: "Total times your published page has loaded." },
    { key: "bookNowHovers", label: "Book Now hovers", value: summary.bookNowHovers, hint: "Times a visitor hovered over the Book Now button." },
    { key: "bookNowClicks", label: "Book Now clicks", value: summary.bookNowClicks, hint: "Times a visitor clicked Book Now." },
  ];
}

/** Decide what the dashboard renders from the owner's site (or null) and the aggregation result (or null when there's no site). */
export function buildDashboardView(
  site: { slug: string } | null,
  summaryResult: ApiResult<AnalyticsSummary> | null,
): DashboardView {
  if (!site) return { kind: "no-site" };
  if (!summaryResult || summaryResult.ok === false) {
    return { kind: "error", message: summaryResult?.ok === false ? summaryResult.error.message : "We couldn't load your analytics just now — try refreshing." };
  }
  return { kind: "ready", slug: site.slug, summary: summaryResult.data, metrics: metricTiles(summaryResult.data) };
}
```

### 2. Page — `apps/builder/app/(owner)/dashboard/page.tsx` (replace)

Server Component. `export const metadata = { title: "Dashboard — Mizrahitality" }` (keep). `export const dynamic = "force-dynamic"`. `const CUSTOMER_ORIGIN = "http://localhost:5112"` (mirror the builder page).

Flow:
1. `const owner = await requireOwner();`
2. `const site = await getOwnerSite(owner.id);`
3. `const summaryResult = site ? (await getAnalyticsSummary(site.slug)).body : null;`
4. `const view = buildDashboardView(site, summaryResult);`
5. `switch (view.kind)`:
   - `"no-site"` → an empty-state `Card` ("Create your venue's page" / a sentence / `<Button asChild><Link href="/builder">Create your site</Link></Button>`). (Same Card vocabulary as today's placeholder.)
   - `"error"` → a `Card` showing `view.message` and a hint to refresh / a link to `/builder`.
   - `"ready"` → a `<div className="space-y-6">` with:
     - a header block: `<h1>` the venue name (`site!.name`) + "Analytics", a subline with the live-site link (`{CUSTOMER_ORIGIN}/{site!.slug}`, `target="_blank" rel="noopener noreferrer"`, mono/underline like the builder page), and — when `!site!.published` — a muted note "Your site isn't published yet — publish it in the builder so visitors see your real page." with a `<Link href="/builder">`;
     - `<AnalyticsMetrics slug={site!.slug} initialSummary={view.summary} />`;
     - a footer line / `<Button variant="outline" asChild><Link href="/builder">Open the site builder</Link></Button>`.

All UI from shadcn `Card`/`Button` + Tailwind utilities already in use elsewhere (`space-y-6`, `rounded-lg border bg-muted/40 p-4`, `text-sm text-muted-foreground`, `font-mono text-primary`, `grid gap-4 sm:grid-cols-3`, `text-3xl font-semibold tabular-nums`, …) — no new CSS.

### 3. Client poll component — `apps/builder/components/analytics/analytics-metrics.tsx` (new)

```tsx
"use client";
import { useEffect, useState } from "react";
import { analyticsSummaryPath, type AnalyticsSummary } from "@mizrahitality/contracts";
import { metricTiles } from "@/lib/analytics/dashboard-view";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
// optional: import { Eye, MousePointer2, MousePointerClick } from "lucide-react";

const POLL_MS = 10_000;

export function AnalyticsMetrics({ slug, initialSummary }: { slug: string; initialSummary: AnalyticsSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(analyticsSummaryPath(slug), { cache: "no-store" });
        const body = (await res.json()) as { ok: boolean; data?: AnalyticsSummary };
        if (!cancelled && body.ok && body.data) {
          setSummary(body.data);
          setUpdatedAt(new Date().toLocaleTimeString());
        }
      } catch {
        /* keep last good numbers */
      }
    }
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [slug]);

  const tiles = metricTiles(summary);
  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.key}>
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{t.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{t.hint}</CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Updates automatically{updatedAt ? ` — last refreshed ${updatedAt}` : ""}.
      </p>
    </div>
  );
}
```

(Optional lucide icon per tile — decorative; only if it stays clean. The component is SSR'd for the first paint; the `useEffect` poll is browser-only.)

### 4. Owner layout — `apps/builder/app/(owner)/layout.tsx` (edit)

- `import Link from "next/link";`
- Brand: `<Link href="/dashboard" className="font-semibold">Mizrahitality</Link>` (was a `<span>`).
- After the brand, add a small nav: `<nav className="flex items-center gap-3 text-sm"><Link href="/dashboard">Dashboard</Link><Link href="/builder">Site builder</Link></nav>` (muted-ish styling consistent with the header). No active-state logic.
- Email + sign-out form stay as-is.

---

## Data model

None. No Prisma/schema change; the `update-database` skill is **not** used. (`AnalyticsEvent` and the aggregation were added in feature 6.)

---

## API surface

None added or changed. The dashboard *reads*:
- in-process: `getAnalyticsSummary(slug)` from `apps/builder/lib/analytics/events.ts` (server render);
- over HTTP: `GET /api/sites/{slug}/analytics` (unchanged — feature 6) for the client poll, same-origin.

No new endpoints, Server Actions, or `@mizrahitality/contracts` exports.

---

## Files & directories

```
apps/builder/
  app/(owner)/dashboard/page.tsx                 (replace — placeholder → real analytics dashboard; force-dynamic; requireOwner → getOwnerSite → getAnalyticsSummary → buildDashboardView → render)
  app/(owner)/layout.tsx                         (edit — brand becomes a Link to /dashboard; add "Dashboard" / "Site builder" header nav)
  lib/analytics/dashboard-view.ts                (new — pure: MetricTile, DashboardView, metricTiles, buildDashboardView; only type imports from @mizrahitality/contracts)
  components/analytics/analytics-metrics.tsx     (new — "use client": three Card tiles seeded with initialSummary, polls GET /api/sites/{slug}/analytics every 10s, "last refreshed" line)
  __tests__/analytics/dashboard-view.test.ts     (new — DB-independent: metricTiles + buildDashboardView branches with mocked ApiResult)
CLAUDE.md                                        (edit — Layout: the (owner)/dashboard page is now the analytics dashboard; new lib/analytics/dashboard-view.ts; new components/analytics/analytics-metrics.tsx; the (owner)/layout header nav; the new __tests__/analytics/dashboard-view.test.ts)
plans/00-master-plan.md                          (edit — §2 status table: feature 7 → in-progress → done)
plans/07-analytics-dashboard-plan.md             (new — this plan, copied verbatim)
```

No new dependencies. No new shadcn components. No migration.

---

## Tests

DB-independent, Vitest, node env, `@/*` alias — consistent with features 5 & 6 (pure logic tested; Server Components / client components not unit-tested — covered by `next build` + manual verification).

**`apps/builder/__tests__/analytics/dashboard-view.test.ts` (new)** —
- `metricTiles`: `metricTiles({ slug:"cafemizrahi", visits:3, bookNowHovers:1, bookNowClicks:2 })` → an array of 3 tiles with `key`s `"visits"|"bookNowHovers"|"bookNowClicks"` (in that order) and `value`s `3,1,2`; each `label` and `hint` is a non-empty string; all-zeros summary → all `value`s `0`.
- `buildDashboardView`:
  - `buildDashboardView(null, null)` → `{ kind:"no-site" }`.
  - `buildDashboardView({ slug:"x" }, null)` → `{ kind:"error", message: expect.any(String) }`.
  - `buildDashboardView({ slug:"x" }, apiErr("not_found","No site with that web address."))` → `{ kind:"error", message:"No site with that web address." }` (surfaces the envelope's message).
  - `buildDashboardView({ slug:"x" }, apiOk({ slug:"x", visits:5, bookNowHovers:2, bookNowClicks:1 }))` → `{ kind:"ready", slug:"x", summary:{…}, metrics: [tiles with values 5,2,1] }`.
  - `buildDashboardView({ slug:"x" }, apiOk({ slug:"x", visits:0, bookNowHovers:0, bookNowClicks:0 }))` → `kind:"ready"` with all-zero tiles (a published-but-no-traffic site still shows the dashboard).

**Not unit-tested** — `app/(owner)/dashboard/page.tsx` (Server Component: `requireOwner()` reads cookies, `getOwnerSite`/`getAnalyticsSummary` touch Prisma), `components/analytics/analytics-metrics.tsx` (client component with a `setInterval`/`fetch` `useEffect` — no testing-library/jsdom set up, and the precedent is not to unit-test components), and `app/(owner)/layout.tsx`. All covered by `next build` (compilation + types) and the manual verification below. Existing tests stay green (nothing they assert changes). `apps/builder/__tests__/smoke.test.ts` untouched and DB-independent.

Gates (green across the workspace): `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build` (both apps; `/dashboard` compiles as a dynamic route).

---

## Acceptance (REQ-# this feature owns)

- **REQ-9 — owner dashboard (P0).** The authenticated `/dashboard` page (gated by `(owner)/layout.tsx`'s `requireOwner()`) shows, for the owner's site, **total visits**, **Book Now click count**, and **Book Now hover count** — sourced from feature 6's aggregation (`getAnalyticsSummary(site.slug)` server-side; `GET /api/sites/{slug}/analytics` for the client poll). The numbers **update as new events arrive**: the metric tiles re-fetch every 10 s and live-update without a manual reload (and a browser reload also shows current counts — the page is `force-dynamic`). *Verified by:* `dashboard-view.test.ts` (the view-model derivation incl. all-zeros and error branches) + `next build` + the manual demo below (POST events via `curl`, watch the tiles tick up).
- **REQ-10 — technophobe-friendly UX (P1), the dashboard page.** The dashboard is built from shadcn/ui `Card`/`Button` (+ optional lucide icons) and existing Tailwind utilities — no raw/unstyled screen; clear headings, plain-English metric labels and hints, a no-site empty state with a single CTA, an unpublished nudge, and header nav links between Dashboard and Site builder. *Verified by:* visual check in the demo; `pnpm lint` (no unused/`any`); the page renders cleanly with 0, some, and many events.

(REQ-15's *posting* of events is feature 8; feature 6 owns ingest/aggregation. This feature only displays the aggregates.)

---

## Verification (end-to-end)

1. **Static gates** (repo root): `pnpm typecheck` → `pnpm lint` → `pnpm test` (contracts + builder + customer vitest, all green incl. the new `__tests__/analytics/dashboard-view.test.ts`) → `pnpm build` (`next build` for both apps; confirms `/dashboard` and the new client component compile; `/dashboard` listed as `ƒ` dynamic).
2. **Run the app:** `pnpm dev` (or, if `:5111` is held by the sibling `../Mizrahitality` dev server — as in features 2/3/5/6 — `pnpm -F builder build && pnpm -F builder start`). You need a signed-in owner; create one via the sign-up page (feature 2) — or, once feature 9 lands, `pnpm seed`.
3. **No-site state:** sign in as an owner who hasn't created a site → `/dashboard` shows the "create your site" Card with a working "Create your site" → `/builder` button.
4. **Create + check empty dashboard:** create a venue (e.g. slug `cafemizrahi`) in `/builder`, then go to `/dashboard` → three tiles, all `0`; live-site URL shown (`http://localhost:5112/cafemizrahi`); since it's not published yet, the "publish it in the builder" note appears with a link.
5. **Publish + see the nudge disappear:** publish the site in `/builder`, return to `/dashboard` → the unpublished note is gone; tiles still `0`.
6. **Events flow through:** `curl -X POST http://localhost:5111/api/events -H 'content-type: application/json' -d '{"slug":"cafemizrahi","type":"visit"}'` ×3, one `book-now-hover`, one `book-now-click`. With `/dashboard` open, within ≤10 s the tiles update to `Visits 3 / Book Now hovers 1 / Book Now clicks 1` and the "last refreshed HH:MM:SS" line ticks — no manual reload. A manual reload also shows `3 / 1 / 1` (server render).
7. **More events keep ticking:** POST a few more `visit`s → tiles climb on the next poll.
8. **Header nav:** the `Mizrahitality` brand and the "Dashboard" / "Site builder" links navigate between `/dashboard` and `/builder`; sign-out still works.
9. **Auth gate:** hitting `/dashboard` while signed out → redirected to `/sign-in` (unchanged behavior, but re-confirm).
10. **(If `:5111` is held)** fall back to `next build` + `next start -p 5111` with a throwaway `OwnerAccount`+`Site`+a few `AnalyticsEvent` rows created via Prisma for the visual/`curl` checks, plus the unit suite; note "live poll smoke done via `next start`; recommend a manual `pnpm dev` pass when `:5111` is free."

---

## Risks & open questions

- **Client poll vs. the charter's "no realtime needed."** A 10 s `setInterval` `fetch` is the agreed mechanism (user choice). It's lightweight (one owner, one same-origin GET) but it *is* extra moving parts vs. plain `force-dynamic` + reload — flagged so it isn't mistaken for over-engineering. The server render still works with JS off (shows the counts at load time); the poll is pure enhancement. (User confirmed.)
- **`GET /api/sites/{slug}/analytics` has no CORS headers** (by design — feature 6) — fine here because the dashboard polls it **same-origin** (`:5111` → `:5111`). If the dashboard were ever served from a different origin this would break; it isn't.
- **`getAnalyticsSummary` 404 for the owner's own site** — can't happen normally (the site row exists); `buildDashboardView` still degrades to an `error` card if `!ok`. Not a real risk; defensive only.
- **Empty dashboard until feature 9 / real traffic.** Out of the box (no seed events yet) every tile is `0` — correct, not a bug. Feature 9 adds sample `AnalyticsEvent` rows so the demo dashboard isn't empty; not this feature's job.
- **No charts / time windows / per-day breakdown** — `AnalyticsSummary` is lifetime totals only (matches REQ-9 and the PRD non-goals). Any trend view later is a new endpoint + UI, not a change here.
- **Touching the shared `(owner)/layout.tsx`** for the header nav — minimal (a `Link` import + the brand becoming a link + two link tags). It affects `/builder` too (gains the nav) — that's desirable, not a regression.
- **No commit** unless the user asks (standing process). No `update-database` (no schema change). No new dependencies.

---

## Tasks (execution order)

> Progress legend: ✅ done · 🔄 in progress · ⬜ not started.

1. ✅ Copy this plan verbatim to `plans/07-analytics-dashboard-plan.md`, status → `in-progress`. (File was already in place; status flipped.)
2. ✅ `apps/builder/lib/analytics/dashboard-view.ts` (new, pure) — `MetricTile`, `DashboardView`, `metricTiles(summary)`, `buildDashboardView(site, summaryResult)`.
3. ✅ `apps/builder/components/analytics/analytics-metrics.tsx` (new, `"use client"`) — three `Card` tiles seeded with `initialSummary`, 10 s poll of `analyticsSummaryPath(slug)` (`cache: "no-store"`, branch on `ok`, skip when `document.hidden`), cleanup on unmount, "last refreshed" line; decorative lucide icons per tile.
4. ✅ `apps/builder/app/(owner)/dashboard/page.tsx` (replace) — `dynamic = "force-dynamic"`; `requireOwner()` → `getOwnerSite` → `getAnalyticsSummary` → `buildDashboardView` → render no-site / error / ready (header w/ venue name + live URL + unpublished nudge, `<AnalyticsMetrics>`, "Open the site builder" link). Kept `metadata`.
5. ✅ `apps/builder/app/(owner)/layout.tsx` (edit) — brand → `<Link href="/dashboard">`; added "Dashboard" / "Site builder" header nav links.
6. ✅ `apps/builder/__tests__/analytics/dashboard-view.test.ts` (new) — `metricTiles` + all `buildDashboardView` branches with mocked `ApiResult` (`apiOk`/`apiErr` from `@mizrahitality/contracts`).
7. ✅ Gates: `pnpm typecheck` → `pnpm lint` → `pnpm test` (101 builder tests incl. the new 7) → `pnpm build` — all green; `/dashboard` listed as `ƒ` dynamic. Live `pnpm dev` smoke (Verification §3–9) **not run** — `:5111` is held by the sibling project; static gates + `next build` cover compilation/types — recommend a manual `pnpm dev` pass when `:5111` is free.
8. ✅ `CLAUDE.md` — Layout section updated (the `(owner)/dashboard` page is now the analytics dashboard; `lib/analytics/dashboard-view.ts`; `components/analytics/analytics-metrics.tsx`; the `(owner)/layout` header nav; the new `__tests__/analytics/dashboard-view.test.ts`; the analytics route handler note now mentions the same-origin poll).
9. ✅ `plans/00-master-plan.md` §2 status table: feature 7 analytics-dashboard → `done ([plan](07-analytics-dashboard-plan.md))`.
10. ✅ Close out: status → `done`; "Execution outcome" added below. No commit (per standing process — user hasn't asked).

---

## Execution outcome

**Done — 2026-05-12.** All in-scope items landed; no scope changes.

**Files changed:**
- `apps/builder/lib/analytics/dashboard-view.ts` — **new**. Pure view-model: `MetricTile`, `DashboardView` (`no-site` | `error` | `ready`), `metricTiles(summary)`, `buildDashboardView(site, summaryResult)`. Only type imports from `@mizrahitality/contracts`.
- `apps/builder/components/analytics/analytics-metrics.tsx` — **new**. `"use client"`. Three `Card` tiles from `metricTiles(summary)` (state seeded with `initialSummary`), decorative lucide icons (`Eye` / `MousePointer2` / `MousePointerClick`), `setInterval` 10 s poll of `analyticsSummaryPath(slug)` (`cache: "no-store"`, branch on the envelope's `ok`, skip when `document.hidden`, `cancelled` flag + `clearInterval` on unmount, errors swallowed), muted "Updates automatically — last refreshed HH:MM:SS" line.
- `apps/builder/app/(owner)/dashboard/page.tsx` — **replaced**. `export const dynamic = "force-dynamic"`; kept `metadata`. `requireOwner()` → `getOwnerSite(owner.id)` → `getAnalyticsSummary(site.slug)` (in-process) → `buildDashboardView(...)` → switch: `no-site` empty-state Card with a "Create your site" CTA; `error` Card surfacing the message + a refresh hint + an "Open the site builder" link; `ready` → `<h1>{site.name} — Analytics</h1>` + the `http://localhost:5112/<slug>` link + (when `!site.published`) an "isn't published yet — publish it in the builder" nudge + `<AnalyticsMetrics slug initialSummary>` + an "Open the site builder" outline button. `CUSTOMER_ORIGIN = "http://localhost:5112"` mirrored from the builder page.
- `apps/builder/app/(owner)/layout.tsx` — **edited**. Added `import Link from "next/link"`; brand is now `<Link href="/dashboard" className="font-semibold">Mizrahitality</Link>` grouped with a `<nav>` of "Dashboard" → `/dashboard` and "Site builder" → `/builder` (muted, `hover:text-foreground`, no active-state logic); email + sign-out form unchanged. (The `/builder` page gains the same header nav — intended.)
- `apps/builder/__tests__/analytics/dashboard-view.test.ts` — **new**. 7 tests: `metricTiles` order/values/non-empty copy + all-zeros; `buildDashboardView` for `null/null` → `no-site`, `{slug}/null` → `error` (non-empty message), `{slug}/apiErr(...)` → `error` surfacing the envelope message, `{slug}/apiOk(...)` → `ready` (slug + summary + tile values), and a published-but-no-traffic `apiOk` all-zeros → `ready`. DB-independent.
- `CLAUDE.md` — Layout section updated (see task 8). `plans/00-master-plan.md` — §2 row 7 → done. `plans/07-analytics-dashboard-plan.md` — this file (status `done`, tasks ticked, this section).

No new dependencies, no new shadcn components, no Prisma/schema change (the `update-database` skill was not used), no `@mizrahitality/contracts` change. `lib/site/*`, `lib/auth/*`, the builder UI, the published-page/events endpoints, and the seed were not touched.

**Gates:** `pnpm typecheck` ✅ · `pnpm lint` ✅ (no unused / no `any`) · `pnpm test` ✅ (contracts 11, builder 101 incl. the new 7, customer 3) · `pnpm build` ✅ (both apps; `/dashboard` is `ƒ` dynamic, 2.15 kB / 114 kB First Load).

**Not done (and why):** the interactive live smoke (Verification §3–9 — sign up, create/publish a site, `curl` events, watch the 10 s poll tick) was **not run** because `localhost:5111` is currently held by the sibling `../Mizrahitality` dev server (the documented fallback for features 2/3/5/6). Static gates + `next build` cover compilation, types, and that `/dashboard` + the client component build as expected; a manual `pnpm dev` pass is recommended when `:5111` is free. No commit was made (standing process — the user hasn't asked).
