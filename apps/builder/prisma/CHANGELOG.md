# Prisma Schema Changelog

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
