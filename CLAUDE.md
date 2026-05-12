# CLAUDE.md

## What this is

**Mizrahitality Simple** — a monorepo with two cooperating, **server-side-rendered** products (job-interview deliverable):

- **Builder app** — owner-facing drag-and-drop website builder for non-technical hospitality venue owners; lets them build a multi-page site, AI-enhance copy, generate audience-targeted variants, publish, and view an analytics dashboard. Exposes a REST/JSON API.
- **Customer app** — public visitor site routed at `localhost:<port>/<domain-name>`; on each request it calls the Builder API for the published page, renders it server-side, and posts analytics events back.

The two apps communicate **only** over the documented REST API.

## Tech stack

- **Customer app:** Next.js (App Router, SSR) — public visitor site on port **5112** (`CUSTOMER_PORT`), routes at `localhost:5112/<domain-name>`. Reads the Builder API via `BUILDER_API_URL` (default `http://localhost:5111`).
- **Builder app:** Next.js (App Router) — owner-facing app on port **5111** (`BUILDER_PORT`); hosts the REST API under `app/api/`.
- **UI:** **shadcn/ui** (with its lucide-react icons) + **Tailwind v4** (CSS-first: `@import "tailwindcss"` + `@theme`; `@tailwindcss/postcss` plugin; no `tailwind.config.js`). No design files are provided — build clean, simple UI directly.
- **AI:** Anthropic Claude (Sonnet 4.6) with prompt caching — see the `claude-api` skill.
- **Monorepo:** plain **pnpm workspace** (no Turborepo/Nx) — `apps/*` + `packages/*`, one lockfile, pnpm pinned via `packageManager`/`engines`.
- **Database:** **Prisma + SQLite** (file-based, Prisma's bundled SQLite — no `better-sqlite3`). DB file `apps/builder/prisma/dev.db`; `DATABASE_URL=file:./prisma/dev.db`. All schema changes go through the `update-database` skill.
- **Image storage:** local **gitignored** dir `apps/builder/uploads/`, served via a Builder route handler at `GET /uploads/<file>`.
- **Tests:** Vitest, per-workspace config; smoke tests are DB-independent.

## Hard constraints (apply everywhere)

- **SSR is mandatory** for the Customer app's published page; the Builder's framework must support SSR.
- The Customer app **is Next.js**.
- AI work uses **Anthropic Claude (Sonnet 4.6) with prompt caching** — no other provider.
- **No UI design files.** Use **shadcn/ui** components (and its lucide-react icons) for buttons and icons across both apps; build the rest as clean, simple UI. No bespoke design system.
- The REST API between the two apps has **no auth** (local demo); the domain-name selects the site.

## Layout

*Not yet scaffolded — this is the intended structure; build it first (e.g. via Plan mode), then update this section with what actually exists.*

- `apps/builder/` — Builder app (Next.js App Router, port 5111). `app/api/` holds the REST API; `prisma/` holds `schema.prisma` + migrations (model `OwnerAccount` to start; later features amend it via `update-database`); `uploads/` (gitignored, with a `.gitkeep`) holds uploaded images.
- `apps/customer/` — Customer app (Next.js App Router, SSR, port 5112). `app/[domain]/page.tsx` is the public per-venue page (a Server Component). `lib/env.ts` reads `BUILDER_API_URL`.
- `packages/contracts/` — `@mizrahitality/contracts`: shared API types (visitor-type & analytics-event vocabularies, `ApiSuccess<T>`/`ApiError` envelope) + a thin `createApiClient({ baseUrl })` fetch wrapper. Consumed as **raw TS source** — no build step; both apps' `next.config.ts` lists it in `transpilePackages`.
- `packages/tsconfig/`, `packages/eslint-config/`, `packages/tailwind-config/` — shared base configs, all `private`. TS `strict` everywhere; ESLint **flat** config with `@typescript-eslint/no-explicit-any: error`; Tailwind v4 `@theme` design tokens (shadcn palette + `--radius`), imported by each app's `globals.css`.
- `pnpm-workspace.yaml` globs `apps/*` + `packages/*`. Each app has `.env.example` (committed; real `.env*` gitignored) and a small `scripts/dev.mjs`/`start.mjs` Node launcher mapping `BUILDER_PORT`/`CUSTOMER_PORT` → `next -p`.
- `PRD.md`, `VISION.md`, `ROADMAP.md` (repo root) — the product docs. **Read them before making product decisions.**

## Note

This is a re-scoped sibling of `../Mizrahitality` — a **different product**, not a copy. Don't reuse that project's specs or domain assumptions here; treat `PRD.md` / `VISION.md` / `ROADMAP.md` in *this* repo as authoritative. Features are developed with Claude Code's Plan mode — there is no spec/design/plan document pipeline in this repo.

## Build / run / test

Not yet scaffolded. Intended flow once the workspace exists: `pnpm install` → copy each app's `.env.example` to `.env` → `pnpm db:migrate` (`prisma migrate deploy` in `apps/builder`, idempotent) → `pnpm dev` (both apps via `concurrently`; Builder :5111, Customer :5112). Other root scripts: `pnpm build` / `lint` / `typecheck` / `test` / `format` / `seed` (each `pnpm -r run …`; `seed` is a no-op stub until the demo-seed work). Per-app: `pnpm -F builder <script>` / `pnpm -F customer <script>`; a single test: `pnpm -F <app> exec vitest run <path>`. Replace this with the real commands once the apps are scaffolded.
