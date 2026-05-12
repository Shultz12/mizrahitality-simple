import type { Metadata } from "next";

import { SiteBuilder } from "@/components/site/site-builder";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOwner } from "@/lib/auth/current-owner";
import { getOwnerSite } from "@/lib/site/site";
import { CreateSiteForm } from "./create-site-form";

export const metadata: Metadata = { title: "Site builder — Mizrahitality" };

// Where the public Customer app serves this site. Hard-coded for the local demo; the slug is
// what selects the site (see PRD / CLAUDE.md). Feature 8 builds that app.
const CUSTOMER_ORIGIN = "http://localhost:5112";

export default async function BuilderPage() {
  const owner = await requireOwner();
  const site = await getOwnerSite(owner.id);

  if (!site) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Name your venue</CardTitle>
            <CardDescription>
              This becomes your page heading and your web address. English letters and spaces only —
              the address is permanent, so pick carefully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateSiteForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  const url = `${CUSTOMER_ORIGIN}/${site.slug}`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Your site’s web address</p>
        <p className="mt-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary underline-offset-4 hover:underline"
          >
            {url}
          </a>
        </p>
        <p className="mt-1 text-muted-foreground">
          This address is permanent — it was set from the venue name when you created the site and
          can’t be changed. Editing the header below changes the name shown on the page, not the
          address. (Your page goes live once you publish — that arrives in a later step.)
        </p>
      </div>
      <SiteBuilder site={site} />
    </div>
  );
}
