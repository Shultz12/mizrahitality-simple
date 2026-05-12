import { describe, it, expect } from "vitest";
import { apiOk, apiErr, type PublishedPage } from "@mizrahitality/contracts";
import { resolvePublishedView, absoluteImageUrl } from "@/lib/published-view";

const PAGE: PublishedPage = {
  slug: "cafe-mizrahi",
  name: "Cafe Mizrahi",
  blocks: [{ id: "b1", type: "rich-text", html: "<p>Hi</p>" }],
};

describe("resolvePublishedView", () => {
  it("maps an ok envelope to a page view", () => {
    expect(resolvePublishedView(apiOk(PAGE))).toEqual({ kind: "page", page: PAGE });
  });

  it("maps the `unpublished` error code to a placeholder view", () => {
    expect(resolvePublishedView(apiErr("unpublished", "not live yet"))).toEqual({
      kind: "placeholder",
    });
  });

  it("maps the `not_found` error code to a not-found view", () => {
    expect(resolvePublishedView(apiErr("not_found", "no such slug"))).toEqual({
      kind: "not-found",
    });
  });

  it("maps a network error to an error view, surfacing its message", () => {
    expect(resolvePublishedView(apiErr("network_error", "boom"))).toEqual({
      kind: "error",
      message: "boom",
    });
  });

  it("treats every other !ok code as an error view", () => {
    for (const code of ["internal_error", "bad_response", "totally_unknown"]) {
      expect(resolvePublishedView(apiErr(code, "x"))).toMatchObject({ kind: "error" });
    }
  });
});

describe("absoluteImageUrl", () => {
  it("resolves a Builder-relative path against the base", () => {
    expect(absoluteImageUrl("/uploads/x.png", "http://localhost:5113")).toBe(
      "http://localhost:5113/uploads/x.png",
    );
  });

  it("normalises a trailing slash on the base", () => {
    expect(absoluteImageUrl("/uploads/x.png", "http://localhost:5113/")).toBe(
      "http://localhost:5113/uploads/x.png",
    );
  });

  it("leaves an already-absolute http(s) URL untouched", () => {
    expect(absoluteImageUrl("https://cdn.example.com/a.jpg", "http://localhost:5113")).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });

  it("leaves a protocol-relative URL untouched", () => {
    expect(absoluteImageUrl("//cdn/x", "http://localhost:5113")).toBe("//cdn/x");
  });

  it("leaves a data: URL untouched", () => {
    expect(absoluteImageUrl("data:image/png;base64,AAAA", "http://localhost:5113")).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("leaves an empty string untouched", () => {
    expect(absoluteImageUrl("", "http://localhost:5113")).toBe("");
  });
});
