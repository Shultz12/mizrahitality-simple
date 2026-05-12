# Plan — Feature 5: published-page-api

**Status:** done
**Order:** 5 of 9
**Depends on:** feature 1 (monorepo-foundation) — done; feature 3 (site-builder) — done; feature 4 (remove-ai-and-variants) — done
**Satisfies (REQ-#):** REQ-8 (Publish), REQ-12 (per-request page fetch — *server/API side*), REQ-16 (placeholder for unpublished sites — *API side*), REQ-18 (REST API contract — endpoint (a): fetch the published page for a slug)
**Skills:** `update-database` (mandatory — adds `publishedJson` + `publishedAt` to `Site` + migration + `prisma/CHANGELOG.md` entry)

> Standing process (master plan §1): designed in Plan mode; on approval this file is copied verbatim to `plans/05-published-page-api-plan.md` with `Status: in-progress`, then executed; on completion its status → `done` and the master plan §2 status table is ticked. No commit unless the user asks.

---

## Context

Features 1–4 are done. The Builder app (Next.js 15 App Router, :5111) has owner auth, the `Site` model (`id`, `ownerId @unique`, `name` = pinned header text, `slug @unique` frozen, `contentJson` = `JSON.stringify({ blocks: Block[] })`, `isDraft Boolean @default(true)` — **carried but inert**, timestamps), `lib/site/*` (`types.ts` builder-local `Block` union; `slug.ts`, `content.ts`, `sanitize.ts` pure; `site.ts` Prisma helpers — `getOwnerSite`/`slugExists`/`createSite`, with the real `@/lib/db` lazy-`import()`-ed so unit tests stay DB-free; `actions.ts` `"use server"` — `createSiteAction`/`saveSiteAction`/`uploadImageAction`), the drag-and-drop builder (`components/site/site-builder.tsx` + children — client state `{ name, blocks }`, a **Save** button via `saveSiteAction`, **no Publish**), and `app/uploads/[file]/route.ts`. `app/api/` does **not exist yet**. `@mizrahitality/contracts` exports the analytics-event vocabulary, the `ApiSuccess<T>`/`ApiError` envelope (+ `apiOk`/`apiErr`, with `"unpublished"` already named as an example error code), and `createApiClient`. The Customer app (`apps/customer`, :5112) has `lib/env.ts` exporting `BUILDER_API_URL` (default `http://localhost:5111`) + a pre-configured `apiClient`; its `app/[slug]/page.tsx` is feature 8's job.

**Why this feature.** Feature 3 left every site `isDraft: true` with nothing reading it, and there is no way for an outside consumer to read a site's page. Feature 5 closes that loop: it gives the owner an explicit **Publish** button that snapshots the current built page into a published record (edits after publishing stay a draft until re-published; before first publish the site is "unpublished"), and it exposes the **only documented Builder→Customer read endpoint** — `GET /api/sites/{slug}` — returning the structured JSON the Customer app (feature 8) will render server-side, in the standard envelope, with well-defined responses for an unknown slug and for an existing-but-unpublished slug (so feature 8 can show its "coming soon" placeholder). No auth on the endpoint — the slug is the identity.

**Intended outcome.** `pnpm build && pnpm typecheck && pnpm test && pnpm lint` stay green; `pnpm db:migrate` applies the new columns idempotently. In the demo: owner builds a page → clicks **Publish** → `curl http://localhost:5111/api/sites/<slug>` returns `{ "ok": true, "data": { "slug", "name", "blocks": [...] } }`; an unpublished-but-real slug returns `{ "ok": false, "error": { "code": "unpublished", ... } }`; an unknown slug returns `404` `{ "ok": false, "error": { "code": "not_found", ... } }`; editing + Save after publishing does **not** change what the endpoint serves until Publish is clicked again.

### Decisions confirmed with the user

1. **Publish = save + publish, one click.** The builder's **Publish** button sends the current client state `{ name, blocks }`; the action persists the draft (`contentJson`, `name`, `isDraft: true→false`) **and** writes the published snapshot (`publishedJson`, `publishedAt`). **Save** stays as-is — saves a draft without going live (sets `isDraft: true`). No "save first, then publish" dance.
2. **The API returns the image URL relative**, exactly as stored (`/uploads/<file>` or `/stock/<name>.svg`). Feature 8's Customer app prefixes it with `BUILDER_API_URL` (which it already has) when rendering — the Builder never needs to know its own external origin. Documented in the API doc + the contract type.
3. **HTTP statuses:** unknown slug → `404` with `apiErr("not_found", …)`; existing-but-unpublished slug → **`200`** with `{ ok: false, error: { code: "unpublished", … } }` (the request was understood and the slug is real — there's just no live content yet; the consumer branches on `error.code === "unpublished"`); published → `200` `apiOk(page)`.

### Design calls (not user-facing forks; recorded for the executor)

- **Schema = two nullable columns on `Site`** (no child/`Published` table — overkill at one row per site): `publishedJson String?` (`JSON.stringify({ name, blocks })` at the last Publish; `null` ⇒ never published) and `publishedAt DateTime?`. The existing **`isDraft`** column becomes active: `true` = the draft has changes not yet published (also true for a never-published site, by its `@default(true)`); set `true` on every `saveSite`, `false` on `publishSite`. The API ignores `isDraft` — it only reads `publishedJson`.
- **Endpoint path: `GET /api/sites/[slug]`** under `apps/builder/app/api/` (the namespace feature 6's analytics aggregation can extend, e.g. `/api/sites/[slug]/analytics`; the event-ingest endpoint is feature 6's `POST /api/events`). `export const dynamic = "force-dynamic"` (it reads the DB — explicit, even though Next 15 GET route handlers are dynamic by default). The incoming slug is lower-cased before lookup (slugs are stored lower-cased) — forgiving. Always returns a JSON envelope body, even on `404`/`500` (so `createApiClient`, which parses the body and ignores status, works).
- **Shared published-page contract lives in `@mizrahitality/contracts`** (the feature-3 plan said feature 5 would define it): a new `published-page.ts` module — `PublishedBlock` (structurally the builder's `Block`: `id` + `type` + payload), `PublishedPage = { slug; name; blocks: PublishedBlock[] }`, and `publishedPagePath(slug)` so both apps share the path. Builder-local `Block` (in `apps/builder/lib/site/types.ts`) stays where it is — it's structurally identical to `PublishedBlock`, so `Block[]` is assignable to `PublishedBlock[]` with no mapping; aligning them via a re-export is a possible later cleanup, not done here. `id` is kept in `PublishedBlock` (harmless pass-through; stable React keys for feature 8).
- **Pure, DB-free seam for everything testable.** `lib/site/published.ts` (pure): `toPublishedPage(slug, publishedJson)` (tolerant — reuses `parsePageContent`; `null`/garbage ⇒ `null`/empty), `buildPublishedSnapshot({ name, blocks })`, and `resolvePublishedResponse(slug, found)` → `{ status, body: ApiResult<PublishedPage> }` (the three-case decision: not-found / unpublished / published — so the route handler is a thin Prisma lookup + `Response.json(body, { status })` and the branching is unit-tested without Next/Prisma). `lib/site/site.ts` gains `saveSite`/`publishSite` over an injectable `WriteSiteDeps` (mirroring `createSite`'s `CreateSiteDeps`) so the snapshot-independence is unit-tested with a fake; the actions become thin wrappers (`requireOwner()` → `saveSite`/`publishSite` → `revalidatePath("/builder")`).
- **No unit test of the route handler itself** (Next-runtime + Prisma) — consistent with feature 3's stance on actions/UI; covered by `next build` (route compilation + types) + a manual `curl` against a temp `next start`, and by the pure `resolvePublishedResponse` tests. Smoke tests stay DB-independent.

---

## Charter (master plan §3.5)

Publishing and the REST endpoint the Customer app reads. Deliver: an explicit **Publish** button in the builder that snapshots the current built state (venue name, ordered blocks, image, Book Now presence) into a **published** record — edits after publishing stay a draft until re-published; before first publish the site is "unpublished". The REST endpoint: `GET` the published page for a given **slug**, returning the structured JSON the Customer app renders (venue name → ordered blocks with type/content/image URL/Book Now presence), wrapped in the `ApiSuccess<T>`/`ApiError` envelope from `@mizrahitality/contracts`; well-defined responses for an **unknown slug** and for an **existing-but-unpublished slug** (so the customer site can show the placeholder); no authentication on this endpoint. Document the endpoint path, request params, and response shape (and/or a short API doc). Tests: the publish snapshot is independent of subsequent draft edits, unknown vs. unpublished slug responses, envelope shape. Out of scope: analytics endpoints (feature 6), the customer-side rendering (feature 8).

---

## In scope

- `update-database` run: `publishedJson String?` + `publishedAt DateTime?` on `Site`; migration `add_published_snapshot`; `prisma/CHANGELOG.md` entry. (`isDraft` is unchanged in the schema — it just starts being written.)
- `@mizrahitality/contracts`: new `published-page.ts` (`PublishedBlock`, `PublishedPage`, `publishedPagePath`) + `index.ts` re-export; a `describe` added to `contracts.test.ts`.
- `apps/builder/lib/site/published.ts` (new, pure): `toPublishedPage`, `buildPublishedSnapshot`, `resolvePublishedResponse`.
- `apps/builder/lib/site/site.ts` (edit): add `SaveResult` type, `WriteSiteDeps`, `saveSite`, `publishSite` (injectable, real Prisma lazy-imported); extend `getOwnerSite` to also return `published: boolean`, `hasUnpublishedChanges: boolean`, `publishedAt: string | null`.
- `apps/builder/lib/site/types.ts` (edit): extend `BuilderSite` with `published` / `hasUnpublishedChanges` / `publishedAt`.
- `apps/builder/lib/site/actions.ts` (edit): `saveSiteAction` delegates to `saveSite`; new `publishSiteAction` → `publishSite`; both `revalidatePath("/builder")` on success; re-export `SaveResult` from `./site`. (`createSiteAction`, `uploadImageAction` untouched.)
- `apps/builder/app/api/sites/[slug]/route.ts` (new): `GET` handler — Prisma lookup by slug → `resolvePublishedResponse` → `Response.json`.
- `apps/builder/app/api/README.md` (new): the REST API doc (this endpoint now; notes feature 6 adds `POST /api/events` + per-slug aggregation).
- `apps/builder/components/site/site-builder.tsx` (edit): a **Publish** button beside Save; a publish-state badge ("Not published yet" / "Unpublished changes — Publish to update the live page" / "Published — the live page is up to date") derived client-side (`everPublished`, `dirty`, seeded from the server props, updated optimistically on save/publish/edit).
- `apps/builder/app/(owner)/builder/page.tsx` (edit): banner copy — "Your page goes live at this address once you publish." (drop the "arrives in a later step" parenthetical); pass the extended `site` through.
- `apps/builder/__tests__/site/published.test.ts` (new, DB-independent): `toPublishedPage`, `resolvePublishedResponse`, and `saveSite`/`publishSite` snapshot-independence with a fake `WriteSiteDeps`.
- `CLAUDE.md` Layout section updated; `plans/00-master-plan.md` §2 status table ticked; `plans/05-published-page-api-plan.md` (this file copied verbatim).

## Out of scope

- The analytics ingest endpoint and the per-slug aggregation endpoint (feature 6). The `AnalyticsEvent` model.
- The Customer app's `app/[slug]/page.tsx` rendering, the "coming soon" placeholder UI, the Book Now confirmation, posting analytics — all feature 8. (Feature 5 only makes the *API* return the right shapes.)
- Absolutizing `imageUrl` (decided: relative; feature 8 prefixes with `BUILDER_API_URL`).
- Any auth on the REST API; rate limiting; multi-tenant hardening (PRD non-goals).
- Versioning the published snapshot / publish history — one current published record per site, overwritten on re-publish.
- Touching `lib/auth/*` beyond reusing `requireOwner()`. `@mizrahitality/contracts`'s analytics/envelope/client modules are unchanged.

---

## Approach

### Data model — via the `update-database` skill

Migration name **`add_published_snapshot`** (→ `prisma/migrations/<ts>_add_published_snapshot/migration.sql`). Adds to `Site`:

```prisma
model Site {
  id            String       @id @default(cuid())
  ownerId       String       @unique
  owner         OwnerAccount @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name          String
  slug          String       @unique
  contentJson   String       @default("{\"blocks\":[]}")
  isDraft       Boolean      @default(true)
  publishedJson String?      // JSON.stringify({ name, blocks }) snapshot at the last Publish; null = never published
  publishedAt   DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

Two **nullable** columns — SQLite `ALTER TABLE ... ADD COLUMN` is fine; no backfill (existing rows get `NULL`, i.e. "never published", which is correct). `isDraft` keeps `@default(true)` and is now written by `saveSite` (`true`) / `publishSite` (`false`). `prisma/CHANGELOG.md` gets a new top entry: feature `published-page-api` (feature 5), models affected `Site`, fields added `publishedJson` (`String?`, nullable — `JSON.stringify({ name, blocks })` snapshot at the last Publish; `null` ⇒ never published), `publishedAt` (`DateTime?`, nullable); note that `isDraft` (added inert in feature 3's `add_site`) is now active — `false` after Publish, `true` after a post-publish Save; no data backfill; `pnpm db:migrate` re-applies idempotently. Run `pnpm db:migrate` to apply.

### Shared contract — `packages/contracts/src/published-page.ts`

```ts
/** A block of a published page, as returned by GET /api/sites/{slug}. */
export type PublishedBlock =
  | { id: string; type: "rich-text"; html: string }
  | { id: string; type: "image"; imageUrl: string; alt: string }
  | { id: string; type: "book-now" };

/**
 * A venue's published landing page: the pinned venue-name header followed by ordered blocks.
 * `imageUrl` on an image block is a path **relative to the Builder origin** (e.g.
 * `/uploads/<file>` or `/stock/<name>.svg`); resolve it against the Builder base URL
 * (`BUILDER_API_URL`) before rendering.
 */
export interface PublishedPage {
  slug: string;
  name: string;
  blocks: PublishedBlock[];
}

/** Path of the published-page endpoint for a slug. `GET` → `ApiResult<PublishedPage>`. */
export function publishedPagePath(slug: string): string {
  return `/api/sites/${encodeURIComponent(slug)}`;
}
```

`index.ts` adds `export * from "./published-page";`. (Raw TS, consumed via `transpilePackages` — no build/version bump.)

### Pure logic — `apps/builder/lib/site/published.ts`

```ts
import { apiErr, apiOk, type ApiResult, type PublishedBlock, type PublishedPage } from "@mizrahitality/contracts";
import { parsePageContent } from "./content";
import type { Block } from "./types";

/** Serialize the current built state into the publishable snapshot string stored in Site.publishedJson. */
export function buildPublishedSnapshot(input: { name: string; blocks: Block[] }): string {
  return JSON.stringify({ name: input.name, blocks: input.blocks });
}

/** Build the API payload from a stored published snapshot. `null`/unparseable ⇒ `null` (treat as unpublished). */
export function toPublishedPage(slug: string, publishedJson: string | null): PublishedPage | null {
  if (publishedJson == null) return null;
  let raw: unknown;
  try { raw = JSON.parse(publishedJson); } catch { return null; }
  if (typeof raw !== "object" || raw === null) return null;
  const name = typeof (raw as { name?: unknown }).name === "string" ? (raw as { name: string }).name : "";
  const blocks = parsePageContent({ blocks: (raw as { blocks?: unknown }).blocks }).blocks as PublishedBlock[];
  return { slug, name, blocks };
}

/** Decide the GET /api/sites/{slug} response from the looked-up row (or `null` if no such slug). */
export function resolvePublishedResponse(
  slug: string,
  found: { slug: string; publishedJson: string | null } | null,
): { status: number; body: ApiResult<PublishedPage> } {
  if (!found) return { status: 404, body: apiErr("not_found", "No site with that web address.") };
  const page = toPublishedPage(found.slug, found.publishedJson);
  if (!page) return { status: 200, body: apiErr("unpublished", "This site hasn’t been published yet.") };
  return { status: 200, body: apiOk(page) };
}
```

`parsePageContent` already drops invalid entries, normalizes missing ids, and de-dups the singletons — so `toPublishedPage` inherits that tolerance for free. `Block[]` ⊇ `PublishedBlock[]` structurally; the cast is a no-op narrowing.

### Persistence seam — `apps/builder/lib/site/site.ts` (edit)

Add (the existing `getOwnerSite`/`slugExists`/`createSite` stay; `@/lib/db` still lazy-imported):

```ts
import { parsePageContent, validateBlocks } from "./content";
import { sanitizeRichTextHtml } from "./sanitize";
import { validateVenueName } from "./slug";
import { buildPublishedSnapshot } from "./published";

export type SaveResult = { ok: true } | { ok: false; error: string };

function preparePayload(payload: { name: unknown; blocks: unknown }):
  | { ok: true; name: string; blocks: Block[] } | { ok: false; error: string } {
  const name = validateVenueName(payload.name);
  if (!name.ok) return { ok: false, error: name.error };
  const parsed = parsePageContent(Array.isArray(payload.blocks) ? { blocks: payload.blocks } : payload.blocks);
  const validated = validateBlocks(parsed.blocks);
  if (!validated.ok) return { ok: false, error: validated.error };
  const blocks = validated.blocks.map((b) => (b.type === "rich-text" ? { ...b, html: sanitizeRichTextHtml(b.html) } : b));
  return { ok: true, name: name.value, blocks };
}

export type WriteSiteDeps = {
  findSite(siteId: string): Promise<{ id: string; ownerId: string } | null>;
  updateSite(siteId: string, data: {
    name: string; contentJson: string; isDraft: boolean; publishedJson?: string; publishedAt?: Date;
  }): Promise<void>;
};

async function defaultWriteSiteDeps(): Promise<WriteSiteDeps> {
  const { prisma } = await import("@/lib/db");
  return {
    findSite: (id) => prisma.site.findUnique({ where: { id }, select: { id: true, ownerId: true } }),
    updateSite: async (id, data) => { await prisma.site.update({ where: { id }, data }); },
  };
}

async function writeSite(siteId: string, ownerId: string, payload: { name: unknown; blocks: unknown },
  publish: boolean, deps?: WriteSiteDeps): Promise<SaveResult> {
  const d = deps ?? (await defaultWriteSiteDeps());
  const site = await d.findSite(siteId);
  if (!site || site.ownerId !== ownerId) return { ok: false, error: "Site not found." };
  const prepared = preparePayload(payload);
  if (!prepared.ok) return { ok: false, error: prepared.error };
  const { name, blocks } = prepared;
  const contentJson = JSON.stringify({ blocks });
  if (publish) {
    await d.updateSite(site.id, { name, contentJson, isDraft: false,
      publishedJson: buildPublishedSnapshot({ name, blocks }), publishedAt: new Date() });
  } else {
    await d.updateSite(site.id, { name, contentJson, isDraft: true });
  }
  return { ok: true };
}

export function saveSite(siteId: string, ownerId: string, payload: { name: unknown; blocks: unknown }, deps?: WriteSiteDeps) {
  return writeSite(siteId, ownerId, payload, false, deps);
}
export function publishSite(siteId: string, ownerId: string, payload: { name: unknown; blocks: unknown }, deps?: WriteSiteDeps) {
  return writeSite(siteId, ownerId, payload, true, deps);
}
```

`getOwnerSite` selects `isDraft, publishedJson, publishedAt` too and returns:
```ts
return {
  id: row.id, name: row.name, slug: row.slug,
  blocks: parsePageContent(row.contentJson).blocks,
  published: row.publishedJson !== null,
  hasUnpublishedChanges: row.isDraft,
  publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
};
```
(`BuilderSite` in `types.ts` gains `published: boolean; hasUnpublishedChanges: boolean; publishedAt: string | null`.)

### Server Actions — `apps/builder/lib/site/actions.ts` (edit)

Replace the inline `saveSiteAction` body with a delegation; add `publishSiteAction`. The current `SaveResult` type definition moves to `site.ts`; `actions.ts` re-exports it (`export type { SaveResult } from "./site";` — type-only exports are already used in this `"use server"` file).

```ts
import { publishSite, saveSite } from "./site";
export type { SaveResult } from "./site";

export async function saveSiteAction(siteId: string, payload: { name: string; blocks: unknown }) {
  const owner = await requireOwner();
  const result = await saveSite(siteId, owner.id, payload);
  if (result.ok) revalidatePath("/builder");
  return result;
}

export async function publishSiteAction(siteId: string, payload: { name: string; blocks: unknown }) {
  const owner = await requireOwner();
  const result = await publishSite(siteId, owner.id, payload);
  if (result.ok) revalidatePath("/builder");
  return result;
}
```
`createSiteAction` and `uploadImageAction` are unchanged. (`createSite` on a fresh site already leaves `publishedJson: NULL` and `isDraft: true` — "not published yet" — no change needed there.)

### REST endpoint — `apps/builder/app/api/sites/[slug]/route.ts` (new)

```ts
import { prisma } from "@/lib/db";
import { resolvePublishedResponse } from "@/lib/site/published";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  try {
    const site = await prisma.site.findUnique({ where: { slug }, select: { slug: true, publishedJson: true } });
    const { status, body } = resolvePublishedResponse(slug, site);
    return Response.json(body, { status });
  } catch {
    return Response.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong loading this site." } },
      { status: 500 },
    );
  }
}
```
Only `GET` is exported → other methods get Next's automatic `405`. The body is always an `ApiResult` envelope (so `createApiClient`, which parses the body and ignores the status code, gets a clean `ApiError` even on `404`/`500`).

### API doc — `apps/builder/app/api/README.md` (new)

Documents the Builder REST API (the only Builder↔Customer channel, no auth, slug = identity):
- **`GET /api/sites/{slug}`** — fetch a venue's published page.
  - Path param `slug` (the venue's slug; case-insensitive — lower-cased server-side).
  - **`200`** `{ "ok": true, "data": { "slug": string, "name": string, "blocks": PublishedBlock[] } }` — the published page; `blocks` in render order; `PublishedBlock` is `{ id, type:"rich-text", html }` | `{ id, type:"image", imageUrl, alt }` | `{ id, type:"book-now" }`; `imageUrl` is **relative to this app's origin** (`/uploads/<file>` or `/stock/<name>.svg`) — resolve it against `BUILDER_API_URL`.
  - **`200`** `{ "ok": false, "error": { "code": "unpublished", "message": "…" } }` — the slug exists but has never been published; consumers show their "coming soon" placeholder.
  - **`404`** `{ "ok": false, "error": { "code": "not_found", "message": "…" } }` — no site with that slug.
  - **`500`** `{ "ok": false, "error": { "code": "internal_error", "message": "…" } }`.
  - Types: `PublishedPage`, `PublishedBlock`, `publishedPagePath()` in `@mizrahitality/contracts`; envelope: `ApiSuccess<T>`/`ApiError` (`apiOk`/`apiErr`) in the same package.
- Note: analytics ingest (`POST /api/events`) and a per-slug aggregation endpoint are added by feature 6 (`analytics-api`).

Also add a one-line pointer to this doc from `apps/builder`'s fractal docs if any exist (none currently — skip if so).

### Builder UI — `apps/builder/components/site/site-builder.tsx` (edit)

- Import `publishSiteAction`. Add to `SaveStatus`: `{ kind: "published" }`. Add a **Publish** button beside Save: `variant`-wise Save = `outline`, Publish = default (primary); both `disabled={pending}`. `onClick` → `startTransition(async () => { const r = await publishSiteAction(site.id, { name, blocks }); if (r.ok) { setEverPublished(true); setDirty(false); setStatus({ kind: "published" }); } else setStatus({ kind: "error", message: r.error }); })`. Save's handler additionally `setDirty(true)` on success (a save keeps the draft un-live).
- Client publish-state, derived (no server round-trip needed for the badge): `const [everPublished, setEverPublished] = useState(site.published)`, `const [dirty, setDirty] = useState(site.hasUnpublishedChanges)`. `touch()` (already called on every edit) also `setDirty(true)`. Badge text: `!everPublished` → "Not published yet"; `everPublished && dirty` → "You have changes that aren’t live yet — Publish to update the page."; `everPublished && !dirty` → "Published — the live page is up to date." Status line shows "Saved" / "Published" transiently and the error `role="alert"` as today.
- (The server-truth badge re-appears correctly on reload via `revalidatePath("/builder")`; the optimistic client state just keeps it sensible without a refresh.)

### Builder page — `apps/builder/app/(owner)/builder/page.tsx` (edit)

In the frozen-slug banner, change "(Your page goes live once you publish — that arrives in a later step.)" to "Your page goes live at this address once you publish — use the **Publish** button below." `getOwnerSite` already returns the extended shape, so `<SiteBuilder site={site} />` just works.

---

## Data model

Through the **`update-database` skill** — adds `publishedJson String?` + `publishedAt DateTime?` to `Site`, generates migration `add_published_snapshot`, appends a `prisma/CHANGELOG.md` entry, runs `pnpm db:migrate` (`prisma migrate deploy`, idempotent). `isDraft` is unchanged in the schema (added inert in feature 3) — it just begins being written (`false` on Publish, `true` on Save). No backfill (existing rows get `NULL` ⇒ "never published", which is correct).

---

## API surface

**New REST endpoint:** `GET /api/sites/{slug}` — `apps/builder/app/api/sites/[slug]/route.ts`. No auth. Returns `ApiResult<PublishedPage>`: `200` `apiOk({ slug, name, blocks })` (published) · `200` `apiErr("unpublished", …)` (slug exists, never published) · `404` `apiErr("not_found", …)` (unknown slug) · `500` `apiErr("internal_error", …)`. Documented in `apps/builder/app/api/README.md`.

**`@mizrahitality/contracts` additions** (raw TS, no version bump): `published-page.ts` — `PublishedBlock`, `PublishedPage` (`{ slug; name; blocks }`; `imageUrl` documented relative-to-Builder-origin), `publishedPagePath(slug)`; re-exported from `index.ts`. Envelope (`ApiSuccess`/`ApiError`/`apiOk`/`apiErr`), analytics vocab, and `createApiClient` unchanged.

**Server Actions** (`apps/builder/lib/site/actions.ts`, `"use server"`): `saveSiteAction(siteId, { name, blocks })` → `SaveResult` (now delegates to `saveSite`; sets `isDraft: true`). `publishSiteAction(siteId, { name, blocks })` → `SaveResult` (new; persists draft **and** the published snapshot; sets `isDraft: false`, `publishedAt: now()`). `createSiteAction`, `uploadImageAction` unchanged.

---

## Files & directories

```
apps/builder/
  prisma/schema.prisma                          (edit — add publishedJson String?, publishedAt DateTime? to Site) — via `update-database`
  prisma/migrations/<ts>_add_published_snapshot/migration.sql  (new — prisma migrate)
  prisma/CHANGELOG.md                           (edit — add_published_snapshot entry)
  lib/site/published.ts                         (new — pure: buildPublishedSnapshot, toPublishedPage, resolvePublishedResponse)
  lib/site/site.ts                              (edit — add SaveResult, WriteSiteDeps, saveSite, publishSite; getOwnerSite returns published/hasUnpublishedChanges/publishedAt)
  lib/site/types.ts                             (edit — extend BuilderSite with published / hasUnpublishedChanges / publishedAt)
  lib/site/actions.ts                           (edit — saveSiteAction delegates to saveSite; new publishSiteAction; re-export SaveResult from ./site)
  app/api/sites/[slug]/route.ts                 (new — GET published-page endpoint)
  app/api/README.md                             (new — REST API doc)
  components/site/site-builder.tsx              (edit — Publish button + publish-state badge; optimistic client state)
  app/(owner)/builder/page.tsx                  (edit — banner copy: goes live on Publish)
  __tests__/site/published.test.ts              (new — DB-independent: toPublishedPage, resolvePublishedResponse, save/publish snapshot independence with a fake WriteSiteDeps)
packages/contracts/
  src/published-page.ts                         (new — PublishedBlock, PublishedPage, publishedPagePath)
  src/index.ts                                  (edit — export * from "./published-page")
  src/__tests__/contracts.test.ts               (edit — add a `published-page contract` describe)
CLAUDE.md                                        (edit — Layout: apps/builder app/api + lib/site/published + saveSite/publishSite + Site columns; packages/contracts published-page module)
plans/00-master-plan.md                          (edit — §2 status table: feature 5 → in-progress → done)
plans/05-published-page-api-plan.md              (new — this plan, copied verbatim)
```

No new dependencies. No new shadcn components. The only step through the `update-database` skill is the migration; everything else is plain code.

---

## Tests

All new tests **DB-independent** (no `@/lib/db` import — `published.ts` is pure; `saveSite`/`publishSite` are exercised with an injected `WriteSiteDeps` fake, like `createSite`'s `CreateSiteDeps`). `sanitize-html` (pulled in transitively by `preparePayload` → `sanitize.ts`) runs in vitest's node env, as it already does in `sanitize.test.ts`.

**`apps/builder/__tests__/site/published.test.ts`** —
- `buildPublishedSnapshot({ name: "Cafe Mizrahi", blocks: [rt, img, bn] })` → a string that `JSON.parse`s to `{ name: "Cafe Mizrahi", blocks: [rt, img, bn] }` (order preserved).
- `toPublishedPage("cafemizrahi", null)` → `null`. `toPublishedPage("cafemizrahi", "not json")` → `null`. `toPublishedPage("c", JSON.stringify({ blocks: "nope" }))` → `{ slug: "c", name: "", blocks: [] }`. `toPublishedPage("c", JSON.stringify({ name: "X", blocks: [validRichText, { type: "bogus" }, validImage] }))` → `{ slug:"c", name:"X", blocks:[validRichText, validImage] }` (bogus dropped, order kept). Two image blocks in the snapshot → only the first survives (inherited from `parsePageContent`). A block missing `id` → kept with a generated one.
- `resolvePublishedResponse("ghost", null)` → `{ status: 404, body: { ok: false, error: { code: "not_found", … } } }`. `resolvePublishedResponse("c", { slug:"c", publishedJson: null })` → `{ status: 200, body: { ok: false, error: { code: "unpublished", … } } }`. `resolvePublishedResponse("c", { slug:"c", publishedJson: JSON.stringify({ name:"Cafe Mizrahi", blocks:[rt] }) })` → `{ status: 200, body: { ok: true, data: { slug:"c", name:"Cafe Mizrahi", blocks:[rt] } } }`.
- **Snapshot independence** (fake `WriteSiteDeps` — `findSite` returns `{ id:"s1", ownerId:"o1" }` for `"s1"` else `null`; `updateSite` pushes `{ siteId, data }` onto a capture array):
  - `publishSite("s1","o1",{ name:"Cafe Mizrahi", blocks:[rt1] }, fake)` → `{ ok:true }`; the captured `updateSite` data has `isDraft:false`, `publishedAt instanceof Date`, `contentJson === JSON.stringify({ blocks:[<rt1 sanitized>] })`, `publishedJson === JSON.stringify({ name:"Cafe Mizrahi", blocks:[<rt1 sanitized>] })`.
  - then `saveSite("s1","o1",{ name:"Cafe Tov", blocks:[rt2] }, fake)` → `{ ok:true }`; the captured data has `isDraft:true`, `contentJson` updated, and **no `publishedJson` / `publishedAt` keys** — i.e. a draft edit never touches the published snapshot.
  - then `publishSite("s1","o1",{ name:"Cafe Tov", blocks:[rt2] }, fake)` → the new `publishedJson` reflects `{ name:"Cafe Tov", blocks:[<rt2 sanitized>] }`.
  - `publishSite("s1","intruder",…,fake)` → `{ ok:false, error:"Site not found." }`; `publishSite("missing","o1",…,fake)` → same.
  - `publishSite("s1","o1",{ name:"Cafe 23", blocks:[] }, fake)` → `{ ok:false, error:"Use English letters and spaces only — no digits or special characters." }` (validation pass-through). A rich-text block whose `html` contains `<script>alert(1)</script>` → the captured `contentJson` and `publishedJson` contain no `<script>` (sanitization pass-through).

**`packages/contracts/src/__tests__/contracts.test.ts`** — add `describe("published-page contract", …)`: `publishedPagePath("cafemizrahi")` === `"/api/sites/cafemizrahi"`; a `PublishedPage` literal compiles and `apiOk(page).data.blocks[0].type` reads as expected (type-smoke). (No need to re-test the envelope itself — already covered.)

**Not unit-tested** — `app/api/sites/[slug]/route.ts` (Next-runtime + Prisma; its logic is a thin Prisma lookup + the unit-tested `resolvePublishedResponse`), `publishSiteAction`/`saveSiteAction` wrappers (Next-runtime), the builder UI (browser-bound) — consistent with feature 3. Covered by `next build` (route/page compilation + types) + the demo `curl`s + the manual builder smoke. Existing tests stay green (the `saveSite` extraction doesn't change `saveSiteAction`'s external behavior except it now also writes `isDraft: true`, which nothing yet asserts).

Gates (green across the workspace): `pnpm db:migrate` (applies `add_published_snapshot` idempotently) → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`.

---

## Acceptance (REQ-# this feature owns)

- **REQ-8 — Publish (P0).** The builder shows an explicit **Publish** button. `publishSiteAction` → `publishSite`: re-auths (`requireOwner`), re-checks ownership, validates the venue name, parses/validates/sanitizes the blocks (same as Save), then writes `contentJson` + `name` **and** `publishedJson = JSON.stringify({ name, blocks })` + `publishedAt = now()` + `isDraft = false`. A subsequent `saveSiteAction` writes only `contentJson`/`name`/`isDraft = true` — `publishedJson` is untouched, so the API keeps serving the old snapshot until Publish is clicked again. Before any Publish, `publishedJson === null`. *Verified by:* `published.test.ts` (snapshot independence — publish then save then re-publish; the captured `updateSite` data); *demo:* sign in → build a page → Publish → `curl /api/sites/<slug>` returns the page → edit + Save → re-`curl` → still the old page → Publish → re-`curl` → the new page; a brand-new site (before any Publish) → `curl` returns `ok:false` `unpublished`.
- **REQ-12 — per-request page fetch & render (P0), API side.** `GET /api/sites/{slug}` returns the structured JSON the Customer app renders: `{ slug, name, blocks: [{ id, type, … }] }` with `blocks` in render order, types `rich-text` (sanitized `html`) / `image` (`imageUrl` relative to the Builder origin, `alt`) / `book-now` (presence only), in the `ApiSuccess<T>` envelope. (Customer-side rendering is feature 8.) *Verified by:* `published.test.ts` (`toPublishedPage` / `resolvePublishedResponse` shape + order); *demo:* `curl` shows the blocks in the order they were built, the image block carries `/uploads/…` or `/stock/…`.
- **REQ-16 — placeholder for unpublished sites (P0), API side.** An existing-but-never-published slug → `200` `{ ok:false, error:{ code:"unpublished", … } }` — a well-defined, non-error, non-blank response the Customer app turns into its "coming soon" placeholder (feature 8). After the owner's first Publish the same slug returns `ok:true` with the page. *Verified by:* `published.test.ts` (`resolvePublishedResponse` with `publishedJson: null`); *demo:* create a site, don't publish → `curl` → `unpublished`; Publish → `curl` → the page.
- **REQ-18 — REST API contract (P0), endpoint (a).** `GET /api/sites/{slug}` is documented in `apps/builder/app/api/README.md` (path, param, all response shapes, the `imageUrl`-relative note, no auth — the slug identifies the site); the shapes are typed in `@mizrahitality/contracts` (`PublishedPage`, `PublishedBlock`, `publishedPagePath`) and compile in both apps; an unknown slug → `404` `not_found`, an unpublished slug → `200` `unpublished` — both well-defined. (Endpoint (b), analytics ingest, is feature 6.) *Verified by:* the doc + `pnpm typecheck` (contracts compile) + the demo `curl`s.

---

## Verification (end-to-end)

1. `pnpm install` (no new deps, but `postinstall` re-runs `prisma generate` against the new schema) → `pnpm db:migrate` applies `add_published_snapshot` (idempotent) → `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` all green across the workspace (builder gets the new `published.test.ts`; contracts gets the new describe).
2. `pnpm dev` (or `pnpm -F builder dev` if :5111 is free) → sign in → `/builder`. New site → the badge says "Not published yet"; `curl http://localhost:5111/api/sites/<slug>` → `{ "ok": false, "error": { "code": "unpublished", … } }` (HTTP 200). An unknown slug → `curl http://localhost:5111/api/sites/nope` → `404` `{ "ok": false, "error": { "code": "not_found", … } }`.
3. Build a page (a Rich Text block with some formatting, an Image — pick a stock image, then upload one — and a Book Now); click **Publish**. Badge → "Published — the live page is up to date". `curl http://localhost:5111/api/sites/<slug>` → `{ "ok": true, "data": { "slug": "<slug>", "name": "<venue name>", "blocks": [ { "id":…, "type":"rich-text", "html":"…sanitized…" }, { "id":…, "type":"image", "imageUrl":"/uploads/<file>" or "/stock/<name>.svg", "alt":"…" }, { "id":…, "type":"book-now" } ] } }` — blocks in build order; `html` has no `<script>`/`on*`; surviving links carry `rel="noopener noreferrer"`.
4. Edit a block, change the header text, click **Save** (not Publish). Badge → "You have changes that aren’t live yet — Publish to update the page." `curl` again → **unchanged** (still the previously-published snapshot). Click **Publish** → `curl` → now reflects the edits. Reload `/builder` → the badge still reads correctly (server truth via `revalidatePath`).
5. `GET http://localhost:5111/api/sites/<slug>` with the image block's `imageUrl` prefixed by `http://localhost:5111` resolves to the actual image (proving feature 8 can render it by prefixing with `BUILDER_API_URL`).
6. (If :5111 is held by the sibling `../Mizrahitality` dev server — as in features 2/3 — fall back to `next build` + `next start -p <free port>` for the `curl` checks + the unit suite, and note "live builder Publish-button smoke pending; recommend a manual `pnpm dev` pass when 5111 is free." The pure logic — `toPublishedPage`, `resolvePublishedResponse`, save/publish snapshot independence — is unit-tested regardless.)

---

## Risks & open questions

- **Publish-state badge is optimistic client state.** `revalidatePath("/builder")` marks the route stale but doesn't swap the live client tree, so the badge updates immediately via local `everPublished`/`dirty` and re-syncs to server truth on the next load. Acceptable for the demo; flagged so it isn't mistaken for a stale-data bug.
- **`Block` vs `PublishedBlock` are structurally identical right now.** `toPublishedPage` returns the builder's `Block[]` typed as the contract's `PublishedBlock[]` (assignable). If the two ever diverge this silently breaks — a future cleanup could make `apps/builder/lib/site/types.ts`'s `Block` re-export the contract type. Not done here (keeps feature 3's module shape).
- **`200` for the unpublished case** (`{ ok:false, error:{ code:"unpublished" } }`) is intentional (the slug is real; the request succeeded; there's just no live content) — `createApiClient` ignores the status and branches on the envelope anyway. Documented in the API README so feature 8 keys off `error.code === "unpublished"` for the placeholder vs. treats other `ok:false` (incl. `404 not_found`) as a graceful fallback.
- **`imageUrl` stays relative.** The API returns the path as stored; feature 8 must prefix with `BUILDER_API_URL` (it already has it). Stock SVGs (`/stock/*.svg`, served by Next's `public/` on :5111) and uploads (`/uploads/<file>`, the route handler from feature 3) are both under the Builder origin, so one prefix covers both. Documented in `app/api/README.md` and `published-page.ts`.
- **Route caching.** Next 15 GET route handlers are dynamic by default; `export const dynamic = "force-dynamic"` is added explicitly so a future Next change or a build optimization can't accidentally prerender/cache the published page.
- **Corrupt `publishedJson`** (shouldn't happen — we control writes) → `toPublishedPage` returns `null` → the endpoint answers `unpublished`. Graceful; mild data-loss-masking risk, acceptable for the demo.
- **`update-database` skill** is mandatory for the schema change (`add_published_snapshot`); nothing else in this feature touches Prisma.
- **No commit** unless the user asks.

---

## Tasks (execution order)

> Progress legend: ✅ done · 🔄 in progress · ⬜ not started.

1. ✅ Copy this plan verbatim to `plans/05-published-page-api-plan.md`, status → `in-progress`.
2. ✅ **`update-database` skill:** add `publishedJson String?` + `publishedAt DateTime?` to `Site` in `prisma/schema.prisma`; create migration `add_published_snapshot` (`20260512180853_add_published_snapshot`); add the `prisma/CHANGELOG.md` entry; `pnpm db:migrate` (idempotent — confirmed).
3. ✅ `packages/contracts/src/published-page.ts` — `PublishedBlock`, `PublishedPage`, `publishedPagePath`; `src/index.ts` re-export.
4. ✅ `apps/builder/lib/site/published.ts` — `buildPublishedSnapshot`, `toPublishedPage`, `resolvePublishedResponse` (pure).
5. ✅ `apps/builder/lib/site/types.ts` — extend `BuilderSite` (`published`, `hasUnpublishedChanges`, `publishedAt`).
6. ✅ `apps/builder/lib/site/site.ts` — `SaveResult`, `preparePayload`, `WriteSiteDeps`, `defaultWriteSiteDeps`, `writeSite`, `saveSite`, `publishSite`; extend `getOwnerSite`'s select + return.
7. ✅ `apps/builder/lib/site/actions.ts` — `saveSiteAction` → `saveSite`; new `publishSiteAction` → `publishSite`; re-export `SaveResult` from `./site`; dropped the now-unused inline imports (the validate/parse/sanitize logic moved into `site.ts`).
8. ✅ `apps/builder/app/api/sites/[slug]/route.ts` — `GET` handler; `apps/builder/app/api/README.md` — the API doc.
9. ✅ `apps/builder/components/site/site-builder.tsx` — Publish button + publish-state badge + optimistic `everPublished`/`dirty`/`pendingAction` state; `app/(owner)/builder/page.tsx` — banner copy.
10. ✅ `apps/builder/__tests__/site/published.test.ts` — pure tests + save/publish snapshot-independence with a fake `WriteSiteDeps`; `packages/contracts/src/__tests__/contracts.test.ts` — `published-page contract` describe.
11. ✅ Gates: `pnpm db:migrate` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build` — all green; live smoke via `next build && next start -p 5111` (a temp owner+site created/torn down via Prisma): `curl /api/sites/<unknown>` → `404 not_found`; `curl /api/sites/SmokeCafe` (unpublished) → `200 unpublished` (and the mixed-case slug is lower-cased); after writing `publishedJson`, `curl /api/sites/smokecafe` → `200 apiOk({slug,name,blocks})` with blocks in order; `POST` → `405`; the image block's `imageUrl` (`/stock/cafe.svg`) resolves at `http://localhost:5111/stock/cafe.svg`.
12. ✅ `CLAUDE.md` — Layout section updated (apps/builder `app/api` + the route + README, `lib/site/published.ts`, `getOwnerSite`/`saveSite`/`publishSite`/`saveSiteAction`/`publishSiteAction`, the `Site` columns + active `isDraft`, `BuilderSite` extra fields, the builder Publish button + badge, the new tests; packages/contracts `published-page` module).
13. ✅ `plans/00-master-plan.md` §2 status table: feature 5 published-page-api → `done ([plan](05-published-page-api-plan.md))`.
14. ✅ Close out: status → `done`; "Execution outcome" section added below. No commit (not requested).

---

## Execution outcome

**Done** — 2026-05-12. All gates green across the workspace; the REST endpoint smoke-tested live.

**What landed (vs. the plan):**
- **Schema:** `Site.publishedJson String?` + `Site.publishedAt DateTime?` via migration `20260512180853_add_published_snapshot` (`ALTER TABLE … ADD COLUMN` ×2, no backfill); `prisma/CHANGELOG.md` entry added; `pnpm db:migrate` re-applies idempotently. `isDraft` is now written (`saveSite` → `true`, `publishSite` → `false`).
- **Contract:** `packages/contracts/src/published-page.ts` (`PublishedBlock`, `PublishedPage`, `publishedPagePath`) + `index.ts` re-export; `contracts.test.ts` gained a `published-page contract` describe.
- **Builder logic:** `lib/site/published.ts` (pure: `buildPublishedSnapshot`, `toPublishedPage`, `resolvePublishedResponse`); `lib/site/site.ts` gained `SaveResult`, `preparePayload`, `WriteSiteDeps`/`defaultWriteSiteDeps`, `writeSite`, `saveSite`, `publishSite`, and `getOwnerSite` now returns `published`/`hasUnpublishedChanges`/`publishedAt`; `lib/site/types.ts` `BuilderSite` extended; `lib/site/actions.ts` — `saveSiteAction` delegates to `saveSite`, new `publishSiteAction` → `publishSite`, both `revalidatePath("/builder")`, `SaveResult` re-exported from `./site` (the inline parse/validate/sanitize that used to live here moved into `site.ts`).
- **REST endpoint:** `app/api/sites/[slug]/route.ts` — `GET`, `dynamic = "force-dynamic"`, slug lower-cased, always returns a JSON envelope (incl. on `404`/`500`); `app/api/README.md` documents it.
- **UI:** `components/site/site-builder.tsx` — a **Publish** button beside **Save** (Save = `outline`), a publish-state badge from optimistic `everPublished`/`dirty` (and a `pendingAction` state so only the active button shows "Saving…"/"Publishing…"), `touch()` now also marks `dirty`; `app/(owner)/builder/page.tsx` — banner copy updated ("goes live … once you publish — use the **Publish** button below").
- **Tests:** `apps/builder/__tests__/site/published.test.ts` (16 tests — `toPublishedPage`/`resolvePublishedResponse` shape & tolerance + `saveSite`/`publishSite` snapshot-independence with a fake `WriteSiteDeps`, all DB-independent). Workspace test count: builder 72, contracts 7, customer 3 — all passing.

**Deviations / notes:**
- **Dev-server lock (Windows):** a running `next dev` on :5111 held Prisma's `query_engine-windows.dll.node`, so `prisma migrate dev`'s auto-`generate` and a follow-up `prisma generate` failed with `EPERM`. With the user's go-ahead the builder dev server was stopped; `prisma generate` then succeeded. The migration itself had already applied. (The temp `next start` used for the live smoke was also stopped afterwards — no servers left running; `pnpm dev` can be restarted normally.)
- **Live smoke** used `next build && next start -p 5111` with a throwaway `OwnerAccount`+`Site` created and deleted via Prisma (the DB has no seed yet) — covered the unknown-slug `404`, the unpublished `200`, the published `200` (blocks in order; slug lower-cased), `405` on `POST`, and that `/stock/<name>.svg` resolves under the Builder origin. The builder Publish-button click-path itself wasn't exercised in a browser (consistent with the plan's stance on UI smoke); recommend a manual `pnpm dev` pass for it.
- No commit (not requested).
