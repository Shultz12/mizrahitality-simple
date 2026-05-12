# Prisma Schema Changelog

## [2026-05-12] Migration: add_published_snapshot

**Feature:** published-page-api (feature 5)
**Models affected:** Site

### Changes

- Added field `publishedJson` (`String?`, nullable) to `Site` — `JSON.stringify({ name, blocks })` snapshot taken at the last Publish; `null` ⇒ the site has never been published. `GET /api/sites/{slug}` reads only this column to build its response.
- Added field `publishedAt` (`DateTime?`, nullable) to `Site` — when the current published snapshot was taken; `null` ⇒ never published.
- `isDraft` (Boolean, `@default(true)` — added inert in feature 3's `add_site`) is now **active**: `saveSite` writes `true` (a draft with changes not yet live), `publishSite` writes `false`. The schema definition of `isDraft` is unchanged.

### Notes

- Two nullable columns — SQLite `ALTER TABLE ... ADD COLUMN` only; no data backfill (existing rows get `NULL`, i.e. "never published", which is correct).
- Not breaking: existing reads/writes are unaffected; the new columns are optional.
- Migration applied with `prisma migrate dev --name add_published_snapshot`; `pnpm db:migrate` (`prisma migrate deploy`) re-applies idempotently.

## [2026-05-12] No migration — feature 4 (remove-ai-and-variants)

**Feature:** remove-ai-and-variants (feature 4)
**Schema change:** none.

The previously-anticipated `Site.variantsJson` field is **not** being added; AI copy / the 7 audience variants / the styling-preset enum are descoped. The future `AnalyticsEvent` model (feature 6) will **not** carry visitor gender or age group. No `prisma migrate` was run; `pnpm db:migrate` stays a no-op.

## [2026-05-12] Migration: add_site

**Feature:** site-builder (feature 3)
**Models affected:** Site (new), OwnerAccount (back-relation `site`)

### Changes

- Added model `Site` with fields: `id` (String, cuid PK), `ownerId` (String, `@unique` FK → `OwnerAccount`, `onDelete: Cascade`), `owner` (relation to `OwnerAccount`), `name` (String — the venue name, also the pinned header text), `slug` (String, `@unique` — derived from the name at creation, frozen), `contentJson` (String, `@default("{\"blocks\":[]}")` — stores `JSON.stringify({ blocks: Block[] })`; the header text is `name`, not duplicated into a block), `isDraft` (Boolean, `@default(true)` — Publish semantics arrive in feature 5; nothing reads it yet), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`) — one site per owner.
- Added back-relation `site Site?` to `OwnerAccount` — completes the effective 1:1 (`Site.ownerId @unique`).

### Notes

- Single-tenant local demo: one `Site` per `OwnerAccount`; no `organizationId` / multi-tenancy (consistent with `OwnerAccount`).
- No data backfill (no existing `Site` rows).
- Migration applied with `prisma migrate dev --name add_site`; `pnpm db:migrate` (`prisma migrate deploy`) re-applies idempotently.

## [2026-05-12] Migration: init

**Feature:** monorepo-foundation (feature 1)
**Models affected:** OwnerAccount

### Changes

- Added model `OwnerAccount` with fields: `id` (String, cuid PK), `email` (String, `@unique`), `passwordHash` (String), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`) — the venue owner's account; owner-auth (feature 2) uses it for sign-up / sign-in; site-builder (feature 3) will add a `Site` model with a one-to-one relation to it.

### Notes

- Datasource: SQLite, file-based — `DATABASE_URL=file:./dev.db` (resolved relative to `prisma/schema.prisma`, i.e. `apps/builder/prisma/dev.db`); Prisma's bundled SQLite — no `better-sqlite3`.
- Single-tenant local demo: one `OwnerAccount` per account, no `organizationId` / multi-tenancy.
- `pnpm db:migrate` runs `prisma migrate deploy` (idempotent); `prisma generate` runs on `postinstall`.
- No data backfill needed (initial schema).
