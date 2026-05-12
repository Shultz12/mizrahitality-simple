# Product Vision: Mizrahitality Simple

## Elevator Pitch
For non-technical hospitality venue owners who need a customer-facing landing site but
can't deal with web technology, Mizrahitality Simple is a drag-and-drop website builder
that publishes a server-rendered site whose copy is AI-rewritten for each visitor's
gender and age group. Unlike generic site builders, our product targets the audience
automatically — one venue description in, a tailored variant out for every visitor — and
exposes the whole thing over a documented REST API that a separate server-side-rendered
customer site consumes.

## Problem
N/A — Mizrahitality Simple is built as a job-interview deliverable rather than a
market-driven product. (Working context: strongly non-technical venue owners struggle to
produce a polished, audience-appropriate landing page without hiring a developer.)

## Target Users
| User Type    | Description | Primary Need |
|--------------|-------------|--------------|
| Venue owner  | A hospitality venue operator who is strongly non-technical ("technophobe"); signs up with email, password, and a domain-name identifier; owns exactly one site | Build and publish a clean multi-page landing site from simple blocks, AI-enhance the venue description, generate audience-targeted variants, and see who's visiting |
| Site visitor | A potential customer browsing a published venue site served by the Customer app; either matched to a visitor type (gender × age group) or unidentified | A fast, server-rendered landing page with copy that fits them and a clear "Book Now" call to action |

## Value Proposition
A venue owner with no web skills gets a published, server-rendered landing site quickly —
drag a few blocks onto one or more pages, write a rough description, tap a magic-wand
"touch-up" button, and the product generates audience-targeted copy variants
automatically. The owner also gets a dashboard showing how many people visited, who they
were (gender / age group), and how many tapped "Book Now."

## Differentiation
- **Built for technophobes** — three content blocks (Rich Text, Image, Book Now button),
  drag-and-drop reordering, multi-page management, live preview, and sane default
  styling; nothing to configure.
- **Audience targeting is automatic** — one venue description becomes 6 visitor-type
  variants (2 genders × 3 age groups) plus a neutral fallback, AI-generated on request.
- **Two products, API-first, SSR everywhere** — the Builder app exposes a documented REST
  API; a separate Next.js Customer app renders published pages entirely server-side from
  that API and posts analytics back through it.

## Success Vision (3-5 Year Horizon)
N/A — Mizrahitality Simple is a scoped interview deliverable, not a long-horizon product.
