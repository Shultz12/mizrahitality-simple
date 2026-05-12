import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";

import { authenticateOwner, registerOwner, type AuthDb } from "@/lib/auth/accounts";
import { verifyPassword } from "@/lib/auth/password";

type Row = { id: string; email: string; passwordHash: string };

type FakeDb = AuthDb & {
  rows: Map<string, Row>; // keyed by email
  state: { createCalls: number };
};

/** A tiny Map-backed stand-in for the Prisma `ownerAccount` model — keeps these tests DB-free. */
function makeFakeDb(): FakeDb {
  const rows = new Map<string, Row>();
  const state = { createCalls: 0 };
  return {
    rows,
    state,
    ownerAccount: {
      async findUnique({ where }) {
        if ("email" in where) return rows.get(where.email) ?? null;
        for (const row of rows.values()) if (row.id === where.id) return row;
        return null;
      },
      async create({ data }) {
        state.createCalls += 1;
        if (rows.has(data.email)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        const row: Row = { id: randomUUID(), email: data.email, passwordHash: data.passwordHash };
        rows.set(row.email, row);
        return { id: row.id, email: row.email };
      },
    },
  };
}

describe("registerOwner", () => {
  it("creates an owner with a normalized email and a bcrypt-hashed password", async () => {
    const db = makeFakeDb();
    const result = await registerOwner({ email: "Owner@Ex.com", password: "hunter2!" }, db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.owner.email).toBe("owner@ex.com");
    expect(result.owner.id).toBeTruthy();

    const stored = db.rows.get("owner@ex.com");
    expect(stored).toBeDefined();
    expect(stored?.passwordHash).not.toBe("hunter2!");
    expect(await verifyPassword("hunter2!", stored!.passwordHash)).toBe(true);
  });

  it("rejects a duplicate email via the pre-check (case-insensitively)", async () => {
    const db = makeFakeDb();
    await registerOwner({ email: "owner@ex.com", password: "first-pw8" }, db);
    const result = await registerOwner({ email: "OWNER@ex.com", password: "another8" }, db);
    expect(result).toEqual({
      ok: false,
      error: "That email is already registered.",
      field: "email",
    });
  });

  it("maps a P2002 race on create() to the same email-taken result", async () => {
    const db = makeFakeDb();
    // findUnique reports the email free, but create() then throws P2002 (a concurrent signup won).
    db.ownerAccount.findUnique = async () => null;
    db.ownerAccount.create = async () => {
      throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    };
    const result = await registerOwner({ email: "race@ex.com", password: "racing88" }, db);
    expect(result).toEqual({
      ok: false,
      error: "That email is already registered.",
      field: "email",
    });
  });

  it("rejects an invalid email before touching the database", async () => {
    const db = makeFakeDb();
    const result = await registerOwner({ email: "not-an-email", password: "longenough" }, db);
    expect(result).toEqual({ ok: false, error: "Enter a valid email address.", field: "email" });
    expect(db.state.createCalls).toBe(0);
  });

  it("rejects a weak password before touching the database", async () => {
    const db = makeFakeDb();
    const result = await registerOwner({ email: "ok@ex.com", password: "short" }, db);
    expect(result).toEqual({
      ok: false,
      error: "Password must be at least 8 characters.",
      field: "password",
    });
    expect(db.state.createCalls).toBe(0);
  });
});

describe("authenticateOwner", () => {
  it("accepts the right credentials (email matched case-insensitively)", async () => {
    const db = makeFakeDb();
    await registerOwner({ email: "owner@ex.com", password: "hunter2!" }, db);
    const result = await authenticateOwner({ email: "OWNER@Ex.com", password: "hunter2!" }, db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.owner.email).toBe("owner@ex.com");
  });

  it("rejects the wrong password with a generic message and no field hint", async () => {
    const db = makeFakeDb();
    await registerOwner({ email: "owner@ex.com", password: "hunter2!" }, db);
    const result = await authenticateOwner({ email: "owner@ex.com", password: "nope-nope" }, db);
    expect(result).toEqual({ ok: false, error: "Email or password is incorrect." });
  });

  it("rejects an unknown email with the same generic message (no enumeration)", async () => {
    const db = makeFakeDb();
    const result = await authenticateOwner({ email: "ghost@ex.com", password: "whatever8" }, db);
    expect(result).toEqual({ ok: false, error: "Email or password is incorrect." });
  });
});
