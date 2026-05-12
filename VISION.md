# Product Vision: Mizrahitality Simple

## Elevator Pitch
For non-technical hospitality venue owners who need a customer-facing landing page but
can't deal with web technology, Mizrahitality Simple is a drag-and-drop website builder
that publishes a server-rendered page whose copy is AI-rewritten for each visitor's gender
and age group. One venue description in, a tailored variant out for every visitor — and the
whole thing is exposed over a documented REST API that a separate server-side-rendered
customer site consumes.

## Context
Built as a job-interview deliverable: the goal is to prove the concept works end-to-end on
localhost in the **simplest** way that honors every constraint — not to ship a scalable
production product. Working scenario: a strongly non-technical venue owner ("technophobe")
needs a polished, audience-appropriate landing page without hiring a developer.

## Target Users
| User Type    | Description | Primary Need |
|--------------|-------------|--------------|
| Venue owner  | A hospitality venue operator, strongly non-technical; signs up with email + password; owns exactly one site | Build & publish a clean single-page landing site from a few simple blocks, AI-enhance the venue copy, generate audience-targeted variants, and see who's visiting |
| Site visitor | A potential customer browsing a published venue site served by the Customer app; either matched to a visitor type (gender × age group) or unidentified | A fast, server-rendered landing page with copy that fits them and a clear "Book Now" call to action |

## Value Proposition
A venue owner with no web skills gets a published, server-rendered landing page quickly —
name the venue, drag in a few blocks, write a rough description, tap a magic-wand "touch-up"
button, generate audience-targeted copy variants, and Publish. The owner also gets a
dashboard showing how many people visited, who they were (gender / age group), and how many
tapped "Book Now."

## Differentiation
- **Built for technophobes** — a pinned venue-name header, one or more Rich Text blocks,
  at most one Image block, at most one Book Now button; drag-and-drop reordering; live
  preview; sane default styling. Nothing to configure.
- **Audience targeting is automatic** — one venue description becomes 6 visitor-type
  variants (2 genders × 3 age groups) plus a neutral fallback, AI-generated on request,
  each with a light styling treatment.
- **Two products, API-first, SSR everywhere** — the Builder app exposes a documented REST
  API; a separate Next.js Customer app renders published pages entirely server-side from
  that API and posts analytics back through it.
