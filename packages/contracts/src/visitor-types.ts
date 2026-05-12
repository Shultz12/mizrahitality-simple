/**
 * Visitor-type vocabulary shared by the Builder API and the Customer site.
 *
 * A visitor is either an audience segment — one of 2 genders × 3 age groups — or the
 * segment-agnostic `"neutral"` case (shown until the demo switcher picks a type, and used
 * for the neutral published variant). That's 7 visitor types in total.
 */

export type Gender = "male" | "female";
export const GENDERS: readonly Gender[] = ["male", "female"];

export type AgeGroup = "18-30" | "31-50" | "50+";
export const AGE_GROUPS: readonly AgeGroup[] = ["18-30", "31-50", "50+"];

/** A targeted audience segment. */
export interface AudienceVisitorType {
  readonly gender: Gender;
  readonly ageGroup: AgeGroup;
}

/** Any visitor type: an audience segment, or the neutral (segment-agnostic) case. */
export type VisitorType = AudienceVisitorType | "neutral";

export const NEUTRAL = "neutral" as const;

/** All seven visitor types: every (gender × age group) pair, plus `"neutral"`. */
export const VISITOR_TYPES: readonly VisitorType[] = [
  ...GENDERS.flatMap((gender) =>
    AGE_GROUPS.map((ageGroup): AudienceVisitorType => ({ gender, ageGroup })),
  ),
  NEUTRAL,
];

export function isNeutral(vt: VisitorType): vt is "neutral" {
  return vt === NEUTRAL;
}

/**
 * Canonical token for a visitor type — safe for DB rows and (via `URLSearchParams`) URLs:
 * `"male-18-30"`, `"female-50+"`, …, or `"neutral"`. Note `"50+"` contains a `+`, so build
 * query strings with `URLSearchParams` (which percent-encodes it) rather than by hand.
 */
export function visitorTypeKey(vt: VisitorType): string {
  return isNeutral(vt) ? NEUTRAL : `${vt.gender}-${vt.ageGroup}`;
}

const GENDER_SET: ReadonlySet<string> = new Set<string>(GENDERS);
const AGE_GROUP_SET: ReadonlySet<string> = new Set<string>(AGE_GROUPS);

/** Inverse of {@link visitorTypeKey}; returns `null` for an unrecognised token. */
export function parseVisitorTypeKey(key: string): VisitorType | null {
  if (key === NEUTRAL) return NEUTRAL;
  // Age groups contain a hyphen ("18-30"), so split on the FIRST hyphen only.
  const dash = key.indexOf("-");
  if (dash === -1) return null;
  const gender = key.slice(0, dash);
  const ageGroup = key.slice(dash + 1);
  if (!GENDER_SET.has(gender) || !AGE_GROUP_SET.has(ageGroup)) return null;
  return { gender: gender as Gender, ageGroup: ageGroup as AgeGroup };
}
