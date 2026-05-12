import { redirect } from "next/navigation";

import { getCurrentOwner } from "@/lib/auth/current-owner";

// The Builder app has no public landing page: route by auth state.
export default async function HomePage() {
  const owner = await getCurrentOwner();
  redirect(owner ? "/dashboard" : "/sign-in");
}
