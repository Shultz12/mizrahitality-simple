# Mizrahitality Simple

A small monorepo with two cooperating, **server-side-rendered** Next.js apps:

- **Builder** (`apps/builder`, port **5113**) — owner-facing drag-and-drop website builder for
  hospitality venue owners. Sign up, create a site by naming the venue (the slug is derived from
  the name), build a single page (pinned venue-name header + repeatable Rich Text blocks, at most
  one Image, at most one Book Now button), publish it, and view an analytics dashboard. Also hosts
  the REST/JSON API under `app/api/`.
- **Customer** (`apps/customer`, port **5114**) — the public visitor site at
  `http://localhost:5114/<slug>`. On each request it calls the Builder API for the published page,
  renders it server-side, and posts analytics events back.

The two apps talk **only** over the documented REST API (`apps/builder/app/api/README.md`).

Tech: pnpm workspace · Next.js (App Router, SSR) · Prisma + SQLite · shadcn/ui + Tailwind v4 ·
`@dnd-kit` · Tiptap · bcrypt + a signed httpOnly session cookie · Vitest. Per-file detail lives in
[`CLAUDE.md`](./CLAUDE.md); product docs in [`PRD.md`](./PRD.md) / [`VISION.md`](./VISION.md) /
[`ROADMAP.md`](./ROADMAP.md). For the big-picture architecture (how the two apps cooperate, the
key request flows, and the design decisions behind the choices), see
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Quick start

Needs **Node.js >= 20** and **pnpm >= 9**. If you have Node 20+, `corepack enable` will install the
pinned pnpm version automatically.

```bash
pnpm install
cp apps/builder/.env.example  apps/builder/.env
cp apps/customer/.env.example apps/customer/.env
pnpm db:migrate   # creates apps/builder/prisma/dev.db
pnpm seed         # populates the demo site (login + a published venue + sample analytics)
pnpm dev          # Builder → http://localhost:5113 , Customer → http://localhost:5114
```

Then sign in to the Builder at http://localhost:5113/sign-in with `demo@mizrahitality.test` /
`demo1234`, or open the public demo venue at http://localhost:5114/hotelmizrahi. The sections below
explain each step.

### Verify it works

- Open http://localhost:5114/hotelmizrahi — you should see the seeded venue page (a pinned
  "Hotel Mizrahi" header, two Rich Text blocks, the stock hotel image, and a Book Now button).
- Sign in to http://localhost:5113/sign-in with `demo@mizrahitality.test` / `demo1234`, then
  click **Dashboard** — the metric tiles should show non-zero counts from the seeded analytics.
- `curl http://localhost:5113/api/sites/hotelmizrahi` should return a JSON envelope with
  `"ok":true`.

## Setup

```bash
pnpm install

# Per-app env files (the defaults are fine for local dev):
cp apps/builder/.env.example  apps/builder/.env
cp apps/customer/.env.example apps/customer/.env

# Create the SQLite DB and apply migrations (idempotent — creates apps/builder/prisma/dev.db):
pnpm db:migrate
```

`apps/builder/.env` needs `SESSION_SECRET` set (the example file ships a dev-only value) — the
Builder app throws at startup if it's missing.

## Seed the demo data

```bash
pnpm seed
```

This populates a ready-to-show **published** demo site so the whole flow is demoable immediately:

- **Owner login:** `demo@mizrahitality.test` / `demo1234`
- **Venue:** "Hotel Mizrahi" → slug `hotelmizrahi` → public URL **http://localhost:5114/hotelmizrahi**
- A published page (venue-name header + two Rich Text blocks + one stock Image + a Book Now button)
- A handful of sample analytics events so the owner dashboard isn't empty

`pnpm seed` is **re-runnable** — it does a *scoped* reset (deletes only the demo owner / site /
events) and recreates them; any other dev data is left intact.

## Run

```bash
pnpm dev
```

Starts both apps together:

- Builder — http://localhost:5113 (sign in at `/sign-in`, then `/dashboard` and `/builder`)
- Customer — http://localhost:5114 (a published venue is at `/<slug>`, e.g. `/hotelmizrahi`)

Override the ports with `BUILDER_PORT` / `CUSTOMER_PORT` (in the `.env` files or the environment).

Quick API check (Builder running + `pnpm seed` already done):

```bash
curl http://localhost:5113/api/sites/hotelmizrahi
```

## Other scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run both apps (via `concurrently`). |
| `pnpm build` | `next build` in every workspace. |
| `pnpm lint` | ESLint across all workspaces. |
| `pnpm typecheck` | `tsc --noEmit` across all workspaces. |
| `pnpm test` | Vitest across all workspaces. |
| `pnpm format` | Prettier write. |
| `pnpm db:migrate` | Apply Prisma migrations (idempotent). Schema changes are logged in `apps/builder/prisma/CHANGELOG.md`. |
| `pnpm seed` | Populate / refresh the demo data (see above). |

Per-workspace: `pnpm -F builder <script>` · `pnpm -F customer <script>` ·
`pnpm -F @mizrahitality/contracts <script>`. A single test file:
`pnpm -F <name> exec vitest run <path>`.

## Layout

```
apps/
  builder/    Builder app (Next.js, port 5113) — owner UI + REST API + Prisma/SQLite
  customer/   Customer app (Next.js, port 5114) — public SSR visitor site
packages/
  contracts/        @mizrahitality/contracts — shared API-contract types (raw TS, no build step)
  tsconfig/         shared TS configs
  eslint-config/    shared ESLint flat config
  tailwind-config/  shared Tailwind v4 @theme tokens
plans/        build-order master plan + per-feature plans
```
