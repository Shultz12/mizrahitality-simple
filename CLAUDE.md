# CLAUDE.md

## What this is

**Mizrahitality Simple** — a monorepo with two cooperating, **server-side-rendered** products (job-interview deliverable; keep everything **as simple as possible**):

- **Builder app** — owner-facing drag-and-drop website builder for non-technical hospitality venue owners; lets them sign up, create a site by naming the venue (slug derived from the name), build a **single page** (pinned venue-name header + repeatable Rich Text blocks, at most one Image, at most one Book Now button), AI-touch-up the copy, generate 7 audience-targeted variants, publish, and view an analytics dashboard. Exposes a REST/JSON API.
- **Customer app** — public visitor site routed at `localhost:<port>/<slug>`; on each request it calls the Builder API for the published page (per slug + visitor type), renders it server-side, and posts analytics events back.

The two apps communicate **only** over the documented REST API.

## Tech stack

- **Customer app:** Next.js (App Router, SSR) — public visitor site on port **5112** (`CUSTOMER_PORT`), routes at `localhost:5112/<slug>`. Reads the Builder API via `BUILDER_API_URL` (default `http://localhost:5111`).
- **Builder app:** Next.js (App Router) — owner-facing app on port **5111** (`BUILDER_PORT`); hosts the REST API under `app/api/`.
- **UI:** **shadcn/ui** (with its lucide-react icons) + **Tailwind v4** (CSS-first: `@import "tailwindcss"` + `@theme`; `@tailwindcss/postcss` plugin; no `tailwind.config.js`). No design files are provided up front — build clean, simple UI directly; a frontend design will be supplied later.
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (Builder canvas) — not hand-rolled.
- **Rich text:** **Tiptap** (bold/italic/headings/bullet+numbered lists/links); stored as sanitized HTML, rendered server-side on the Customer app.
- **Auth:** bcrypt-hashed passwords + a signed httpOnly session cookie — **no NextAuth** or other auth framework. The Builder↔Customer REST API itself has no auth.
- **AI:** Anthropic Claude (Sonnet 4.6) with prompt caching — see the `claude-api` skill. Description touch-up + the 7 variants (AI-rewritten copy + a styling preset picked from a fixed enumerated list).
- **Monorepo:** plain **pnpm workspace** (no Turborepo/Nx) — `apps/*` + `packages/*`, one lockfile, pnpm pinned via `packageManager`/`engines`.
- **Database:** **Prisma + SQLite** (file-based, Prisma's bundled SQLite — no `better-sqlite3`). DB file `apps/builder/prisma/dev.db`; `DATABASE_URL=file:./dev.db` (resolved relative to `prisma/schema.prisma`). All schema changes go through the `update-database` skill (logged in `apps/builder/prisma/CHANGELOG.md`).
- **Image storage:** uploaded images in a local **gitignored** dir `apps/builder/uploads/`, served via a Builder route handler at `GET /uploads/<file>`; plus a small **committed** stock-image set under `apps/builder/public/stock/`.
- **Tests:** Vitest, per-workspace config; moderate rigor — core logic (auth, analytics aggregation, REST contract, AI variant generation) well-tested, lighter on the supplied UI; smoke tests are DB-independent.

## Hard constraints (apply everywhere)

- **SSR is mandatory** for the Customer app's published page; the Builder's framework must support SSR.
- The Customer app **is Next.js**; both apps are Next.js.
- It is a **monorepo** with shared API-contract types.
- AI work uses **Anthropic Claude (Sonnet 4.6) with prompt caching** — no other provider.
- **No UI design files (yet).** Use **shadcn/ui** components (and its lucide-react icons) for buttons and icons across both apps; build the rest as clean, simple UI. No bespoke design system.
- The REST API between the two apps has **no auth** (local demo); the **slug** (derived from the venue name) selects the site.

## Layout

Scaffolded by feature 1 (`monorepo-foundation`). pnpm workspace — `pnpm-workspace.yaml` globs `apps/*` + `packages/*`; one lockfile; pnpm pinned via `packageManager` (`pnpm@9.x`) / `engines` (`node >=20`). Root `package.json` scripts: `dev` (both apps via `concurrently`), `build` / `lint` / `typecheck` / `test` (each `pnpm -r --if-present run …`), `format` (Prettier), `db:migrate`, `seed`.

- `apps/builder/` — Builder app (Next.js App Router, port 5111). `app/` has the root layout, `page.tsx` (redirects by auth state: signed in → `/dashboard`, else → `/sign-in`), a public `(auth)/` route group (`layout.tsx` bounces already-signed-in visitors to `/dashboard`; `sign-in/` and `sign-up/` — shadcn `Card` pages with `useActionState` client forms), and a gated `(owner)/` route group (`layout.tsx` calls `requireOwner()` + a header showing the owner email and a server-action sign-out button; `dashboard/page.tsx` is a placeholder until `analytics-dashboard`); `app/api/` will hold the REST API. `lib/db.ts` is the Prisma client singleton; `lib/auth/` has the owner-auth modules — `password.ts` (bcryptjs hash/verify + a decoy hash), `session.ts` (pure HMAC-SHA256 signed-token sign/verify, `SESSION_COOKIE_NAME = "miz_session"`, 30-day max-age), `cookie.ts` (Next 15 async `cookies()` helpers — set/clear only callable from Server Actions), `validation.ts` (email/password validation + normalize), `accounts.ts` (`registerOwner`/`authenticateOwner` over an injectable `AuthDb`; the real `prisma` is lazy-`import()`-ed so unit tests stay DB-free), `current-owner.ts` (`getCurrentOwner` (`cache()`-wrapped) / `requireOwner` → `redirect("/sign-in")`), `actions.ts` (`"use server"` — `signUpAction`/`signInAction`/`signOutAction`); `lib/utils.ts` is shadcn's `cn`; `lib/stock.ts` lists the bundled stock images. `components/ui/` holds shadcn components (`button`, `input`, `label`, `card`); `components.json` configures `shadcn add` (note: `label.tsx` pulls in the unified `radix-ui` package). `prisma/` holds `schema.prisma` (model `OwnerAccount`; later features add `Site` etc. via the `update-database` skill), `migrations/` (committed), `CHANGELOG.md` (schema log), and `seed.mjs` (no-op stub until `demo-seed`). `uploads/` (gitignored, with a `.gitkeep`) will hold uploaded images. `public/stock/` holds the committed stock SVGs. `scripts/dev.mjs` / `start.mjs` run `next dev|start -p $BUILDER_PORT` (default 5111). `.env.example` lists `BUILDER_PORT`, `DATABASE_URL`, `SESSION_SECRET` (**required** — the app throws at startup if unset; sign the session cookie), `ANTHROPIC_API_KEY`. `next.config.ts` sets `transpilePackages: ["@mizrahitality/contracts"]` and `eslint.ignoreDuringBuilds` (lint runs via `pnpm lint`). Vitest tests in `__tests__/` (node env, `@/*` alias) — `__tests__/auth/` covers password, session, validation, and the register/authenticate flows (all DB-independent).
- `apps/customer/` — Customer app (Next.js App Router, SSR, port 5112). `app/[slug]/page.tsx` (the public per-venue Server Component) lands in the `customer-site` feature; for now `app/` has the root layout + a placeholder home page. `lib/env.ts` reads `BUILDER_API_URL` (default `http://localhost:5111`) and exports a configured `apiClient`. Otherwise mirrors the Builder's setup (shadcn, `scripts/`, `.env.example` with `CUSTOMER_PORT` + `BUILDER_API_URL`, `next.config.ts`, `__tests__/`). No DB.
- `packages/contracts/` — `@mizrahitality/contracts`: shared API types — the visitor-type vocabulary (`Gender`, `AgeGroup`, `VisitorType = { gender; ageGroup } | "neutral"`, `VISITOR_TYPES`, `visitorTypeKey()` / `parseVisitorTypeKey()`), the analytics-event vocabulary (`AnalyticsEventType`, `AnalyticsEventInput`), the `ApiSuccess<T>` / `ApiError` / `ApiResult<T>` envelope (+ `apiOk` / `apiErr`), and `createApiClient({ baseUrl })`. Consumed as **raw TS source** — no build step; both apps' `next.config.ts` lists it in `transpilePackages`. Vitest tests under `src/__tests__/`.
- `packages/tsconfig/` (`base.json` + `nextjs.json`), `packages/eslint-config/` (flat config: `index.mjs` = JS + typescript-eslint recommended scoped to `.ts(x)` + `@typescript-eslint/no-explicit-any: error`; `next.mjs` adds `@next/eslint-plugin-next`), `packages/tailwind-config/` (`tokens.css` — Tailwind v4 `@theme` tokens: shadcn neutral palette + `--radius`; each app's `app/globals.css` does `@import "tailwindcss"; @import "@mizrahitality/tailwind-config/tokens.css";`). All `private`. TS `strict` everywhere.
- `plans/` — `00-master-plan.md` (build order, dependency graph, per-feature charters, cross-cutting rules) + `NN-<feature>-plan.md` per feature, created just-in-time from the master plan in Plan mode. **Read `plans/00-master-plan.md` before starting a feature.**
- `PRD.md`, `VISION.md`, `ROADMAP.md` (repo root) — the product docs. **Read them before making product decisions.**

## Note

This is a re-scoped sibling of `../Mizrahitality` — a **different product**, not a copy. Don't reuse that project's specs or domain assumptions here; treat `PRD.md` / `VISION.md` / `ROADMAP.md` in *this* repo as authoritative. Features are developed with Claude Code's Plan mode; the lightweight plan pipeline lives in `plans/` (`00-master-plan.md` + per-feature `NN-<feature>-plan.md`) — there is no separate spec/design/SRS document pipeline.

## Build / run / test

First-time setup: `pnpm install` → `cp apps/builder/.env.example apps/builder/.env` and `cp apps/customer/.env.example apps/customer/.env` → `pnpm db:migrate` (`prisma migrate deploy` in `apps/builder`; idempotent; creates `apps/builder/prisma/dev.db`). Then:

- `pnpm dev` — both apps via `concurrently` (Builder http://localhost:5111, Customer http://localhost:5112). Override ports with `BUILDER_PORT` / `CUSTOMER_PORT`.
- `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test` — across all workspaces (`pnpm -r --if-present run …`).
- `pnpm format` — Prettier write. `pnpm db:migrate` — apply migrations (idempotent; schema changes go through the `update-database` skill, logged in `apps/builder/prisma/CHANGELOG.md`). `pnpm seed` — no-op stub until the `demo-seed` feature.
- Per-app / per-package: `pnpm -F builder <script>` / `pnpm -F customer <script>` / `pnpm -F @mizrahitality/contracts <script>`. A single test file: `pnpm -F <name> exec vitest run <path>`.
