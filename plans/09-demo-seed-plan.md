# Feature 9 — demo-seed — Plan

**Status:** done
**Build-order index:** 09 → durable copy lands at `plans/09-demo-seed-plan.md`
**Depends on:** 1 (monorepo-foundation), 3 (site-builder), 5 (published-page-api), 6 (analytics-api) — all `done`
**Satisfies:** REQ-17 (the `seed` per-app script does real work) + the milestone North Star clause "the demo-seed populates a ready-to-show published site"
**Skills:** `update-database` — **not needed** (data-only; no schema change; a "no migration" note is added to `prisma/CHANGELOG.md` for the record)

---

## Context

`pnpm seed` is currently a no-op stub (`apps/builder/prisma/seed.mjs` just `console.log`s). The milestone success criteria (ROADMAP / PRD North Star, master-plan §5) require that after `pnpm install && pnpm db:migrate && pnpm seed` the whole flow is demoable immediately — i.e. a published site exists, the public SSR customer page renders it, and the owner dashboard shows non-zero analytics. This feature replaces the stub with a real, re-runnable seed that creates a demo owner account, a single published `Site` (header + two Rich Text blocks + one stock Image + a Book Now button), and a handful of sample analytics events. No app behavior changes — seed is data only.

## Charter (from `plans/00-master-plan.md` §3.9)

Make `pnpm seed` populate a ready-to-show, **published** demo site so the whole flow is demoable immediately after `pnpm install && pnpm db:migrate && pnpm seed`. Deliver a seed script (replacing the no-op stub) that creates a demo `OwnerAccount` (known email/password), a `Site` with a sensible venue name → slug, a representative page (venue-name header + a couple of Rich Text blocks + one Image from the stock set + a Book Now button), a **published** snapshot of all that, and a handful of sample analytics events so the dashboard isn't empty; idempotent or safely re-runnable (clear + reseed). Document the demo credentials and slug. Tests: a smoke test that the seed produces a published, fetchable site. **Out of scope:** anything that changes app behavior.

## Resolved decisions (confirmed with the user)

- **Seed implementation & test:** keep `prisma/seed.mjs` as plain `node`-runnable ESM (no new deps); move the *pure demo content* into `prisma/seed-content.mjs` (single source of truth); add a **DB-independent** vitest `.mjs` test that validates that content against the real `lib/` validators. (Rejected: `tsx`-based TS seed; a DB-dependent test.)
- **Demo identity:** venue **"Hotel Mizrahi"** → slug **`hotelmizrahi`** → public URL **http://localhost:5114/hotelmizrahi**. Owner **`demo@mizrahitality.test`** / **`demo1234`** (the default carried by all the offered options; the user overrode only the venue name — flagged here for visibility, change on request).
- **Re-runnability:** **scoped reset** — delete only the demo owner / site / events (keyed by the demo email + slug), then recreate; any other dev data is left intact. (`deleteMany` never throws on no-match.)

## In scope

- A working `pnpm seed` (`node prisma/seed.mjs`) that wipes the demo rows and recreates: `OwnerAccount` (bcrypt-hashed password) → published `Site` → sample `AnalyticsEvent` rows.
- The pure demo content (venue name, blocks, derived `contentJson` / `publishedJson` strings, sample events) factored into `prisma/seed-content.mjs`.
- A DB-free vitest test asserting the demo content is well-formed (validates against `lib/site/*` + `@mizrahitality/contracts`).
- Doc updates: `prisma/CHANGELOG.md` no-migration note; root `CLAUDE.md` "Build / run / test" (demo creds + slug + URL) and the `apps/builder/prisma/` "Layout" line; on completion, `plans/00-master-plan.md` §2 status row and `ROADMAP.md`.

## Out of scope

- Any schema/migration change (none needed — `Site` / `AnalyticsEvent` / `OwnerAccount` already suffice).
- Any change to app code, routes, components, or the REST API.
- A DB-dependent test; uploading a real image (the demo Image uses a committed stock SVG).
- Changing the `seed` scripts in `package.json` (root `seed` → `pnpm -F builder seed` → `node prisma/seed.mjs` already chains correctly).

## Approach

**`prisma/seed.mjs` runs as a plain `node` script.** `@prisma/client` auto-loads `apps/builder/.env` (the generated client carries `schemaEnvPath`; verified — `new PrismaClient()` connects with `DATABASE_URL` unset in `process.env`), so no `dotenv` wiring is needed; first-time setup (`cp apps/builder/.env.example apps/builder/.env`, then `pnpm db:migrate`) is the documented prerequisite.

**Single source of truth for the demo content:** `prisma/seed-content.mjs` — pure ESM, **no imports** except (optionally) none at all — exports plain data:

- `DEMO_EMAIL = "demo@mizrahitality.test"`, `DEMO_PASSWORD = "demo1234"`
- `DEMO_VENUE_NAME = "Hotel Mizrahi"`, `DEMO_SLUG = DEMO_VENUE_NAME.replace(/\s+/g, "").toLowerCase()` (= `"hotelmizrahi"`) — mirrors `slugifyVenueName` in `lib/site/slug.ts`
- `DEMO_BLOCKS` — ordered array of 4 blocks with stable string `id`s, each shape matching `lib/site/types.ts`:
  1. `{ id: "intro", type: "rich-text", html: "<h2>Welcome to Hotel Mizrahi</h2><p>…</p><ul><li>…</li>…</ul>" }`
  2. `{ id: "photo", type: "image", imageUrl: "/stock/hotel.svg", alt: "The Hotel Mizrahi lobby" }` (uses the committed `apps/builder/public/stock/hotel.svg`)
  3. `{ id: "stay", type: "rich-text", html: "<h3>Plan your stay</h3><p>… <a href=\"https://example.com\" rel=\"noopener noreferrer\" target=\"_blank\">directions</a>.</p>" }`
  4. `{ id: "book", type: "book-now" }`
  HTML is hand-authored, already safe **and identical to what `sanitizeRichTextHtml` would emit** (no `<script>`, `style=`, `on*`, `<img>`, `<iframe>`; `<a>` carries `rel="noopener noreferrer" target="_blank"`) — the test asserts `sanitizeRichTextHtml(html) === html`.
- `DEMO_CONTENT_JSON = JSON.stringify({ blocks: DEMO_BLOCKS })` — what goes in `Site.contentJson`
- `DEMO_PUBLISHED_JSON = JSON.stringify({ name: DEMO_VENUE_NAME, blocks: DEMO_BLOCKS })` — what goes in `Site.publishedJson` (mirrors `buildPublishedSnapshot` in `lib/site/published.ts`)
- `demoEvents(now = new Date())` — pure function → array of `{ slug: DEMO_SLUG, type, createdAt: Date }`: ~16 `visit`, ~5 `book-now-hover`, ~2 `book-now-click`, `createdAt` spread over the last ~7 days so the dashboard shows a non-trivial funnel. `type` values are the literals from `ANALYTICS_EVENT_TYPES` (`"visit" | "book-now-hover" | "book-now-click"`).

**`prisma/seed.mjs`:**
1. `import { PrismaClient } from "@prisma/client"`, `import bcrypt from "bcryptjs"`, `import * as content from "./seed-content.mjs"`.
2. `const prisma = new PrismaClient();`
3. **Scoped reset** (order respects the lack of an FK on `AnalyticsEvent.slug` and the `OwnerAccount→Site` cascade): `prisma.analyticsEvent.deleteMany({ where: { slug: DEMO_SLUG } })` → `prisma.site.deleteMany({ where: { slug: DEMO_SLUG } })` → `prisma.ownerAccount.deleteMany({ where: { email: DEMO_EMAIL } })`.
4. **Create owner:** `passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)` (`// keep cost in sync with SALT_ROUNDS in lib/auth/password.ts`) → `prisma.ownerAccount.create({ data: { email: DEMO_EMAIL, passwordHash } })`.
5. **Create published site:** `prisma.site.create({ data: { ownerId: owner.id, name: DEMO_VENUE_NAME, slug: DEMO_SLUG, contentJson: DEMO_CONTENT_JSON, isDraft: false, publishedJson: DEMO_PUBLISHED_JSON, publishedAt: new Date() } })`.
6. **Create events:** `prisma.analyticsEvent.createMany({ data: demoEvents() })`.
7. Print a summary: the credentials, the builder URL (`http://localhost:5113`), the dashboard, the builder page, and the public site URL (`http://localhost:5114/hotelmizrahi`), plus the event count.
8. Wrap in `try { … } catch (e) { console.error(e); process.exitCode = 1; } finally { await prisma.$disconnect(); }` so a failure exits non-zero and the connection always closes.

Match the existing `seed.mjs` / `lib/db.ts` style (no semicolons-vs-not surprises; the repo uses Prettier defaults — semicolons on). Keep it short.

**Test discovery:** add `"**/*.test.mjs"` to `test.include` in `apps/builder/vitest.config.ts` (currently only `**/*.test.ts`) so the new `.mjs` test runs. `tsc --noEmit` ignores `.mjs` (tsconfig `include` is `**/*.ts`/`**/*.tsx` only), so the new files aren't type-checked — same as today's `prisma/seed.mjs` and `scripts/*.mjs`.

## Tasks

1. **`apps/builder/prisma/seed-content.mjs`** (new) — pure demo content as described above (`DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_VENUE_NAME`, `DEMO_SLUG`, `DEMO_BLOCKS`, `DEMO_CONTENT_JSON`, `DEMO_PUBLISHED_JSON`, `demoEvents`). No imports.
2. **`apps/builder/prisma/seed.mjs`** (replace stub) — Prisma + bcrypt + `./seed-content.mjs`; scoped reset → create owner → create published site → `createMany` events → print summary; `try/catch/finally` with non-zero exit on error.
3. **`apps/builder/vitest.config.ts`** — add `"**/*.test.mjs"` to `test.include`.
4. **`apps/builder/__tests__/seed/seed-content.test.mjs`** (new) — DB-independent; imports `prisma/seed-content.mjs` and `@/lib/site/slug`, `@/lib/site/content`, `@/lib/site/published`, `@/lib/site/sanitize`, `@/lib/auth/validation`, `@mizrahitality/contracts`. Asserts:
   - `validateVenueName(DEMO_VENUE_NAME)` → `{ ok: true, value: DEMO_VENUE_NAME, slug: DEMO_SLUG }`.
   - `parsePageContent(DEMO_CONTENT_JSON).blocks` deep-equals `DEMO_BLOCKS` (ids/shape/order survive the tolerant reader unchanged).
   - `validateBlocks(DEMO_BLOCKS).ok === true` (≤1 image, ≤1 book-now; exactly one image + one book-now present).
   - `toPublishedPage(DEMO_SLUG, DEMO_PUBLISHED_JSON)` deep-equals `{ slug: DEMO_SLUG, name: DEMO_VENUE_NAME, blocks: DEMO_BLOCKS }`.
   - every `rich-text` block: `sanitizeRichTextHtml(html) === html` (content is already clean).
   - `validatePassword(DEMO_PASSWORD).ok === true`.
   - `demoEvents(new Date("2026-01-01T12:00:00Z"))` — non-empty, every entry `slug === DEMO_SLUG`, `ANALYTICS_EVENT_TYPES.includes(type)`, `createdAt instanceof Date`; at least one of each event type.
5. **`apps/builder/prisma/CHANGELOG.md`** — prepend a `[2026-05-12] No migration — feature 9 (demo-seed)` entry: data-only seed; no schema change; lists what `pnpm seed` now creates.
6. **`CLAUDE.md`** (root) — "Build / run / test": `pnpm seed` now populates the demo site (creds `demo@mizrahitality.test` / `demo1234`, slug `hotelmizrahi`, public URL `http://localhost:5114/hotelmizrahi`); re-runnable (scoped reset). "Layout" — update the `apps/builder/prisma/` sentence: `seed.mjs` is now the real demo seed + add `seed-content.mjs`; note `__tests__/seed/seed-content.test.mjs`; note `vitest.config.ts` now also includes `**/*.test.mjs`.
7. **On completion only:** copy this approved plan verbatim to `plans/09-demo-seed-plan.md` (status `in-progress` at execution start → `done` when finished); set `plans/00-master-plan.md` §2 row for feature 9 to `done ([plan](09-demo-seed-plan.md))`; update `ROADMAP.md` (`demo-seed` → done/complete).

## Data model

**None.** No Prisma schema change — `OwnerAccount`, `Site` (incl. `publishedJson` / `publishedAt` / `isDraft`), and `AnalyticsEvent` already cover everything. The `update-database` skill is therefore not invoked; a "no migration" note is added to `apps/builder/prisma/CHANGELOG.md` for the record (mirroring the feature-4 entry).

## API surface

**None.** No new or changed endpoints/contracts. The seed's output is consumed through the existing `GET /api/sites/{slug}` (published page), `GET /api/sites/{slug}/analytics` (dashboard), and the customer SSR route — all unchanged.

## Files & directories

- **New:** `apps/builder/prisma/seed-content.mjs`, `apps/builder/__tests__/seed/seed-content.test.mjs`
- **Edited:** `apps/builder/prisma/seed.mjs` (replace the stub), `apps/builder/vitest.config.ts` (+`**/*.test.mjs`), `apps/builder/prisma/CHANGELOG.md` (no-migration note), `CLAUDE.md` (Build/run/test + Layout)
- **Edited on completion:** `plans/00-master-plan.md` (status), `ROADMAP.md` (status); **new:** `plans/09-demo-seed-plan.md` (verbatim copy of this file)
- **Unchanged (confirmed):** `apps/builder/package.json` (`seed` → `node prisma/seed.mjs` already), root `package.json` (`seed` → `pnpm -F builder seed` already), all of `apps/customer/`, `packages/*`

## Tests

- **`apps/builder/__tests__/seed/seed-content.test.mjs`** — Vitest, node env, **DB-independent** (no `@prisma/client` import). This is the feature's "seed smoke test", kept DB-free per the master-plan §4 cross-cutting rule by testing the pure demo *content* against the production validators rather than the DB writes.
- The seed *script*'s DB writes are verified by the manual end-to-end walkthrough below (consistent with how route handlers and Prisma helpers' DB paths are covered elsewhere in the repo) — no DB-dependent automated test.
- Rigor: light — appropriate for a data-only seed; the validators it leans on (`parsePageContent`, `validateBlocks`, `toPublishedPage`, `sanitizeRichTextHtml`, `validateVenueName`, `validatePassword`) are already well-tested.

## Acceptance / verification

**Owns:** REQ-17's "per-app scripts exist (… seed)" — the `seed` script now does real work — and the milestone clause "the demo-seed populates a ready-to-show published site" (ROADMAP / PRD North Star, master-plan §5).

**End-to-end check (run after the change):**
1. `pnpm db:migrate` (idempotent) → `pnpm seed` → prints the demo creds + URLs + event count, exits 0. Run `pnpm seed` again → still succeeds (scoped reset).
2. `pnpm dev`, open `http://localhost:5114/hotelmizrahi` → published page renders: header "Hotel Mizrahi", two Rich Text sections, the hotel stock image, a Book Now button. View-source / JS-disabled shows the page content (SSR). Click Book Now → confirmation toast.
3. `curl http://localhost:5113/api/sites/hotelmizrahi` → `{"ok":true,"data":{"slug":"hotelmizrahi","name":"Hotel Mizrahi","blocks":[…4 blocks…]}}`.
4. `http://localhost:5113/sign-in` with `demo@mizrahitality.test` / `demo1234` → `/dashboard` shows non-zero Visits / Book Now hovers / Book Now clicks (the seeded sample events; the link reads "Published — up to date") + the `http://localhost:5114/hotelmizrahi` link.
5. `http://localhost:5113/builder` → the builder loads the demo page (frozen-slug banner for `hotelmizrahi`, the 4 blocks on the canvas).
6. `pnpm -F builder test` → the new `seed-content` test is discovered (`.test.mjs`) and passes. `pnpm build && pnpm typecheck && pnpm test && pnpm lint` green across the workspace.

## Risks & open questions

- **`.mjs` test discovery** — relies on adding `**/*.test.mjs` to `vitest.config.ts` `include`; confirm `pnpm -F builder test` runs it. (Low risk.)
- **bcrypt cost drift** — the seed inlines `12` to match `SALT_ROUNDS` in `lib/auth/password.ts`; a comment flags this. (Even on drift, sign-in still works — `bcrypt.compare` reads the cost from the stored hash — so it's cosmetic.)
- **`DATABASE_URL` for `node prisma/seed.mjs`** — resolved: `@prisma/client` auto-loads `apps/builder/.env`; first-time setup (`cp .env.example .env` + `pnpm db:migrate`) is the documented prerequisite. (Verified manually.)
- **Demo credentials default** — the user chose the venue ("Hotel Mizrahi") but not the email/password; using the default that all offered options carried (`demo@mizrahitality.test` / `demo1234`). Change on request.
- **Open:** none blocking — all decisions above confirmed; the credentials default is the only item to veto at plan review.
