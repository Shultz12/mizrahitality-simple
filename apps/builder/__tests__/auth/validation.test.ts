import { describe, it, expect } from "vitest";

import { normalizeEmail, validateEmail, validatePassword } from "@/lib/auth/validation";

describe("email validation", () => {
  it("trims and lowercases a valid email", () => {
    expect(validateEmail(" Owner@Example.COM ")).toEqual({ ok: true, value: "owner@example.com" });
  });

  it("rejects malformed emails and non-strings with a field-friendly message", () => {
    for (const bad of ["not-an-email", "", "a@b", "a b@c.com", "@x.com", "x@.com", 123, null, undefined]) {
      expect(validateEmail(bad)).toEqual({ ok: false, error: "Enter a valid email address." });
    }
  });

  it("normalizeEmail is idempotent", () => {
    const once = normalizeEmail("  Foo@Bar.IO ");
    expect(once).toBe("foo@bar.io");
    expect(normalizeEmail(once)).toBe(once);
  });
});

describe("password validation", () => {
  it("accepts an 8-character password and returns it unchanged", () => {
    expect(validatePassword("12345678")).toEqual({ ok: true, value: "12345678" });
  });

  it("rejects too-short, empty, non-string, and too-long passwords", () => {
    const msg = "Password must be at least 8 characters.";
    expect(validatePassword("1234567")).toEqual({ ok: false, error: msg });
    expect(validatePassword("")).toEqual({ ok: false, error: msg });
    expect(validatePassword(12345678)).toEqual({ ok: false, error: msg });
    expect(validatePassword(undefined)).toEqual({ ok: false, error: msg });
    expect(validatePassword("a".repeat(201))).toEqual({ ok: false, error: msg });
  });
});
