// Single source of truth for the demo content created by `prisma/seed.mjs`.
//
// Pure data + one pure function — no imports, no Prisma, no Next — so it can be required by both
// the seed script (plain `node`) and the DB-free vitest test that validates it against the real
// `lib/site/*` validators. Shapes mirror `lib/site/types.ts`; the derived JSON strings mirror what
// `saveSite` / `publishSite` would persist (`{ blocks }` and `{ name, blocks }`).

/** Demo owner credentials — also documented in the root CLAUDE.md "Build / run / test". */
export const DEMO_EMAIL = "demo@mizrahitality.test";
export const DEMO_PASSWORD = "demo1234";

/** Demo venue. The slug is derived exactly like `slugifyVenueName` (drop whitespace, lowercase). */
export const DEMO_VENUE_NAME = "Hotel Mizrahi";
export const DEMO_SLUG = DEMO_VENUE_NAME.replace(/\s+/g, "").toLowerCase(); // "hotelmizrahi"

/**
 * The demo page's blocks, in order: an intro Rich Text, the one stock Image, a "plan your stay"
 * Rich Text (with a link), and the one Book Now button. Each `html` is hand-authored to be
 * **already identical to what `sanitizeRichTextHtml` emits** — only allowed tags, no inter-tag
 * whitespace, links carrying `rel="noopener noreferrer" target="_blank"` — so the seed never has
 * to run the sanitizer and the test can assert `sanitizeRichTextHtml(html) === html`.
 */
export const DEMO_BLOCKS = [
  {
    id: "intro",
    type: "rich-text",
    html:
      "<h2>Welcome to Hotel Mizrahi</h2>" +
      "<p>A small boutique stay in the heart of the old city — warm rooms, a sunlit courtyard, and breakfast that runs late.</p>" +
      "<ul><li>Twelve rooms, each a little different</li><li>Rooftop terrace open from sunrise to midnight</li><li>Five minutes from the market on foot</li></ul>",
  },
  {
    id: "photo",
    type: "image",
    imageUrl: "/stock/hotel.svg",
    alt: "The Hotel Mizrahi lobby",
  },
  {
    id: "stay",
    type: "rich-text",
    html:
      "<h3>Plan your stay</h3>" +
      '<p>Check in from <strong>3pm</strong>, check out by <strong>11am</strong>. Need to get here? See our <a href="https://example.com" rel="noopener noreferrer" target="_blank">directions</a>.</p>',
  },
  {
    id: "book",
    type: "book-now",
  },
];

/** What goes in `Site.contentJson` — `JSON.stringify({ blocks })`, the draft state. */
export const DEMO_CONTENT_JSON = JSON.stringify({ blocks: DEMO_BLOCKS });

/** What goes in `Site.publishedJson` — `JSON.stringify({ name, blocks })`; mirrors `buildPublishedSnapshot`. */
export const DEMO_PUBLISHED_JSON = JSON.stringify({ name: DEMO_VENUE_NAME, blocks: DEMO_BLOCKS });

// Sample analytics events so the owner dashboard shows a non-trivial funnel right after seeding.
// Counts: 16 visit / 5 book-now-hover / 2 book-now-click. Each entry is `[type, daysAgo, hoursAgo]`
// — `createdAt` = now − daysAgo days − hoursAgo hours, so every row is comfortably in the past and
// they spread over the last ~week. `type` values are the `ANALYTICS_EVENT_TYPES` literals from
// `@mizrahitality/contracts`.
const SAMPLE_EVENTS = [
  ["visit", 6, 3],
  ["visit", 6, 9],
  ["visit", 6, 15],
  ["visit", 5, 4],
  ["visit", 5, 11],
  ["visit", 5, 20],
  ["visit", 4, 6],
  ["visit", 4, 13],
  ["visit", 3, 2],
  ["visit", 3, 10],
  ["visit", 3, 19],
  ["visit", 2, 7],
  ["visit", 2, 16],
  ["visit", 1, 5],
  ["visit", 1, 14],
  ["visit", 0, 2],
  ["book-now-hover", 5, 11],
  ["book-now-hover", 4, 13],
  ["book-now-hover", 3, 10],
  ["book-now-hover", 1, 14],
  ["book-now-hover", 0, 2],
  ["book-now-click", 4, 13],
  ["book-now-click", 1, 14],
];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Build the demo `AnalyticsEvent` rows. Pure: takes "now" as an argument (defaults to the real
 * clock) and returns `{ slug, type, createdAt }[]` — `createdAt` = now − daysAgo days − hoursAgo
 * hours. Same length / shape on every call.
 */
export function demoEvents(now = new Date()) {
  const base = now.getTime();
  return SAMPLE_EVENTS.map(([type, daysAgo, hoursAgo]) => ({
    slug: DEMO_SLUG,
    type,
    createdAt: new Date(base - daysAgo * DAY_MS - hoursAgo * HOUR_MS),
  }));
}

// ---------------------------------------------------------------------------
// Second demo owner — fully seeded but with **zero** analytics events. Lets the
// sign-in page's "Quick fill" panel offer a populated demo (above) *and* an
// empty one whose dashboard fills up live as the reviewer clicks the published
// venue page. Same shape as the first owner; no second event set.
// ---------------------------------------------------------------------------

export const DEMO2_EMAIL = "demo2@mizrahitality.test";
export const DEMO2_PASSWORD = "demo1234";

export const DEMO2_VENUE_NAME = "Sample Inn";
export const DEMO2_SLUG = DEMO2_VENUE_NAME.replace(/\s+/g, "").toLowerCase(); // "sampleinn"

/**
 * Minimal published page — one intro Rich Text + a Book Now button. No image (saves a stock asset),
 * but enough surface for `visit`, `book-now-hover`, and `book-now-click` events to flow back. Each
 * `html` is already in the `sanitizeRichTextHtml` shape (allowed tags only, no inter-tag whitespace,
 * no attributes), same convention as `DEMO_BLOCKS`.
 */
export const DEMO2_BLOCKS = [
  {
    id: "intro",
    type: "rich-text",
    html:
      "<h2>Welcome to Sample Inn</h2>" +
      "<p>A quiet coastal stay. Click <strong>Book Now</strong> below — every hover and click flows into the owner dashboard live.</p>",
  },
  { id: "book", type: "book-now" },
];

export const DEMO2_CONTENT_JSON = JSON.stringify({ blocks: DEMO2_BLOCKS });
export const DEMO2_PUBLISHED_JSON = JSON.stringify({ name: DEMO2_VENUE_NAME, blocks: DEMO2_BLOCKS });
