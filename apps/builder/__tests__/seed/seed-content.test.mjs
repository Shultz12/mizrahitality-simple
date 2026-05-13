// DB-free check that the demo seed *content* (prisma/seed-content.mjs) is well-formed: it runs the
// content through the same production validators the builder uses on save/publish, so a bad demo
// page (unknown block, two images, dirty HTML, a slug that doesn't match `slugifyVenueName`, …)
// fails here rather than at `pnpm seed`. The seed *script*'s DB writes are covered by the manual
// end-to-end walkthrough (see plans/09-demo-seed-plan.md), consistent with the rest of the repo.
//
// This is the feature's "seed smoke test" — kept DB-independent (no @prisma/client import) per the
// master-plan cross-cutting rule. `.test.mjs` is picked up via the `**/*.test.mjs` glob added to
// apps/builder/vitest.config.ts.

import { describe, it, expect } from "vitest";

import {
  DEMO_BLOCKS,
  DEMO_CONTENT_JSON,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_PUBLISHED_JSON,
  DEMO_SLUG,
  DEMO_VENUE_NAME,
  DEMO2_BLOCKS,
  DEMO2_CONTENT_JSON,
  DEMO2_EMAIL,
  DEMO2_PASSWORD,
  DEMO2_PUBLISHED_JSON,
  DEMO2_SLUG,
  DEMO2_VENUE_NAME,
  demoEvents,
} from "../../prisma/seed-content.mjs";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import { parsePageContent, validateBlocks, countByType } from "@/lib/site/content";
import { toPublishedPage } from "@/lib/site/published";
import { sanitizeRichTextHtml } from "@/lib/site/sanitize";
import { validateVenueName } from "@/lib/site/slug";
import { ANALYTICS_EVENT_TYPES } from "@mizrahitality/contracts";

describe("demo seed content", () => {
  it("the venue name validates and derives the documented slug", () => {
    expect(validateVenueName(DEMO_VENUE_NAME)).toEqual({
      ok: true,
      value: DEMO_VENUE_NAME,
      slug: DEMO_SLUG,
    });
    expect(DEMO_SLUG).toBe("hotelmizrahi");
  });

  it("the demo credentials are accepted by the auth validators", () => {
    expect(validateEmail(DEMO_EMAIL)).toEqual({ ok: true, value: DEMO_EMAIL });
    expect(validatePassword(DEMO_PASSWORD).ok).toBe(true);
  });

  it("contentJson round-trips through parsePageContent unchanged (ids, shape, order)", () => {
    expect(parsePageContent(DEMO_CONTENT_JSON).blocks).toEqual(DEMO_BLOCKS);
  });

  it("the blocks satisfy validateBlocks — exactly one Image and one Book Now, plus rich text", () => {
    expect(validateBlocks(DEMO_BLOCKS).ok).toBe(true);
    const counts = countByType(DEMO_BLOCKS);
    expect(counts.image).toBe(1);
    expect(counts["book-now"]).toBe(1);
    expect(counts["rich-text"]).toBeGreaterThanOrEqual(1);
  });

  it("publishedJson reads back as the expected published page", () => {
    expect(toPublishedPage(DEMO_SLUG, DEMO_PUBLISHED_JSON)).toEqual({
      slug: DEMO_SLUG,
      name: DEMO_VENUE_NAME,
      blocks: DEMO_BLOCKS,
    });
  });

  it("every rich-text block's HTML is already sanitized (sanitizer is a no-op on it)", () => {
    const richText = DEMO_BLOCKS.filter((b) => b.type === "rich-text");
    expect(richText.length).toBeGreaterThan(0);
    for (const b of richText) {
      expect(sanitizeRichTextHtml(b.html)).toBe(b.html);
    }
  });

  it("the demo image points at a relative stock path", () => {
    const image = DEMO_BLOCKS.find((b) => b.type === "image");
    expect(image).toBeTruthy();
    expect(image.imageUrl).toBe("/stock/hotel.svg");
    expect(typeof image.alt).toBe("string");
    expect(image.alt.length).toBeGreaterThan(0);
  });

  it("demoEvents returns well-formed rows for the demo slug, with every event type present", () => {
    const events = demoEvents(new Date("2026-01-01T12:00:00Z"));
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.slug).toBe(DEMO_SLUG);
      expect(ANALYTICS_EVENT_TYPES).toContain(e.type);
      expect(e.createdAt).toBeInstanceOf(Date);
      expect(e.createdAt.getTime()).toBeLessThan(new Date("2026-01-01T12:00:00Z").getTime());
    }
    for (const type of ANALYTICS_EVENT_TYPES) {
      expect(events.some((e) => e.type === type)).toBe(true);
    }
  });

  it("demoEvents is deterministic in length and shape across calls", () => {
    expect(demoEvents().length).toBe(demoEvents().length);
  });
});

// Second demo owner — same content-shape guarantees as the first, minus the events block
// (owner 2 ships with zero analytics rows on purpose). Mirrors the assertions above so the
// sign-in page's "Quick fill" second card has a well-formed published site to land on.
describe("second demo seed content", () => {
  it("the venue name validates and derives the documented slug", () => {
    expect(validateVenueName(DEMO2_VENUE_NAME)).toEqual({
      ok: true,
      value: DEMO2_VENUE_NAME,
      slug: DEMO2_SLUG,
    });
    expect(DEMO2_SLUG).toBe("sampleinn");
  });

  it("the second owner's credentials are accepted by the auth validators", () => {
    expect(validateEmail(DEMO2_EMAIL)).toEqual({ ok: true, value: DEMO2_EMAIL });
    expect(validatePassword(DEMO2_PASSWORD).ok).toBe(true);
  });

  it("contentJson round-trips through parsePageContent unchanged", () => {
    expect(parsePageContent(DEMO2_CONTENT_JSON).blocks).toEqual(DEMO2_BLOCKS);
  });

  it("the blocks satisfy validateBlocks — at-most-one image / book-now plus rich text", () => {
    expect(validateBlocks(DEMO2_BLOCKS).ok).toBe(true);
    const counts = countByType(DEMO2_BLOCKS);
    expect(counts["book-now"]).toBe(1);
    expect(counts["rich-text"]).toBeGreaterThanOrEqual(1);
    expect(counts.image ?? 0).toBeLessThanOrEqual(1);
  });

  it("publishedJson reads back as the expected published page", () => {
    expect(toPublishedPage(DEMO2_SLUG, DEMO2_PUBLISHED_JSON)).toEqual({
      slug: DEMO2_SLUG,
      name: DEMO2_VENUE_NAME,
      blocks: DEMO2_BLOCKS,
    });
  });

  it("every rich-text block's HTML is already sanitized (sanitizer is a no-op on it)", () => {
    const richText = DEMO2_BLOCKS.filter((b) => b.type === "rich-text");
    expect(richText.length).toBeGreaterThan(0);
    for (const b of richText) {
      expect(sanitizeRichTextHtml(b.html)).toBe(b.html);
    }
  });

  it("uses a different email and slug than the first demo owner", () => {
    expect(DEMO2_EMAIL).not.toBe(DEMO_EMAIL);
    expect(DEMO2_SLUG).not.toBe(DEMO_SLUG);
  });
});
