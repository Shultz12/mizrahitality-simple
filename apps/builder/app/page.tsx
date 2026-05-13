import { redirect } from "next/navigation";

import { getCurrentOwner } from "@/lib/auth/current-owner";

// Reads the session cookie on every request, so the page must not be statically rendered. Next 15
// auto-detects this via the `cookies()` call inside `getCurrentOwner`, but we mirror the explicit
// opt-in used by `app/(owner)/dashboard/page.tsx` to keep the dynamic-render contract obvious.
export const dynamic = "force-dynamic";

// The Builder app has no public landing page: route by auth state.
export default async function HomePage() {
  const owner = await getCurrentOwner();
  redirect(owner ? "/dashboard" : "/sign-in");
}
