// Prisma-touching analytics helpers. To keep the unit tests DB-independent (mirroring `lib/site/
// site.ts` and `lib/auth/accounts.ts`), the real Prisma client is `import()`-ed lazily — only inside
// `defaultRecordEventDeps()` / `defaultReadAnalyticsDeps()` — so a test that injects a fake never
// loads `@prisma/client`. The decision logic (`parseAnalyticsEventInput` / `resolveIngestResponse` /
// `resolveAnalyticsSummaryResponse`) is pure, so it's imported at the top. `prisma.analyticsEvent`
// only exists on the generated client after the `add_analytics_event` migration's `prisma generate`.

import { apiErr, type AnalyticsEventInput, type ApiResult } from "@mizrahitality/contracts";

import {
  parseAnalyticsEventInput,
  resolveAnalyticsSummaryResponse,
  resolveIngestResponse,
  type StoredEvent,
} from "./analytics";

export type RecordEventDeps = {
  siteExists(slug: string): Promise<boolean>;
  insert(event: AnalyticsEventInput): Promise<void>;
};

async function defaultRecordEventDeps(): Promise<RecordEventDeps> {
  const { prisma } = await import("@/lib/db");
  return {
    siteExists: async (slug) =>
      (await prisma.site.findUnique({ where: { slug }, select: { id: true } })) !== null,
    insert: async (event) => {
      await prisma.analyticsEvent.create({ data: { slug: event.slug, type: event.type } });
    },
  };
}

/**
 * Ingest one analytics event: validate the body (400 invalid_event on bad/missing slug or unknown
 * type), reject an unknown slug (404 not_found, nothing stored), otherwise insert one row → 200
 * {recorded:true}. DB-injectable so every branch is unit-tested without a database.
 */
export async function recordEvent(
  body: unknown,
  deps?: RecordEventDeps,
): Promise<{ status: number; body: ApiResult<{ recorded: true }> }> {
  const parsed = parseAnalyticsEventInput(body);
  if (!parsed.ok) return { status: 400, body: apiErr(parsed.code, parsed.message) };
  const d = deps ?? (await defaultRecordEventDeps());
  const decision = resolveIngestResponse(parsed, await d.siteExists(parsed.value.slug));
  if (decision.store) await d.insert(parsed.value);
  return { status: decision.status, body: decision.body };
}

export type ReadAnalyticsDeps = {
  findSite(slug: string): Promise<{ slug: string } | null>;
  listEvents(slug: string): Promise<StoredEvent[]>;
};

async function defaultReadAnalyticsDeps(): Promise<ReadAnalyticsDeps> {
  const { prisma } = await import("@/lib/db");
  return {
    findSite: (slug) => prisma.site.findUnique({ where: { slug }, select: { slug: true } }),
    listEvents: (slug) => prisma.analyticsEvent.findMany({ where: { slug }, select: { type: true } }),
  };
}

/** Build the GET /api/sites/{slug}/analytics response: 404 unknown slug, else 200 with the summary (all-zeros if no events). */
export async function getAnalyticsSummary(slug: string, deps?: ReadAnalyticsDeps) {
  const d = deps ?? (await defaultReadAnalyticsDeps());
  const [site, events] = await Promise.all([d.findSite(slug), d.listEvents(slug)]);
  return resolveAnalyticsSummaryResponse(slug, site, events);
}
