// GET /api/sites/{slug} — the one documented Builder→Customer read endpoint: a venue's published
// page, in the `ApiResult<PublishedPage>` envelope. No auth — the slug is the identity. The body is
// always a JSON envelope, even on 404/500, so `createApiClient` (which parses the body and ignores
// the status code) gets a clean `ApiError`. Decision logic lives in the pure `resolvePublishedResponse`;
// this handler is just the Prisma lookup. See `apps/builder/app/api/README.md`.

import { prisma } from "@/lib/db";
import { resolvePublishedResponse } from "@/lib/site/published";

// It reads the DB on every request — explicit, though Next 15 GET route handlers are dynamic by default.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase(); // slugs are stored lower-cased; be forgiving on the way in
  try {
    const site = await prisma.site.findUnique({
      where: { slug },
      select: { slug: true, publishedJson: true },
    });
    const { status, body } = resolvePublishedResponse(slug, site);
    return Response.json(body, { status });
  } catch {
    return Response.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong loading this site." } },
      { status: 500 },
    );
  }
}
