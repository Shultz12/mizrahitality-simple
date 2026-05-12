# Prisma Schema Changelog

## [2026-05-12] Migration: add_site

**Feature:** site-builder (feature 3)
**Models affected:** Site (new), OwnerAccount (back-relation `site`)

### Changes

- Added model `Site` with fields: `id` (String, cuid PK), `ownerId` (String, `@unique` FK → `OwnerAccount`, `onDelete: Cascade`), `owner` (relation to `OwnerAccount`), `name` (String — the venue name, also the pinned header text), `slug` (String, `@unique` — derived from the name at creation, frozen), `contentJson` (String, `@default("{\"blocks\":[]}")` — stores `JSON.stringify({ blocks: Block[] })`; the header text is `name`, not duplicated into a block), `isDraft` (Boolean, `@default(true)` — Publish semantics arrive in feature 5; nothing reads it yet), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`) — one site per owner.
- Added back-relation `site Site?` to `OwnerAccount` — completes the effective 1:1 (`Site.ownerId @unique`).

### Notes

- Single-tenant local demo: one `Site` per `OwnerAccount`; no `organizationId` / multi-tenancy (consistent with `OwnerAccount`).
- No data backfill (no existing `Site` rows).
- Feature 4 (ai-copy-and-variants) will add `variantsJson String?` to `Site` via this skill — not pre-added here.
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
