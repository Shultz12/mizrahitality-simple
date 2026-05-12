import type { ReactNode } from "react";

import { signOutAction } from "@/lib/auth/actions";
import { requireOwner } from "@/lib/auth/current-owner";
import { Button } from "@/components/ui/button";

// Gate for every owner-facing page. `requireOwner()` redirects to /sign-in when there's no
// valid session, so anything rendered below can assume an authenticated owner. Feature 3's
// builder and feature 7's analytics dashboard live under this group.
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const owner = await requireOwner();

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Mizrahitality</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{owner.email}</span>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
