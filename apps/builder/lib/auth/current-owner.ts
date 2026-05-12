// Reading "the current owner" from the request's session cookie, for Server Components /
// layouts. `getCurrentOwner()` is `cache()`-wrapped so multiple calls in one request hit
// the DB once. `requireOwner()` is the gate for the `(owner)` route group.

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import type { OwnerSummary } from "./accounts";
import { getSessionCookie } from "./cookie";
import { verifySessionToken } from "./session";

/** The signed-in owner for this request, or `null` if there's no valid session. */
export const getCurrentOwner = cache(async (): Promise<OwnerSummary | null> => {
  const token = await getSessionCookie();
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  return prisma.ownerAccount.findUnique({
    where: { id: payload.ownerId },
    select: { id: true, email: true },
  });
});

/** Like `getCurrentOwner()`, but redirects to `/sign-in` (never returns) when unauthenticated. */
export async function requireOwner(): Promise<OwnerSummary> {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/sign-in");
  return owner;
}
