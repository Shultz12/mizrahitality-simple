# Roadmap

## Product: Mizrahitality Simple
**North Star:** Every P0 requirement demoable end-to-end on localhost — an owner builds &
publishes a single-page site, the Next.js SSR customer site renders the published page, and
analytics round-trip to the owner dashboard.

---

## Milestone: v1.0 — Two-product drag-and-drop hospitality site builder + SSR visitor site, end-to-end on localhost
**Status:** planned
**Success Criteria:** An owner can sign up (email + password), create a site by naming the
venue (the slug is derived from the name — spaces removed, lowercased), build a single
landing page by dragging blocks from a "Drag into site" tray onto a canvas under a pinned
venue-name header — one or more Rich Text boxes, at most one Image, at most one Book Now
button — reorder/delete them with live preview, write venue copy and Publish; the Next.js
SSR customer site at `localhost:<port>/<slug>` renders the published page server-side, shows
a friendly placeholder for an unpublished slug, and posts visit / Book Now hover / Book Now
click events through the API; the owner dashboard shows total visits, Book Now clicks, Book
Now hovers with correct numbers; both products communicate only over the documented JSON
REST API in a single pnpm monorepo; the demo-seed populates a ready-to-show published site;
core logic (auth, analytics aggregation, REST contract) is tested at moderate rigor with no
P0 defects in the demo flow.

### Features (build in roughly this order)
| Feature | Status | Notes |
|---|---|---|
| monorepo-foundation | planned | pnpm workspace + both Next.js app skeletons + shared packages (`contracts`, configs) + Prisma/SQLite. Tech decisions live in `CLAUDE.md`. |
| owner-auth | planned | Sign-up / sign-in (email + password); bcrypt + signed httpOnly cookie; `OwnerAccount` model. |
| site-builder | planned | Site creation (venue name → slug). Single-page builder: pinned venue-name header + repeatable Rich Text (Tiptap), at most one Image, at most one Book Now; drag-and-drop (dnd-kit) + reorder/delete + live preview; image upload + bundled stock set; `Site` model. |
| remove-ai-and-variants | planned | Descope: strip AI copy touch-up, the 7 audience variants, the styling-preset list, and visitor-type targeting (the demo switcher, per-gender/age analytics) from the docs + code; trim the downstream charters. |
| published-page-api | planned | REST endpoint the Customer app fetches the published page (per slug) from. |
| analytics-api | planned | Analytics event ingest + storage + aggregation endpoints. |
| analytics-dashboard | planned | Owner dashboard: total visits, Book Now clicks/hovers. |
| customer-site | planned | SSR public site at `localhost:5114/<slug>`: renders the published page, Book Now confirmation, posts analytics. |
| demo-seed | complete | `pnpm seed` populates a ready-to-show published site — owner `demo@mizrahitality.test` / `demo1234`, venue "Hotel Mizrahi" → `localhost:5114/hotelmizrahi`, plus sample analytics; re-runnable (scoped reset). |

---

## What We're Not Building
| Request | Reason | Revisit When |
|---|---|---|
| Real custom domains / DNS / SSL / hosting | Runs on localhost; the slug is just a URL path segment and the API identity | Productionizing beyond the interview |
| Real booking / payments behind "Book Now" | Out of scope; a click ends at a confirmation modal/toast | A real venue customer needs end-to-end booking |
| Multiple sites per owner, or multi-page sites | One owner → one single-page site keeps the model simple | A real need for multi-venue / multi-page owners emerges |
| More than one Image or Book Now block per page | A single Image and a single CTA keep the builder technophobe-simple | Owners ask for more with evidence |
| Teams / roles / org accounts | Single-owner accounts suffice | Multi-operator venues become a target segment |
| Email verification & password reset | Not core to the demo; immediate sign-up only | Hardening for real users |
| Real visitor identification or audience segmentation | Not in this edition | — |
| Block types beyond Rich Text / Image / Book Now (video, forms, maps, embeds) | Three blocks keep the builder technophobe-simple | Owners ask for more with evidence |
| AI / LLM features of any kind, and audience-targeted content variants | The published page is exactly what the owner built | — |
| Analytics beyond the dashboard metrics (A/B, funnels, cohorts, exports) | Scope control | Owners ask for it with evidence |
| API authentication / rate limiting / multi-tenant hardening | Open API for the local demo | Productionizing beyond the interview |
| A bespoke design system / custom component library | No design files provided up front; UI uses shadcn/ui (buttons + icons) + Tailwind | — |

---

## Workflow
- **Process:** One feature at a time, developed with Claude Code's built-in **Plan mode** —
  no separate spec/design/plan documents. Product context lives in `PRD.md`, `VISION.md`, and
  this roadmap; technical decisions live in `CLAUDE.md`.
- **Test rigor:** Moderate — core logic well-tested (auth, analytics math, the REST API
  contract); lighter on the supplied UI.
- **Skills:** Use the `update-database` (Prisma) skill when it applies.
- **Commits:** No commit obligation unless the user asks.
