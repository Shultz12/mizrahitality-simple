// bcrypt password hashing (via bcryptjs — pure JS, no native build). Pure: no env, no Next.

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Hash a plaintext password with bcrypt. (bcrypt uses only the first 72 bytes.) */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Verify a plaintext password against a bcrypt hash. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A precomputed bcrypt hash (no real password produces it) used as a constant-time decoy
 * in `authenticateOwner` when no account matches the email, so sign-in response time
 * doesn't trivially reveal whether an account exists.
 */
export const DUMMY_PASSWORD_HASH: string = bcrypt.hashSync(
  "decoy::no-account-uses-this-value",
  SALT_ROUNDS,
);
