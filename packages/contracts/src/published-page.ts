// The Builder→Customer published-page contract: the shape `GET /api/sites/{slug}` returns inside
// the `ApiSuccess<T>` envelope (see `./envelope`), plus the endpoint path helper both apps share.
// Defined here (feature 5, published-page-api) per the feature-3 plan. The Builder app keeps its own
// `Block` union (`apps/builder/lib/site/types.ts`) — it's structurally identical to `PublishedBlock`,
// so `Block[]` is assignable to `PublishedBlock[]` with no mapping.

/** A block of a published page, as returned by `GET /api/sites/{slug}`. `id` is a stable React key for the renderer. */
export type PublishedBlock =
  | { id: string; type: "rich-text"; html: string }
  | { id: string; type: "image"; imageUrl: string; alt: string }
  | { id: string; type: "book-now" };

/**
 * A venue's published landing page: the pinned venue-name header followed by ordered blocks.
 * `imageUrl` on an image block is a path **relative to the Builder origin** (e.g.
 * `/uploads/<file>` or `/stock/<name>.svg`); resolve it against the Builder base URL
 * (`BUILDER_API_URL`) before rendering — the Builder never emits its own external origin.
 */
export interface PublishedPage {
  slug: string;
  name: string;
  blocks: PublishedBlock[];
}

/** Path of the published-page endpoint for a slug. `GET` → `ApiResult<PublishedPage>`. */
export function publishedPagePath(slug: string): string {
  return `/api/sites/${encodeURIComponent(slug)}`;
}
