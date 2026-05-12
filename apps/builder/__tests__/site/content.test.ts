import { describe, it, expect } from "vitest";

import {
  countByType,
  isValidBlock,
  parsePageContent,
  validateBlocks,
} from "@/lib/site/content";
import type { Block } from "@/lib/site/types";

const rt = (id: string, html = "<p>hi</p>"): Block => ({ id, type: "rich-text", html });
const img = (id: string): Block => ({ id, type: "image", imageUrl: "/stock/cafe.svg", alt: "Café" });
const bn = (id: string): Block => ({ id, type: "book-now" });

describe("parsePageContent", () => {
  it("parses a well-formed JSON string", () => {
    expect(parsePageContent('{"blocks":[]}')).toEqual({ blocks: [] });
  });

  it("is tolerant of garbage and odd shapes", () => {
    for (const bad of ["not json", "{}", '{"blocks":"nope"}', null, undefined, 42, [], { x: 1 }]) {
      expect(parsePageContent(bad)).toEqual({ blocks: [] });
    }
  });

  it("keeps valid blocks and drops invalid ones, preserving order", () => {
    const input = JSON.stringify({
      blocks: [rt("a"), { type: "bogus" }, img("b"), { type: "rich-text" }, bn("c")],
    });
    const result = parsePageContent(input);
    expect(result.blocks.map((b) => b.id)).toEqual(["a", "b", "c"]);
    expect(result.blocks.map((b) => b.type)).toEqual(["rich-text", "image", "book-now"]);
  });

  it("de-dups the singletons — keeps only the first image and the first book-now", () => {
    const input = JSON.stringify({ blocks: [img("img1"), img("img2"), bn("bn1"), bn("bn2")] });
    const result = parsePageContent(input);
    expect(result.blocks.map((b) => b.id)).toEqual(["img1", "bn1"]);
  });

  it("assigns an id to a block that's missing one rather than dropping it", () => {
    const input = JSON.stringify({ blocks: [{ type: "rich-text", html: "<p>x</p>" }] });
    const result = parsePageContent(input);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]?.type).toBe("rich-text");
    expect(typeof result.blocks[0]?.id).toBe("string");
    expect(result.blocks[0]?.id).not.toBe("");
  });

  it("preserves block order through the JSON round-trip", () => {
    const a = rt("a");
    const b = img("b");
    const c = bn("c");
    const result = parsePageContent(JSON.stringify({ blocks: [c, a, b] }));
    expect(result.blocks.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("accepts an already-parsed object", () => {
    expect(parsePageContent({ blocks: [rt("a")] }).blocks.map((b) => b.id)).toEqual(["a"]);
  });
});

describe("isValidBlock", () => {
  it("accepts well-formed blocks of each type", () => {
    expect(isValidBlock(rt("a"))).toBe(true);
    expect(isValidBlock(img("b"))).toBe(true);
    expect(isValidBlock(bn("c"))).toBe(true);
  });

  it("rejects malformed or unknown blocks", () => {
    expect(isValidBlock({ type: "image", imageUrl: 5, alt: "x" })).toBe(false);
    expect(isValidBlock({ type: "image", imageUrl: "/x.png" })).toBe(false);
    expect(isValidBlock({ type: "rich-text" })).toBe(false);
    expect(isValidBlock({ type: "link" })).toBe(false);
    expect(isValidBlock(null)).toBe(false);
    expect(isValidBlock("nope")).toBe(false);
  });
});

describe("countByType", () => {
  it("counts blocks by type", () => {
    expect(countByType([rt("a"), rt("b"), img("c")])).toEqual({
      "rich-text": 2,
      image: 1,
      "book-now": 0,
    });
  });
});

describe("validateBlocks", () => {
  it("accepts zero or one of each singleton, and any number of rich-text", () => {
    expect(validateBlocks([]).ok).toBe(true);
    expect(validateBlocks([img("a")]).ok).toBe(true);
    expect(validateBlocks([bn("a")]).ok).toBe(true);
    expect(validateBlocks([rt("a"), rt("b"), rt("c")]).ok).toBe(true);
    expect(validateBlocks([rt("a"), img("b"), bn("c")]).ok).toBe(true);
  });

  it("rejects two image blocks", () => {
    expect(validateBlocks([img("a"), img("b")])).toEqual({
      ok: false,
      error: "You can only add one Image block.",
    });
  });

  it("rejects two book-now blocks", () => {
    expect(validateBlocks([bn("a"), bn("b")])).toEqual({
      ok: false,
      error: "You can only add one Book Now button.",
    });
  });

  it("rejects an unknown block type", () => {
    const weird = { id: "w", type: "weird" } as unknown as Block;
    expect(validateBlocks([weird]).ok).toBe(false);
  });
});
