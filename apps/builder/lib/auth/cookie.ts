// Thin wrappers over Next 15's async `cookies()` for the owner session cookie.
// Kept separate from `./session.ts` so that module stays pure (no `next/headers`).
// `setSessionCookie` / `clearSessionCookie` mutate the cookie store, so they may only be
// called from a Server Action or Route Handler — never during a Server Component render.
// `getSessionCookie` only reads, so it's safe in a layout/page render (it opts the route
// into dynamic rendering, which is correct for auth-gated pages).

import { cookies } from "next/headers";

import { MAX_AGE_SECONDS, SESSION_COOKIE_NAME, signSessionToken } from "./session";

/** Read the raw session token from the request cookies (or `undefined` if absent). */
export async function getSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

/** Sign a fresh session token for `ownerId` and set it as an httpOnly cookie. */
export async function setSessionCookie(ownerId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, signSessionToken(ownerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Remove the session cookie (sign-out). */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
