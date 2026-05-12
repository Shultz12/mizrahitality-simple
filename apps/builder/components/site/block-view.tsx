// A pure, server-renderable read-only renderer for a built page: the venue-name <h1> followed
// by the ordered blocks. The builder's live-preview pane renders it off the client state, and
// because it takes only plain data it can be mirrored by the Customer app's renderer (feature 8;
// feature 5 defines the shared shape). "Matches the published layout" is best-effort until
// feature 8 finalizes that layout.

import { Button } from "@/components/ui/button";
import type { Block } from "@/lib/site/types";

export function BlockView({ name, blocks }: { name: string; blocks: readonly Block[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{name || "Your venue"}</h1>
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — drag blocks from the tray to build your page.
        </p>
      ) : (
        blocks.map((block) => <BlockItem key={block.id} block={block} />)
      )}
    </div>
  );
}

function BlockItem({ block }: { block: Block }) {
  switch (block.type) {
    case "rich-text":
      return (
        <div
          className="miz-prose"
          // The HTML is sanitized server-side on save (see lib/site/sanitize.ts) — trusted on read.
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
        // feature 5: resolve absolute against BUILDER_API_URL — the Customer app can't fetch a
        // `/uploads/...` path relative to itself.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.imageUrl} alt={block.alt} className="max-h-96 w-full rounded-md object-cover" />
      );
    case "book-now":
      return (
        <div>
          <Button type="button">Book Now</Button>
        </div>
      );
  }
}
