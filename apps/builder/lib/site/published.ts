// Pure, DB-free logic for the published-page snapshot and the GET /api/sites/{slug} response.
// No Prisma, no Next — so it's exercised directly in vitest. `buildPublishedSnapshot` produces the
// string stored in `Site.publishedJson`; `toPublishedPage` reads one back tolerantly (reusing
// `parsePageContent`); `resolvePublishedResponse` makes the three-case decision (unknown slug /
// existing-but-unpublished / published) so the route handler stays a thin Prisma lookup + Response.

import {
  apiErr,
  apiOk,
  type ApiResult,
  type PublishedBlock,
  type PublishedPage,
} from "@mizrahitality/contracts";

import { parsePageContent } from "./content";
import type { Block } from "./types";

/** Serialize the current built state into the snapshot string stored in `Site.publishedJson`. */
export function buildPublishedSnapshot(input: { name: string; blocks: Block[] }): string {
  return JSON.stringify({ name: input.name, blocks: input.blocks });
}

/**
 * Build the API payload from a stored published snapshot. `null`/unparseable ⇒ `null` (treat the
 * site as unpublished). `parsePageContent` drops invalid entries, normalizes missing ids, and
 * de-dups the singletons, so the read inherits that tolerance for free. `Block[]` ⊇ `PublishedBlock[]`
 * structurally — the cast is a no-op narrowing.
 */
export function toPublishedPage(slug: string, publishedJson: string | null): PublishedPage | null {
  if (publishedJson == null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(publishedJson);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const name =
    typeof (raw as { name?: unknown }).name === "string" ? (raw as { name: string }).name : "";
  const blocks = parsePageContent({ blocks: (raw as { blocks?: unknown }).blocks })
    .blocks as PublishedBlock[];
  return { slug, name, blocks };
}

/** Decide the `GET /api/sites/{slug}` response from the looked-up row (or `null` if no such slug). */
export function resolvePublishedResponse(
  slug: string,
  found: { slug: string; publishedJson: string | null } | null,
): { status: number; body: ApiResult<PublishedPage> } {
  if (!found) return { status: 404, body: apiErr("not_found", "No site with that web address.") };
  const page = toPublishedPage(found.slug, found.publishedJson);
  if (!page) return { status: 200, body: apiErr("unpublished", "This site hasn’t been published yet.") };
  return { status: 200, body: apiOk(page) };
}
