// Prisma-touching site helpers. To keep the unit tests DB-independent (mirroring `lib/auth/
// accounts.ts`), the real Prisma client is `import()`-ed lazily — never at module top — so a test
// that imports `createSite` / `saveSite` / `publishSite` and injects a fake never loads
// `@prisma/client`. `createSite` (via `CreateSiteDeps`) and `saveSite` / `publishSite` (via
// `WriteSiteDeps`) carry injectable seams; `getOwnerSite` / `slugExists` use the real client and
// aren't unit-tested.

import { parsePageContent, validateBlocks } from "./content";
import { buildPublishedSnapshot } from "./published";
import { sanitizeRichTextHtml } from "./sanitize";
import { validateVenueName } from "./slug";
import type { Block, BuilderSite } from "./types";

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
    select: {
      id: true,
      name: true,
      slug: true,
      contentJson: true,
      isDraft: true,
      publishedJson: true,
      publishedAt: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    blocks: parsePageContent(row.contentJson).blocks,
    published: row.publishedJson !== null,
    hasUnpublishedChanges: row.isDraft,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
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
 * paths are unit-tested without a database. A fresh site keeps `isDraft: true` and `publishedJson:
 * NULL` ("not published yet") — no extra work needed here.
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

// ── Save / Publish ──────────────────────────────────────────────────────────────────────────────

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Validate + parse + sanitize a builder payload (shared by Save and Publish). */
function preparePayload(
  payload: { name: unknown; blocks: unknown },
): { ok: true; name: string; blocks: Block[] } | { ok: false; error: string } {
  const name = validateVenueName(payload.name);
  if (!name.ok) return { ok: false, error: name.error };
  const parsed = parsePageContent(
    Array.isArray(payload.blocks) ? { blocks: payload.blocks } : payload.blocks,
  );
  const validated = validateBlocks(parsed.blocks);
  if (!validated.ok) return { ok: false, error: validated.error };
  const blocks = validated.blocks.map((b) =>
    b.type === "rich-text" ? { ...b, html: sanitizeRichTextHtml(b.html) } : b,
  );
  return { ok: true, name: name.value, blocks };
}

/** The injectable seam `saveSite` / `publishSite` use — the real Prisma-backed implementation, or a test fake. */
export type WriteSiteDeps = {
  findSite(siteId: string): Promise<{ id: string; ownerId: string } | null>;
  updateSite(
    siteId: string,
    data: {
      name: string;
      contentJson: string;
      isDraft: boolean;
      publishedJson?: string;
      publishedAt?: Date;
    },
  ): Promise<void>;
};

async function defaultWriteSiteDeps(): Promise<WriteSiteDeps> {
  const { prisma } = await import("@/lib/db");
  return {
    findSite: (id) =>
      prisma.site.findUnique({ where: { id }, select: { id: true, ownerId: true } }),
    updateSite: async (id, data) => {
      await prisma.site.update({ where: { id }, data });
    },
  };
}

async function writeSite(
  siteId: string,
  ownerId: string,
  payload: { name: unknown; blocks: unknown },
  publish: boolean,
  deps?: WriteSiteDeps,
): Promise<SaveResult> {
  const d = deps ?? (await defaultWriteSiteDeps());
  const site = await d.findSite(siteId);
  if (!site || site.ownerId !== ownerId) return { ok: false, error: "Site not found." };

  const prepared = preparePayload(payload);
  if (!prepared.ok) return { ok: false, error: prepared.error };
  const { name, blocks } = prepared;
  const contentJson = JSON.stringify({ blocks });

  if (publish) {
    await d.updateSite(site.id, {
      name,
      contentJson,
      isDraft: false,
      publishedJson: buildPublishedSnapshot({ name, blocks }),
      publishedAt: new Date(),
    });
  } else {
    await d.updateSite(site.id, { name, contentJson, isDraft: true });
  }
  return { ok: true };
}

/**
 * Persist the built page as a **draft** (keeps `isDraft: true` — un-live until Publish). Re-checks
 * ownership server-side (never trusts the client `siteId`), re-validates the venue name, parses +
 * validates + sanitizes the blocks. Never touches `publishedJson` / `publishedAt`.
 */
export function saveSite(
  siteId: string,
  ownerId: string,
  payload: { name: unknown; blocks: unknown },
  deps?: WriteSiteDeps,
): Promise<SaveResult> {
  return writeSite(siteId, ownerId, payload, false, deps);
}

/**
 * Persist the built page **and** snapshot it as the live published record: writes `contentJson` +
 * `name`, `publishedJson = JSON.stringify({ name, blocks })`, `publishedAt = now()`, `isDraft =
 * false`. Same ownership re-check, validation, and sanitization as `saveSite`.
 */
export function publishSite(
  siteId: string,
  ownerId: string,
  payload: { name: unknown; blocks: unknown },
  deps?: WriteSiteDeps,
): Promise<SaveResult> {
  return writeSite(siteId, ownerId, payload, true, deps);
}
