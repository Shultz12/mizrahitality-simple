// Stateless signed session token: `base64url(JSON({ownerId, iat})) + "." + base64url(HMAC-SHA256)`.
// Hand-rolled over node:crypto — no jose/JWT library (per CLAUDE.md: a signed httpOnly cookie,
// no auth framework). Pure module: no `next/headers` import, so it's safe to unit-test in a
// plain Node environment. The Next-bound cookie helpers live in `./cookie.ts`.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Name of the httpOnly session cookie set by the Builder app. */
export const SESSION_COOKIE_NAME = "miz_session";

/** Tokens older than this (and the cookie's maxAge) — 30 days, in seconds. */
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = { ownerId: string; iat: number };

/** The server secret used to sign session tokens. Throws if `SESSION_SECRET` is unset. */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set — the Builder app needs it to sign session cookies. " +
        "Copy apps/builder/.env.example to apps/builder/.env (or set the env var).",
    );
  }
  return secret;
}

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

/** Build a signed session token for the given owner id. */
export function signSessionToken(ownerId: string): string {
  const payload: SessionPayload = { ownerId, iat: Math.floor(Date.now() / 1000) };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

/**
 * Verify a session token: checks the HMAC (constant-time), the payload shape, and the age.
 * Returns the decoded payload, or `null` for anything malformed / tampered / expired.
 */
export function verifySessionToken(token: unknown): SessionPayload | null {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1 || token.indexOf(".", dot + 1) !== -1) return null;

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expectedSig = Buffer.from(signPayload(payloadB64), "base64url");
  const actualSig = Buffer.from(sigB64, "base64url");
  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { ownerId?: unknown }).ownerId !== "string" ||
    typeof (parsed as { iat?: unknown }).iat !== "number" ||
    !Number.isFinite((parsed as { iat: number }).iat)
  ) {
    return null;
  }

  const { ownerId, iat } = parsed as SessionPayload;
  if (iat < Math.floor(Date.now() / 1000) - MAX_AGE_SECONDS) return null;

  return { ownerId, iat };
}
