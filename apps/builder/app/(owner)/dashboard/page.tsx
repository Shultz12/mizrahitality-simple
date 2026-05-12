import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsMetrics } from "@/components/analytics/analytics-metrics";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildDashboardView } from "@/lib/analytics/dashboard-view";
import { getAnalyticsSummary } from "@/lib/analytics/events";
import { requireOwner } from "@/lib/auth/current-owner";
import { getOwnerSite } from "@/lib/site/site";

export const metadata: Metadata = { title: "Dashboard — Mizrahitality" };

// `requireOwner()` reads cookies (already forces dynamic); stating it is explicit and guarantees the
// first paint reflects current event counts.
export const dynamic = "force-dynamic";

// Where the public Customer app serves this site (mirrors `(owner)/builder/page.tsx`). Feature 8
// builds that app; the slug is what selects the site.
const CUSTOMER_ORIGIN = "http://localhost:5114";

export default async function DashboardPage() {
  const owner = await requireOwner();
  const site = await getOwnerSite(owner.id);
  const summaryResult = site ? (await getAnalyticsSummary(site.slug)).body : null;
  const view = buildDashboardView(site, summaryResult);

  if (view.kind === "no-site") {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create your venue’s page</CardTitle>
            <CardDescription>
              You haven’t set up a site yet. Once you do, this page shows how many people are visiting
              and clicking Book Now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/builder">Create your site</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>We couldn’t load your analytics</CardTitle>
          <CardDescription>{view.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Try refreshing the page. If it keeps happening, open the site builder and check your site.
          </p>
          <Button variant="outline" asChild>
            <Link href="/builder">Open the site builder</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // view.kind === "ready" — `site` is non-null here.
  const url = `${CUSTOMER_ORIGIN}/${view.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{site!.name} — Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your live site:{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary underline-offset-4 hover:underline"
          >
            {url}
          </a>
        </p>
        {!site!.published && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your site isn’t published yet —{" "}
            <Link href="/builder" className="text-primary underline-offset-4 hover:underline">
              publish it in the builder
            </Link>{" "}
            so visitors see your real page.
          </p>
        )}
      </div>

      <AnalyticsMetrics slug={view.slug} initialSummary={view.summary} />

      <Button variant="outline" asChild>
        <Link href="/builder">Open the site builder</Link>
      </Button>
    </div>
  );
}
