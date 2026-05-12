# Plan — Feature 6: analytics-api

**Status:** done
**Order:** 6 of 9
**Depends on:** feature 1 (monorepo-foundation) — done; feature 3 (site-builder) — done. (Sits in parallel with feature 5 published-page-api — done — in the dependency graph; needs only the monorepo + the `Site`/slug.)
**Satisfies (REQ-#):** REQ-15 (analytics events posting — *ingest + aggregation API side*), REQ-18 (REST API contract — endpoint (b): ingest analytics events; per-slug aggregation endpoint). Feeds REQ-9 (owner dashboard — built in feature 7).
**Skills:** `update-database` (mandatory — adds the `AnalyticsEvent` model + migration `add_analytics_event` + `prisma/CHANGELOG.md` entry).

> Standing process (master plan §1): designed in Plan mode; on approval this file is copied verbatim to `plans/06-analytics-api-plan.md` with `Status: in-progress`, then executed; on completion its status → `done` and the master plan §2 status table is ticked. No commit unless the user asks.

---

## Context

**Why this feature.** The Customer app (feature 8) will post analytics events — `visit`, `book-now-hover`, `book-now-click` — and the owner dashboard (feature 7) will show their totals. Right now there is nowhere to post them and nothing to aggregate: `@mizrahitality/contracts` already names the event vocabulary (`AnalyticsEventType`, `ANALYTICS_EVENT_TYPES`, `AnalyticsEventInput = { slug, type }`) and the `app/api/README.md` "Coming later" section already promises `POST /api/events` + a per-slug aggregation endpoint "added by feature 6", but neither exists. Feature 6 closes that loop on the Builder side: an `AnalyticsEvent` table, a `POST /api/events` ingest endpoint, and a `GET /api/sites/{slug}/analytics` aggregation endpoint — both unauthenticated (the slug is the identity), both in the standard `ApiSuccess<T>`/`ApiError` envelope, documented alongside the published-page API.

**What's already there (the patterns to mirror — from feature 5, done).**
- `apps/builder/app/api/sites/[slug]/route.ts` — `GET` handler: `export const dynamic = "force-dynamic"`, lower-cases the incoming slug, `prisma.site.findUnique(...)`, hands to a *pure* `resolvePublishedResponse(slug, found)` returning `{ status, body: ApiResult<…> }`, then `Response.json(body, { status })`; on a thrown error → `500` with an envelope body. The body is **always** a JSON envelope (even 404/500) so `createApiClient` (which parses the body and ignores HTTP status) gets a clean `ApiError`.
- `apps/builder/lib/site/published.ts` — pure module (no Prisma, no Next): `buildPublishedSnapshot`, `toPublishedPage`, `resolvePublishedResponse`. Fully unit-tested DB-free.
- `apps/builder/lib/site/site.ts` — Prisma helpers. To keep unit tests DB-free, the real Prisma client is `await import("@/lib/db")`-ed **lazily inside `defaultXxxDeps()`**, never at module top. `createSite` takes optional `CreateSiteDeps`; `saveSite`/`publishSite` take optional `WriteSiteDeps` (`{ findSite, updateSite }`). Tests inject a fake; production passes nothing → `defaultWriteSiteDeps()` lazy-imports prisma.
- `apps/builder/lib/db.ts` — `export const prisma: PrismaClient` singleton (cached on `globalThis`).
- `apps/builder/app/api/README.md` — the REST API doc; intro explains the envelope ("body is always an envelope; branch on `ok`, not the HTTP status"); has a `## Coming later` section listing the two endpoints this feature delivers.
- `packages/contracts/src/analytics.ts` — `AnalyticsEventType`, `ANALYTICS_EVENT_TYPES` (readonly array), `AnalyticsEventInput = { slug: string; type: AnalyticsEventType }`. `src/envelope.ts` — `ApiSuccess<T>`/`ApiError`/`ApiResult<T>`/`apiOk`/`apiErr`. `src/client.ts` — `createApiClient`. `src/published-page.ts` — `PublishedBlock`/`PublishedPage`/`publishedPagePath`. `src/index.ts` — `export * from "./analytics"` (so new exports from `analytics.ts` are picked up automatically).
- `apps/builder/prisma/schema.prisma` — `OwnerAccount` (id, email @unique, passwordHash, timestamps, `site Site?`) + `Site` (id, `ownerId @unique`, owner relation `onDelete: Cascade`, name, `slug @unique`, contentJson, isDraft, publishedJson?, publishedAt?, timestamps). `prisma/CHANGELOG.md` has prior entries (init / add_site / add_published_snapshot); the feature-4 entry already promised "the future `AnalyticsEvent` model will **not** carry visitor gender or age group" — confirmed: it doesn't.
- Tests: Vitest per workspace, node env, `@/*` alias. `apps/builder/__tests__/{auth,site}/*.test.ts` + `apps/builder/__tests__/smoke.test.ts`; `packages/contracts/src/__tests__/contracts.test.ts`; `apps/customer/__tests__/smoke.test.ts`. Established stance (feature 5): pure logic + injectable-deps functions get DB-free unit tests; Next route handlers and Server Actions are **not** unit-tested (covered by `next build` + manual `curl`). Smoke tests must be DB-independent.

**Intended outcome.** `pnpm db:migrate` applies `add_analytics_event` idempotently; `pnpm typecheck && pnpm lint && pnpm test && pnpm build` stay green across the workspace. In the demo: `curl -X POST http://localhost:5111/api/events -H 'content-type: application/json' -d '{"slug":"<slug>","type":"visit"}'` → `{"ok":true,"data":{"recorded":true}}` (and a `*` CORS header); repeat + a `book-now-hover` + a `book-now-click`; `curl http://localhost:5111/api/sites/<slug>/analytics` → `{"ok":true,"data":{"slug":"<slug>","visits":3,"bookNowHovers":1,"bookNowClicks":0}}` (the 3 visits are **not** deduped); an unknown slug → `404 not_found` on both endpoints; a bad `type` or missing `slug` → `400 invalid_event`; `OPTIONS /api/events` → `204` with the CORS headers.

### Decisions confirmed with the user

1. **`AnalyticsEvent` stores a plain `slug` column (no FK to `Site`)**; `POST /api/events` looks up the `Site` by slug and **404s an unknown slug without storing anything**. An existing-but-**unpublished** slug *is* accepted (the placeholder "coming soon" page still loads and emits a `visit`). Trade-off (no referential integrity / possible orphan rows if a site were ever deleted) is fine for this demo — accounts/sites are never deleted here; noted in the changelog.
2. **`POST /api/events` is CORS-friendly:** it sets `Access-Control-Allow-Origin: *` (plus `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers`) on every response and exports an `OPTIONS` handler answering the browser preflight — so feature 8 can `fetch` it directly from the visitor's browser (`:5112` → `:5111`) with no proxy route. Consistent with the API already being unauthenticated/open for the local demo. (The `GET` aggregation endpoint gets **no** CORS headers — the dashboard reads it server-side, same origin.)
3. **No server-side de-duplication.** Every accepted `POST /api/events` stores one distinct row. The "exactly one `visit` per page load" guarantee (REQ-15) is the **Customer app's** responsibility (feature 8). Matches the PRD non-goal "Real visitor identification or audience segmentation". Documented + tested (3 POSTs → summary shows 3 visits).

### Design calls (not user-facing forks; recorded for the executor)

- **Schema = one new table, `slug`/`type` as `String`s.** SQLite + Prisma enums are awkward; the event vocabulary already lives (and is validated) in `@mizrahitality/contracts`, and the aggregation only counts the three known types, so a stray value can never corrupt a summary. Two indexes (`@@index([slug])`, `@@index([slug, type])`) — cheap, cover the reads. New-table-only migration → trivial `CREATE TABLE`; no backfill.
- **Endpoint paths.** `POST /api/events` at `apps/builder/app/api/events/route.ts` (matches `analyticsEventsPath()` and the README's promise). `GET /api/sites/[slug]/analytics` at `apps/builder/app/api/sites/[slug]/analytics/route.ts` (matches `analyticsSummaryPath(slug)` and the README's `(e.g. GET /api/sites/{slug}/analytics)` note; nests under the existing `app/api/sites/[slug]/` segment). Both `export const dynamic = "force-dynamic"`. Both lower-case the incoming slug (slugs are stored lower-cased) and always return an envelope body (incl. on 400/404/500).
- **Shared contract additions in `@mizrahitality/contracts`** (raw TS, no build/version bump): extend `src/analytics.ts` with `AnalyticsSummary` (`{ slug; visits; bookNowHovers; bookNowClicks }`) + `analyticsEventsPath()` + `analyticsSummaryPath(slug)` (mirroring `publishedPagePath`). `index.ts` already re-exports `./analytics` — nothing to change there.
- **Pure / DB-free seam for everything testable**, mirroring feature 5's `published.ts` (pure) + `site.ts` (Prisma helpers with injectable deps):
  - `apps/builder/lib/analytics/analytics.ts` (pure): `parseAnalyticsEventInput(body)` (validate `type` ∈ `ANALYTICS_EVENT_TYPES`, `slug` a non-empty string → trimmed + lower-cased; returns the clean `AnalyticsEventInput` or a stable `{ code, message }`), `summarizeEvents(slug, events)` (reduce `{ type }[]` → `AnalyticsSummary`, counting only the three known types), `resolveAnalyticsSummaryResponse(slug, site, events)` and `resolveIngestResponse(parsed, siteExists)` (the `{ status, body, store? }` decisions — so the unknown-slug/validation branching is unit-tested with zero deps).
  - `apps/builder/lib/analytics/events.ts` (Prisma helpers): `recordEvent(body, deps?)` over an injectable `RecordEventDeps` (`{ siteExists(slug), insert(event) }`) and `getAnalyticsSummary(slug, deps?)` over `ReadAnalyticsDeps` (`{ findSite(slug), listEvents(slug) }`); `defaultRecordEventDeps()`/`defaultReadAnalyticsDeps()` lazy-`import("@/lib/db")` so unit tests injecting fakes never touch Prisma. Each returns `{ status, body: ApiResult<…> }`; the route handlers are thin wrappers (`await req.json()` → `recordEvent` / `getAnalyticsSummary` → `Response.json`).
- **No unit test of the route handlers / `OPTIONS`** (Next-runtime + Prisma) — consistent with feature 5; covered by `next build` (route compilation + types) + manual `curl` (incl. the CORS preflight) + the pure/fake-deps unit tests. Smoke tests stay DB-independent. The seed (`prisma/seed.mjs`) is unchanged here (feature 9 owns it; verification step 3 below notes you'll need a published site — via `pnpm seed` once feature 9 lands, or by signing up + creating + publishing manually).
- **Error code naming:** ingest validation failures use `apiErr("invalid_event", …)` (body not JSON / `slug` missing-or-empty / `type` not one of the three); unknown slug uses `apiErr("not_found", …)` (the same code `GET /api/sites/{slug}` already uses); unexpected failures `apiErr("internal_error", …)`. Success of ingest = `apiOk({ recorded: true } as const)` — minimal; feature 8 ignores the data and only checks `ok`.

---

## Charter (master plan §3.6)

Analytics ingestion, storage, and aggregation in the Builder app. Deliver: an `AnalyticsEvent` Prisma model (site/slug, event type ∈ {`visit`, `book-now-hover`, `book-now-click`}, timestamp) via `update-database`; a REST endpoint to **ingest** an event (slug + event type, validated against the event-type vocabulary in `@mizrahitality/contracts`, no auth); an **aggregation** query/endpoint for a slug giving total visits, Book Now click count, and Book Now hover count. Both wrapped in the standard envelope; documented alongside the published-page API. Tests (this is core logic — test it well): aggregation math, event validation/rejection, idempotency expectations for the `visit` event are documented/tested as decided in the plan. Out of scope: the dashboard UI (feature 7), emitting events (that's the customer site, feature 8).

---

## In scope

- `update-database` skill run: new `AnalyticsEvent` model in `prisma/schema.prisma`; migration `add_analytics_event`; `prisma/CHANGELOG.md` entry; `pnpm db:migrate` applies idempotently.
- `@mizrahitality/contracts`: extend `src/analytics.ts` with `AnalyticsSummary`, `analyticsEventsPath()`, `analyticsSummaryPath(slug)`; add tests to `src/__tests__/contracts.test.ts`. (`src/index.ts` unchanged — `export * from "./analytics"` already covers it.)
- `apps/builder/lib/analytics/analytics.ts` (new, pure): `parseAnalyticsEventInput`, `summarizeEvents`, `resolveAnalyticsSummaryResponse`, `resolveIngestResponse`, `type StoredEvent`.
- `apps/builder/lib/analytics/events.ts` (new, Prisma helpers): `RecordEventDeps`, `ReadAnalyticsDeps`, `recordEvent`, `getAnalyticsSummary` (real `@/lib/db` lazy-imported in the `defaultXxxDeps()`).
- `apps/builder/app/api/events/route.ts` (new): `POST` (ingest, always-envelope body, CORS headers) + `OPTIONS` (CORS preflight); `dynamic = "force-dynamic"`.
- `apps/builder/app/api/sites/[slug]/analytics/route.ts` (new): `GET` (per-slug summary, always-envelope body); `dynamic = "force-dynamic"`.
- `apps/builder/app/api/README.md` (edit): replace the `## Coming later` section with full docs for both new endpoints (paths, params, request/response shapes, status codes, the no-auth note, the CORS note on `/api/events`, the "no server-side dedup; Customer guarantees one `visit` per load" note); mention all three endpoints in the overview.
- `apps/builder/__tests__/analytics/analytics.test.ts` (new, DB-independent): `parseAnalyticsEventInput`, `summarizeEvents`, `resolveAnalyticsSummaryResponse`, `resolveIngestResponse`.
- `apps/builder/__tests__/analytics/events.test.ts` (new, DB-independent): `recordEvent` / `getAnalyticsSummary` with fake `RecordEventDeps` / `ReadAnalyticsDeps` capturing the insert / serving an in-memory event list.
- `CLAUDE.md` Layout section updated; `plans/00-master-plan.md` §2 status table ticked; `plans/06-analytics-api-plan.md` (this file copied verbatim).

## Out of scope

- The owner dashboard UI (feature 7) — feature 6 only provides the aggregation endpoint (and the reusable `getAnalyticsSummary` function it can call server-side, or hit over HTTP — feature 7's call).
- Emitting events — the Customer app's `visit`/`book-now-hover`/`book-now-click` calls and the once-per-load guarantee (feature 8).
- Any analytics beyond the three counts (no time windows, per-day breakdowns, funnels, cohorts, exports — PRD non-goals); `AnalyticsSummary` is lifetime totals only (matches REQ-9).
- Any auth / rate limiting / multi-tenant hardening on the API (PRD non-goals).
- Adding sample `AnalyticsEvent` rows to the seed (feature 9 owns the seed; not touched here).
- A customer-side proxy route for events — decided against (the Builder endpoint is CORS-friendly).
- Touching `lib/site/*`, `lib/auth/*`, the builder UI, or the published-page endpoint.

---

## Approach

### Data model — via the `update-database` skill

Invoke the `update-database` skill: it adds the model to `prisma/schema.prisma`, runs `prisma migrate dev --name add_analytics_event` (regenerating the client), and appends the `prisma/CHANGELOG.md` entry. Migration name: **`add_analytics_event`**.

```prisma
/// A single analytics event posted by the Customer site to POST /api/events. One row per accepted
/// POST — no server-side dedup; the Customer app guarantees exactly one `visit` per page load (REQ-15).
/// `slug` is a plain copy of the venue slug (no FK to Site — the slug is the API identity, the
/// aggregation needs no join, and sites are never deleted in this demo; see prisma/CHANGELOG.md).
/// `type` is one of ANALYTICS_EVENT_TYPES from @mizrahitality/contracts ("visit" | "book-now-hover"
/// | "book-now-click"), validated before insert; stored as String (SQLite has no enums).
model AnalyticsEvent {
  id        String   @id @default(cuid())
  slug      String
  type      String
  createdAt DateTime @default(now())

  @@index([slug])
  @@index([slug, type])
}
```

`prisma/CHANGELOG.md` gets a new top entry (date `2026-05-12`): feature `analytics-api` (feature 6); models affected `AnalyticsEvent` (new); fields `id` (String, cuid PK), `slug` (String — plain copy of the venue slug, **no FK** to `Site`: rationale = slug is the API identity, the per-slug aggregation needs no join, and accounts/sites are never deleted in this demo; trade-off = no referential integrity / possible orphan rows), `type` (String — one of `ANALYTICS_EVENT_TYPES`; validated in `parseAnalyticsEventInput` before insert; no DB enum), `createdAt` (DateTime, `@default(now())`); indexes `@@index([slug])` + `@@index([slug, type])`; new-table-only migration (`CREATE TABLE`), no backfill, not breaking; confirms the feature-4 note (the model carries no visitor gender/age); `prisma migrate dev --name add_analytics_event`; `pnpm db:migrate` (`prisma migrate deploy`) re-applies idempotently. Then run `pnpm db:migrate` to confirm.

### Shared contract — `packages/contracts/src/analytics.ts` (edit)

Keep the existing `AnalyticsEventType` / `ANALYTICS_EVENT_TYPES` / `AnalyticsEventInput`; add:

```ts
/**
 * Aggregated analytics for one slug, as returned by GET /api/sites/{slug}/analytics inside the
 * ApiSuccess envelope. Lifetime counts over all stored events for the slug (no time window). A slug
 * that exists but has no events yet → all zeros; an unknown slug → ApiError "not_found" (not zeros).
 */
export interface AnalyticsSummary {
  slug: string;
  visits: number;          // count of "visit" events
  bookNowHovers: number;   // count of "book-now-hover" events
  bookNowClicks: number;   // count of "book-now-click" events
}

/** Path of the analytics-event ingest endpoint. `POST` body `AnalyticsEventInput` → `ApiResult<{ recorded: true }>`. */
export function analyticsEventsPath(): string {
  return "/api/events";
}

/** Path of the per-slug analytics-summary endpoint. `GET` → `ApiResult<AnalyticsSummary>`. */
export function analyticsSummaryPath(slug: string): string {
  return `/api/sites/${encodeURIComponent(slug)}/analytics`;
}
```

`src/index.ts` is unchanged (`export * from "./analytics"`).

### Pure logic — `apps/builder/lib/analytics/analytics.ts` (new)

No Prisma, no Next. (`@mizrahitality/contracts` is fine to import — it's raw TS via `transpilePackages`.)

```ts
import {
  ANALYTICS_EVENT_TYPES, apiErr, apiOk,
  type AnalyticsEventInput, type AnalyticsEventType, type AnalyticsSummary, type ApiResult,
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
    return { ok: false, code: "invalid_event", message: "Expected a JSON object with `slug` and `type`." };
  }
  const rawSlug = (body as { slug?: unknown }).slug;
  const rawType = (body as { type?: unknown }).type;
  if (typeof rawSlug !== "string" || rawSlug.trim() === "") {
    return { ok: false, code: "invalid_event", message: "`slug` must be a non-empty string." };
  }
  if (typeof rawType !== "string" || !(ANALYTICS_EVENT_TYPES as readonly string[]).includes(rawType)) {
    return { ok: false, code: "invalid_event", message: `\`type\` must be one of: ${ANALYTICS_EVENT_TYPES.join(", ")}.` };
  }
  return { ok: true, value: { slug: rawSlug.trim().toLowerCase(), type: rawType as AnalyticsEventType } };
}

/** Reduce a set of stored events into the AnalyticsSummary shape. Counts only the three known types. */
export function summarizeEvents(slug: string, events: StoredEvent[]): AnalyticsSummary {
  let visits = 0, bookNowHovers = 0, bookNowClicks = 0;
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
  if (!siteExists) return { status: 404, body: apiErr("not_found", "No site with that web address."), store: false };
  return { status: 200, body: apiOk({ recorded: true } as const), store: true };
}
```

### Prisma helpers — `apps/builder/lib/analytics/events.ts` (new)

The real `@/lib/db` is lazy-imported only inside the `defaultXxxDeps()` (mirroring `lib/site/site.ts`); `resolveAnalyticsSummaryResponse` / `resolveIngestResponse` / `parseAnalyticsEventInput` are pure, so they're imported at the top.

```ts
import { apiErr, type AnalyticsEventInput, type ApiResult } from "@mizrahitality/contracts";
import {
  parseAnalyticsEventInput, resolveAnalyticsSummaryResponse, resolveIngestResponse, type StoredEvent,
} from "./analytics";

export type RecordEventDeps = {
  siteExists(slug: string): Promise<boolean>;
  insert(event: AnalyticsEventInput): Promise<void>;
};

async function defaultRecordEventDeps(): Promise<RecordEventDeps> {
  const { prisma } = await import("@/lib/db");
  return {
    siteExists: async (slug) =>
      (await prisma.site.findUnique({ where: { slug }, select: { id: true } })) !== null,
    insert: async (event) => { await prisma.analyticsEvent.create({ data: { slug: event.slug, type: event.type } }); },
  };
}

/**
 * Ingest one analytics event: validate the body (400 invalid_event on bad/missing slug or unknown type),
 * reject an unknown slug (404 not_found, nothing stored), otherwise insert one row → 200 {recorded:true}.
 * DB-injectable so every branch is unit-tested without a database.
 */
export async function recordEvent(
  body: unknown,
  deps?: RecordEventDeps,
): Promise<{ status: number; body: ApiResult<{ recorded: true }> }> {
  const parsed = parseAnalyticsEventInput(body);
  if (!parsed.ok) return { status: 400, body: apiErr(parsed.code, parsed.message) };
  const d = deps ?? (await defaultRecordEventDeps());
  const decision = resolveIngestResponse(parsed, await d.siteExists(parsed.value.slug));
  if (decision.store) await d.insert(parsed.value);
  return { status: decision.status, body: decision.body };
}

export type ReadAnalyticsDeps = {
  findSite(slug: string): Promise<{ slug: string } | null>;
  listEvents(slug: string): Promise<StoredEvent[]>;
};

async function defaultReadAnalyticsDeps(): Promise<ReadAnalyticsDeps> {
  const { prisma } = await import("@/lib/db");
  return {
    findSite: (slug) => prisma.site.findUnique({ where: { slug }, select: { slug: true } }),
    listEvents: (slug) => prisma.analyticsEvent.findMany({ where: { slug }, select: { type: true } }),
  };
}

/** Build the GET /api/sites/{slug}/analytics response: 404 unknown slug, else 200 with the summary (all-zeros if no events). */
export async function getAnalyticsSummary(slug: string, deps?: ReadAnalyticsDeps) {
  const d = deps ?? (await defaultReadAnalyticsDeps());
  const [site, events] = await Promise.all([d.findSite(slug), d.listEvents(slug)]);
  return resolveAnalyticsSummaryResponse(slug, site, events);
}
```

> Note (`prisma.analyticsEvent`): this property only exists on the generated client *after* the `add_analytics_event` migration's `prisma generate` has run — so do the `update-database` step first, then write this module, or `pnpm typecheck` will complain.
> Note (read query): `findMany({ select: { type: true } })` then count in JS keeps `summarizeEvents` the single source of truth and stays trivially testable. A `prisma.analyticsEvent.groupBy({ by: ["type"], where: { slug }, _count: { _all: true } })` would also work but isn't worth the extra mapping at demo scale — `findMany` is fine.

### REST endpoint — `apps/builder/app/api/events/route.ts` (new)

```ts
// POST /api/events — analytics ingest. No auth (the slug is the identity). Cross-origin: the Customer
// site emits hover/click events from the visitor's browser (:5112 → :5111), and POST with
// content-type: application/json triggers a CORS preflight — so we answer OPTIONS and set permissive
// CORS headers on every response. One accepted POST = one stored row; no server-side dedup (the
// Customer app guarantees one `visit` per page load — REQ-15). Body is always a JSON envelope, even on
// 400/404/500, so createApiClient gets a clean ApiError. See apps/builder/app/api/README.md.
import { recordEvent } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: { code: "invalid_event", message: "Request body must be valid JSON." } },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  try {
    const { status, body: envelope } = await recordEvent(body);
    return Response.json(envelope, { status, headers: CORS_HEADERS });
  } catch {
    return Response.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong recording this event." } },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
```

Only `POST` + `OPTIONS` exported → other methods get Next's automatic `405`.

### REST endpoint — `apps/builder/app/api/sites/[slug]/analytics/route.ts` (new)

```ts
// GET /api/sites/{slug}/analytics — lifetime counts for a slug: total visits, Book Now hovers, Book Now
// clicks. No auth. Unknown slug → 404 not_found. Existing slug with no events → all zeros. Body is
// always a JSON envelope (even 404/500). Decision logic is in lib/analytics; this handler is just the
// lookup. Read server-side by the owner dashboard (feature 7) — same origin, so no CORS headers.
// See apps/builder/app/api/README.md.
import { getAnalyticsSummary } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase(); // slugs are stored lower-cased; be forgiving on the way in
  try {
    const { status, body } = await getAnalyticsSummary(slug);
    return Response.json(body, { status });
  } catch {
    return Response.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong loading analytics." } },
      { status: 500 },
    );
  }
}
```

### API doc — `apps/builder/app/api/README.md` (edit)

Keep the intro (the envelope explanation — already says "body is always an envelope; branch on `ok`, not the HTTP status"). Add a line to the overview so all three endpoints are listed. Replace the `## Coming later` section with:

- **`## POST /api/events`** — record one analytics event from the Customer site. No authentication. Called from the visitor's **browser** on the published page (`:5112` → `:5111`) — a cross-origin request: the endpoint sets `Access-Control-Allow-Origin: *` and answers the `OPTIONS` preflight. **No server-side de-duplication** — every accepted `POST` stores one row; the Customer app emits exactly one `visit` per page load (REQ-15).
  - Request body `AnalyticsEventInput` = `{ "slug": string, "type": "visit" | "book-now-hover" | "book-now-click" }`. `slug` is trimmed + lower-cased server-side; `type` is validated against `ANALYTICS_EVENT_TYPES`. Path helper `analyticsEventsPath()`; type `ApiResult<{ recorded: true }>`.
  - Responses: `200` `{ "ok": true, "data": { "recorded": true } }` — stored one row · `400` `{ "ok": false, "error": { "code": "invalid_event", "message": "…" } }` — body not valid JSON, `slug` missing/empty, or `type` not one of the three; nothing stored · `404` `{ "ok": false, "error": { "code": "not_found", "message": "…" } }` — no site with that slug; nothing stored (an existing-but-**unpublished** slug *is* accepted — the placeholder page still emits a `visit`) · `500` `{ "ok": false, "error": { "code": "internal_error", "message": "…" } }`.
  - Example: `curl -X POST http://localhost:5111/api/events -H 'content-type: application/json' -d '{"slug":"cafemizrahi","type":"visit"}'` → `{"ok":true,"data":{"recorded":true}}`.
- **`## GET /api/sites/{slug}/analytics`** — aggregated analytics for a venue. No authentication.
  - Path param `slug` — case-insensitive (lower-cased server-side). Path helper `analyticsSummaryPath(slug)`; type `ApiResult<AnalyticsSummary>` (`AnalyticsSummary` exported from `@mizrahitality/contracts`).
  - Responses: `200` `{ "ok": true, "data": { "slug": string, "visits": number, "bookNowHovers": number, "bookNowClicks": number } }` — lifetime counts over all stored events for the slug (no time window); a slug with no events yet → all zeros · `404` `{ "ok": false, "error": { "code": "not_found", "message": "…" } }` — no site with that slug · `500` `{ "ok": false, "error": { "code": "internal_error", "message": "…" } }`.
  - Example: `curl http://localhost:5111/api/sites/cafemizrahi/analytics` → `{"ok":true,"data":{"slug":"cafemizrahi","visits":3,"bookNowHovers":1,"bookNowClicks":0}}`.

(No "Coming later" section is needed anymore — all three endpoints are documented; if anything, a closing note that feature 7 surfaces the aggregation on the owner dashboard and feature 8 is what posts the events.)

---

## Data model

Through the **`update-database` skill** — adds the `AnalyticsEvent` model (`id`, `slug String`, `type String`, `createdAt DateTime @default(now())`, `@@index([slug])`, `@@index([slug, type])`) to `apps/builder/prisma/schema.prisma`, generates migration `add_analytics_event`, appends a `prisma/CHANGELOG.md` entry, regenerates the Prisma client. New-table-only migration → trivial `CREATE TABLE`; no backfill. `slug` is a plain string (no FK to `Site`); `type` is a string validated in code against `ANALYTICS_EVENT_TYPES`. `pnpm db:migrate` (`prisma migrate deploy`) re-applies idempotently.

---

## API surface

**New REST endpoints** (both no-auth, `dynamic = "force-dynamic"`, always-envelope body):
- `POST /api/events` — `apps/builder/app/api/events/route.ts` (+ `OPTIONS`). Body `AnalyticsEventInput`. → `ApiResult<{ recorded: true }>`: `200` `apiOk({recorded:true})` · `400` `apiErr("invalid_event", …)` · `404` `apiErr("not_found", …)` · `500` `apiErr("internal_error", …)`. Sets `Access-Control-Allow-Origin: *` etc. on every response.
- `GET /api/sites/{slug}/analytics` — `apps/builder/app/api/sites/[slug]/analytics/route.ts`. → `ApiResult<AnalyticsSummary>`: `200` `apiOk({slug,visits,bookNowHovers,bookNowClicks})` · `404` `apiErr("not_found", …)` · `500` `apiErr("internal_error", …)`. No CORS headers (read server-side, same origin).

Documented in `apps/builder/app/api/README.md` (the existing `GET /api/sites/{slug}` is unchanged).

**`@mizrahitality/contracts` additions** (raw TS, no version bump): `analytics.ts` — `AnalyticsSummary` (`{ slug; visits; bookNowHovers; bookNowClicks }`), `analyticsEventsPath()`, `analyticsSummaryPath(slug)`. Re-exported via the existing `export * from "./analytics"`. Envelope, `createApiClient`, `published-page`, and the existing analytics vocab/`AnalyticsEventInput` are unchanged.

**No new Server Actions.** `recordEvent` / `getAnalyticsSummary` (`apps/builder/lib/analytics/events.ts`) are plain async functions usable from a route handler or, server-side, from feature 7's dashboard.

---

## Files & directories

```
apps/builder/
  prisma/schema.prisma                                  (edit — add AnalyticsEvent model) — via `update-database`
  prisma/migrations/<ts>_add_analytics_event/migration.sql  (new — prisma migrate)
  prisma/CHANGELOG.md                                   (edit — add_analytics_event entry)
  lib/analytics/analytics.ts                            (new — pure: parseAnalyticsEventInput, summarizeEvents, resolveAnalyticsSummaryResponse, resolveIngestResponse, type StoredEvent)
  lib/analytics/events.ts                               (new — Prisma helpers: RecordEventDeps/ReadAnalyticsDeps, recordEvent, getAnalyticsSummary; real @/lib/db lazy-imported)
  app/api/events/route.ts                               (new — POST ingest + OPTIONS preflight; CORS headers; force-dynamic)
  app/api/sites/[slug]/analytics/route.ts               (new — GET per-slug summary; force-dynamic)
  app/api/README.md                                     (edit — replace "Coming later" with POST /api/events + GET /api/sites/{slug}/analytics docs; list all three endpoints)
  __tests__/analytics/analytics.test.ts                 (new — DB-independent: parse/summarize/resolve functions)
  __tests__/analytics/events.test.ts                    (new — DB-independent: recordEvent/getAnalyticsSummary with fake deps)
packages/contracts/
  src/analytics.ts                                      (edit — add AnalyticsSummary, analyticsEventsPath, analyticsSummaryPath)
  src/__tests__/contracts.test.ts                       (edit — add an `analytics-summary contract` describe)
CLAUDE.md                                                (edit — Layout: apps/builder app/api (events + sites/[slug]/analytics routes), lib/analytics/*, the AnalyticsEvent model, the new tests; packages/contracts analytics module additions)
plans/00-master-plan.md                                  (edit — §2 status table: feature 6 → in-progress → done)
plans/06-analytics-api-plan.md                           (new — this plan, copied verbatim)
```

No new dependencies. No new shadcn components. The only `update-database`-skill step is the migration; everything else is plain code.

---

## Tests

All new tests **DB-independent** (no `@/lib/db` import — `analytics.ts` is pure; `recordEvent`/`getAnalyticsSummary` are exercised with injected `RecordEventDeps`/`ReadAnalyticsDeps` fakes, like `createSite`'s `CreateSiteDeps`). Vitest, node env, `@/*` alias.

**`apps/builder/__tests__/analytics/analytics.test.ts`** —
- `parseAnalyticsEventInput`: valid `{ slug:"CafeMizrahi ", type:"visit" }` → `{ ok:true, value:{ slug:"cafemizrahi", type:"visit" } }` (asserts slug trimmed + lower-cased); valid for `"book-now-hover"` and `"book-now-click"` too; bad `type` (`"click"`, `"VISIT"`, `42`, missing) → `{ ok:false, code:"invalid_event" }` (message mentions the allowed types); missing/empty/whitespace `slug` (`""`, `"  "`, `undefined`, `123`) → `{ ok:false, code:"invalid_event" }`; non-object body (`null`, `"hi"`, `[]`) → `{ ok:false, code:"invalid_event" }`.
- `summarizeEvents`: `[]` → `{ slug, visits:0, bookNowHovers:0, bookNowClicks:0 }`; mixed set (3×visit, 1×book-now-hover, 2×book-now-click) → correct counts, preserves the passed slug; three `{type:"visit"}` rows → `visits === 3` (the explicit **`visit` non-idempotency** assertion); rows with an unknown `type` (e.g. `{type:"scroll"}`) ignored.
- `resolveAnalyticsSummaryResponse`: `site === null` → `{ status:404, body:{ ok:false, error:{ code:"not_found", message: expect.any(String) } } }`; existing site + no events → `{ status:200, body:{ ok:true, data:{ slug, visits:0, bookNowHovers:0, bookNowClicks:0 } } }`; existing site + mixed events → `{ status:200, body:{ ok:true, data:{ ...correct counts } } }` and uses `site.slug` (not the raw arg) in the output.
- `resolveIngestResponse`: `siteExists === false` → `{ status:404, body:{ ok:false, error:{ code:"not_found", … } }, store:false }`; `siteExists === true` → `{ status:200, body:{ ok:true, data:{ recorded:true } }, store:true }`.

**`apps/builder/__tests__/analytics/events.test.ts`** — fake `RecordEventDeps` (knows slug `"cafemizrahi"` exists; pushes every `insert(...)` onto a capture array) + fake `ReadAnalyticsDeps` (in-memory event list, configurable `findSite`):
- `recordEvent` happy path: `recordEvent({ slug:"CafeMizrahi", type:"visit" }, fake)` → `{ status:200, body:{ ok:true, data:{ recorded:true } } }`; captured exactly one `insert({ slug:"cafemizrahi", type:"visit" })` (slug normalized before insert).
- `recordEvent` validation: `recordEvent({ type:"visit" }, fake)` (no slug) → `{ status:400, body:{ ok:false, error:{ code:"invalid_event", … } } }`, **no insert** captured; `recordEvent({ slug:"x", type:"bogus" }, fake)` → `400`, no insert.
- `recordEvent` unknown slug: `recordEvent({ slug:"ghost", type:"visit" }, fake)` → `{ status:404, body:{ ok:false, error:{ code:"not_found", … } } }`, **no insert** captured.
- `recordEvent` non-idempotency: three calls with `{ slug:"cafemizrahi", type:"visit" }` → three inserts captured.
- `getAnalyticsSummary` happy path: fake `findSite` → `{ slug:"cafemizrahi" }`, `listEvents` → `[visit, visit, book-now-click]` → `{ status:200, body:{ ok:true, data:{ slug:"cafemizrahi", visits:2, bookNowHovers:0, bookNowClicks:1 } } }`.
- `getAnalyticsSummary` unknown slug: fake `findSite` → `null` → `{ status:404, body:{ ok:false, error:{ code:"not_found", … } } }`.
- `getAnalyticsSummary` no events: existing site, empty list → all-zeros summary.

**`packages/contracts/src/__tests__/contracts.test.ts`** — add `describe("analytics-summary contract", …)`: `analyticsEventsPath()` === `"/api/events"`; `analyticsSummaryPath("cafemizrahi")` === `"/api/sites/cafemizrahi/analytics"`; `analyticsSummaryPath("a b")` === `"/api/sites/a%20b/analytics"` (encoding); an `AnalyticsSummary` literal compiles and `apiOk(summary).data.visits` is a `number` (type-smoke, like the existing `PublishedPage` smoke).

**Not unit-tested** — `app/api/events/route.ts` (`POST` + `OPTIONS`) and `app/api/sites/[slug]/analytics/route.ts` (`GET`) — Next-runtime + Prisma; logic is the thin `await req.json()` + the unit-tested `recordEvent` / `getAnalyticsSummary`. `lib/db.ts` and the `defaultXxxDeps()` real-Prisma impls — no DB in tests (same as `getOwnerSite`/`slugExists`). Consistent with feature 5. Covered by `next build` (route/type compilation) + the demo `curl`s (incl. the CORS preflight). Existing tests stay green (nothing they assert changes). Smoke tests stay DB-independent — `apps/builder/__tests__/smoke.test.ts` is untouched.

Gates (green across the workspace): `pnpm db:migrate` (applies `add_analytics_event` idempotently — do the `update-database` step first so `prisma generate` has run) → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`.

---

## Acceptance (REQ-# this feature owns)

- **REQ-15 — analytics events posting (P0), ingest + aggregation API side.** `POST /api/events` accepts `{ slug, type }` (`type` ∈ {`visit`, `book-now-hover`, `book-now-click`} — validated against `ANALYTICS_EVENT_TYPES`), stores one `AnalyticsEvent` row per accepted POST (no dedup — the "exactly one `visit` per page load" guarantee is the Customer app's, feature 8 — documented in the README + asserted in `summarizeEvents`'s "3 → 3" test), and 404s an unknown slug. `GET /api/sites/{slug}/analytics` aggregates them into `{ visits, bookNowHovers, bookNowClicks }`. *Verified by:* `analytics.test.ts` (parse/summarize/resolve) + `events.test.ts` (`recordEvent`/`getAnalyticsSummary` with fakes); *demo:* `curl -X POST .../api/events` three `visit`s + a `book-now-hover` + a `book-now-click` → `curl .../api/sites/<slug>/analytics` → `{visits:3, bookNowHovers:1, bookNowClicks:0}`. (The Customer→API posting itself and the dashboard display are features 8 and 7.)
- **REQ-18 — REST API contract (P0), endpoint (b) + the aggregation endpoint.** Both new endpoints are documented in `apps/builder/app/api/README.md` (paths, params, request/response shapes, all status codes, no-auth note, the CORS note on `/api/events`, the no-dedup note); the event vocabulary is in `@mizrahitality/contracts` (`AnalyticsEventInput`, `ANALYTICS_EVENT_TYPES`) and the new `AnalyticsSummary` + path helpers compile in both apps; an unknown slug → `404 not_found` on both, a bad/missing `type` or `slug` → `400 invalid_event`, malformed JSON → `400 invalid_event` — all well-defined. *Verified by:* the doc + `pnpm typecheck` (contracts compile) + the demo `curl`s (incl. `OPTIONS`).

---

## Verification (end-to-end)

1. **Schema/migration:** run the `update-database` skill (it adds `AnalyticsEvent` to `schema.prisma`, runs `prisma migrate dev --name add_analytics_event`, regenerates the client, appends the `prisma/CHANGELOG.md` entry). Confirm `prisma/migrations/<ts>_add_analytics_event/migration.sql` exists and is a `CREATE TABLE`. Then `pnpm db:migrate` re-applies idempotently. (Windows note: a running `next dev` on :5111 can lock Prisma's query-engine DLL and break `prisma generate` with `EPERM` — as happened in feature 5; stop the builder dev server first if so.)
2. **Static gates** (repo root): `pnpm typecheck` → `pnpm lint` → `pnpm test` (contracts + builder vitest, all green incl. the new `__tests__/analytics/*`) → `pnpm build` (`next build` for builder + customer; confirms both new routes compile).
3. **Run the app:** `pnpm dev` (or `pnpm -F builder build && pnpm -F builder start` if :5111 is held by the sibling `../Mizrahitality` dev server — as in features 2/3/5). You need a published site — `pnpm seed` once feature 9 lands, or sign up → create a venue (e.g. slug `cafemizrahi`) → Publish.
4. **Ingest happy path:** `curl -i -X POST http://localhost:5111/api/events -H 'content-type: application/json' -d '{"slug":"cafemizrahi","type":"visit"}'` → `200`, `{"ok":true,"data":{"recorded":true}}`, and an `Access-Control-Allow-Origin: *` header present. Repeat the `visit` POST twice more; POST one `book-now-hover` and one `book-now-click`.
5. **Summary:** `curl http://localhost:5111/api/sites/cafemizrahi/analytics` → `200`, `{"ok":true,"data":{"slug":"cafemizrahi","visits":3,"bookNowHovers":1,"bookNowClicks":0}}` — the 3 `visit`s are **not** deduped. Case-insensitivity: `curl http://localhost:5111/api/sites/CafeMizrahi/analytics` → same.
6. **Unknown-slug cases:** `curl -i -X POST .../api/events -H 'content-type: application/json' -d '{"slug":"ghost","type":"visit"}'` → `404 not_found`; re-`curl` the `cafemizrahi` summary — counts unchanged (nothing stored). `curl -i http://localhost:5111/api/sites/ghost/analytics` → `404 not_found`.
7. **Validation cases:** `curl -i -X POST .../api/events -H 'content-type: application/json' -d '{"slug":"cafemizrahi","type":"scroll"}'` → `400 invalid_event`; `curl -i -X POST .../api/events -H 'content-type: application/json' -d '{"type":"visit"}'` → `400 invalid_event` (missing slug); `curl -i -X POST .../api/events -H 'content-type: application/json' -d 'not json'` → `400 invalid_event`.
8. **CORS preflight:** `curl -i -X OPTIONS http://localhost:5111/api/events -H 'Origin: http://localhost:5112' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'` → `204` with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: content-type`.
9. **Empty-but-existing slug:** publish a second venue with no traffic → `curl .../api/sites/<that-slug>/analytics` → `200` all-zeros. (Optional: a site that exists but was never published — POST a `visit` for it → `200 recorded` (accepted); summary → `visits:1`.)
10. (If :5111 is held — as in features 2/3/5 — fall back to `next build` + `next start -p 5111` with a throwaway `OwnerAccount`+`Site` created/torn down via Prisma for the `curl` checks, plus the unit suite. Note "live ingest/summary smoke done via `next start`; recommend a manual `pnpm dev` pass when :5111 is free.")

---

## Risks & open questions

- **CORS `*` on `POST /api/events`** — chosen for simplicity (unauthenticated demo ingest; lets feature 8 `fetch` from the browser with no proxy route). It's the one place this design deviates from "the API is fetched server-side". Acceptable for the local demo; flagged so it isn't mistaken for a hardening gap. (User confirmed.)
- **Plain `slug` column, no FK** — no referential integrity; orphan rows if a site were ever deleted (it isn't, in this demo). The aggregation needs no join in exchange. Noted in `prisma/CHANGELOG.md`. (User confirmed.)
- **No server-side dedup** — every `POST` is a row; "one `visit` per page load" is feature 8's job. If feature 8 misbehaves, visit counts inflate; not feature 6's concern. Documented + tested. (User confirmed.)
- **`prisma.analyticsEvent` doesn't exist until `prisma generate` runs** post-migration — do the `update-database` step before writing `lib/analytics/events.ts` or `pnpm typecheck` fails on the missing client property.
- **Lifetime totals only** — `AnalyticsSummary` has no time window / per-day breakdown (matches REQ-9 "total visits / Book Now clicks / Book Now hovers"). If feature 7's dashboard later wants trends, that's a new endpoint, not a change here.
- **Seed has no published site / no events yet** — verification steps 3–9 need a published venue; until feature 9's `pnpm seed` lands, create one manually (sign up → create → Publish). Not a code risk; a heads-up for the verifier. (Adding sample `AnalyticsEvent` rows to the seed is feature 9's call — out of scope here.)
- **Error code `invalid_event`** for ingest validation failures (distinct from the generic `validation_error` mentioned in the envelope doc, and from `not_found`/`unpublished` used elsewhere). If a single shared `validation_error` code is preferred API-wide, it's a one-line change — purely naming.
- **`update-database` skill is mandatory** for the `AnalyticsEvent` table; nothing else here touches Prisma. **No commit** unless the user asks.

---

## Tasks (execution order)

> Progress legend: ✅ done · 🔄 in progress · ⬜ not started.

1. ✅ Copy this plan verbatim to `plans/06-analytics-api-plan.md`, status → `in-progress`.
2. ✅ **`update-database` skill:** add the `AnalyticsEvent` model to `apps/builder/prisma/schema.prisma`; create migration `add_analytics_event`; append the `prisma/CHANGELOG.md` entry; `pnpm db:migrate` (idempotent). Confirm `prisma generate` ran (so `prisma.analyticsEvent` exists on the client).
3. ✅ `packages/contracts/src/analytics.ts` — add `AnalyticsSummary`, `analyticsEventsPath()`, `analyticsSummaryPath(slug)`. (`src/index.ts` already re-exports `./analytics`.)
4. ✅ `apps/builder/lib/analytics/analytics.ts` (new, pure) — `parseAnalyticsEventInput`, `summarizeEvents`, `resolveAnalyticsSummaryResponse`, `resolveIngestResponse`, `type StoredEvent`.
5. ✅ `apps/builder/lib/analytics/events.ts` (new) — `RecordEventDeps`/`ReadAnalyticsDeps`, `defaultRecordEventDeps`/`defaultReadAnalyticsDeps` (lazy `import("@/lib/db")`), `recordEvent`, `getAnalyticsSummary`.
6. ✅ `apps/builder/app/api/events/route.ts` (new) — `POST` + `OPTIONS`, CORS headers, `dynamic = "force-dynamic"`.
7. ✅ `apps/builder/app/api/sites/[slug]/analytics/route.ts` (new) — `GET`, `dynamic = "force-dynamic"`.
8. ✅ `apps/builder/app/api/README.md` (edit) — replaced `## Coming later` with the `POST /api/events` + `GET /api/sites/{slug}/analytics` docs; all three endpoints listed in the overview.
9. ✅ `apps/builder/__tests__/analytics/analytics.test.ts` + `apps/builder/__tests__/analytics/events.test.ts` (new) — the DB-independent unit tests above; `packages/contracts/src/__tests__/contracts.test.ts` — the `analytics-summary contract` describe.
10. ✅ Gates: `pnpm db:migrate` → `pnpm typecheck` → `pnpm lint` → `pnpm test` (94 builder + 11 contracts + 3 customer, all green incl. the new `__tests__/analytics/*` and the `analytics-summary contract` describe) → `pnpm build` (both apps; `/api/events` and `/api/sites/[slug]/analytics` listed as dynamic routes) — all green; live smoke via `pnpm -F builder start` on :5111 with a throwaway owner+site created/torn down via Prisma — all `curl`s in Verification §4–9 passed (see Execution outcome).
11. ✅ `CLAUDE.md` — Layout section updated (apps/builder `app/api/events` + `app/api/sites/[slug]/analytics` routes, `lib/analytics/analytics.ts` + `lib/analytics/events.ts`, the `AnalyticsEvent` model + the `add_analytics_event` migration, the new `__tests__/analytics/*` tests; packages/contracts `analytics` module gains `AnalyticsSummary` + the two path helpers).
12. ✅ `plans/00-master-plan.md` §2 status table: feature 6 analytics-api → `done ([plan](06-analytics-api-plan.md))`.
13. ✅ Close out: status → `done`; Execution outcome section added below. No commit (per standing process — not requested).

---

## Execution outcome

**Done 2026-05-12.** Built exactly as planned — no deviations.

- **Schema/migration:** `AnalyticsEvent` model added to `apps/builder/prisma/schema.prisma` (`id` cuid PK, `slug String`, `type String`, `createdAt DateTime @default(now())`, `@@index([slug])`, `@@index([slug, type])`). Migration `prisma/migrations/20260512194151_add_analytics_event/migration.sql` — a single `CREATE TABLE` + two `CREATE INDEX`. `prisma/CHANGELOG.md` got the `add_analytics_event` entry (no-FK rationale + trade-off, no-dedup note, confirms the feature-4 "no gender/age" note). `prisma generate` ran (so `prisma.analyticsEvent` exists on the client); `pnpm db:migrate` re-applies idempotently ("No pending migrations to apply").
- **Contracts:** `packages/contracts/src/analytics.ts` gained `AnalyticsSummary`, `analyticsEventsPath()` (`/api/events`), `analyticsSummaryPath(slug)` (`/api/sites/{slug}/analytics`, URL-encoded). `src/index.ts` unchanged. Tests: a new `analytics-summary contract` describe in `src/__tests__/contracts.test.ts` (paths, encoding, type-smoke).
- **Builder logic:** `lib/analytics/analytics.ts` (pure — `parseAnalyticsEventInput`, `summarizeEvents`, `resolveAnalyticsSummaryResponse`, `resolveIngestResponse`, `type StoredEvent`) + `lib/analytics/events.ts` (`RecordEventDeps`/`ReadAnalyticsDeps`, `recordEvent`, `getAnalyticsSummary`; real `@/lib/db` lazy-imported in the `defaultXxxDeps()`).
- **Routes:** `app/api/events/route.ts` (`POST` ingest + `OPTIONS` preflight, `Access-Control-Allow-Origin: *` etc. on every response, `dynamic = "force-dynamic"`, always-envelope body) + `app/api/sites/[slug]/analytics/route.ts` (`GET`, `dynamic = "force-dynamic"`, always-envelope body, no CORS). `app/api/README.md` rewritten — all three endpoints documented (paths, params, request/response tables, no-auth, the CORS + no-dedup notes).
- **Tests:** `apps/builder/__tests__/analytics/analytics.test.ts` (14 tests) + `apps/builder/__tests__/analytics/events.test.ts` (8 tests) — DB-independent (pure functions + injected fake deps); incl. the `visit` non-dedup `3 → 3` assertion. Route handlers + `OPTIONS` not unit-tested (consistent with feature 5).
- **Gates (all green):** `pnpm db:migrate` (idempotent) → `pnpm typecheck` → `pnpm lint` → `pnpm test` (108 tests: 94 builder + 11 contracts + 3 customer) → `pnpm build` (both apps; `/api/events` and `/api/sites/[slug]/analytics` compiled as `ƒ` dynamic routes).
- **Live smoke** (via `pnpm -F builder start` on :5111, with a throwaway `cafemizrahi` published site + a `quietplace` unpublished site created/torn down via Prisma — `:5111` was free): ingest happy path → `200 {"ok":true,"data":{"recorded":true}}` with `Access-Control-Allow-Origin: *` present; 3×`visit` + 1×`book-now-hover` → `GET /api/sites/cafemizrahi/analytics` → `{"slug":"cafemizrahi","visits":3,"bookNowHovers":1,"bookNowClicks":0}` (the 3 visits **not** deduped); case-insensitive (`CafeMizrahi`) → same; unknown-slug `POST` → `404 not_found`, summary unchanged (nothing stored); unknown-slug `GET` → `404 not_found`; bad `type` (`scroll`) → `400 invalid_event`; missing `slug` → `400 invalid_event`; non-JSON body → `400 invalid_event`; `OPTIONS` preflight → `204` with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: content-type`; empty-but-existing slug (`quietplace`) → `200` all-zeros; unpublished slug accepts a `visit` → `200 recorded`, then summary → `visits:1`. All throwaway rows (owners, sites, events) deleted afterward — DB back to empty.
- **No commit** (standing process; not requested). New/changed files: `apps/builder/prisma/{schema.prisma,CHANGELOG.md}` + `prisma/migrations/20260512194151_add_analytics_event/`, `apps/builder/lib/analytics/{analytics,events}.ts`, `apps/builder/app/api/events/route.ts`, `apps/builder/app/api/sites/[slug]/analytics/route.ts`, `apps/builder/app/api/README.md`, `apps/builder/__tests__/analytics/{analytics,events}.test.ts`, `packages/contracts/src/analytics.ts`, `packages/contracts/src/__tests__/contracts.test.ts`, `CLAUDE.md`, `plans/00-master-plan.md`, `plans/06-analytics-api-plan.md`.
