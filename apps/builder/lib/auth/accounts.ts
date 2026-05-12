// The testable heart of owner-auth: register / authenticate, framework-free and with an
// injectable `db` so unit tests pass a Map-backed fake (keeping every test DB-independent —
// the real Prisma client is `import()`-ed lazily only when no `db` is supplied, so the test
// process never loads `@prisma/client`). The real `PrismaClient` satisfies `AuthDb`
// structurally; so does the fake in the tests.

import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password";
import { normalizeEmail, validateEmail, validatePassword } from "./validation";

/** The minimal Prisma surface `accounts.ts` uses — both the real client and the test fake fit it. */
export type AuthDb = {
  ownerAccount: {
    findUnique(args: {
      where: { email: string } | { id: string };
      select?: Record<string, boolean>;
    }): Promise<{ id: string; email: string; passwordHash: string } | null>;
    create(args: {
      data: { email: string; passwordHash: string };
    }): Promise<{ id: string; email: string }>;
  };
};

export type OwnerSummary = { id: string; email: string };
export type AuthFailure = { ok: false; error: string; field?: "email" | "password" };
export type RegisterResult = { ok: true; owner: OwnerSummary } | AuthFailure;
export type AuthnResult = { ok: true; owner: OwnerSummary } | AuthFailure;

async function resolveDb(db?: AuthDb): Promise<AuthDb> {
  if (db) return db;
  const { prisma } = await import("@/lib/db");
  return prisma;
}

/** True for a Prisma "unique constraint failed" error (raced concurrent sign-up on the email). */
function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/**
 * Create a new owner account: validate the email + password, ensure the email is free,
 * hash the password with bcrypt, and persist. On the concurrent-sign-up race (`P2002`)
 * it reports the same "already registered" result as the pre-check.
 */
export async function registerOwner(
  input: { email: unknown; password: unknown },
  db?: AuthDb,
): Promise<RegisterResult> {
  const email = validateEmail(input.email);
  if (!email.ok) return { ok: false, error: email.error, field: "email" };

  const password = validatePassword(input.password);
  if (!password.ok) return { ok: false, error: password.error, field: "password" };

  const database = await resolveDb(db);

  const existing = await database.ownerAccount.findUnique({ where: { email: email.value } });
  if (existing) {
    return { ok: false, error: "That email is already registered.", field: "email" };
  }

  const passwordHash = await hashPassword(password.value);
  try {
    const created = await database.ownerAccount.create({
      data: { email: email.value, passwordHash },
    });
    return { ok: true, owner: { id: created.id, email: created.email } };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, error: "That email is already registered.", field: "email" };
    }
    throw err;
  }
}

/**
 * Verify owner credentials. Unknown email and wrong password both yield the same generic
 * message (no user enumeration); when the email is unknown we still run a bcrypt compare
 * against a decoy hash so the response time doesn't betray account existence.
 */
export async function authenticateOwner(
  input: { email: unknown; password: unknown },
  db?: AuthDb,
): Promise<AuthnResult> {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";

  const database = await resolveDb(db);
  const row = await database.ownerAccount.findUnique({ where: { email } });
  const passwordOk = await verifyPassword(password, row ? row.passwordHash : DUMMY_PASSWORD_HASH);

  if (!row || !passwordOk) {
    return { ok: false, error: "Email or password is incorrect." };
  }
  return { ok: true, owner: { id: row.id, email: row.email } };
}
