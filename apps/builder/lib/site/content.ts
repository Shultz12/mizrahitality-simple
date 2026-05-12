// Page-content parsing + validation. Pure (no Prisma, no Next, no DOM) so it's exercised
// directly in vitest. `parsePageContent` is the tolerant reader for `Site.contentJson` and the
// `saveSiteAction` payload; `validateBlocks` enforces the at-most-one constraints; `isValidBlock`
// is the per-entry shape gate.

import {
  BLOCK_TYPES,
  type Block,
  type BlockType,
  type PageContent,
  type SingletonBlockType,
} from "./types";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Structural check for one block. Narrows `unknown` to `Block`. The `id` is checked separately. */
export function isValidBlock(x: unknown): x is Block {
  if (!isRecord(x)) return false;
  const type = x.type;
  if (typeof type !== "string" || !(BLOCK_TYPES as readonly string[]).includes(type)) return false;
  switch (type as BlockType) {
    case "rich-text":
      return typeof x.html === "string";
    case "image":
      return typeof x.imageUrl === "string" && typeof x.alt === "string";
    case "book-now":
      return true;
  }
}

/** Normalize one raw entry into a `Block`, assigning a fresh `id` if it's missing/blank. */
function normalizeBlock(x: Block & { id?: unknown }): Block {
  const id = typeof x.id === "string" && x.id.length > 0 ? x.id : crypto.randomUUID();
  switch (x.type) {
    case "rich-text":
      return { id, type: "rich-text", html: x.html };
    case "image":
      return { id, type: "image", imageUrl: x.imageUrl, alt: x.alt };
    case "book-now":
      return { id, type: "book-now" };
  }
}

/**
 * Tolerant reader: a JSON string, an already-parsed object, or anything else → a `PageContent`.
 * Order is preserved. Invalid entries are dropped; entries missing an `id` are kept with a
 * generated one. Defensively de-dups the singletons: keeps only the first `image` and the first
 * `book-now`.
 */
export function parsePageContent(raw: unknown): PageContent {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { blocks: [] };
    }
  }
  if (!isRecord(value) || !Array.isArray(value.blocks)) return { blocks: [] };

  const blocks: Block[] = [];
  let seenImage = false;
  let seenBookNow = false;
  for (const entry of value.blocks) {
    if (!isValidBlock(entry)) continue;
    if (entry.type === "image") {
      if (seenImage) continue;
      seenImage = true;
    }
    if (entry.type === "book-now") {
      if (seenBookNow) continue;
      seenBookNow = true;
    }
    blocks.push(normalizeBlock(entry as Block & { id?: unknown }));
  }
  return { blocks };
}

/** Count blocks by type. Used by `validateBlocks` and by the tray's `hasImage` / `hasBookNow`. */
export function countByType(blocks: readonly Block[]): Record<BlockType, number> {
  const counts: Record<BlockType, number> = { "rich-text": 0, image: 0, "book-now": 0 };
  for (const b of blocks) counts[b.type] += 1;
  return counts;
}

export type ValidateBlocksResult = { ok: true; blocks: Block[] } | { ok: false; error: string };

const SINGLETON_OVERFLOW_MESSAGE: Record<SingletonBlockType, string> = {
  image: "You can only add one Image block.",
  "book-now": "You can only add one Book Now button.",
};

/** Enforce: every block has a known type; at most one `image`; at most one `book-now`. */
export function validateBlocks(blocks: readonly Block[]): ValidateBlocksResult {
  for (const b of blocks) {
    if (!(BLOCK_TYPES as readonly string[]).includes(b.type)) {
      return { ok: false, error: "Unknown block type." };
    }
  }
  const counts = countByType(blocks);
  if (counts.image > 1) return { ok: false, error: SINGLETON_OVERFLOW_MESSAGE.image };
  if (counts["book-now"] > 1) return { ok: false, error: SINGLETON_OVERFLOW_MESSAGE["book-now"] };
  return { ok: true, blocks: [...blocks] };
}
