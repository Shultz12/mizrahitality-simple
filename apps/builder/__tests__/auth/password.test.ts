import { describe, it, expect } from "vitest";

import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/lib/auth/password";

const BCRYPT_SHAPE = /^\$2[aby]\$\d{2}\$/;

describe("password hashing", () => {
  it("hashPassword produces a bcrypt-shaped hash, not the plaintext", async () => {
    const hash = await hashPassword("hunter2!");
    expect(hash).not.toBe("hunter2!");
    expect(hash).toMatch(BCRYPT_SHAPE);
  });

  it("verifyPassword accepts the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("two hashes of the same password differ but both verify", async () => {
    const a = await hashPassword("repeat-me-8");
    const b = await hashPassword("repeat-me-8");
    expect(a).not.toBe(b);
    expect(await verifyPassword("repeat-me-8", a)).toBe(true);
    expect(await verifyPassword("repeat-me-8", b)).toBe(true);
  });

  it("the decoy hash is bcrypt-shaped and matches no obvious password", async () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(BCRYPT_SHAPE);
    expect(await verifyPassword("", DUMMY_PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword("password", DUMMY_PASSWORD_HASH)).toBe(false);
  });
});
