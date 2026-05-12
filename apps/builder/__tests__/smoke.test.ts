import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { STOCK_IMAGES } from "@/lib/stock";
import { VISITOR_TYPES } from "@mizrahitality/contracts";

describe("builder foundation smoke", () => {
  it("merges class names via cn(), resolving conflicting Tailwind utilities", () => {
    expect(cn("a", { b: false }, "c")).toBe("a c");
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("ships a non-empty stock-image set served from public/stock/", () => {
    expect(STOCK_IMAGES.length).toBeGreaterThan(0);
    for (const img of STOCK_IMAGES) {
      expect(img.src.startsWith("/stock/")).toBe(true);
    }
  });

  it("can import the shared contracts package", () => {
    expect(VISITOR_TYPES).toHaveLength(7);
  });
});
