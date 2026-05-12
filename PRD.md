# PRD: Mizrahitality Simple

**Status:** Draft
**Last Updated:** 2026-05-11
**Author:** shultz.devops@gmail.com

## 1. Problem Statement
N/A — Mizrahitality Simple is built as a job-interview deliverable, not in response to a
validated market problem. Working context: strongly non-technical hospitality venue owners
struggle to publish a polished landing site and have no easy way to tailor its copy to
different audiences.

### Evidence
- **User signals:** N/A — no user research; this is an interview exercise.
- **Market signals:** N/A.
- **Business signals:** Demonstrates full-stack product delivery (SSR, two-product API
  integration, AI copy generation, monorepo) for a hiring evaluation.

## 2. Solution Overview
Mizrahitality Simple is two cooperating, server-side-rendered products in one monorepo.
The **Builder** app lets a non-technical venue owner sign up (email, password, domain-name
identifier), assemble a multi-page landing site from three drag-and-drop content blocks
(Rich Text, Image, Book Now button) with live preview, write a venue description and
AI-enhance it via a magic-wand "touch-up" button, generate AI-targeted copy variants for
each visitor type, publish, and watch a dashboard of visit and Book Now analytics. The
**Customer** app is a Next.js site routed at `localhost:<port>/<domain-name>` that, on
every request, calls the Builder's documented REST API for the published page matching the
current visitor type, renders it entirely server-side, and posts visit / Book Now hover /
Book Now click events back through the API. A visitor-type demo switcher on the Customer
site lets the venue type be changed live; until then the neutral variant is shown.

### Differentiation
- Built for technophobes: three blocks, drag-and-drop, live preview, sensible default
  styling — nothing to configure.
- Audience targeting is automatic: one description → 6 visitor-type variants (2 genders ×
  3 age groups) + 1 neutral, each with rewritten copy and a light styling treatment.
- API-first and SSR-everywhere: a clean REST contract decouples the Builder from a fully
  server-rendered Next.js customer site.

## 3. Target Users
| Persona      | Role | Primary Need | Key Behavior |
|--------------|------|--------------|--------------|
| Venue owner  | Operator of a hospitality venue; strongly non-technical | Build & publish a clean multi-page landing site, AI-enhance copy, generate audience variants, see visitor analytics | Signs up with email/password/domain-name; drags blocks; taps the magic wand; clicks Publish; checks the dashboard |
| Site visitor | Potential customer browsing a published venue site | A fast, server-rendered page whose copy fits them, with a clear Book Now CTA | Lands on `localhost:<port>/<domain-name>`; may set their type via the demo switcher; hovers/clicks Book Now |

## 4. Goals & Success Metrics
Success for this deliverable is functional completeness — every P0 requirement demoable end-to-end.

| Goal | Metric | Baseline | Target | Window |
|------|--------|----------|--------|--------|
| Owner can produce a published site | Owner signs up, builds a multi-page site with all 3 block types, AI-touches-up the description, generates the 7 variants, and publishes — without code | Not built | Works end-to-end | Deliverable |
| Customer site renders the right variant SSR | Visiting `localhost:<port>/<domain-name>` returns server-rendered HTML for the neutral variant; switching visitor type re-renders the matching variant; an unpublished domain shows the placeholder | Not built | Works end-to-end | Deliverable |
| Analytics round-trip | Visits and Book Now hovers/clicks generated on the Customer site appear (aggregated, with gender/age breakdowns) on the owner dashboard | Not built | Works end-to-end | Deliverable |
| API contract holds | Both products communicate only over the documented JSON REST API; shared contract types compile in the monorepo | Not built | Works end-to-end | Deliverable |
| Quality bar | Core logic (auth, analytics aggregation, REST contract, AI variant generation) covered by tests at moderate rigor; no P0 defects in the demo flow | n/a | Met | Deliverable |

## 5. Requirements

### REQ-1: Owner sign-up (P0)
A new venue owner registers with an email, a password, and a unique domain-name
identifier. The domain-name is the site's URL path segment and API identity.
**Acceptance criteria:** Valid email + password + unused domain-name creates an account
and signs the owner in, landing on the builder/dashboard; a duplicate domain-name (or
invalid email) is rejected with a clear message; the password is stored hashed.

### REQ-2: Owner sign-in & session (P0)
An existing owner signs in with email + password; the session persists across page loads;
sign-out ends it.
**Acceptance criteria:** Correct credentials start an authenticated session and reveal the
dashboard/builder; incorrect credentials are rejected; protected pages redirect to sign-in
when unauthenticated; sign-out returns to the signed-out state.

### REQ-3: Multi-page site management (P0)
The owner manages multiple pages within their one site: add, rename, delete, and reorder
pages. The site always has at least one page.
**Acceptance criteria:** Owner can create a new page, rename it, delete a non-last page,
and reorder pages; the page order is persisted and reflected in the published site's
navigation.

### REQ-4: Content blocks — drag-and-drop (P0)
Each page is composed from three block types — Rich Text, Image, Book Now button — added
and reordered via drag-and-drop, and deletable. Image blocks take an uploaded image file
(stored by the Builder, served by URL). Rich Text supports bold, italic, headings,
bullet/numbered lists, and links.
**Acceptance criteria:** Owner can drag any of the three block types onto a page, drag to
reorder them, and delete a block; an uploaded image is stored and rendered; Rich Text
formatting is preserved through save/publish/render; block order is persisted.

### REQ-5: Live preview (P1)
The builder shows a live preview of the page currently being edited.
**Acceptance criteria:** Edits to blocks/content are reflected in the preview without a
manual refresh; the preview reflects the same layout the published page will use.

### REQ-6: Venue description + AI touch-up (P0)
The owner writes a free-text venue description and can enhance it via a magic-wand
"touch-up" button next to the Rich Text editing area, which sends the text to AI and
replaces it with an improved version; the owner can keep or revert.
**Acceptance criteria:** Clicking the touch-up button returns an enhanced description
within a reasonable time; the owner can revert to the previous text; the enhanced text is
what subsequent variant generation uses.

### REQ-7: AI variant generation (P0)
From the current description, the owner triggers generation of audience-targeted variants
— one per visitor type (gender ∈ {male, female} × age group ∈ {18–30, 31–50, 50+} = 6)
plus one neutral variant = 7 total. Each variant is AI-rewritten copy plus a light
per-segment styling treatment. Regenerating replaces the set.
**Acceptance criteria:** A single action produces all 7 variants, each distinct and tied
to its visitor type (the neutral one segment-agnostic); each variant carries a styling
treatment; regeneration overwrites the prior set; variants are what the API serves to the
Customer app.

### REQ-8: Publish (P0)
An explicit "Publish" button makes the current built state (pages, blocks, variants) live
to the API. Edits made after publishing remain a draft until re-published. An unpublished
site is not served as content.
**Acceptance criteria:** Before first publish, the API reports the site as unpublished (the
Customer app shows the placeholder); after Publish, the API serves the published snapshot;
later edits do not change what the API serves until Publish is clicked again.

### REQ-9: Owner dashboard (P0)
The dashboard shows, for the owner's site: total visits, Book Now click count, Book Now
hover count, visitor gender breakdown, and visitor age-group breakdown — derived from
analytics events posted by the Customer app.
**Acceptance criteria:** Each metric reflects the events ingested via the API; gender and
age breakdowns are consistent with total visits; the dashboard updates as new events
arrive.

### REQ-10: Technophobe-friendly UX (P1)
Sign-up, sign-in, dashboard, and builder pages use clear layouts and appropriate default
colors. No UI design files are provided; the UI is built directly as a clean, simple
interface, using shadcn/ui components (and its lucide-react icons) for buttons and icons
across both apps. No bespoke design system.
**Acceptance criteria:** The four page types are operable without technical knowledge with
no raw/unstyled screens in the demo path; buttons and icons throughout both apps come from
shadcn/ui.

### REQ-11: Customer site — Next.js SSR (P0)
A Next.js site routed at `localhost:<port>/<domain-name>` renders the venue's published
page entirely server-side on each request.
**Acceptance criteria:** The HTML returned for the route contains the rendered page content
(verifiable with JS disabled / via the raw response); routing is by the domain-name path
segment; an unknown domain-name is handled gracefully.

### REQ-12: Per-request page fetch & render (P0)
On each request the Customer app calls the Builder REST API for the page content matching
the current visitor type and renders the returned structured JSON block tree (pages →
ordered blocks with type, content, and the selected variant's copy + styling treatment)
server-side.
**Acceptance criteria:** The rendered page reflects the API response for the requested
visitor type; block order and types render correctly; the variant's styling treatment is
applied; an API error degrades gracefully (placeholder or neutral fallback).

### REQ-13: Visitor-type demo switcher (P0)
A small on-page control lets a visitor pick gender + age group live; until a type is
chosen, the neutral variant is shown; changing the selection re-renders with that variant.
**Acceptance criteria:** Initial load shows the neutral variant; selecting a (gender, age
group) re-renders server-side with that variant's copy and styling; the control is
unobtrusive and always reachable.

### REQ-14: Book Now button block (P0)
The Book Now block renders as a button; clicking it records a Book Now click event and
shows a friendly confirmation modal/toast. There is no real booking or payment.
**Acceptance criteria:** Clicking Book Now shows the confirmation UI and emits a click
event with the current visitor type; hovering emits a hover event; no booking/payment
backend is invoked.

### REQ-15: Analytics events posting (P0)
The Customer app posts `visit`, `book-now hover`, and `book-now click` events — each tagged
with the current visitor type — to the Builder API, which aggregates them for the
dashboard.
**Acceptance criteria:** A page load emits exactly one `visit` event with visitor type;
hovers and clicks emit their events; events reach the API and are reflected in dashboard
aggregates.

### REQ-16: Placeholder for unpublished sites (P0)
A domain-name that exists but has no published content shows a friendly "coming soon"-style
placeholder on the Customer site.
**Acceptance criteria:** Before the owner's first publish, visiting the domain shows the
placeholder (not an error, not a blank page); after publish, the real page is shown.

### REQ-17: Monorepo (P0)
Both products live in a single repository, sharing the API-contract types.
**Acceptance criteria:** One repo builds and runs both apps; shared contract types are
imported by both; per-app scripts exist (build, lint, run, test, seed).

### REQ-18: REST API contract (P0)
A documented JSON REST API is the only channel between the two products. No authentication
for the local demo; the domain-name identifier selects the site. Endpoints cover: (a) fetch
the published page for a given visitor type, (b) ingest analytics events.
**Acceptance criteria:** The endpoints, request/response shapes, and the visitor-type and
event vocabularies are documented; the Customer app uses only these endpoints; requests for
an unpublished or unknown domain return well-defined responses.

### REQ-19: SSR mandatory (P0)
Server-side rendering is required for the published page on the Customer site; the Builder's
framework must support SSR.
**Acceptance criteria:** The Customer page's initial HTML is fully rendered server-side (no
client-only render of page content); this holds for every visitor-type variant and the
placeholder.

### REQ-20: AI provider — Anthropic Claude with prompt caching (P0)
Description touch-up and variant generation use Anthropic Claude (Sonnet 4.6) with prompt
caching.
**Acceptance criteria:** Both AI features call Claude (Sonnet 4.6); prompt caching is
configured for the shared/static portions of the prompts; failures are handled without
corrupting saved content.

## 6. Non-Goals
- Real domains, DNS, SSL, or hosting — the domain-name is just a local URL path identifier.
- Real booking or payments — Book Now only records an event and shows a confirmation.
- Teams, multiple users per account, or roles — one owner, one account.
- Multiple sites per account — exactly one site per owner.
- Email verification and password reset — out of scope for the demo.
- Real visitor identification — only the demo switcher; no tracking/fingerprinting.
- A bespoke design system or custom component library — UI uses shadcn/ui defaults (buttons + icons via shadcn/ui) plus Tailwind; no hand-rolled design system.
- Analytics beyond the listed dashboard metrics — no funnels, cohorts, exports, etc.
- API authentication, rate limiting, or multi-tenant hardening — open API for the local demo.
- Block types beyond the three (Rich Text, Image, Book Now button) — no video, forms, maps, embeds.
- Novelty visitor types — only male/female (no "alien" or other joke genders).

## 7. Technical Considerations
- **Dependencies:** Anthropic Claude API (Sonnet 4.6, with prompt caching); Next.js for the
  Customer app; an SSR-capable React framework for the Builder; shadcn/ui + lucide-react +
  Tailwind CSS for UI; a database for accounts, site/page/block content, variants, and
  analytics events; image file storage for uploaded images.
- **Constraints:** SSR mandatory (Customer published page; Builder framework must support
  it); monorepo with shared contract types; no UI design files — UI built directly with
  shadcn/ui (which implies React-based app frameworks); moderate test rigor (core logic
  well-tested, lighter on UI); local-only operation (`localhost:<port>/<domain-name>`).
- **Known Risks:** AI output variability/latency for touch-up and 7-variant generation (and
  prompt-cache correctness); ensuring the Customer site is genuinely server-rendered for
  every variant and the placeholder; analytics aggregation correctness (gender/age
  breakdowns vs. totals); keeping the published snapshot vs. draft state cleanly separated;
  image upload handling.

## 8. Launch Phases
This is a single-milestone interview deliverable; the "phases" are build stages, not
audience tiers.

| Phase | Audience | Success Gate |
|-------|----------|--------------|
| Internal Alpha | Builder of the deliverable | All P0 requirements implemented; the full owner→publish→customer→analytics flow works locally; no P0 defects |
| Beta | N/A | N/A — no external beta |
| GA / Handoff | Interview reviewers | Demo runs end-to-end from a seeded state; docs (README, API contract) present; core-logic tests pass |

## 9. Open Questions
- Builder framework choice (an SSR-capable React framework, so shadcn/ui works) — deferred to spec/design.
- Database and image-storage technology — deferred to spec/design.
- Exact REST endpoint paths and payload schemas — to be pinned in `monorepo-foundation` /
  `published-page-api` / `analytics-api` specs.
- Whether the demo switcher persists the chosen visitor type across pages of a multi-page
  site (assumed: yes, within a session) — confirm during spec.
- Whether per-segment "styling treatment" is a fixed palette/typography preset chosen by
  the AI or free-form — to be defined in the `ai-copy-and-variants` spec.
