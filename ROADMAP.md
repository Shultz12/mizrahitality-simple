# Roadmap

## Product: Mizrahitality Simple
**North Star:** Every P0 requirement demoable end-to-end on localhost — an owner builds &
publishes a multi-page site, the Next.js SSR customer site renders the right
per-visitor-type variant, and analytics round-trip to the owner dashboard.

---

## Milestone: v1.0 — Two-product drag-and-drop hospitality site builder + SSR visitor site, end-to-end on localhost
**Status:** planned
**Success Criteria:** An owner can sign up (email, password, domain-name), build a
multi-page site by drag-and-dropping Rich Text / Image / Book Now blocks with live preview,
write a venue description and AI-touch-up it, generate all 7 audience variants (male/female
× 18–30/31–50/50+ + neutral, each with copy + a light styling treatment) and Publish; the
Next.js SSR customer site at `localhost:<port>/<domain-name>` renders the neutral variant
by default and the matching variant when the demo switcher changes visitor type, shows a
friendly placeholder for an unpublished domain, and posts visit / Book Now hover / Book Now
click events through the API; the owner dashboard shows total visits, Book Now clicks, Book
Now hovers, and gender + age-group breakdowns with correct numbers; both products
communicate only over the documented JSON REST API in a single monorepo; the demo-seed
populates a ready-to-show published site; core logic (auth, analytics aggregation, REST
contract, AI variant generation) is tested at moderate rigor with no P0 defects in the demo
flow.

### Features (build in roughly this order)
| Feature | Status | Notes |
|---|---|---|
| monorepo-foundation | planned | pnpm workspace + both Next.js app skeletons + shared packages + Prisma/SQLite. Design decisions live in `CLAUDE.md`. |
| owner-auth | planned | Sign-up / sign-in (email, password, domain-name); amends the `OwnerAccount` model. |
| site-builder | planned | Multi-page builder: Rich Text / Image / Book Now blocks, drag-and-drop, live preview; image upload endpoint; `Site` model. |
| ai-copy-and-variants | planned | AI description touch-up + the 7 audience variants (copy + a light styling treatment). |
| published-page-api | planned | REST endpoint the Customer app fetches the published page from. |
| analytics-api | planned | Analytics event ingest + storage + aggregation endpoints. |
| analytics-dashboard | planned | Owner dashboard: total visits, Book Now clicks/hovers, gender + age-group breakdowns. |
| customer-site | planned | SSR public site at `localhost:5112/<domain-name>`: renders the variant, demo visitor-type switcher, posts analytics. |
| demo-seed | planned | `pnpm seed` populates a ready-to-show published site. |

---

## What We're Not Building
| Request | Reason | Revisit When |
|---|---|---|
| Real custom domains / DNS / SSL / hosting | Runs on localhost; the domain-name is just a URL path segment and the API identity | Productionizing beyond the interview |
| Real booking / payments behind "Book Now" | Out of scope; a click ends at a confirmation modal/toast | A real venue customer needs end-to-end booking |
| Multiple sites per owner account | One owner → one site keeps the model simple | A real need for multi-venue owners emerges |
| Teams / roles / org accounts | Single-owner accounts suffice | Multi-operator venues become a target segment |
| Email verification & password reset | Not core to the demo; immediate sign-up only | Hardening for real users |
| Real visitor identification (true gender/age) | Unsolvable here; simulated via the demo switcher | A privacy-respecting signal source exists |
| Block types beyond Rich Text / Image / Book Now (video, forms, maps, embeds) | Three blocks keep the builder technophobe-simple | Owners ask for more with evidence |
| AI-synthesized page layouts or full template designs | AI only authors copy + a light styling treatment; the UI is supplied | A real need to synthesize new designs emerges |
| Analytics beyond the dashboard metrics (A/B, funnels, cohorts, exports) | Scope control | Owners ask for it with evidence |
| API authentication / rate limiting / multi-tenant hardening | Open API for the local demo | Productionizing beyond the interview |
| Novelty visitor types (e.g. an "alien" gender) | The simple edition keeps it to male/female | — |
| A bespoke design system / custom component library | No design files provided; UI uses shadcn/ui (buttons + icons) + Tailwind, built directly | — |

---

## Workflow
- **Process:** One feature at a time, developed with Claude Code's built-in **Plan mode** —
  no separate spec/design/plan documents. Product context lives in `PRD.md`, `VISION.md`, and
  this roadmap; technical decisions live in `CLAUDE.md`.
- **Test rigor:** Moderate — core logic well-tested (auth, analytics math, the REST API
  contract, AI variant generation); lighter on the supplied UI.
- **Skills:** Use `update-database` (Prisma) and the `claude-api` skill when they apply.
- **Commits:** No commit obligation unless the user asks.
