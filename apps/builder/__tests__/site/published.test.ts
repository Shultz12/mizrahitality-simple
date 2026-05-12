import { describe, it, expect } from "vitest";

import {
  buildPublishedSnapshot,
  resolvePublishedResponse,
  toPublishedPage,
} from "@/lib/site/published";
import { publishSite, saveSite, type WriteSiteDeps } from "@/lib/site/site";
import type { Block } from "@/lib/site/types";

const rt = (id: string, html = "<p>hi</p>"): Block => ({ id, type: "rich-text", html });
const img = (id: string): Block => ({ id, type: "image", imageUrl: "/stock/cafe.svg", alt: "Café" });
const bn = (id: string): Block => ({ id, type: "book-now" });

describe("buildPublishedSnapshot", () => {
  it("serializes { name, blocks } preserving block order", () => {
    const snap = buildPublishedSnapshot({ name: "Cafe Mizrahi", blocks: [rt("a"), img("b"), bn("c")] });
    expect(JSON.parse(snap)).toEqual({
      name: "Cafe Mizrahi",
      blocks: [rt("a"), img("b"), bn("c")],
    });
  });
});

describe("toPublishedPage", () => {
  it("returns null for a never-published snapshot", () => {
    expect(toPublishedPage("cafemizrahi", null)).toBeNull();
  });

  it("returns null for unparseable JSON", () => {
    expect(toPublishedPage("cafemizrahi", "not json")).toBeNull();
  });

  it("falls back to an empty name + no blocks when the shape is off", () => {
    expect(toPublishedPage("c", JSON.stringify({ blocks: "nope" }))).toEqual({
      slug: "c",
      name: "",
      blocks: [],
    });
  });

  it("keeps valid blocks, drops bogus ones, preserves order", () => {
    const page = toPublishedPage(
      "c",
      JSON.stringify({ name: "X", blocks: [rt("a"), { type: "bogus" }, img("b")] }),
    );
    expect(page).toEqual({ slug: "c", name: "X", blocks: [rt("a"), img("b")] });
  });

  it("de-dups the singletons (inherited from parsePageContent) — keeps the first image", () => {
    const page = toPublishedPage("c", JSON.stringify({ name: "X", blocks: [img("img1"), img("img2")] }));
    expect(page?.blocks.map((b) => b.id)).toEqual(["img1"]);
  });

  it("keeps a block missing an id, assigning a generated one", () => {
    const page = toPublishedPage("c", JSON.stringify({ name: "X", blocks: [{ type: "book-now" }] }));
    expect(page?.blocks).toHaveLength(1);
    expect(page?.blocks[0]?.type).toBe("book-now");
    expect(typeof page?.blocks[0]?.id).toBe("string");
    expect(page?.blocks[0]?.id).not.toBe("");
  });
});

describe("resolvePublishedResponse", () => {
  it("404 not_found when no site has the slug", () => {
    expect(resolvePublishedResponse("ghost", null)).toEqual({
      status: 404,
      body: { ok: false, error: { code: "not_found", message: expect.any(String) } },
    });
  });

  it("200 unpublished when the site exists but was never published", () => {
    expect(resolvePublishedResponse("c", { slug: "c", publishedJson: null })).toEqual({
      status: 200,
      body: { ok: false, error: { code: "unpublished", message: expect.any(String) } },
    });
  });

  it("200 with the page when a published snapshot exists", () => {
    expect(
      resolvePublishedResponse("c", {
        slug: "c",
        publishedJson: JSON.stringify({ name: "Cafe Mizrahi", blocks: [rt("a")] }),
      }),
    ).toEqual({
      status: 200,
      body: { ok: true, data: { slug: "c", name: "Cafe Mizrahi", blocks: [rt("a")] } },
    });
  });
});

// A fake WriteSiteDeps: `findSite` knows site "s1" owned by "o1"; `updateSite` records every call.
function makeFakeDeps() {
  const calls: { siteId: string; data: Parameters<WriteSiteDeps["updateSite"]>[1] }[] = [];
  const deps: WriteSiteDeps = {
    findSite: async (id) => (id === "s1" ? { id: "s1", ownerId: "o1" } : null),
    updateSite: async (siteId, data) => {
      calls.push({ siteId, data });
    },
  };
  return { deps, calls };
}

describe("saveSite / publishSite — snapshot independence", () => {
  it("publish writes the draft and the published snapshot together", async () => {
    const { deps, calls } = makeFakeDeps();
    const result = await publishSite("s1", "o1", { name: "Cafe Mizrahi", blocks: [rt("r1")] }, deps);
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    const data = calls[0]!.data;
    expect(data.isDraft).toBe(false);
    expect(data.publishedAt).toBeInstanceOf(Date);
    expect(data.contentJson).toBe(JSON.stringify({ blocks: [rt("r1")] }));
    expect(data.publishedJson).toBe(JSON.stringify({ name: "Cafe Mizrahi", blocks: [rt("r1")] }));
  });

  it("a later save is a draft edit that never touches the published snapshot", async () => {
    const { deps, calls } = makeFakeDeps();
    await publishSite("s1", "o1", { name: "Cafe Mizrahi", blocks: [rt("r1")] }, deps);
    const result = await saveSite("s1", "o1", { name: "Cafe Tov", blocks: [rt("r2")] }, deps);
    expect(result).toEqual({ ok: true });
    const data = calls[1]!.data;
    expect(data.isDraft).toBe(true);
    expect(data.contentJson).toBe(JSON.stringify({ blocks: [rt("r2")] }));
    expect("publishedJson" in data).toBe(false);
    expect("publishedAt" in data).toBe(false);
  });

  it("re-publishing overwrites the snapshot with the new state", async () => {
    const { deps, calls } = makeFakeDeps();
    await publishSite("s1", "o1", { name: "Cafe Mizrahi", blocks: [rt("r1")] }, deps);
    await saveSite("s1", "o1", { name: "Cafe Tov", blocks: [rt("r2")] }, deps);
    await publishSite("s1", "o1", { name: "Cafe Tov", blocks: [rt("r2")] }, deps);
    expect(calls[2]!.data.publishedJson).toBe(JSON.stringify({ name: "Cafe Tov", blocks: [rt("r2")] }));
  });

  it("rejects a payload whose siteId/owner don't match", async () => {
    const { deps } = makeFakeDeps();
    expect(await publishSite("s1", "intruder", { name: "X", blocks: [] }, deps)).toEqual({
      ok: false,
      error: "Site not found.",
    });
    expect(await publishSite("missing", "o1", { name: "X", blocks: [] }, deps)).toEqual({
      ok: false,
      error: "Site not found.",
    });
  });

  it("passes through venue-name validation", async () => {
    const { deps, calls } = makeFakeDeps();
    expect(await publishSite("s1", "o1", { name: "Cafe 23", blocks: [] }, deps)).toEqual({
      ok: false,
      error: "Use English letters and spaces only — no digits or special characters.",
    });
    expect(calls).toHaveLength(0);
  });

  it("sanitizes rich-text HTML before persisting (draft and published)", async () => {
    const { deps, calls } = makeFakeDeps();
    await publishSite(
      "s1",
      "o1",
      { name: "Cafe Mizrahi", blocks: [rt("r1", "<p>hi</p><script>alert(1)</script>")] },
      deps,
    );
    const data = calls[0]!.data;
    expect(data.contentJson).not.toContain("<script>");
    expect(data.publishedJson).not.toContain("<script>");
  });
});
