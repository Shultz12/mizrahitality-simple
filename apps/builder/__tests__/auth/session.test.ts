// `session.ts` reads SESSION_SECRET lazily (inside getSecret()), so setting it here — before
// any sign/verify call runs — is enough; no import ordering tricks needed.
process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";

import { afterEach, describe, it, expect, vi } from "vitest";

import {
  MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";

afterEach(() => {
  vi.useRealTimers();
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

describe("session token sign / verify", () => {
  it("exposes the expected cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("miz_session");
  });

  it("signs a two-segment base64url token and verifies it round-trip", () => {
    const token = signSessionToken("owner_123");
    expect(token.split(".")).toHaveLength(2);
    for (const seg of token.split(".")) {
      expect(seg.length).toBeGreaterThan(0);
      expect(seg).toMatch(/^[A-Za-z0-9_-]+$/); // base64url alphabet
    }
    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.ownerId).toBe("owner_123");
    expect(typeof payload?.iat).toBe("number");
  });

  it("rejects a tampered payload segment", () => {
    const token = signSessionToken("owner_123");
    const [, sig] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ownerId: "owner_evil", iat: 1 })).toString(
      "base64url",
    );
    expect(verifySessionToken(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it("rejects garbage, empty, undefined, single-segment, and non-JSON-payload tokens", () => {
    expect(verifySessionToken("garbage")).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("only-one-segment")).toBeNull();
    expect(verifySessionToken("a.b.c")).toBeNull();
    const notJson = Buffer.from("not json at all").toString("base64url");
    // pair it with a "valid-looking" signature — still rejected because the HMAC won't match,
    // and even if it did the payload isn't JSON.
    expect(verifySessionToken(`${notJson}.${notJson}`)).toBeNull();
  });

  it("rejects a token signed under a different secret", () => {
    const token = signSessionToken("owner_123");
    process.env.SESSION_SECRET = "a-completely-different-secret";
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects an expired token (iat older than MAX_AGE_SECONDS)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    const oldToken = signSessionToken("owner_123");
    // jump well past the 30-day window
    vi.setSystemTime(new Date(Date.now() + (MAX_AGE_SECONDS + 60) * 1000));
    expect(verifySessionToken(oldToken)).toBeNull();
    // a freshly-signed token at the new "now" still verifies
    expect(verifySessionToken(signSessionToken("owner_123"))).not.toBeNull();
  });
});
