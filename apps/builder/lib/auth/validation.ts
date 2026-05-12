// Email + password validation for owner sign-up / sign-in. Hand-rolled (no validation
// library) — this is a local demo and the rules are tiny. Pure: safe on any input.

/** Pragmatic email shape — `something@something.something`, no whitespace. Not RFC 5322. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN = 8;
// bcrypt only consumes the first 72 bytes of the password; cap the length so a very long
// input isn't silently truncated. (This is a guard, not a behaviour the UI advertises.)
const PASSWORD_MAX = 200;

export type ValidationResult = { ok: true; value: string } | { ok: false; error: string };

/** Trim + lowercase an email for storage and lookup. Coerces non-strings to `""`-ish safely. */
export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

export function validateEmail(raw: unknown): ValidationResult {
  const value = normalizeEmail(raw);
  if (!value || !EMAIL_RE.test(value)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true, value };
}

export function validatePassword(raw: unknown): ValidationResult {
  if (typeof raw !== "string" || raw.length < PASSWORD_MIN || raw.length > PASSWORD_MAX) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  return { ok: true, value: raw };
}
