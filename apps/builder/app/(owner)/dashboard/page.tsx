import type { Metadata } from "next";

import { requireOwner } from "@/lib/auth/current-owner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard — Mizrahitality" };

// TODO(feature-7): replace this placeholder with the real analytics dashboard
// (total visits, Book Now hover/click counts, gender + age-group breakdowns).
export default async function DashboardPage() {
  const owner = await requireOwner();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signed in as {owner.email}</CardTitle>
        <CardDescription>Your account is ready.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Your site builder and analytics dashboard arrive in the next features.
        </p>
      </CardContent>
    </Card>
  );
}
