// The public per-venue page: `localhost:5114/<slug>`. Server-rendered on every request — it fetches
// the venue's published page from the Builder REST API and renders it entirely server-side, then the
// browser posts analytics back. Branches on the resolved view:
//   page        → the real published page + a one-shot `visit`
//   placeholder → "coming soon" (unpublished slug) + a `visit` (the API accepts it)
//   not-found   → Next's notFound() → app/not-found.tsx, 404, no analytics
//   error       → "temporarily unavailable", HTTP 200 (graceful degradation, REQ-12), no analytics

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BUILDER_API_URL } from "@/lib/env";
import { loadPublishedView } from "@/lib/published-view";
import { PublishedPage } from "@/components/published-page";
import { ComingSoon } from "@/components/coming-soon";
import { VisitorAnalytics } from "@/components/visitor-analytics";

export const dynamic = "force-dynamic"; // SSR on each request; never statically prerendered.

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const view = await loadPublishedView(slug.toLowerCase()); // deduped with the page body via cache()
  if (view.kind === "page") return { title: view.page.name || "Mizrahitality" };
  return { title: "Mizrahitality" };
}

export default async function VenuePage({ params }: Params) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase(); // the Builder lower-cases on input; keep the analytics slug consistent
  const view = await loadPublishedView(slug);

  switch (view.kind) {
    case "page":
      return (
        <>
          <PublishedPage page={view.page} builderApiUrl={BUILDER_API_URL} />
          <VisitorAnalytics slug={view.page.slug} builderApiUrl={BUILDER_API_URL} />
        </>
      );
    case "placeholder":
      return (
        <>
          <ComingSoon variant="soon" />
          <VisitorAnalytics slug={slug} builderApiUrl={BUILDER_API_URL} />
        </>
      );
    case "not-found":
      return notFound(); // throws (returns `never`) — renders app/not-found.tsx with a 404
    case "error":
      return <ComingSoon variant="unavailable" />;
  }
}
