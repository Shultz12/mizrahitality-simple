# PRD: Mizrahitality Simple

**Status:** Draft
**Last Updated:** 2026-05-12
**Author:** shultz.devops@gmail.com

## 1. Context
Mizrahitality Simple is a job-interview deliverable: prove the concept works end-to-end on
localhost in the **simplest** way that satisfies every constraint — not a scalable
production product. Working scenario: strongly non-technical hospitality venue owners
struggle to publish a polished landing page. Success is functional completeness — every P0
requirement demoable end-to-end.

## 2. Solution Overview
Two cooperating, server-side-rendered Next.js products in one pnpm monorepo, communicating
**only** over a documented JSON REST API.

The **Builder** app lets a non-technical venue owner sign up (email + password), create a
site by naming the venue (the URL slug is derived from that name), assemble a single
landing page from drag-and-drop blocks — a pinned venue-name header, one or more Rich Text
boxes, at most one Image, at most one Book Now button — with live preview, write venue copy,
Publish, and watch a dashboard of visit and Book Now analytics.

The **Customer** app is a Next.js site routed at `localhost:<port>/<slug>` that, on every
request, calls the Builder's REST API for the published page, renders it entirely
server-side, and posts visit / Book Now hover / Book Now click events back through the API.

### Differentiation
- Built for technophobes: a venue name, repeatable Rich Text, one Image, one Book Now;
  drag-and-drop; live preview; sensible default styling — nothing to configure.
- API-first and SSR-everywhere: a clean REST contract decouples the Builder from a fully
  server-rendered Next.js customer site.

## 3. Target Users
| Persona      | Role | Primary Need | Key Behavior |
|--------------|------|--------------|--------------|
| Venue owner  | Operator of a hospitality venue; strongly non-technical | Build & publish a clean single-page landing site, see visitor analytics | Signs up with email + password; names the venue; drags in blocks; clicks Publish; checks the dashboard |
| Site visitor | Potential customer browsing a published venue site | A fast, server-rendered page with a clear Book Now CTA | Lands on `localhost:<port>/<slug>`; hovers/clicks Book Now |

## 4. Goals & Success Metrics
Success for this deliverable is functional completeness — every P0 requirement demoable end-to-end.

| Goal | Metric | Target |
|------|--------|--------|
| Owner can produce a published site | Owner signs up, creates a site, builds the page with all block types, and Publishes — without code | Works end-to-end |
| Customer site renders the published page SSR | Visiting `localhost:<port>/<slug>` returns server-rendered HTML for the published page; an unpublished slug shows the placeholder | Works end-to-end |
| Analytics round-trip | Visits and Book Now hovers/clicks generated on the Customer site appear (aggregated) on the owner dashboard | Works end-to-end |
| API contract holds | Both products communicate only over the documented JSON REST API; shared contract types compile in the monorepo | Works end-to-end |
| Quality bar | Core logic (auth, analytics aggregation, REST contract) covered by tests at moderate rigor; no P0 defects in the demo flow | Met |

## 5. Requirements

### REQ-1: Owner sign-up (P0)
A new venue owner registers with an email and a password — nothing else.
**Acceptance criteria:** A valid, unused email + a password creates an account and signs the
owner in, landing on the builder/dashboard; a duplicate or invalid email is rejected with a
clear message; the password is stored hashed (bcrypt).

### REQ-2: Owner sign-in & session (P0)
An existing owner signs in with email + password; the session persists across page loads (a
signed httpOnly cookie); sign-out ends it.
**Acceptance criteria:** Correct credentials start an authenticated session and reveal the
dashboard/builder; incorrect credentials are rejected; protected pages redirect to sign-in
when unauthenticated; sign-out returns to the signed-out state.

### REQ-3: Site creation & slug (P0)
After signing in, the owner creates their one site by entering a **venue name** — English
letters and spaces only, no digits or special characters. The site's **slug** is derived
from the venue name by removing spaces and lowercasing (e.g. `"Cafe Mizrahi"` →
`cafemizrahi`); the slug is the Customer-site URL path segment and the API identity.
**Acceptance criteria:** A valid venue name creates the site and computes its slug; a name
with disallowed characters is rejected with a clear message; a name whose slug collides with
an existing site is rejected ("that venue name is taken — pick another"); the slug is shown
to the owner.

### REQ-4: Page builder — drag-and-drop blocks (P0)
The site has exactly one page. At the top sits a pinned **venue-name header** (always
present, edited in place). Below it, the owner builds the page from a "Drag into site" tray
holding three block types: **Rich Text** (repeatable — any number), **Image** (at most one),
**Book Now button** (at most one). Blocks are added by dragging from the tray onto the page,
reordered by dragging, and deletable. When the Image or Book Now block is already placed, its
tray item is greyed out; hovering the greyed Book Now item shows "Only one is allowed." Rich
Text supports bold, italic, headings, bullet/numbered lists, and links. The Image block's
picture is either an uploaded file (stored by the Builder, served by URL) or one chosen from
a small bundled stock set.
**Acceptance criteria:** Owner can drag a Rich Text / Image / Book Now block onto the page,
drag to reorder blocks, and delete a block; the at-most-one constraint on Image and Book Now
is enforced in the tray; an uploaded or stock image is stored/referenced and rendered; Rich
Text formatting is preserved through save/publish/render; block order is persisted.

### REQ-5: Live preview (P1)
The builder shows a live preview of the page being edited.
**Acceptance criteria:** Edits to blocks/content are reflected in the preview without a
manual refresh; the preview reflects the same layout the published page will use.

### REQ-6: (removed)
**Descoped 2026-05-12.** Rich Text blocks hold the venue's free-text copy; that's covered
by REQ-4. No AI "touch-up".

### REQ-7: (removed)
**Descoped 2026-05-12.** No audience variants; the published page is exactly the owner's
blocks.

### REQ-8: Publish (P0)
An explicit "Publish" button makes the current built state (venue name, ordered blocks,
image, Book Now presence) live to the API. Edits made after publishing remain a draft until
re-published. An unpublished site is not served as content.
**Acceptance criteria:** Before first publish, the API reports the site as unpublished (the
Customer app shows the placeholder); after Publish, the API serves the published snapshot;
later edits do not change what the API serves until Publish is clicked again.

### REQ-9: Owner dashboard (P0)
The dashboard shows, for the owner's site: total visits, Book Now click count, and Book Now
hover count — derived from analytics events posted by the Customer app.
**Acceptance criteria:** Each metric reflects the events ingested via the API; the dashboard
updates as new events arrive.

### REQ-10: Technophobe-friendly UX (P1)
Sign-up, sign-in, site-creation, dashboard, and builder pages use clear layouts and
appropriate default colors. No UI design files are provided up front; the UI is built
directly as a clean, simple interface using shadcn/ui components (and its lucide-react
icons) for buttons and icons across both apps. No bespoke design system.
**Acceptance criteria:** The owner-facing pages are operable without technical knowledge with
no raw/unstyled screens in the demo path; buttons and icons throughout both apps come from
shadcn/ui.

### REQ-11: Customer site — Next.js SSR (P0)
A Next.js site routed at `localhost:<port>/<slug>` renders the venue's published page
entirely server-side on each request.
**Acceptance criteria:** The HTML returned for the route contains the rendered page content
(verifiable with JS disabled / via the raw response); routing is by the slug path segment;
an unknown slug is handled gracefully.

### REQ-12: Per-request page fetch & render (P0)
On each request the Customer app calls the Builder REST API for the published page content
and renders the returned structured JSON server-side (venue name → ordered blocks with
type, content, image URL, Book Now presence).
**Acceptance criteria:** The rendered page reflects the API response; block order and types
render correctly; an API error degrades gracefully (placeholder fallback).

### REQ-13: (removed)
**Descoped 2026-05-12.** No visitor types and no demo switcher.

### REQ-14: Book Now button block (P0)
The Book Now block renders as a button; clicking it records a Book Now click event and shows
a friendly confirmation modal/toast. There is no real booking or payment.
**Acceptance criteria:** Clicking Book Now shows the confirmation UI and emits a click
event; hovering emits a hover event; no booking/payment backend is invoked.

### REQ-15: Analytics events posting (P0)
The Customer app posts `visit`, `book-now hover`, and `book-now click` events to the Builder
API, which aggregates them for the dashboard.
**Acceptance criteria:** A page load emits exactly one `visit` event; hovers and clicks emit
their events; events reach the API and are reflected in dashboard aggregates.

### REQ-16: Placeholder for unpublished sites (P0)
A slug that exists but has no published content shows a friendly "coming soon"-style
placeholder on the Customer site.
**Acceptance criteria:** Before the owner's first publish, visiting the slug shows the
placeholder (not an error, not a blank page); after publish, the real page is shown.

### REQ-17: Monorepo (P0)
Both products live in a single pnpm-workspace repository, sharing the API-contract types.
**Acceptance criteria:** One repo builds and runs both apps; shared contract types are
imported by both; per-app scripts exist (build, lint, run, test, seed).

### REQ-18: REST API contract (P0)
A documented JSON REST API is the only channel between the two products. No authentication
for the local demo; the slug identifies the site. Endpoints cover: (a) fetch the published
page for a given slug, (b) ingest analytics events.
**Acceptance criteria:** The endpoints, request/response shapes, and the event vocabulary
are documented; the Customer app uses only these endpoints; requests for an unpublished or
unknown slug return well-defined responses.

### REQ-19: SSR mandatory (P0)
Server-side rendering is required for the published page on the Customer site; the Builder's
framework supports SSR.
**Acceptance criteria:** The Customer page's initial HTML is fully rendered server-side (no
client-only render of page content); this holds for the published page and the placeholder.

### REQ-20: (removed)
**Descoped 2026-05-12.** No AI provider; no AI features.

## 6. Non-Goals
- Real domains, DNS, SSL, or hosting — the slug is just a local URL path identifier.
- Real booking or payments — Book Now only records an event and shows a confirmation.
- Teams, multiple users per account, or roles — one owner, one account.
- Multiple sites per account, or multi-page sites — exactly one site, one page, per owner.
- More than one Image or Book Now block per page.
- Email verification and password reset — out of scope for the demo.
- Real visitor identification or audience segmentation.
- A bespoke design system or custom component library — UI uses shadcn/ui defaults + Tailwind.
- Analytics beyond the listed dashboard metrics — no funnels, cohorts, exports, etc.
- API authentication, rate limiting, or multi-tenant hardening — open API for the local demo.
- Block types beyond Rich Text / Image / Book Now — no video, forms, maps, embeds.
- AI / LLM features of any kind, and audience-targeted content variants — the published page is exactly what the owner built.

## 7. Technical Decisions
- **Frameworks:** Next.js (App Router) for both apps; the Builder hosts the REST API under
  `app/api/`. SSR is mandatory for the Customer published page.
- **Monorepo:** plain pnpm workspace — `apps/builder`, `apps/customer`, shared `packages/*`
  (API-contract types + thin fetch client; base tsconfig / eslint / tailwind configs).
- **UI:** shadcn/ui (+ lucide-react icons) + Tailwind v4 (CSS-first `@theme`). Frontend
  design is supplied later; until then, clean simple UI built directly.
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (not hand-rolled).
- **Rich text:** Tiptap; stored as sanitized HTML, rendered server-side on the Customer app.
- **Auth:** bcrypt-hashed passwords + a signed httpOnly session cookie; no NextAuth or other
  auth framework.
- **Database:** Prisma + SQLite (bundled, file-based) for accounts, site / blocks, and
  analytics events (schema changes via the `update-database` skill).
- **Image storage:** uploaded images in a local gitignored directory under the Builder, plus
  a small committed stock-image set; images served by the Builder.
- **Tests:** Vitest per workspace; moderate rigor — core logic well-tested (auth, analytics
  math, REST contract), lighter on the supplied UI.
- **Local-only:** runs on `localhost`; Builder :5113, Customer :5114.

## 8. Risks & Open Questions
**Known risks**
- Ensuring the Customer site is genuinely server-rendered for the published page and the placeholder.
- Analytics aggregation correctness.
- Keeping the published snapshot vs. draft state cleanly separated.
- Image upload / stock-image handling.

**Open questions**
- Exact REST endpoint paths and payload schemas — pinned in the `monorepo-foundation` /
  `published-page-api` / `analytics-api` features.
