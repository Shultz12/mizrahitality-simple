import type { ReactNode } from "react";

import { signOutAction } from "@/lib/auth/actions";
import { requireOwner } from "@/lib/auth/current-owner";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/owner/sidebar-nav";

// Gate for every owner-facing page. `requireOwner()` redirects to /sign-in when there's no
// valid session, so anything rendered below can assume an authenticated owner. Feature 3's
// builder and feature 7's analytics dashboard live under this group.
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const owner = await requireOwner();

  return (
    <div className="flex min-h-svh bg-background">
      <SidebarNav />
      <div className="flex flex-1 flex-col md:ml-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="text-sm font-medium md:hidden">Mizrahitality</div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{owner.email}</span>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
