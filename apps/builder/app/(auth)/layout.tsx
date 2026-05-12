import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentOwner } from "@/lib/auth/current-owner";

// The public auth pages (sign-in / sign-up). An already-signed-in visitor has no business
// here — bounce them to the dashboard.
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const owner = await getCurrentOwner();
  if (owner) redirect("/dashboard");

  return (
    <div className="min-h-svh grid place-items-center bg-muted/30 p-4">{children}</div>
  );
}
