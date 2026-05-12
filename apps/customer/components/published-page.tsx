// Server Component that renders a venue's published page: the pinned venue-name <h1> followed by the
// ordered blocks. Mirrors the builder's server-renderable `apps/builder/components/site/block-view.tsx`
// (Rich Text via dangerouslySetInnerHTML on the server-sanitized HTML, at most one Image, an optional
// Book Now). Pure SSR — the only client leaf is <BookNowButton>, whose initial markup still renders
// server-side.

import type { PublishedBlock, PublishedPage as PublishedPageData } from "@mizrahitality/contracts";
import { absoluteImageUrl } from "@/lib/published-view";
import { BookNowButton } from "@/components/book-now-button";

export function PublishedPage({
  page,
  builderApiUrl,
}: {
  page: PublishedPageData;
  builderApiUrl: string;
}) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">{page.name || "Your venue"}</h1>
      {page.blocks.map((block) => (
        <BlockItem
          key={block.id}
          block={block}
          slug={page.slug}
          builderApiUrl={builderApiUrl}
        />
      ))}
    </main>
  );
}

function BlockItem({
  block,
  slug,
  builderApiUrl,
}: {
  block: PublishedBlock;
  slug: string;
  builderApiUrl: string;
}) {
  switch (block.type) {
    case "rich-text":
      return (
        <div
          className="miz-prose"
          // The HTML was sanitized server-side by the Builder on save (see
          // apps/builder/lib/site/sanitize.ts) — trusted on read, same as the builder's preview.
          dangerouslySetInnerHTML={{ __html: block.html || "<p></p>" }}
        />
      );
    case "image":
      if (!block.imageUrl) {
        return (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No image chosen yet
          </div>
        );
      }
      return (
        // imageUrl is relative to the Builder origin (e.g. /uploads/... or /stock/...); resolve it
        // against BUILDER_API_URL. A remote-loader next/image is overkill here — mirrors the builder.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={absoluteImageUrl(block.imageUrl, builderApiUrl)}
          alt={block.alt}
          className="max-h-96 w-full rounded-md object-cover"
        />
      );
    case "book-now":
      return <BookNowButton slug={slug} builderApiUrl={builderApiUrl} />;
  }
}
