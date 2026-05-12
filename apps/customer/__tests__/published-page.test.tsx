import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublishedPage as PublishedPageData } from "@mizrahitality/contracts";
import { PublishedPage } from "@/components/published-page";

const BASE = "http://localhost:5113";

function render(page: PublishedPageData) {
  return renderToStaticMarkup(<PublishedPage page={page} builderApiUrl={BASE} />);
}

describe("<PublishedPage> server render", () => {
  it("renders the venue name, rich-text HTML, the image, and the Book Now button", () => {
    const html = render({
      slug: "cafe-mizrahi",
      name: "Cafe Mizrahi",
      blocks: [
        { id: "b1", type: "rich-text", html: "<p>Hello <strong>world</strong></p>" },
        { id: "b2", type: "image", imageUrl: "/stock/cafe.svg", alt: "Our cafe" },
        { id: "b3", type: "book-now" },
      ],
    });
    expect(html).toContain("Cafe Mizrahi");
    expect(html).toContain("Hello <strong>world</strong>");
    expect(html).toContain('class="miz-prose"');
    expect(html).toContain('src="http://localhost:5113/stock/cafe.svg"');
    expect(html).toContain('alt="Our cafe"');
    expect(html).toContain("Book Now");
  });

  it("shows the 'no image' fallback (and no <img>) for an image block with an empty URL", () => {
    const html = render({
      slug: "x",
      name: "X",
      blocks: [{ id: "b1", type: "image", imageUrl: "", alt: "" }],
    });
    expect(html).toContain("No image chosen yet");
    expect(html).not.toContain("<img");
  });

  it("falls back to a placeholder venue name when name is empty", () => {
    const html = render({ slug: "x", name: "", blocks: [] });
    expect(html).toContain("Your venue");
  });
});
