// Server-side HTML sanitization for Rich Text blocks. `sanitize-html` is a Node library
// (`htmlparser2` under the hood) — this module must only ever be imported from server code
// (`lib/site/actions.ts`), never from a `"use client"` component. Tiptap's schema already
// constrains the editor's markup on the client; this is the authoritative pass on save, and the
// rendered output (`dangerouslySetInnerHTML`) trusts it.

import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  // Tiptap StarterKit + Link can emit these; <img> is excluded (images are their own block).
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "code",
    "pre",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Force safe link attributes on every surviving <a>.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
  disallowedTagsMode: "discard",
};

/**
 * Sanitize Rich Text HTML: drops `<script>`, any `on*` handler, `style=`, `javascript:` hrefs,
 * `<iframe>`, `<img>`; keeps `<p>/<br>/<strong>/<b>/<em>/<i>/<u>/<s>/<h1-3>/<ul>/<ol>/<li>/<a
 * href>/<blockquote>/<code>/<pre>`; every surviving `<a>` gets `rel="noopener noreferrer"
 * target="_blank"`. Idempotent.
 */
export function sanitizeRichTextHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
