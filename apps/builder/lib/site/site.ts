// Prisma-touching site helpers. To keep the unit tests DB-independent (mirroring `lib/auth/
// accounts.ts`), the real Prisma client is `import()`-ed lazily — never at module top — so a test
// that imports `createSite` and injects a fake never loads `@prisma/client`. `createSite` is the
// only function with an injectable seam; `getOwnerSite` / `slugExists` use the real client and
// aren't unit-tested.

import { parsePageContent } from "./content";
import { validateVenueName } from "./slug";
import type { BuilderSite } from "./types";

/** True for a Prisma "unique constraint failed" error — here, a raced concurrent create on `slug`. */
function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

const SLUG_TAKEN = "That venue name is taken — pick another.";

/** The signed-in owner's site, with `contentJson` already parsed — or `null` if they have none. */
export async function getOwnerSite(ownerId: string): Promise<BuilderSite | null> {
  const { prisma } = await import("@/lib/db");
  const row = await prisma.site.findUnique({
    where: { ownerId },
    select: { id: true, name: true, slug: true, contentJson: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    blocks: parsePageContent(row.contentJson).blocks,
  };
}

/** Whether a slug is already taken by some site. */
export async function slugExists(slug: string): Promise<boolean> {
  const { prisma } = await import("@/lib/db");
  const row = await prisma.site.findUnique({ where: { slug }, select: { id: true } });
  return row !== null;
}

/** The injectable seam `createSite` uses — the real Prisma-backed implementation, or a test fake. */
export type CreateSiteDeps = {
  slugExists(slug: string): Promise<boolean>;
  create(data: { ownerId: string; name: string; slug: string }): Promise<{ id: string }>;
};

export type CreateSiteResult =
  | { ok: true; site: { id: string; name: string; slug: string } }
  | { ok: false; error: string };

async function defaultCreateSiteDeps(): Promise<CreateSiteDeps> {
  const { prisma } = await import("@/lib/db");
  return {
    slugExists: async (slug) =>
      (await prisma.site.findUnique({ where: { slug }, select: { id: true } })) !== null,
    create: (data) => prisma.site.create({ data, select: { id: true } }),
  };
}

/**
 * Create the owner's site: validate the venue name, derive the (frozen) slug, reject a collision
 * (`"That venue name is taken — pick another."`), and persist. On the concurrent-create race
 * (`P2002` on `slug`) it returns the same taken result. Written DB-injectable so the collision
 * paths are unit-tested without a database.
 */
export async function createSite(
  input: { ownerId: string; name: unknown },
  deps?: CreateSiteDeps,
): Promise<CreateSiteResult> {
  const name = validateVenueName(input.name);
  if (!name.ok) return { ok: false, error: name.error };

  const d = deps ?? (await defaultCreateSiteDeps());
  if (await d.slugExists(name.slug)) return { ok: false, error: SLUG_TAKEN };

  try {
    const created = await d.create({ ownerId: input.ownerId, name: name.value, slug: name.slug });
    return { ok: true, site: { id: created.id, name: name.value, slug: name.slug } };
  } catch (err) {
    if (isUniqueConstraintError(err)) return { ok: false, error: SLUG_TAKEN };
    throw err;
  }
}
