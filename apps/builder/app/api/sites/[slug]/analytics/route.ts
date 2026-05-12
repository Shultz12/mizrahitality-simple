// GET /api/sites/{slug}/analytics — lifetime counts for a slug: total visits, Book Now hovers, Book Now
// clicks. No auth. Unknown slug → 404 not_found. Existing slug with no events → all zeros. Body is
// always a JSON envelope (even 404/500). Decision logic is in lib/analytics; this handler is just the
// lookup. Read server-side by the owner dashboard (feature 7) — same origin, so no CORS headers.
// See apps/builder/app/api/README.md.
import { getAnalyticsSummary } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase(); // slugs are stored lower-cased; be forgiving on the way in
  try {
    const { status, body } = await getAnalyticsSummary(slug);
    return Response.json(body, { status });
  } catch {
    return Response.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong loading analytics." } },
      { status: 500 },
    );
  }
}
