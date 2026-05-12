import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOwner } from "@/lib/auth/current-owner";

export const metadata: Metadata = { title: "Dashboard — Mizrahitality" };

// TODO(feature-7): replace this placeholder with the real analytics dashboard
// (total visits, Book Now hover count, Book Now click count).
export default async function DashboardPage() {
  const owner = await requireOwner();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signed in as {owner.email}</CardTitle>
        <CardDescription>Your account is ready.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Build your venue’s page in the site builder. Your analytics dashboard arrives in a later
          feature.
        </p>
        <Button asChild>
          <Link href="/builder">Open the site builder</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
