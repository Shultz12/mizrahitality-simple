// Venue-name validation + slug derivation. Pure and framework-free (no Prisma, no Next) so the
// whole thing is unit-testable in vitest's node env. Collision detection lives in `site.ts`'s
// `createSite` (it needs the DB) — this module only knows the shape rules.

/** A venue name is English letters and spaces only — no digits, punctuation, or accents. */
export const VENUE_NAME_RE = /^[A-Za-z ]+$/;

/** Derive the (frozen) slug from a venue name: drop all whitespace, lowercase. `"Cafe Mizrahi"` → `"cafemizrahi"`. */
export function slugifyVenueName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

export type VenueNameResult =
  | { ok: true; value: string; slug: string }
  | { ok: false; error: string };

/**
 * Validate a raw venue-name input and, on success, return the trimmed display name + its slug.
 * - non-string / empty / whitespace-only → "Enter a venue name."
 * - contains anything other than English letters and spaces → the letters-only message
 * - (defensive) slugifies to empty → the letters-only message
 */
export function validateVenueName(raw: unknown): VenueNameResult {
  const value = (typeof raw === "string" ? raw : String(raw ?? "")).trim();
  if (!value) return { ok: false, error: "Enter a venue name." };
  if (!VENUE_NAME_RE.test(value)) {
    return {
      ok: false,
      error: "Use English letters and spaces only — no digits or special characters.",
    };
  }
  const slug = slugifyVenueName(value);
  if (!slug) {
    return {
      ok: false,
      error: "Use English letters and spaces only — no digits or special characters.",
    };
  }
  return { ok: true, value, slug };
}
