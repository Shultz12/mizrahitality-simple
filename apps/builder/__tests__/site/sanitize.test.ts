import { describe, it, expect } from "vitest";

import { sanitizeRichTextHtml } from "@/lib/site/sanitize";

describe("sanitizeRichTextHtml", () => {
  it("strips <script> but keeps surrounding markup", () => {
    const out = sanitizeRichTextHtml("<p>hi</p><script>alert(1)</script>");
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain("<p>hi</p>");
  });

  it("strips on* event handlers", () => {
    const out = sanitizeRichTextHtml('<p onclick="x()">hi</p>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toContain("hi");
  });

  it("drops javascript: hrefs", () => {
    const out = sanitizeRichTextHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it("keeps http(s) links and forces rel=noopener noreferrer", () => {
    const out = sanitizeRichTextHtml('<a href="https://example.com">x</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("keeps allowed marks and block tags", () => {
    const out = sanitizeRichTextHtml(
      "<h1>T</h1><h2>U</h2><h3>V</h3><p><strong>b</strong> <b>b2</b> <em>i</em> <i>i2</i> <u>u</u> <s>s</s></p><ul><li>one</li></ul><ol><li>two</li></ol><blockquote>q</blockquote>",
    );
    for (const tag of [
      "<h1>",
      "<h2>",
      "<h3>",
      "<strong>",
      "<b>",
      "<em>",
      "<i>",
      "<u>",
      "<s>",
      "<ul>",
      "<ol>",
      "<li>",
      "<blockquote>",
    ]) {
      expect(out).toContain(tag);
    }
  });

  it("strips <style>, <iframe> and <img>", () => {
    const out = sanitizeRichTextHtml(
      '<style>body{color:red}</style><iframe src="https://evil"></iframe><img src="x.png"><p>ok</p>',
    );
    expect(out).not.toMatch(/<style|<iframe|<img/i);
    expect(out).toContain("<p>ok</p>");
  });

  it("is idempotent", () => {
    const doc =
      '<h2>Heading</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>item</li></ul><p><a href="https://example.com">link</a></p>';
    const once = sanitizeRichTextHtml(doc);
    expect(sanitizeRichTextHtml(once)).toBe(once);
  });
});
