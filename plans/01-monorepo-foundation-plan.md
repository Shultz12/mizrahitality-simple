# Plan — Feature 1: monorepo-foundation

**Status:** done (2026-05-12)
**Order:** 1 of 9 — hard prerequisite for every other feature
**Depends on:** — (nothing)
**Satisfies:** REQ-17, REQ-18 (contract types only), REQ-19 (framework choice), REQ-20 (SDK wiring only)
**Skills:** `update-database` (Prisma init)

> This is the durable feature-plan artifact, copied verbatim from the Plan-mode plan on approval
> (per `plans/00-master-plan.md` §1). On approval the executor also (a) adds the "copy the Plan-mode
> plan into `plans/` as `plans/NN-<feature>-plan.md` before executing" rule to `plans/00-master-plan.md`
> §1 so every future feature does the same, then (b) executes the **Tasks** below. No commit unless asked.
>
> **Standing process:** each feature is designed in Claude Code Plan mode; when the plan is approved, the
> Plan-mode plan file is copied to `plans/NN-<feature-name>-plan.md` (status `in-progress`), then
> executed; on completion its status is set to `done` and the master plan's status table is ticked.
>
> **Execution note:** Next.js apps and shadcn/ui are scaffolded **by hand** (not via `create-next-app` /
> `shadcn init`) for full control and reproducibility — the end state (files, deps, structure, behaviour)
> is exactly as specified below.

---

## Execution outcome (2026-05-12)

Scaffolded as planned. **Verified green:** `pnpm install` (corepack couldn't write a global pnpm shim →
installed pnpm 9.15.9 via `npm i -g pnpm@9`; added `pnpm.onlyBuiltDependencies` for `prisma` / `esbuild`
/ `@tailwindcss/oxide` / `unrs-resolver` etc. so pnpm 9 runs their build scripts), `pnpm db:migrate`
(migration `20260512072348_init` created + applied, `apps/builder/prisma/dev.db` created; idempotent on
re-run), `pnpm typecheck` (3 workspaces), `pnpm lint` (both apps), `pnpm test` (contracts 8 + builder 3 +
customer 3 = 14), `pnpm build` (both Next apps build, pages prerendered, the shared `@mizrahitality/contracts`
import + shadcn `Button` + Tailwind v4 tokens all resolve). Resolved versions: Next 15.5.18, React 19,
Tailwind v4, Prisma 6.19, vitest 2.1.

**Deviations from the written plan (all toward robustness; end state unchanged):**
- `packages/eslint-config` uses `@next/eslint-plugin-next` directly (flat config) instead of
  `eslint-config-next` via `FlatCompat` — the FlatCompat route mis-attributed `no-unused-vars` to
  legitimately-used type-only imports; the TS configs are now scoped to `**/*.{ts,tsx,mts,cts}` so
  `.mjs`/`.cjs` files aren't TS-parsed, and `next-env.d.ts` is in the ESLint `ignores`.
- `postcss.config.mjs` uses the object form `plugins: { "@tailwindcss/postcss": {} }` (Next-canonical;
  Vite/Vitest also accepts it); each app's `vitest.config.ts` sets `css.postcss.plugins: []` so test
  runs don't load Tailwind, and a `@/*` → app-dir alias for the tests.
- `next.config.ts` sets `eslint.ignoreDuringBuilds: true` (lint is the dedicated `pnpm lint` step;
  removes Next's "plugin not detected" warning and the redundant build-time lint pass).
- The builder stock manifest lives at `apps/builder/lib/stock.ts` (not `public/stock/manifest.ts`) so it
  imports cleanly in tests; the SVGs are at `apps/builder/public/stock/{cafe,restaurant,bar,hotel}.svg`.
- A `db:reset` convenience script (`prisma migrate reset --force`) was added to `apps/builder`.
- `DATABASE_URL` is `file:./dev.db` (not `file:./prisma/dev.db`): Prisma resolves SQLite paths relative
  to `prisma/schema.prisma`, so `./dev.db` is `apps/builder/prisma/dev.db` as intended — CLAUDE.md's DB
  bullet was corrected to match.

**Live `pnpm dev` HTTP smoke not run** — the environment's bash hook blocked starting a long-running dev
server; `next build` (full Next pipeline) + `next start` wrappers cover it. Re-check with `pnpm dev` →
http://localhost:5111 and http://localhost:5112 when convenient.

No commit made (per the no-commit-unless-asked rule).

---

## Context

The repo currently holds only the product docs (`PRD.md`, `VISION.md`, `ROADMAP.md`, `CLAUDE.md`)
and `plans/00-master-plan.md` — nothing is scaffolded. Per the master plan's build order, feature 1
(`monorepo-foundation`) is the hard prerequisite for everything else: it stands up the pnpm-workspace
monorepo, both Next.js app skeletons, the shared `packages/*` (`@mizrahitality/contracts` + base
configs), Prisma + SQLite, shadcn/ui + Tailwind v4, env files, and the root/per-app scripts — with no
product features yet. Outcome: `pnpm install && pnpm db:migrate && pnpm typecheck && pnpm lint &&
pnpm test && pnpm build` all green, and `pnpm dev` serves a placeholder Builder on :5111 and a
placeholder Customer on :5112, with the shared contract types importable (and used) in both apps.

**Decisions confirmed with the user for this feature:**
1. **Prisma schema** ships now with the `OwnerAccount` model + an `init` migration (matches CLAUDE.md's
   "model `OwnerAccount` to start"); owner-auth (feature 2) adds only auth logic, no new model.
2. **`apps/builder/public/stock/`** gets **3–4 committed lightweight SVG placeholders** now (cafe /
   restaurant / bar / hotel) + a small manifest module; site-builder uses them in the Image block.
3. **Visitor-type vocabulary** in `@mizrahitality/contracts` is **structured + key helpers**:
   `Gender`, `AgeGroup`, `VisitorType = { gender; ageGroup } | 'neutral'`, the 7-element
   `VISITOR_TYPES`, and `visitorTypeKey()` / `parseVisitorTypeKey()` producing tokens like
   `male-18-30` / `neutral` for URLs, query params and DB rows.

---

## Charter (from master plan §3.1)

Stand up the pnpm-workspace monorepo and everything both apps build on, with no product features yet:
the workspace, `apps/builder` (Next.js App Router, :5111) and `apps/customer` (Next.js App Router,
SSR, :5112), `packages/contracts` (`@mizrahitality/contracts` — raw TS: visitor-type & analytics-event
vocabularies, `ApiSuccess<T>`/`ApiError` envelope, `createApiClient({ baseUrl })`), `packages/tsconfig`
/ `packages/eslint-config` / `packages/tailwind-config`, Prisma + SQLite in `apps/builder`, shadcn/ui
in both apps, `uploads/` (gitignored) + `public/stock/`, `.env.example` per app, root + per-app
scripts, per-app Vitest with a DB-independent smoke test each; finish by updating `CLAUDE.md`'s
"Layout" and "Build / run / test" sections. **Out of scope:** any auth, any builder/dashboard UI, any
REST endpoints, any AI logic (only the Anthropic SDK dependency + env var, no calls).

---

## In scope
Workspace + both Next.js skeletons; shared `packages/*`; Prisma + SQLite with `OwnerAccount` + `init`
migration; shadcn/ui + Tailwind v4 (CSS-first) wired with shared theme tokens; `@mizrahitality/contracts`
vocabularies + envelope + fetch client; `apps/builder/uploads/` (gitignored, `.gitkeep`) +
`apps/builder/public/stock/` (3–4 SVGs + manifest); `.env.example` per app; root + per-app scripts
(`dev`/`build`/`lint`/`typecheck`/`test`/`format`/`db:migrate`/`seed`); per-app Vitest config + a
DB-independent smoke test each; `@anthropic-ai/sdk` dependency + `ANTHROPIC_API_KEY` in the builder
`.env.example` (no AI code); `CLAUDE.md` update.

## Out of scope
Auth and sessions (feature 2); site creation, the builder canvas, image upload route, Tiptap
(feature 3); AI touch-up / variants (feature 4); the published-page REST endpoint + Publish (feature 5);
analytics endpoints (feature 6); the dashboard (feature 7); the customer `[slug]` page + switcher
(feature 8); the real seed data (feature 9 — `pnpm seed` stays a no-op stub).

---

## Approach

**Workspace.** Plain pnpm workspace: `pnpm-workspace.yaml` globs `apps/*` + `packages/*`; private root
`package.json` with `packageManager: "pnpm@<installed version>"`, `engines` (`node >=20`, `pnpm >=9`),
the root scripts, and root devDeps (`concurrently`, `prettier`, `typescript`). Root scripts that fan out
use `pnpm -r --if-present run <name>` so config-only packages without that script are skipped.

**Both apps.** Scaffold each with `pnpm create next-app@latest` (TypeScript, App Router, **no** `src/`
dir, ESLint, import alias `@/*`, pnpm), then reconcile each app:
- ensure **Tailwind v4 CSS-first** (`@tailwindcss/postcss` in `postcss.config.mjs`, no
  `tailwind.config.js`; `app/globals.css` does `@import "tailwindcss";`);
- add `transpilePackages: ["@mizrahitality/contracts"]` to `next.config.ts`;
- replace the generated `eslint.config.mjs` with one that spreads `@mizrahitality/eslint-config`;
- point `tsconfig.json` at `@mizrahitality/tsconfig/nextjs.json` (keeping the `@/*` path + Next plugin);
- add `scripts/dev.mjs` + `scripts/start.mjs` (tiny Node launchers that read `BUILDER_PORT`/
  `CUSTOMER_PORT`, default 5111/5112, and run `next dev|start -p <port>` via the local `next` bin —
  `pnpm exec next …` with `shell: true` for Windows) and wire `dev`/`start`/`build`/`lint`/`typecheck`/
  `test` scripts;
- add `.env.example`;
- give each a minimal placeholder home page (`app/page.tsx`) that demonstrates the wiring (Builder:
  renders a shadcn `Button` + shows `VISITOR_TYPES.length`; Customer: shows `BUILDER_API_URL` from
  `lib/env.ts` + `VISITOR_TYPES.length`).

**shadcn/ui.** Run `pnpm dlx shadcn@latest init` in each app (CSS variables, neutral base color), then
`pnpm dlx shadcn@latest add button` (gives `components/ui/button.tsx`, `lib/utils.ts` with `cn`,
lucide-react). Hoist the generated design tokens (the shadcn neutral palette + `--radius`) into
`packages/tailwind-config/tokens.css` and have each app's `globals.css` `@import` it instead of keeping
a per-app copy.

**`packages/contracts` (`@mizrahitality/contracts`).** Raw TS, no build step: `package.json` (`private`,
`exports` / `main` / `types` all `./src/index.ts`), `tsconfig.json` extending the shared base.
Modules:
- `src/visitor-types.ts` — `Gender = "male" | "female"`, `GENDERS`; `AgeGroup = "18-30" | "31-50" |
  "50+"`, `AGE_GROUPS`; `VisitorType = { gender: Gender; ageGroup: AgeGroup } | "neutral"`; `NEUTRAL`;
  `VISITOR_TYPES` (the 7); `isNeutral(vt)`; `visitorTypeKey(vt): string` (`"male-18-30"` … `"neutral"`);
  `parseVisitorTypeKey(s): VisitorType | null`.
- `src/analytics.ts` — `AnalyticsEventType = "visit" | "book-now-hover" | "book-now-click"`,
  `ANALYTICS_EVENT_TYPES`; `AnalyticsEventInput = { slug: string; type: AnalyticsEventType; visitorType:
  VisitorType }`.
- `src/envelope.ts` — `ApiSuccess<T> = { ok: true; data: T }`; `ApiError = { ok: false; error: { code:
  string; message: string } }`; `ApiResult<T> = ApiSuccess<T> | ApiError`; `apiOk(data)` /
  `apiErr(code, message)` constructors.
- `src/client.ts` — `createApiClient({ baseUrl }: { baseUrl: string })` → `{ get<T>(path, init?):
  Promise<ApiResult<T>>; post<T>(path, body, init?): Promise<ApiResult<T>> }`: a thin `fetch` wrapper
  that joins `baseUrl + path`, sends/parses JSON, returns the parsed envelope, and synthesizes an
  `ApiError` (`code: "network_error"`) on a thrown fetch / non-JSON body.
- `src/index.ts` — re-exports all of the above.

**Shared config packages** (all `private`, names `@mizrahitality/{tsconfig,eslint-config,tailwind-config}`):
- `packages/tsconfig` — `base.json` (`strict`, `target ES2022`, `moduleResolution bundler`,
  `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `noUncheckedIndexedAccess`) and
  `nextjs.json` (extends `base`, adds `jsx: "preserve"`, `lib: ["dom","dom.iterable","esnext"]`, the
  Next `plugins` entry, `incremental`, `noEmit`).
- `packages/eslint-config` — a flat-config entry (`index.mjs`) exporting an array: `@typescript-eslint`
  recommended + **`@typescript-eslint/no-explicit-any: "error"`**, plus a `next.mjs` that composes the
  base with `eslint-config-next`'s flat config (`next/core-web-vitals`). Apps' `eslint.config.mjs`
  spread `@mizrahitality/eslint-config/next`.
- `packages/tailwind-config` — `tokens.css` (the shadcn neutral palette CSS vars in `:root` / `.dark`
  plus `--radius`, exposed via Tailwind v4 `@theme inline`), `package.json` with `exports: { "./tokens.css":
  "./tokens.css" }`.

**Prisma + SQLite (in `apps/builder`).** Done **via the `update-database` skill**: `prisma/schema.prisma`
with `generator client` (prisma-client-js), `datasource db` (sqlite, `url = env("DATABASE_URL")`), and
`model OwnerAccount { id String @id @default(cuid()); email String @unique; passwordHash String;
createdAt DateTime @default(now()); updatedAt DateTime @updatedAt }`. Create the `init` migration
(`prisma migrate dev --name init`, committed under `prisma/migrations/`), add a `prisma/seed.mjs`
no-op stub, and `lib/db.ts` (Prisma client singleton with the `globalThis` hot-reload cache). The
builder `package.json` gets `db:migrate` → `prisma migrate deploy`, `seed` → `node prisma/seed.mjs`,
and `postinstall` → `prisma generate`. `DATABASE_URL="file:./dev.db"` in `.env.example` (Prisma resolves
the SQLite path relative to `prisma/schema.prisma`, so the DB lands at `apps/builder/prisma/dev.db`); the
`dev.db` file is gitignored; the migrations folder is committed.

**Customer wiring.** `apps/customer/lib/env.ts` reads `BUILDER_API_URL` (default
`http://localhost:5111`) and exports it plus a configured `apiClient = createApiClient({ baseUrl:
BUILDER_API_URL })`.

**Stock images.** `apps/builder/public/stock/{cafe,restaurant,bar,hotel}.svg` — tiny solid-colour SVGs
with a centred label — plus `apps/builder/public/stock/manifest.ts` exporting `STOCK_IMAGES: { id:
string; label: string; src: string }[]` (e.g. `{ id: "cafe", label: "Café", src: "/stock/cafe.svg" }`).

**Uploads.** `apps/builder/uploads/.gitkeep`; `.gitignore` gets `apps/builder/uploads/*` +
`!apps/builder/uploads/.gitkeep`, plus `*.db` / `*.db-journal` for the SQLite file. (The route handler
that serves uploads comes in feature 3.)

**Tooling.** Root Prettier (`.prettierrc` minimal, `.prettierignore` covering `**/.next`,
`**/node_modules`, `pnpm-lock.yaml`, `apps/builder/prisma/migrations`). Per-app Vitest configs;
`packages/contracts` Vitest config. Anthropic: `@anthropic-ai/sdk` added to builder deps,
`ANTHROPIC_API_KEY=` (commented "used by ai-copy-and-variants") in the builder `.env.example` — no code.

**Scripts (final shape).**
- Root: `dev` = `concurrently -n builder,customer -c blue,green "pnpm -F builder dev" "pnpm -F customer dev"`;
  `build`/`lint`/`typecheck`/`test` = `pnpm -r --if-present run <name>`; `format` = `prettier --write .`;
  `db:migrate` = `pnpm -F builder db:migrate`; `seed` = `pnpm -F builder seed`.
- `apps/builder`: `dev` = `node scripts/dev.mjs`; `start` = `node scripts/start.mjs`; `build` =
  `next build`; `lint` = `eslint .`; `typecheck` = `tsc --noEmit`; `test` = `vitest run`; `db:migrate` =
  `prisma migrate deploy`; `seed` = `node prisma/seed.mjs`; `postinstall` = `prisma generate`.
- `apps/customer`: `dev` = `node scripts/dev.mjs`; `start` = `node scripts/start.mjs`; `build` =
  `next build`; `lint` = `eslint .`; `typecheck` = `tsc --noEmit`; `test` = `vitest run`.

---

## Tasks (execution order)

1. **Copy this plan** — write this Plan-mode plan file verbatim to `plans/01-monorepo-foundation-plan.md`,
   changing its top status note to `Status: in-progress`. (This is the durable feature-plan artifact;
   the Plan-mode scratch file is throwaway.)
2. **Workspace root** — `pnpm-workspace.yaml`; root `package.json` (private, `packageManager`,
   `engines`, scripts, devDeps `concurrently`/`prettier`/`typescript`); `.prettierrc` + `.prettierignore`;
   extend `.gitignore` (`apps/builder/uploads/*` + `!.gitkeep`, `*.db`, `*.db-journal`).
3. **`packages/tsconfig`** — `package.json`, `base.json`, `nextjs.json`.
4. **`packages/eslint-config`** — `package.json` (+ deps), `index.mjs`, `next.mjs`.
5. **`packages/tailwind-config`** — `package.json` (`exports`), `tokens.css` (filled in step 8 from
   shadcn output, or pre-populated with the shadcn neutral palette + `--radius`).
6. **`packages/contracts`** — `package.json`, `tsconfig.json`, `src/{visitor-types,analytics,envelope,client,index}.ts`,
   `vitest.config.ts`, `src/__tests__/contracts.test.ts` (visitor-type key round-trip for all 7;
   `createApiClient` URL building + envelope/network-error handling with a mocked `fetch`).
7. **`apps/builder`** — scaffold with `create-next-app` (TS, App Router, no `src/`, ESLint, `@/*`, pnpm);
   reconcile to Tailwind v4 CSS-first; `next.config.ts` `transpilePackages`; swap `eslint.config.mjs`
   → `@mizrahitality/eslint-config/next`; `tsconfig.json` → `@mizrahitality/tsconfig/nextjs.json`;
   add `scripts/dev.mjs` + `scripts/start.mjs`; wire `package.json` scripts + deps (`@mizrahitality/contracts`
   workspace dep, `@anthropic-ai/sdk`); `.env.example`; placeholder `app/page.tsx`; `app/globals.css`
   imports `@mizrahitality/tailwind-config/tokens.css`.
8. **shadcn/ui in `apps/builder`** — `shadcn init` (CSS vars, neutral) + `add button`; hoist the
   generated tokens into `packages/tailwind-config/tokens.css`; have `globals.css` import it.
9. **Prisma in `apps/builder`** — via the **`update-database` skill**: `prisma/schema.prisma` (datasource
   + generator + `OwnerAccount`); `prisma migrate dev --name init` (commit the migration); `lib/db.ts`
   singleton; `prisma/seed.mjs` no-op stub; builder `db:migrate` / `seed` / `postinstall` scripts;
   record the change in the skill's changelog.
10. **`apps/builder` Vitest** — `vitest.config.ts` + a DB-independent smoke test (`lib/db.ts` exports a
    defined client; `cn()` from `lib/utils.ts` merges classes).
11. **`apps/builder` stock + uploads** — `public/stock/{cafe,restaurant,bar,hotel}.svg` + `public/stock/manifest.ts`;
    `uploads/.gitkeep`.
12. **`apps/customer`** — scaffold with `create-next-app` (same flags); same reconciliation as the builder
    (Tailwind v4, `transpilePackages`, shared eslint/tsconfig, `scripts/dev.mjs`+`start.mjs`, scripts,
    `.env.example` with `CUSTOMER_PORT`/`BUILDER_API_URL`); `lib/env.ts` (reads `BUILDER_API_URL`,
    exports it + `apiClient`); placeholder `app/page.tsx`; `globals.css` imports the shared tokens.
13. **shadcn/ui in `apps/customer`** — `shadcn init` + `add button` (reuse the hoisted shared tokens).
14. **`apps/customer` Vitest** — `vitest.config.ts` + a DB-independent smoke test (`lib/env.ts` default
    fallback; `apiClient` is created).
15. **Install & verify** — `pnpm install`; create local `.env` files from the examples; `pnpm db:migrate`;
    `pnpm typecheck`; `pnpm lint`; `pnpm test`; `pnpm build`; spot-check `pnpm dev` (both ports) and the
    `BUILDER_PORT` override. Fix anything red.
16. **Docs** — (a) in `plans/00-master-plan.md` §1, add the standing rule: *"Each feature is designed in
    Claude Code Plan mode; when the plan is approved it is **copied into `plans/` as `plans/NN-<feature-name>-plan.md`**
    (status `in-progress`) before execution begins, and its status is set to `done` on completion."*
    (b) update `CLAUDE.md`: replace the "Layout" section's "Not yet scaffolded" caveat with the real tree,
    and "Build / run / test" with the real commands. (c) set `plans/01-monorepo-foundation-plan.md` status
    → `done` and tick the master plan's status table (feature 1 → `done`); update `plans/00-master-plan.md`
    further only if reality diverged from the charter.

---

## Data model

`apps/builder/prisma/schema.prisma`: SQLite datasource (`DATABASE_URL="file:./dev.db"` → `apps/builder/prisma/dev.db`),
`prisma-client-js` generator, and one model:

```prisma
model OwnerAccount {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Initial migration `prisma/migrations/<timestamp>_init/` committed. All of this performed **via the
`update-database` skill** (incl. its changelog entry). Future features extend the schema only through
that skill.

## API surface

No HTTP endpoints. Only the `@mizrahitality/contracts` package: the `Gender`/`AgeGroup`/`VisitorType`
vocabulary + helpers, the `AnalyticsEventType` vocabulary + `AnalyticsEventInput`, the
`ApiSuccess<T>`/`ApiError`/`ApiResult<T>` envelope + `apiOk`/`apiErr`, and `createApiClient({ baseUrl })`.

## Files & directories (principal)

```
pnpm-workspace.yaml · package.json · .prettierrc · .prettierignore · .gitignore (edited)
packages/tsconfig/{package.json,base.json,nextjs.json}
packages/eslint-config/{package.json,index.mjs,next.mjs}
packages/tailwind-config/{package.json,tokens.css}
packages/contracts/{package.json,tsconfig.json,vitest.config.ts,src/{index,visitor-types,analytics,envelope,client}.ts,src/__tests__/contracts.test.ts}
apps/builder/{package.json,next.config.ts,tsconfig.json,eslint.config.mjs,postcss.config.mjs,vitest.config.ts,
  .env.example,scripts/{dev,start}.mjs,components.json,lib/{utils,db}.ts,components/ui/button.tsx,
  app/{layout.tsx,page.tsx,globals.css},prisma/{schema.prisma,seed.mjs,migrations/**},
  public/stock/{cafe,restaurant,bar,hotel}.svg,public/stock/manifest.ts,uploads/.gitkeep}
apps/customer/{package.json,next.config.ts,tsconfig.json,eslint.config.mjs,postcss.config.mjs,vitest.config.ts,
  .env.example,scripts/{dev,start}.mjs,components.json,lib/{utils,env}.ts,components/ui/button.tsx,
  app/{layout.tsx,page.tsx,globals.css}}
CLAUDE.md (Layout + Build/run/test sections updated) · plans/01-monorepo-foundation-plan.md (new) · plans/00-master-plan.md (status tick)
```

## Tests

- **`packages/contracts`** (real, DB-independent): `visitorTypeKey` / `parseVisitorTypeKey` round-trip
  for all 7 visitor types incl. `neutral`; `VISITOR_TYPES` has exactly 7 entries; `createApiClient`
  joins `baseUrl + path`, sends JSON, returns the parsed envelope on success, and returns an `ApiError`
  with `code: "network_error"` when `fetch` throws (mock `globalThis.fetch`).
- **`apps/builder`** (smoke, DB-independent): `lib/db.ts` exports a defined Prisma client (import does
  not connect); `cn("a", false && "b", "c")` → `"a c"`.
- **`apps/customer`** (smoke, DB-independent): `lib/env.ts` returns `http://localhost:5111` when
  `BUILDER_API_URL` is unset; the exported `apiClient` is created.
- `pnpm -r --if-present run test` green; `pnpm typecheck`, `pnpm lint`, `pnpm build` green.

## Acceptance (REQ-# this feature owns)

- **REQ-17 (monorepo):** one pnpm-workspace repo builds and runs **both** apps; `@mizrahitality/contracts`
  types are imported (and exercised) by both `apps/builder` and `apps/customer`; per-app `build` / `lint`
  / `dev` (run) / `test` / `seed` scripts exist (`seed` is the no-op stub).
- **REQ-19 (SSR / framework):** both apps are Next.js App Router; the Customer app is SSR-capable
  (default Server Components, no static `output: "export"`); the Builder app's framework supports SSR.
- **REQ-18 (contract types only):** the visitor-type vocabulary, the analytics-event vocabulary, and the
  `ApiSuccess<T>`/`ApiError` envelope exist in `@mizrahitality/contracts` and compile when imported in
  both apps. (The endpoints themselves are out of scope here.)
- **REQ-20 (SDK wiring only):** `@anthropic-ai/sdk` is a Builder dependency and `ANTHROPIC_API_KEY` is
  documented in the Builder `.env.example`; no AI code yet.

## Verification (end-to-end)

1. `pnpm install` — workspaces link; the builder `postinstall` runs `prisma generate` cleanly.
2. `cp apps/builder/.env.example apps/builder/.env` and `cp apps/customer/.env.example apps/customer/.env`.
3. `pnpm db:migrate` — applies the `init` migration and creates `apps/builder/prisma/dev.db`; re-running
   is a no-op (idempotent).
4. `pnpm typecheck` → green. `pnpm lint` → green. `pnpm test` → green (contracts + both app smoke tests).
   `pnpm build` → both Next apps build.
5. `pnpm dev` → Builder at http://localhost:5111 renders its placeholder page (a shadcn `Button` + the
   visitor-type count); Customer at http://localhost:5112 renders its placeholder (the `BUILDER_API_URL`
   value + the visitor-type count). `BUILDER_PORT=6000 pnpm -F builder dev` serves on :6000 (port wiring).
6. Confirm `@mizrahitality/contracts` is genuinely consumed in both apps' pages (the placeholder pages
   import from it) — proves `transpilePackages` + the raw-TS workspace dependency works.

## Risks & open questions (resolved)

- **Tailwind v4 × shadcn/ui × Next 15 interplay** — follow shadcn's official Tailwind-v4 / Next.js setup
  (CSS variables, `@theme inline`); hoist the generated tokens into `packages/tailwind-config` after
  `init`. If `create-next-app` scaffolds Tailwind v3, switch it to v4 CSS-first.
- **ESLint flat config + `eslint-config-next`** — wrap whatever `create-next-app` emits into
  `@mizrahitality/eslint-config/next`; apps just spread it. Add `@typescript-eslint/no-explicit-any:
  "error"` in the base.
- **Raw-TS shared package across two Next apps** — `workspace:*` dep + `transpilePackages` + the package's
  `main`/`types`/`exports` all pointing at `src/index.ts`; no build step.
- **`next` binary resolution in the `scripts/dev.mjs` launchers on Windows** — use `pnpm exec next …`
  with `{ stdio: "inherit", shell: true }`.
- **Resolved choices:** `OwnerAccount` + `init` migration included now; 3–4 committed SVG stock
  placeholders + manifest; structured `VisitorType` + `visitorTypeKey`/`parseVisitorTypeKey`.
- **No commit** will be made; once the scaffold is verified I'll ask whether you want it committed.
