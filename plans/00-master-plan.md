# Master Plan — Mizrahitality Simple

**Status:** active
**Last updated:** 2026-05-12
**Owner:** shultz.devops@gmail.com

> This file is the **plan-of-plans** and the only file in `plans/` until features start.
> It does not contain implementation steps itself. It (1) defines how feature plan files
> work, (2) fixes the build order and the dependencies between features, and (3) states
> what each feature plan file is responsible for. When a feature's phase begins, its plan
> file — `plans/NN-<feature-name>-plan.md`, numbered in build order — is **generated from
> this master plan** (in Plan mode) and holds that feature's detailed development actions.
> Feature plan files are created **just in time**, one at a time — not up front.

Authoritative product context: `PRD.md`, `VISION.md`, `ROADMAP.md`, `CLAUDE.md` (repo
root). If anything here conflicts with those, those win — fix this file.

---

## 1. How the plan files work

`plans/` starts with just this file. Feature plan files are added one at a time, in build
order, as each phase begins:

```
plans/
├── 00-master-plan.md              <- this file: order, dependencies, responsibilities
├── 01-monorepo-foundation-plan.md <- done
├── 02-owner-auth-plan.md          <- created when feature 2 starts
├── 03-site-builder-plan.md            …and so on, in order:
├── 04-ai-copy-and-variants-plan.md
├── 05-published-page-api-plan.md
├── 06-analytics-api-plan.md
├── 07-analytics-dashboard-plan.md
├── 08-customer-site-plan.md
└── 09-demo-seed-plan.md
```

- **One feature plan file per roadmap feature, created just in time.** Name:
  `plans/NN-<feature-name>-plan.md`, where `NN` is the two-digit build-order index (from
  the table in §2) and `<feature-name>` matches the ROADMAP feature row exactly. The
  numeric prefix makes the directory listing read in build order. Do **not** pre-create
  them — generate each one from this master plan when its phase begins.
- **Master plan = index + contract.** It owns the build order, the dependency graph,
  and the one-paragraph "what this feature is responsible for" charter for each feature.
  Changing scope or order happens **here first**.
- **Feature plan = the working document.** Each feature is designed in Claude Code **Plan
  mode**, starting from this master plan's charter for that feature (§3) and filling in the
  detailed sections (approach, task breakdown, data-model changes, API surface, file list,
  tests, acceptance mapping, risks, open questions resolved). When the plan is approved, the
  Plan-mode plan file is **copied verbatim into `plans/` as `plans/NN-<feature-name>-plan.md`**
  with its status set to `in-progress` — that copy is the durable artifact and the checklist
  during execution. On completion the file's status is set to `done` and this master plan's
  status table (§2) is ticked. (Open design decisions are run by the user during Plan mode,
  before approval.)
- **Lifecycle / status field** at the top of each feature plan:
  `not-started → planning → in-progress → in-review → done`.
  Keep it current; the master plan's status table mirrors it.
- **Skills are mandatory where they apply:** every Prisma/schema change goes through the
  `update-database` skill; all Anthropic Claude work goes through the `claude-api` skill.
  A feature plan that touches those areas must say so explicitly.
- **No commits unless the user asks** (per ROADMAP workflow). Plan files are updated in
  place as work progresses.

### Feature plan file — required sections

Every `plans/NN-<feature-name>-plan.md` must contain, at minimum:

1. **Header** — feature name, status, dependencies (features it needs done first),
   the REQ-# items it satisfies, which skills it uses.
2. **Charter** — the responsibility paragraph (copied from this master plan; expand, don't contradict).
3. **In scope / Out of scope** — what this feature delivers and what is explicitly left
   to a later feature.
4. **Approach** — the chosen design, in prose; key decisions and why.
5. **Tasks** — ordered, checkable task list (the development actions).
6. **Data model** — Prisma models/fields added or changed (or "none"); note the `update-database` run.
7. **API surface** — endpoints/contracts added or changed (or "none"); request/response shapes.
8. **Files & directories** — the main paths created/edited.
9. **Tests** — what gets tested and at what rigor (Vitest); which tests must be DB-independent smoke tests.
10. **Acceptance** — each REQ-# acceptance criterion this feature owns, with how it's verified/demoed.
11. **Risks & open questions** — and their resolutions as they're decided.

---

## 2. Build order & dependency graph

Build one feature at a time, in this order. Each feature assumes all earlier ones are `done`.

```
1. monorepo-foundation
        │
        ├──────────────► 2. owner-auth
        │                       │
        │                       ▼
        ├──────────────► 3. site-builder
        │                       │
        │                       ▼
        │                4. ai-copy-and-variants
        │                       │
        │                       ▼
        ├──────────────► 5. published-page-api ─────┐
        │                                           │
        ├──────────────► 6. analytics-api ──────────┤
        │                       │                   │
        │                       ▼                   │
        │                7. analytics-dashboard     │
        │                                           ▼
        └───────────────────────────────────► 8. customer-site
                                                    │
                                                    ▼
                                              9. demo-seed
```

| # | Feature | Status | Depends on | Satisfies (REQ-#) | Skills |
|---|---|---|---|---|---|
| 1 | monorepo-foundation | done ([plan](01-monorepo-foundation-plan.md)) | — | 17, 18 (contract types only), 19 (framework choice), 20 (SDK wiring only) | `update-database` |
| 2 | owner-auth | done ([plan](02-owner-auth-plan.md)) | 1 | 1, 2 | `update-database` |
| 3 | site-builder | not-started | 1, 2 | 3, 4, 5, 10 (builder pages) | `update-database` |
| 4 | ai-copy-and-variants | not-started | 1, 3 | 6, 7, 20 | `claude-api`, `update-database` |
| 5 | published-page-api | not-started | 1, 3, 4 | 8, 12 (server side), 16 (API side), 18 | `update-database` |
| 6 | analytics-api | not-started | 1, 3 | 15, 18 (events side) | `update-database` |
| 7 | analytics-dashboard | not-started | 1, 2, 6 | 9, 10 (dashboard page) | — |
| 8 | customer-site | not-started | 1, 5, 6 | 11, 12, 13, 14, 16, 19 | — |
| 9 | demo-seed | not-started | 3, 4, 5 (and 6 for sample events) | 17 (seed script) | `update-database` (only if it needs schema help) |

Notes on ordering:
- **monorepo-foundation is the hard prerequisite for everything** — it creates the
  workspace, both Next.js apps, the `@mizrahitality/contracts` package (with the
  visitor-type and analytics-event vocabularies + `ApiSuccess<T>`/`ApiError` envelope),
  the shared configs, Prisma+SQLite, env files, root/per-app scripts, and shadcn/ui +
  Tailwind v4 setup.
- **ai-copy-and-variants before published-page-api** — the published snapshot includes
  the 7 variants, so variant generation and the styling-preset enum must exist first.
- **analytics-api can be built in parallel with published-page-api** but is listed after
  it to keep the stream linear; it only needs the monorepo + the `Site`/slug from
  site-builder.
- **customer-site is the integration feature** — it consumes `published-page-api` and
  `analytics-api` and exercises SSR, the demo switcher, Book Now, and the placeholder.
- **demo-seed is last** — it stitches together a complete published site (account → site
  → blocks → generated variants → published snapshot, plus a few sample analytics events).

---

## 3. Feature charters (what each feature plan is responsible for)

Each charter below is the seed of that feature's `plans/NN-<feature-name>-plan.md`, which
is created from it when the feature's phase begins. The feature plan expands the charter
into the full required-sections document; it must not contradict the charter without
updating this file first.

### 1 — monorepo-foundation
**Charter.** Stand up the pnpm-workspace monorepo and everything both apps build on, with
no product features yet. Deliver: `pnpm-workspace.yaml` globbing `apps/*` + `packages/*`;
`apps/builder/` (Next.js App Router, port 5111 via `scripts/dev.mjs`/`start.mjs` reading
`BUILDER_PORT`) and `apps/customer/` (Next.js App Router, SSR, port 5112 via
`CUSTOMER_PORT`); `packages/contracts/` (`@mizrahitality/contracts` — raw-TS, no build:
visitor-type vocabulary `{gender: male|female} × {age: 18-30|31-50|50+}` + the neutral
case, analytics-event vocabulary `visit | book-now-hover | book-now-click`,
`ApiSuccess<T>`/`ApiError` envelope, and a thin `createApiClient({ baseUrl })` fetch
wrapper) listed in both apps' `transpilePackages`; `packages/tsconfig`, `packages/eslint-config`
(flat config, `@typescript-eslint/no-explicit-any: error`), `packages/tailwind-config`
(Tailwind v4 `@theme` tokens — shadcn palette + `--radius`); Prisma + SQLite in
`apps/builder` (`schema.prisma` with a starter `OwnerAccount` model placeholder *or* an
empty schema ready for owner-auth — decide in the plan; `DATABASE_URL=file:./prisma/dev.db`);
shadcn/ui initialized in both apps (components dir, `cn` util, lucide-react); `uploads/`
(gitignored, `.gitkeep`) and `public/stock/` (with at least a couple of committed sample
images) under `apps/builder`; `.env.example` per app (committed) + gitignored real envs;
root scripts `dev` (both apps via `concurrently`), `build`, `lint`, `typecheck`, `test`
(Vitest per workspace), `format`, `db:migrate` (`prisma migrate deploy` in builder,
idempotent), `seed` (no-op stub); per-app Vitest config with at least one DB-independent
smoke test each; CI-less but `pnpm install && pnpm build && pnpm typecheck && pnpm test`
green. Update `CLAUDE.md`'s "Layout" and "Build / run / test" sections to match what was
actually created. **Out of scope:** any auth, any builder UI, any API endpoints, any AI.

### 2 — owner-auth
**Charter.** Email+password owner accounts and sessions in the Builder app. Deliver: the
`OwnerAccount` Prisma model (email unique, bcrypt password hash, timestamps) via the
`update-database` skill; sign-up (validate email format + uniqueness, hash with bcrypt,
create account, start session, land on the dashboard/builder), sign-in (verify credentials,
start session), sign-out (clear session); a signed **httpOnly** session cookie (no
NextAuth or other framework — sign/verify with a server secret from env); a way to gate
the owner-facing pages (redirect to sign-in when unauthenticated) and to read the current
owner in server components / route handlers; clean shadcn/ui sign-up and sign-in pages
with clear validation errors. Tests: password hashing + verification, session
sign/verify, the sign-up/sign-in/sign-out flows, rejection of duplicate/invalid email and
wrong password. **Out of scope:** email verification, password reset, site creation
(that's site-builder), any REST API auth (the Builder↔Customer API stays unauthenticated).

### 3 — site-builder
**Charter.** Site creation and the single-page drag-and-drop builder. Deliver: the `Site`
data model (one per owner; venue name; derived slug; ordered list of blocks; an Image
slot; a Book Now flag; a place to hang the variants set added by feature 4; draft state;
created/updated timestamps) via `update-database` — model blocks/variants in whatever
shape is simplest (e.g. a JSON column or child tables, decide in the plan). Site creation:
the owner enters a **venue name** (English letters + spaces only — reject digits/specials
with a clear message), the slug is derived by removing spaces and lowercasing, slug
collisions are rejected ("that venue name is taken — pick another"), and the slug is shown
to the owner. The builder page: a pinned **venue-name header** (always present, edited in
place); a "Drag into site" tray with three block types — **Rich Text** (Tiptap: bold,
italic, headings, bullet + numbered lists, links; stored as sanitized HTML), repeatable;
**Image**, at most one; **Book Now button**, at most one; drag from tray onto the page,
drag to reorder, delete a block — all via `@dnd-kit/core` + `@dnd-kit/sortable` (not
hand-rolled); when Image or Book Now is already placed its tray item is greyed out and the
greyed Book Now item shows "Only one is allowed." on hover; **live preview** that reflects
edits without manual refresh and matches the published layout; image handling — upload a
file (stored under `apps/builder/uploads/`, served by a Builder route handler at
`GET /uploads/<file>`) or pick from the small committed stock set in `public/stock/`;
block order and content persisted. Tests: slug derivation + name validation + collision,
HTML sanitization round-trip, the at-most-one constraint, persistence of block order.
**Out of scope:** AI touch-up and variant generation (feature 4), the Publish action and
the published-page API (feature 5), analytics.

### 4 — ai-copy-and-variants
**Charter.** The two AI features, on Anthropic Claude (Sonnet 4.6) with prompt caching
(via the `claude-api` skill). Deliver: per-Rich-Text-block **"touch-up"** — a magic-wand
button that sends the block's text to Claude and replaces it with an improved version, with
the owner able to keep or revert (the kept text is what variant generation later rewrites);
**variant generation** — one owner action produces the **7 variants**: 6 audience variants
(gender ∈ {male, female} × age ∈ {18-30, 31-50, 50+}) each = the AI-rewritten copy of
every Rich Text block on the page plus a **styling preset the AI picks from a fixed
enumerated list** (define that list here — a handful of named presets, e.g. tone/color/
spacing flavors; put the enum in `@mizrahitality/contracts` so the customer site and API
share it), plus 1 **neutral** variant = the owner's own touched-up copy with the default
preset; regenerating replaces the whole set; the variants are stored on the `Site` (the
shape the published-page API will serve). Prompt caching configured for the static/shared
prompt portions; AI failures handled without corrupting saved content. Tests: variant-set
shape (7 entries, correct visitor-type tagging, neutral is segment-agnostic), preset is
always one of the fixed list, regeneration overwrites, graceful failure handling (mock the
Claude client). **Out of scope:** publishing the variants (feature 5), rendering them
(feature 8), AI-synthesized layouts (the AI only authors copy + picks a preset).

### 5 — published-page-api
**Charter.** Publishing and the REST endpoint the Customer app reads. Deliver: an explicit
**Publish** button in the builder that snapshots the current built state (venue name,
ordered blocks, image, Book Now presence, the 7 variants) into a **published** record —
edits after publishing stay a draft until re-published; before first publish the site is
"unpublished". The REST endpoint: `GET` the published page for a given **slug + visitor
type** (gender+age or neutral), returning the structured JSON the Customer app renders
(venue name → ordered blocks with type/content/image URL/Book Now presence + the selected
variant's copy + styling preset), wrapped in the `ApiSuccess<T>`/`ApiError` envelope from
`@mizrahitality/contracts`; well-defined responses for an **unknown slug** and for an
**existing-but-unpublished slug** (so the customer site can show the placeholder); no
authentication on this endpoint. Document the endpoint path, request params, response
shape, and the visitor-type vocabulary (extend `@mizrahitality/contracts` and/or a short
API doc). Tests: the publish snapshot is independent of subsequent draft edits, the
endpoint returns the right variant per visitor type and the default/neutral when none is
given, unknown vs. unpublished slug responses, envelope shape. **Out of scope:** analytics
endpoints (feature 6), the customer-side rendering and switcher (feature 8).

### 6 — analytics-api
**Charter.** Analytics ingestion, storage, and aggregation in the Builder app. Deliver: an
`AnalyticsEvent` Prisma model (site/slug, event type ∈ {`visit`, `book-now-hover`,
`book-now-click`}, visitor gender + age group — nullable for neutral/unset, timestamp) via
`update-database`; a REST endpoint to **ingest** an event (slug + event type + visitor
type, validated against the vocabularies in `@mizrahitality/contracts`, no auth); an
**aggregation** query/endpoint for a slug giving total visits, Book Now click count, Book
Now hover count, visitor gender breakdown, and visitor age-group breakdown — with the
breakdowns consistent with the totals. Both wrapped in the standard envelope; documented
alongside the published-page API. Tests (this is core logic — test it well): aggregation
math (totals vs. breakdowns), event validation/rejection, idempotency expectations for the
`visit` event are documented/tested as decided in the plan. **Out of scope:** the dashboard
UI (feature 7), emitting events (that's the customer site, feature 8).

### 7 — analytics-dashboard
**Charter.** The owner's analytics dashboard page in the Builder app. Deliver: an
authenticated dashboard (gated by owner-auth) for the owner's site showing total visits,
Book Now click count, Book Now hover count, the visitor gender breakdown, and the visitor
age-group breakdown — sourced from the analytics-api aggregation — with the breakdowns
visibly consistent with totals and the view reflecting events as they arrive (server
component re-fetch / refresh is fine; no realtime needed). Clean shadcn/ui layout, no
raw/unstyled screens. Tests: light — the aggregation math is already covered in
analytics-api; here, mostly a smoke test that the page renders with mocked aggregates.
**Out of scope:** analytics ingestion/aggregation logic (feature 6), any new metrics
beyond the listed five.

### 8 — customer-site
**Charter.** The public, server-side-rendered visitor site (`apps/customer`). Deliver:
`app/[slug]/page.tsx` as a Server Component that, **on each request**, calls the Builder
REST API (via `createApiClient` with `BUILDER_API_URL`, default `http://localhost:5111`)
for the published page matching the current visitor type and renders the returned JSON
**entirely server-side** — venue name, ordered blocks (Rich Text sanitized HTML, the one
Image by URL, the Book Now button if present), with the selected variant's copy and its
styling preset applied; **routing by the slug path segment** at `localhost:5112/<slug>`;
an **unknown slug** handled gracefully and an **existing-but-unpublished slug** showing a
friendly "coming soon" placeholder; an unobtrusive, always-reachable **visitor-type demo
switcher** (gender + age group) — initial load shows the **neutral** variant, selecting a
type re-renders server-side with that variant, and the choice persists within the session;
the **Book Now** block renders as a button that on click shows a friendly confirmation
modal/toast (no real booking/payment) and emits a `book-now-click` event tagged with the
current visitor type, with hover emitting `book-now-hover`, and each page load emitting
exactly one `visit` event — all posted to the analytics-api; graceful degradation
(placeholder or neutral fallback) when the Builder API errors. shadcn/ui for buttons and
icons; SSR verifiable with JS disabled / from the raw response, for every variant and the
placeholder. Tests: SSR output contains rendered page content, variant selection by
visitor type, placeholder vs. unknown-slug behavior, that exactly one `visit` event is
emitted, Book Now event emission, API-error fallback. **Out of scope:** the API endpoints
themselves (features 5 & 6), the builder/dashboard.

### 9 — demo-seed
**Charter.** Make `pnpm seed` populate a ready-to-show, **published** demo site so the
whole flow is demoable immediately after `pnpm install && pnpm db:migrate && pnpm seed`.
Deliver: a seed script (replacing the no-op stub from feature 1) that creates a demo
`OwnerAccount` (known email/password), a `Site` with a sensible venue name → slug, a
representative page (venue-name header + a couple of Rich Text blocks + one Image from the
stock set + a Book Now button), the **7 variants** (use the real generation path, or
ship canned variant content to avoid a live Claude call during seeding — decide in the
plan and document it), a **published** snapshot of all that, and a handful of sample
analytics events so the dashboard isn't empty; idempotent or safely re-runnable (clear +
reseed). Document the demo credentials and the demo slug in the plan and/or `CLAUDE.md`.
Tests: a smoke test that the seed script runs and produces a published, fetchable site
(may be DB-dependent — note that). **Out of scope:** anything that changes app behavior;
seed is data only.

---

## 4. Cross-cutting rules (apply to every feature plan)

- **SSR is mandatory** for the Customer published page (every variant + the placeholder);
  both apps are Next.js (App Router).
- **The Builder↔Customer REST API has no auth**; the **slug** (derived from the venue
  name: letters + spaces only → spaces removed → lowercased) is the site identity.
- **Shared contract types** live in `@mizrahitality/contracts` and are imported by both
  apps as raw TS (listed in `transpilePackages`); the visitor-type vocabulary, the
  analytics-event vocabulary, the styling-preset enum, and the `ApiSuccess<T>`/`ApiError`
  envelope all live there.
- **AI = Anthropic Claude (Sonnet 4.6) + prompt caching only** — no other provider; use
  the `claude-api` skill.
- **Every Prisma/schema change goes through the `update-database` skill** (and updates the
  changelog that skill maintains).
- **UI:** shadcn/ui components (+ lucide-react icons) for buttons and icons across both
  apps; the rest is clean, simple UI built directly; no bespoke design system; a real
  design may be supplied later.
- **Tests:** Vitest per workspace, moderate rigor — core logic well-tested (auth,
  analytics aggregation, the REST contract, AI variant generation), lighter on the
  supplied UI; smoke tests must be DB-independent.
- **Local only:** Builder :5111 (`BUILDER_PORT`), Customer :5112 (`CUSTOMER_PORT`).
- **Process:** one feature at a time, planned in Claude Code Plan mode; the feature plan
  file is the persisted artifact. No commits unless the user asks.
- **Keep it simple:** this is a job-interview deliverable judged on functional
  completeness of every P0 — simplest thing that satisfies the constraints, every time.

---

## 5. Definition of done

**Per feature:** all tasks in its plan checked; the REQ-# acceptance criteria it owns
verified (and demoable); required tests written and green; `pnpm build && pnpm typecheck
&& pnpm test && pnpm lint` green across the workspace; the feature plan's status set to
`done` and this master plan's status table updated; any `CLAUDE.md` sections it changed
(Layout, Build/run/test, demo credentials) updated.

**Milestone v1.0 (the whole thing):** every P0 requirement in `PRD.md` demoable
end-to-end on localhost per the ROADMAP success criteria — owner signs up, creates a site,
builds the page with all block types, AI-touches-up copy, generates the 7 variants,
publishes; the SSR customer site renders the neutral variant by default and the matching
variant on switcher change, shows the placeholder for an unpublished slug, and round-trips
analytics to the dashboard with correct numbers; both products talk only over the
documented REST API in the single pnpm monorepo; `pnpm seed` yields a ready-to-show site;
core logic tested at moderate rigor with no P0 defects in the demo flow.
