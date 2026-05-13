# Architecture

## Purpose & how to use this doc

You are reviewing **Mizrahitality Simple**, a job-interview deliverable: a tiny monorepo
with two cooperating Next.js apps that together form a drag-and-drop hospitality website
builder + a server-rendered public visitor site. This document gives you the macro picture
in roughly ten minutes — what the system is, how the two apps cooperate, the key request
and data flows, the state model, and the design choices behind the choices. For per-file
detail see [`CLAUDE.md`](./CLAUDE.md); for the REST contract see
[`apps/builder/app/api/README.md`](./apps/builder/app/api/README.md); for product context
see [`PRD.md`](./PRD.md), [`VISION.md`](./VISION.md), and [`ROADMAP.md`](./ROADMAP.md).

## 1. System at a glance

Two Next.js apps run side by side on localhost. They share nothing at runtime except a
small REST/JSON API hosted by the Builder app. The owner uses the Builder; the public
visits the Customer; the Customer never touches the database.

```
  Owner browser  ──►  Builder (:5113, Next.js)  ──►  Prisma / SQLite
                          │                            (apps/builder/prisma/dev.db)
                          │  REST/JSON  (the only channel)
                          ▼
Visitor browser  ──►  Customer (:5114, Next.js SSR)
```

- **SSR is mandatory** for the Customer's published page (REQ-11 / REQ-19) — every
  visitor request hits the Customer server, which fetches the live snapshot from the
  Builder and renders the HTML on the server.
- The **slug is the site identity.** It is derived from the venue name at site creation
  (`/^[A-Za-z ]+$/`, spaces removed, lower-cased), frozen, and used as both the public
  URL path segment (`/<slug>`) and the API key.
- The two apps communicate **only** over the REST API documented at
  `apps/builder/app/api/README.md`. There is no direct DB access from the Customer, no
  shared session, and no other channel.

## 2. The three core flows

Each flow below names the entry-point file, then traces the request 4–6 steps. Open the
files to follow along.

### 2.1 Owner publishes a page

The owner builds a page in the Builder UI and clicks **Publish**. The page becomes live
for visitors on the next request.

1. **UI** — `apps/builder/components/site/site-builder.tsx` (`"use client"`) renders the
   pinned venue-name header, the dnd-kit canvas of blocks, and the **Save** / **Publish**
   buttons.
2. **Action** — Publish calls the `publishSiteAction` Server Action in
   `apps/builder/lib/site/actions.ts`, which re-authenticates via `requireOwner()` and
   delegates to `publishSite`.
3. **Domain logic** — `publishSite` in `apps/builder/lib/site/site.ts` re-checks
   ownership, validates the venue name, parses + validates + sanitizes the blocks
   (`apps/builder/lib/site/sanitize.ts` over `sanitize-html`), then writes:
   `name`, `contentJson`, `isDraft = false`,
   `publishedJson = JSON.stringify({ name, blocks })`, `publishedAt = new Date()`.
4. **Snapshot** — `buildPublishedSnapshot` in `apps/builder/lib/site/published.ts` is the
   pure function that produces the snapshot string the API will later serve.
5. **Result** — the next `GET /api/sites/{slug}` returns the new snapshot. **Save** uses
   the same path with `publish: false` — it writes only the draft (`isDraft: true`,
   `contentJson` only) and never touches `publishedJson` / `publishedAt`. So saving a
   draft does **not** change what visitors see.

### 2.2 Visitor sees a published page

A visitor opens `http://localhost:5114/<slug>`. The Customer renders the page entirely
server-side from the Builder API.

1. **Entry** — `apps/customer/app/[slug]/page.tsx` is a Server Component with
   `dynamic = "force-dynamic"` (SSR per request, never statically prerendered).
2. **Load** — `loadPublishedView(slug)` in `apps/customer/lib/published-view.ts`
   (wrapped in React `cache()` so the page body and `generateMetadata` share one
   round-trip per request) calls the Builder API client.
3. **Fetch** — `apiClient.get<PublishedPage>(publishedPagePath(slug), { cache: "no-store" })`
   hits `GET /api/sites/{slug}` on the Builder. The handler is
   `apps/builder/app/api/sites/[slug]/route.ts`; the decision logic is the pure
   `resolvePublishedResponse` in `apps/builder/lib/site/published.ts`.
4. **Resolve** — `resolvePublishedView` maps the envelope to a four-arm discriminated
   union: `page` (live snapshot), `placeholder` (slug exists, never published →
   `error.code: "unpublished"`), `not-found` (unknown slug → 404), `error` (network /
   unexpected → renders gracefully at HTTP 200, REQ-12).
5. **Render** — the `page` arm renders `<PublishedPage>` (server component in
   `apps/customer/components/published-page.tsx`) — a pinned `<h1>` venue name, then each
   block in order: `rich-text` via `dangerouslySetInnerHTML` on the **builder-sanitized**
   HTML; the optional `image` via `<img src={absoluteImageUrl(...)}>`; the optional
   `book-now` via `<BookNowButton>`. `<VisitorAnalytics>` is mounted in parallel and
   posts a `visit` from the browser.

### 2.3 Analytics round-trip

The Customer emits browser events; the Builder ingests them; the owner dashboard reads
the aggregation back.

1. **Emit (visit)** — `<VisitorAnalytics>` in
   `apps/customer/components/visitor-analytics.tsx` (`"use client"`) calls
   `postEventOnce(builderApiUrl, { slug, type: "visit" })` from
   `apps/customer/lib/analytics-client.ts`. The once-guard is a module-scoped `Set`
   (StrictMode-safe — survives React's dev double-effect because it's not held in a ref).
2. **Emit (Book Now)** — `<BookNowButton>` in
   `apps/customer/components/book-now-button.tsx` posts `book-now-hover` once per page
   load on hover/focus, and `book-now-click` on every click (no dedup). Then it shows an
   inline confirmation toast — the click ends at a confirmation, not a real booking.
3. **Ingest** — the cross-origin `POST /api/events` is handled by
   `apps/builder/app/api/events/route.ts` (CORS-friendly: `Access-Control-Allow-Origin: *`
   + an `OPTIONS` preflight handler). The thin route wraps `recordEvent` in
   `apps/builder/lib/analytics/events.ts`, which validates the body, rejects an unknown
   slug (`404 not_found`, nothing stored), accepts an existing-but-**unpublished** slug,
   and inserts one row. **No server-side dedup** — the Customer's once-guard guarantees
   exactly one `visit` per page load (REQ-15).
4. **Aggregate** — `getAnalyticsSummary(slug)` in the same file is a tiny `findSite` +
   `listEvents` + reduce; the pure `summarizeEvents` in
   `apps/builder/lib/analytics/analytics.ts` reduces `{ type }[]` → `AnalyticsSummary`
   `{ slug, visits, bookNowHovers, bookNowClicks }`.
5. **Read (server)** — the owner dashboard at `apps/builder/app/(owner)/dashboard/page.tsx`
   is a Server Component with `dynamic = "force-dynamic"`: `requireOwner()` →
   `getOwnerSite()` → `getAnalyticsSummary(site.slug)` → `buildDashboardView(...)` →
   renders the metric tiles with the seeded `initialSummary`.
6. **Read (poll)** — `<AnalyticsMetrics>` in
   `apps/builder/components/analytics/analytics-metrics.tsx` (`"use client"`) polls the
   same-origin `GET /api/sites/{slug}/analytics` every 10 seconds (skipped when the tab
   is hidden, interval cleared on unmount, late results ignored), updating the tiles in
   place. No WebSocket / SSE infrastructure (REQ-9).

## 3. Data model

The whole product is three Prisma models in `apps/builder/prisma/schema.prisma`. SQLite
file at `apps/builder/prisma/dev.db`.

| Model | What it is | Key fields | Relationships |
| --- | --- | --- | --- |
| `OwnerAccount` | A venue owner's login | `email @unique`, `passwordHash` (bcrypt) | 1 : 1 → `Site` |
| `Site` | The owner's single page | `ownerId @unique`, `name` (= header text), `slug @unique` (frozen at creation), `contentJson` (the working draft `{ blocks }`), `isDraft`, `publishedJson` (snapshot — `null` = never published), `publishedAt` | belongs to `OwnerAccount` (cascade delete) |
| `AnalyticsEvent` | One row per accepted `POST /api/events` | `slug` (plain string copy — **no FK**), `type` (`"visit" \| "book-now-hover" \| "book-now-click"`, validated in code — SQLite has no enums), `createdAt`; `@@index([slug])` + `@@index([slug, type])` | none |

`AnalyticsEvent.slug` not having a foreign key is deliberate (see §6). `OwnerAccount` 1:1
`Site` is enforced by `Site.ownerId @unique`.

## 4. Draft vs. published state

A site has two simultaneous states stored on the same row.

- `Site.contentJson` — the **working draft**. **Save** writes only this and sets
  `isDraft: true`. The visitor never sees it.
- `Site.publishedJson` + `Site.publishedAt` — the **live snapshot**. **Publish** writes
  these (and `contentJson`, and `isDraft: false`). `GET /api/sites/{slug}` returns this
  snapshot — so editing + saving has **zero effect** on visitors until Publish runs.

The Builder UI's badge derives from this state — "Not published yet" (`publishedJson IS
NULL`), "changes that aren't live yet" (`publishedJson IS NOT NULL` and `isDraft: true`),
"Published — up to date" (`isDraft: false`). The state is seeded server-side via
`getOwnerSite` (which exposes `published`, `hasUnpublishedChanges`, `publishedAt`) and
re-synced on each `revalidatePath("/builder")` after a Save or Publish.

## 5. Authentication model

Two surfaces with very different rules — keep them straight when reviewing.

- **Owner-facing pages and Server Actions** — passwords hashed with **bcrypt** at cost
  12 (`apps/builder/lib/auth/password.ts`); a signed httpOnly cookie named `miz_session`
  carries a stateless token of the form
  `base64url(JSON({ ownerId, iat })) + "." + base64url(HMAC-SHA256(payload, SESSION_SECRET))`
  (`apps/builder/lib/auth/session.ts`, 30-day max-age). `requireOwner()`
  (`apps/builder/lib/auth/current-owner.ts`) gates every owner Server Component and
  Server Action; it `redirect()`s to `/sign-in` if there is no valid session.
  **No NextAuth.** No external auth dependency. The Builder throws at startup if
  `SESSION_SECRET` is unset.
- **Builder ↔ Customer REST API** — **no authentication.** The slug is the identity.
  Open by design (PRD §7 / REQ-18) — a local demo, not a productionised service.
  Authentication / rate-limiting / multi-tenant hardening is an explicit non-goal in
  `ROADMAP.md` §"What We're Not Building".

## 6. Code tour (where things live, in 30 seconds)

Not exhaustive — for the per-file tour see `CLAUDE.md`.

| Path | What's there |
| --- | --- |
| `apps/builder/app/api/` | The three REST endpoints (route handlers) + the API README. |
| `apps/builder/lib/site/` | Site domain logic: validation (`slug.ts`, `content.ts`), sanitization (`sanitize.ts`), persistence (`site.ts` — DB-injectable for tests), publish snapshot (`published.ts`), Server Actions (`actions.ts`). |
| `apps/builder/lib/analytics/` | Analytics domain: pure decision logic (`analytics.ts`), DB-touching helpers (`events.ts` — DB-injectable for tests), the dashboard view-model (`dashboard-view.ts`). |
| `apps/builder/lib/auth/` | bcrypt + signed-cookie auth: `password.ts`, `session.ts`, `cookie.ts`, `accounts.ts`, `current-owner.ts`, `actions.ts`. |
| `apps/builder/components/site/` | The dnd-kit + Tiptap builder UI (`site-builder.tsx`, `block-tray.tsx`, `sortable-block.tsx`, `rich-text-editor.tsx`, `image-block-editor.tsx`, `book-now-block.tsx`, `block-view.tsx`). |
| `apps/builder/prisma/` | `schema.prisma`, `migrations/` (committed), `seed.mjs` (`pnpm seed`), `seed-content.mjs` (pure demo content), `CHANGELOG.md`. |
| `apps/customer/app/[slug]/page.tsx` | The SSR visitor page — branches on the resolved `PublishedView`. |
| `apps/customer/lib/published-view.ts` | Pure resolver (`resolvePublishedView`, `absoluteImageUrl`) + the cached I/O wrapper `loadPublishedView`. |
| `apps/customer/lib/analytics-client.ts` | Browser-side `postEvent` / `postEventOnce` (with a module-scoped once-guard). |
| `apps/customer/components/` | `published-page.tsx` (server-side block renderer), `book-now-button.tsx`, `visitor-analytics.tsx`, `coming-soon.tsx`. |
| `packages/contracts/src/` | The shared API types: `envelope.ts` (`ApiResult<T>`, `apiOk` / `apiErr`), `client.ts` (`createApiClient`), `published-page.ts`, `analytics.ts`. Consumed as **raw TS** (no build step) via `transpilePackages`. |
| `packages/{tsconfig,eslint-config,tailwind-config}/` | Shared TS / ESLint flat / Tailwind v4 `@theme` configs. |
| `plans/` | `00-master-plan.md` + per-feature plans — process artifacts, not orientation. |

## 7. Design decisions

The "why we chose this" answers a reviewer is most likely to ask. Each is short on
purpose — for the long form, the linked code is the source of truth.

### 7.1 Why two cooperating apps (not one)

The PRD calls for an SSR public site that talks to a separate owner-facing builder over
a documented API (PRD §2, REQ-11/17/18). Two apps prove the API-first separation is real
— the Customer has no Prisma client, no schema, no auth — instead of pretending behind
a single Next.js server.

### 7.2 Why Next.js for both

App Router gives Server Components, Server Actions, and Route Handlers in one place. The
Builder needs forms (Server Actions) and an API (Route Handlers); the Customer needs SSR
per request and a tiny `<BookNowButton>` client island. Choosing the same framework for
both means one mental model, one toolchain, one set of conventions.

### 7.3 Why a pnpm workspace (no Turborepo / Nx)

Two apps + a few shared packages do not need a build orchestrator. `pnpm-workspace.yaml`
plus `pnpm -r --if-present run …` covers `dev` / `build` / `lint` / `typecheck` / `test`
across the monorepo. One lockfile, pnpm pinned via `packageManager` and `engines`.
Smaller blast radius, fewer moving parts.

### 7.4 Why Prisma + SQLite (file-based, no `better-sqlite3`)

Zero infrastructure: a file at `apps/builder/prisma/dev.db`, created by
`pnpm db:migrate`. Prisma's bundled SQLite avoids a native module (`better-sqlite3`'s
`node-gyp` toolchain is the most common "doesn't run on a fresh laptop" failure mode).
A reviewer can clone the repo and have a working database in two commands.

### 7.5 Why bcrypt + a signed cookie (no NextAuth)

The requirement set is sign-up + sign-in + session (REQ-1 / REQ-2). A bcrypt password
hash plus a stateless HMAC-SHA256 signed cookie is the smallest thing that satisfies it.
Fewer dependencies, easier to audit, no third-party identity layer to learn or
configure. The cookie helpers are Next-bound; the token format is pure Node `crypto` so
unit tests don't need Next at all.

### 7.6 Why Tiptap with `sanitize-html`, stored as sanitized HTML

Rich Text persists round-trip and renders **server-side** without re-running an editor —
the Customer's `<PublishedPage>` just `dangerouslySetInnerHTML`s the stored string.
Sanitization is the security boundary: the allowlist in
`apps/builder/lib/site/sanitize.ts` strips `<script>`, `on*`, `style`, `javascript:`,
`<iframe>`, `<img>`, and forces `rel="noopener noreferrer"` on links. The same
sanitization runs on Save and on Publish, so the snapshot is always safe by construction.

### 7.7 Why `@dnd-kit` (not hand-rolled drag-and-drop)

REQ-4 requires reorder + drop targets that work on a touch surface and respect keyboard
accessibility. Rolling that yourself is more risk and more code than the rest of the
builder combined. `@dnd-kit/core` + `@dnd-kit/sortable` give correct sensors, keyboard
navigation, and a `SortableContext` that maps cleanly onto our blocks array.

### 7.8 Why shadcn/ui + Tailwind v4 (CSS-first, no `tailwind.config.js`)

REQ-10 / project rules say no bespoke design system — UI must be clean and simple, and
no design files were supplied up front. shadcn provides accessible primitives (Button,
Card, Dialog, Tooltip, Input, Label, Separator) we can copy in. Tailwind v4 with CSS
`@theme` tokens (`packages/tailwind-config/tokens.css`) keeps the palette in one place
without a JS config. The single hand-rolled `.miz-prose` block (~20 lines) styles the
rendered Rich Text on both apps without pulling in `@tailwindcss/typography`.

### 7.9 Why shared types as raw TS (`packages/contracts/`) via `transpilePackages`

Both apps' `next.config.ts` lists `@mizrahitality/contracts` in `transpilePackages`, so
the package is consumed as TypeScript source. **No build step. No publish step.** A
contract change is one edit — both apps see it on the next type-check.

### 7.10 Why the Builder ↔ Customer REST API has no auth

Local demo (PRD §7 / REQ-18). The slug is the identity. Production hardening — API
authentication, rate limiting, multi-tenancy — is an explicit non-goal in
`ROADMAP.md` §"What We're Not Building". Adding auth between the two local processes
would be ceremony that the demo does not benefit from.

### 7.11 Why slug derivation is so strict (`/^[A-Za-z ]+$/`, spaces removed, lower-cased)

The owner types the **venue name**, not a URL. We need a derivation that's deterministic
(same name → same slug, so we can detect collision before insert), URL-safe (no
percent-encoding ambiguity), and matches what a hospitality owner would intuit from the
URL. The slug is frozen at creation so the public URL never changes underneath visitors.

### 7.12 Why no server-side dedup for `visit` events

The Customer guarantees exactly one `visit` per page load via a module-scoped `Set` in
`apps/customer/lib/analytics-client.ts` (StrictMode-safe — a `useRef` would re-fire on
React's dev double-effect). Pushing dedup to the server would need a session id or
request id that the Customer doesn't carry, and would defeat the purpose of "no auth on
the API". Server-side, every accepted POST inserts one row — see
`apps/builder/lib/analytics/analytics.ts`'s `summarizeEvents` (3 visits → 3, asserted in
the unit tests).

### 7.13 Why `AnalyticsEvent.slug` is a plain copy with no FK to `Site`

The slug is the API identity — aggregation needs no join with `Site`. Sites are never
deleted in the demo (cascade-delete the events with the owner is the only path that
would matter, and the owner-account cascade already covers user-facing deletion). A
plain string keeps writes single-row, keeps the schema rectangular, and means an
unpublished slug is still a valid analytics target without a relational dance.

### 7.14 Why image storage is a gitignored `apps/builder/uploads/` directory served by a route handler

No cloud, no infra. `apps/builder/app/uploads/[file]/route.ts` validates the filename,
guards against path traversal, and streams the file with an immutable cache header. The
committed stock SVGs under `apps/builder/public/stock/` ensure the demo seed produces a
working page on a fresh checkout — no upload step required.

### 7.15 Why an `ApiResult<T>` envelope on every response (including 404 / 500)

Clients branch on the envelope's `ok`, not on the HTTP status. That gives a single
uniform error vocabulary (`not_found`, `unpublished`, `invalid_event`, `internal_error`,
plus the client-synthesised `network_error` / `bad_response`) that
`createApiClient` produces in every failure mode, including network failures and
non-JSON responses. The Customer's `resolvePublishedView` is a single `switch` on the
error code — no separate HTTP-status path.

### 7.16 Why `"unpublished"` is a 200 with `ok: false` (not a 404)

The request was understood; the slug exists; there's just no live snapshot yet. A 404
would be a lie about the resource. The Customer's `placeholder` arm keys off the error
code, not the HTTP status — and `POST /api/events` accepts a `visit` for an unpublished
slug for the same reason.

### 7.17 Why the dashboard polls every 10 seconds (not WebSockets / SSE)

REQ-9 says the dashboard updates as new events arrive. A 10-second poll keeps the
implementation trivial (one `useEffect`, one `setInterval`, skip when
`document.hidden`), keeps the demo lively, and avoids a second protocol. WebSockets /
SSE would buy little for a single owner watching a single dashboard.

## 8. Testing strategy

Vitest, moderate rigor, per the ROADMAP workflow.

- **Core logic** (auth, analytics aggregation, REST contract, publish/save snapshot
  rules) is well-tested via DB-free unit tests over **injectable dependencies** —
  `accounts.ts` / `site.ts` / `events.ts` accept a `Deps` argument; the real Prisma
  client is `import()`-ed lazily so a test that injects a fake never loads
  `@prisma/client`.
- **Pure modules** (`session.ts`, `slug.ts`, `content.ts`, `sanitize.ts`,
  `published.ts`, `analytics.ts`, `dashboard-view.ts`, `published-view.ts`,
  `analytics-client.ts`) are tested directly.
- **UI is lighter** — the Customer renders an SSR smoke test of `<PublishedPage>`; the
  Builder's dnd-kit / Tiptap surfaces are not unit-tested.
- **Route handlers** are thin wrappers over the unit-tested decision logic and are
  covered by `pnpm build` + manual `curl` against the seeded demo.
- Test files live under each workspace's `__tests__/` tree (Builder, Customer,
  contracts).

Run `pnpm test` for everything; `pnpm -F <name> exec vitest run <path>` for a single
file.

## 9. What's NOT here / non-goals

The deferred-scope list lives in `ROADMAP.md` §"What We're Not Building". Highlights:
no real custom domains / DNS / hosting, no real booking or payments behind Book Now, no
multi-site / multi-page owners, no teams, no email verification or password reset, no AI
features, no API authentication. Reach for the ROADMAP before asking "where's the X
flow?".

## 10. Where to read what

| If you want… | Read |
| --- | --- |
| Why this product exists, who it's for | `VISION.md`, `PRD.md` §1–§4 |
| The exact requirement set (REQ-1 … REQ-19) | `PRD.md` §5 |
| What's deferred and why | `ROADMAP.md` §"What We're Not Building" |
| The REST contract (every endpoint, every envelope) | `apps/builder/app/api/README.md` |
| The full per-file tour | `CLAUDE.md` |
| Per-feature implementation history | `plans/00-master-plan.md` + `plans/NN-*-plan.md` |
| Schema history | `apps/builder/prisma/CHANGELOG.md` |
| How to run it | `README.md` |
