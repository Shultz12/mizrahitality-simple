import { describe, it, expect, vi } from "vitest";

import { slugifyVenueName, validateVenueName } from "@/lib/site/slug";
import { createSite } from "@/lib/site/site";

const CHARS_ERROR = "Use English letters and spaces only — no digits or special characters.";
const EMPTY_ERROR = "Enter a venue name.";
const TAKEN_ERROR = "That venue name is taken — pick another.";

describe("slugifyVenueName", () => {
  it("removes whitespace and lowercases", () => {
    expect(slugifyVenueName("Cafe Mizrahi")).toBe("cafemizrahi");
    expect(slugifyVenueName("  Bar   Tov  ")).toBe("bartov");
    expect(slugifyVenueName("UPPER lower")).toBe("upperlower");
  });
});

describe("validateVenueName", () => {
  it("accepts a letters-and-spaces name and returns the trimmed value + slug", () => {
    expect(validateVenueName("Cafe Mizrahi")).toEqual({
      ok: true,
      value: "Cafe Mizrahi",
      slug: "cafemizrahi",
    });
    expect(validateVenueName("  Cafe Mizrahi  ")).toEqual({
      ok: true,
      value: "Cafe Mizrahi",
      slug: "cafemizrahi",
    });
  });

  it("rejects digits and special characters", () => {
    for (const bad of ["Cafe 23", "Café Mizrahi", "O'Brien", "Bar & Grill", "site_one"]) {
      expect(validateVenueName(bad)).toEqual({ ok: false, error: CHARS_ERROR });
    }
  });

  it("rejects empty / whitespace-only input", () => {
    expect(validateVenueName("")).toEqual({ ok: false, error: EMPTY_ERROR });
    expect(validateVenueName("   ")).toEqual({ ok: false, error: EMPTY_ERROR });
  });

  it("coerces non-string input to a failure", () => {
    for (const bad of [123, null, undefined, {}, []]) {
      expect(validateVenueName(bad).ok).toBe(false);
    }
  });
});

describe("createSite (collision handling, DB-injected)", () => {
  it("rejects a colliding slug reported by slugExists", async () => {
    const create = vi.fn();
    const result = await createSite(
      { ownerId: "owner1", name: "Taken" },
      { slugExists: async (slug) => slug === "taken", create },
    );
    expect(result).toEqual({ ok: false, error: TAKEN_ERROR });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the site when the slug is free", async () => {
    const create = vi.fn(async (data: { ownerId: string; name: string; slug: string }) => ({
      id: `site_${data.slug}`,
    }));
    const result = await createSite(
      { ownerId: "owner1", name: "Cafe Mizrahi" },
      { slugExists: async () => false, create },
    );
    expect(result).toEqual({
      ok: true,
      site: { id: "site_cafemizrahi", name: "Cafe Mizrahi", slug: "cafemizrahi" },
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      ownerId: "owner1",
      name: "Cafe Mizrahi",
      slug: "cafemizrahi",
    });
  });

  it("maps a P2002 race on create() to the same taken result", async () => {
    const result = await createSite(
      { ownerId: "owner1", name: "Cafe Mizrahi" },
      {
        slugExists: async () => false,
        create: async () => {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        },
      },
    );
    expect(result).toEqual({ ok: false, error: TAKEN_ERROR });
  });

  it("rejects an invalid venue name before any DB call", async () => {
    const slugExists = vi.fn(async () => false);
    const create = vi.fn();
    const result = await createSite({ ownerId: "owner1", name: "Cafe 23" }, { slugExists, create });
    expect(result).toEqual({ ok: false, error: CHARS_ERROR });
    expect(slugExists).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
