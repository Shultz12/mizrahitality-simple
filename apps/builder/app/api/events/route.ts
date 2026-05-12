// POST /api/events — analytics ingest. No auth (the slug is the identity). Cross-origin: the Customer
// site emits hover/click events from the visitor's browser (:5112 → :5111), and POST with
// content-type: application/json triggers a CORS preflight — so we answer OPTIONS and set permissive
// CORS headers on every response. One accepted POST = one stored row; no server-side dedup (the
// Customer app guarantees one `visit` per page load — REQ-15). Body is always a JSON envelope, even on
// 400/404/500, so createApiClient gets a clean ApiError. See apps/builder/app/api/README.md.
import { recordEvent } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: { code: "invalid_event", message: "Request body must be valid JSON." } },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  try {
    const { status, body: envelope } = await recordEvent(body);
    return Response.json(envelope, { status, headers: CORS_HEADERS });
  } catch {
    return Response.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong recording this event." } },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
