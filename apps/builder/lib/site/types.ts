// Builder-local page-content types. The Customer-facing published-page contract lives in
// `@mizrahitality/contracts` and is defined by feature 5 (published-page-api) — this module
// stays internal to the Builder app. A "page" is the venue-name header (held in `Site.name`,
// not in this array) followed by an ordered list of blocks stored as JSON in `Site.contentJson`.

/** A repeatable Rich Text block. `html` is sanitized server-side on save (see `sanitize.ts`). */
export type RichTextBlock = { id: string; type: "rich-text"; html: string };

/**
 * The single Image block (at most one per page). `imageUrl` is a **relative** path:
 * `/uploads/<uuid>.<ext>` for an upload, `/stock/<name>.svg` for a stock pick.
 * feature 5: resolve absolute against BUILDER_API_URL — the Customer app can't fetch a
 * `/uploads/...` path relative to itself.
 */
export type ImageBlock = { id: string; type: "image"; imageUrl: string; alt: string };

/** The single Book Now button block (at most one per page). No payload — presence is the data. */
export type BookNowBlock = { id: string; type: "book-now" };

export type Block = RichTextBlock | ImageBlock | BookNowBlock;

export type PageContent = { blocks: Block[] };

/** Every block type the builder offers in the "Drag into site" tray, in tray order. */
export const BLOCK_TYPES = ["rich-text", "image", "book-now"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** Block types that may appear at most once on a page. */
export const SINGLETON_BLOCK_TYPES = ["image", "book-now"] as const;
export type SingletonBlockType = (typeof SINGLETON_BLOCK_TYPES)[number];

/** What the builder client posts to `saveSiteAction` / `publishSiteAction`. `blocks` arrives `unknown`-typed at the action boundary. */
export type SitePayload = { name: string; blocks: Block[] };

/**
 * A site as the builder UI consumes it (Prisma's `contentJson` already parsed).
 * - `published` — has the site been published at least once (`Site.publishedJson !== null`).
 * - `hasUnpublishedChanges` — the draft has edits not yet live (`Site.isDraft`; also true before any Publish).
 * - `publishedAt` — ISO string of the last Publish, or `null` if never published.
 */
export type BuilderSite = {
  id: string;
  name: string;
  slug: string;
  blocks: Block[];
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
};
