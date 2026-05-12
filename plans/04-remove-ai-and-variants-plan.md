# Plan — Feature 4: remove-ai-and-variants

**Status:** done
**Order:** 4 of 9 (slot kept; feature renamed from `ai-copy-and-variants`)
**Depends on:** feature 1 (monorepo-foundation) — done; feature 3 (site-builder) — done. (These created the artifacts being edited: the `@mizrahitality/contracts` package, the `Site` schema comments, the placeholder customer page.)
**Affects (REQ-#):** **Removes** REQ-6 (venue copy + AI touch-up), REQ-7 (AI variant generation), REQ-13 (visitor-type demo switcher), REQ-20 (AI provider — Anthropic Claude). **Trims** REQ-8 (Publish — no longer snapshots "the 7 variants"), REQ-9 (dashboard — no gender/age breakdowns), REQ-12 (customer render — no variant copy/preset), REQ-15 (analytics — no visitor-type tag), REQ-18 (REST contract — no visitor-type param/vocab).
**Skills:** none. (No schema change → `update-database` not needed; no AI → no `claude-api`.)

> Standing process (master plan §1): designed in Plan mode; on approval this file is copied verbatim to `plans/04-remove-ai-and-variants-plan.md` with `Status: in-progress`, then executed; on completion its status → `done` and the master plan §2 status table is ticked/renamed. No commit unless the user asks.

---

## Context

**Why this feature.** A product-scope decision by the owner (2026-05-12): **the simple edition ships with no AI features and no audience targeting at all.** There will be **no per-Rich-Text-block AI "touch-up"**, **no 7 audience variants**, and **no visitor types** anywhere in the system — the published page is exactly the blocks the owner built, the customer site has no demo switcher, and analytics carry no gender/age. The text the owner writes is the text that exists.

The original feature 4 (`ai-copy-and-variants`) was never built, and feature 3 deliberately left `Site.variantsJson` un-added and the rich-text editor's magic-wand button out — so this is a *forward-looking* descope: no migrations, no code rip-out of shipped behavior. The work is (a) a documentation sweep removing every reference to AI copy, variants, styling presets, and visitor types from the product docs and the master plan (including the downstream feature charters so features 5–9 are re-planned without them), and (b) a small code cleanup — drop the `@anthropic-ai/sdk` dependency and `ANTHROPIC_API_KEY`, delete the visitor-type vocabulary from `@mizrahitality/contracts`, drop `visitorType` from `AnalyticsEventInput`, and fix the handful of files that imported the removed exports.

**Intended outcome.** The repo (docs + code) describes and contains a *single, non-personalized* published page per site; `pnpm install && pnpm build && pnpm typecheck && pnpm test && pnpm lint` stay green; nothing references AI/Anthropic/Claude, "variant", "styling preset", or "visitor type / gender / age group" except as explicit "removed/descoped" notes; features 5–9 (published-page API, analytics API, dashboard, customer site, demo seed) can be planned against the trimmed charters.

### Decisions confirmed with the user

1. **All AI is out** — no AI copy touch-up, no AI variant generation, no Anthropic/Claude usage; `@anthropic-ai/sdk` and `ANTHROPIC_API_KEY` are removed.
2. **Visitor types are out entirely** — no `Gender`/`AgeGroup`/`VisitorType`, no `VISITOR_TYPES`, no demo switcher (REQ-13 deleted), no per-gender/age data in analytics events or dashboard breakdowns ("remove the tab as well, and the data from all the queries and such — no more visitor types in the system at all").
3. **Feature 4 keeps its slot, renamed** to `remove-ai-and-variants` — a cleanup/descope feature. Features 5–9 keep their numbers; their master-plan charters are trimmed here. Plan file: `plans/04-remove-ai-and-variants-plan.md`.

### Design calls (not user-facing forks; recorded for the executor)

- **Removed REQs keep their numbers** in `PRD.md` (REQ-6, REQ-7, REQ-13, REQ-20) — each becomes a one-line "**REQ-N: (removed)** — Descoped 2026-05-12; …" stub so cross-references and traceability survive. Trimmed REQs (8, 9, 12, 15, 18) keep their numbers and just lose the relevant clauses.
- **Completed plan files (`plans/01–03-*-plan.md`) are left as historical records.** Optionally add a single bracketed note to `plans/03-site-builder-plan.md` where it forward-references "feature 4 will add `variantsJson`" — but don't rewrite history.
- **No `prisma migrate`.** `Site.variantsJson` was never added; this feature only deletes a *comment* in `schema.prisma` and a *note* in `CHANGELOG.md` (and may append a short "no-migration, decision-only" CHANGELOG entry recording the descope).
- **The placeholder customer home page and the two `smoke.test.ts` files** currently import `VISITOR_TYPES` from contracts purely to prove the workspace wiring; re-point them at `ANALYTICS_EVENT_TYPES` (still a real contracts export, still DB-independent) rather than dropping the contracts import.
- **Local `.env` files are gitignored / per-developer** — the executor updates `apps/builder/.env.example` (committed) and also strips `ANTHROPIC_API_KEY` from their own `apps/builder/.env`.

---

## Charter (replaces master plan §3.4)

> **4 — remove-ai-and-variants.** Descope the AI and audience-targeting scope from the product. Deliver: a documentation sweep removing every reference to AI copy "touch-up", the 7 audience variants, the fixed styling-preset list, and visitor types (gender × age group, the neutral case, the demo switcher) from `PRD.md`, `VISION.md`, `ROADMAP.md`, the root `CLAUDE.md`, and `plans/00-master-plan.md` — including rewriting the downstream charters (5 published-page-api, 6 analytics-api, 7 analytics-dashboard, 8 customer-site, 9 demo-seed) so they assume a single non-personalized published page and totals-only analytics; plus a code cleanup: remove the `@anthropic-ai/sdk` dependency and the `ANTHROPIC_API_KEY` env var, delete the visitor-type vocabulary module from `@mizrahitality/contracts` (`Gender`, `AgeGroup`, `VisitorType`, `VISITOR_TYPES`, `visitorTypeKey`, `parseVisitorTypeKey`, `NEUTRAL`, `isNeutral`), drop `visitorType` from `AnalyticsEventInput`, and update the few consumers (`contracts.test.ts`, both `smoke.test.ts`, the placeholder `apps/customer/app/page.tsx`), the `Site` schema comment, and the Prisma `CHANGELOG.md` note. No schema migration (the anticipated `Site.variantsJson` is simply never added). Out of scope: building any new product behavior; touching shipped builder UI (the magic-wand button was never added); renumbering REQs or later features.

---

## In scope

- **Doc sweep** (Phase 1): `PRD.md`, `VISION.md`, `ROADMAP.md`, `CLAUDE.md` (root), `plans/00-master-plan.md` — remove all AI / variant / styling-preset / visitor-type references; mark removed REQs as `(removed)`; rewrite the master plan's feature-4 charter + status row + dependency-graph label + ordering notes + cross-cutting rules + downstream charters (5–9) + Definition of Done.
- **Code cleanup** (Phase 2): `apps/builder/package.json` (drop `@anthropic-ai/sdk`) + `pnpm-lock.yaml` (regenerated by `pnpm install`); `apps/builder/.env.example` (drop `ANTHROPIC_API_KEY`); delete `packages/contracts/src/visitor-types.ts`; `packages/contracts/src/index.ts` (drop the `./visitor-types` export); `packages/contracts/src/analytics.ts` (drop `visitorType` from `AnalyticsEventInput`, drop the `VisitorType` import); `packages/contracts/src/__tests__/contracts.test.ts` (delete the visitor-type `describe` block + its imports); `apps/builder/__tests__/smoke.test.ts` and `apps/customer/__tests__/smoke.test.ts` (swap `VISITOR_TYPES`→`ANALYTICS_EVENT_TYPES`); `apps/customer/app/page.tsx` (swap the `VISITOR_TYPES.length` placeholder line to `ANALYTICS_EVENT_TYPES.length`); `apps/builder/prisma/schema.prisma` (delete the `variantsJson` comment line + trim the `Site` model's leading comment); `apps/builder/prisma/CHANGELOG.md` (strike the "feature 4 will add `variantsJson`" note in the `add_site` entry; append a brief decision-only entry).
- **Verify** (Phase 3): `pnpm install` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build` green across the workspace; `pnpm db:migrate` still idempotent (no schema change); a final grep confirms no dangling AI/variant/visitor-type references outside the `(removed)` stubs and historical `plans/01–03`.
- **Close-out**: copy this plan verbatim to `plans/04-remove-ai-and-variants-plan.md` with `Status: in-progress` → on completion `done`; tick/rename feature 4 in the master plan §2 status table. No commit unless the user asks.

## Out of scope

- Any *new* product behavior. Image resizing (mentioned in passing by the owner) is **not** part of this feature — flag it as a possible future `site-builder` enhancement, don't build it here.
- Touching shipped builder UI / `lib/site/*` — there is nothing AI/variant-related there (the magic wand was never added; `BuilderSite` has no `variants`).
- Renumbering `PRD.md` REQs or renumbering features 5–9 / their plan-file names.
- Rewriting completed plan files `plans/01–03-*-plan.md` (historical records; at most a one-line bracketed note).
- The actual published-page API / analytics models / customer site — those are features 5/6/8, planned later against the now-trimmed charters.

---

## Approach

### Phase 1 — strip AI / variant / visitor-type references from the docs

The bulk of the work. Concrete edits per file:

**`PRD.md`**
- §1 Context: drop "have no easy way to tailor its copy to different audiences" (reword the working-scenario sentence to just the publish struggle).
- §2 Solution Overview: "write venue copy and AI-enhance it via a magic-wand 'touch-up' button, generate AI-targeted copy variants for each visitor type, Publish" → "write venue copy, Publish"; "calls the Builder's REST API for the published page matching the current visitor type" → "…for the published page"; delete "An on-page visitor-type demo switcher lets the audience be changed live; until a type is chosen, the neutral variant is shown."
- §2 Differentiation: delete bullet 2 ("Audience targeting is automatic…"); keep bullets 1 and 3 (drop any variant nuance from bullet 3).
- §3 Target Users: venue-owner row "AI-enhance copy, generate audience variants, see visitor analytics" → "see visitor analytics"; venue-owner behavior drop "taps the magic wand"; site-visitor row "A fast, server-rendered page whose copy fits them" → "A fast, server-rendered page", and drop "may set their type via the demo switcher".
- §4 Goals: "AI-touches-up the copy, generates the 7 variants, and Publishes — without code" → "and Publishes — without code"; "returns server-rendered HTML for the neutral variant; switching visitor type re-renders the matching variant; an unpublished slug shows the placeholder" → "returns server-rendered HTML for the published page; an unpublished slug shows the placeholder"; "appear (aggregated, with gender/age breakdowns) on the owner dashboard" → "appear (aggregated) on the owner dashboard"; "core logic (auth, analytics aggregation, REST contract, AI variant generation)" → "(auth, analytics aggregation, REST contract)".
- §5 Requirements:
  - **REQ-6** → "**REQ-6: (removed)** — Descoped 2026-05-12. Rich Text blocks hold the venue's free-text copy; that's covered by REQ-4. No AI 'touch-up'."
  - **REQ-7** → "**REQ-7: (removed)** — Descoped 2026-05-12. No audience variants; the published page is exactly the owner's blocks."
  - **REQ-8** (Publish): "(venue name, ordered blocks, image, Book Now presence, the 7 variants)" → "(venue name, ordered blocks, image, Book Now presence)".
  - **REQ-9** (dashboard): drop "visitor gender breakdown, and visitor age-group breakdown" from the requirement and "gender and age breakdowns are consistent with total visits" from the acceptance — leaving total visits, Book Now click count, Book Now hover count.
  - **REQ-12** (per-request render): "the page content matching the current visitor type" → "the published page content"; "(venue name → ordered blocks with type, content, image URL, Book Now presence, and the selected variant's copy + styling preset)" → "(venue name → ordered blocks with type, content, image URL, Book Now presence)"; drop "the variant's styling preset is applied"; "(placeholder or neutral fallback)" → "(placeholder fallback)".
  - **REQ-13** → "**REQ-13: (removed)** — Descoped 2026-05-12. No visitor types and no demo switcher."
  - **REQ-15** (analytics posting): drop "— each tagged with the current visitor type" and "with visitor type" from the acceptance.
  - **REQ-18** (REST contract): "(a) fetch the published page for a given slug + visitor type" → "(a) fetch the published page for a given slug"; "the visitor-type and event vocabularies are documented" → "the event vocabulary is documented".
  - **REQ-20** → "**REQ-20: (removed)** — Descoped 2026-05-12. No AI provider; no AI features."
  - REQ-11/14/16/19 — verify no "neutral variant" wording lingers (REQ-19 says "every visitor-type variant and the placeholder" → "the published page and the placeholder").
- §6 Non-Goals: replace "AI-synthesized page layouts or template designs — the AI authors copy + picks a styling preset; the UI is supplied" with "**AI / LLM features of any kind, and audience-targeted content variants** — the published page is exactly what the owner built"; delete "Novelty visitor types — only male/female (no joke genders)"; "Real visitor identification — only the demo switcher; no tracking/fingerprinting" → "Real visitor identification or audience segmentation".
- §7 Technical Decisions: delete the "AI: Anthropic Claude (Sonnet 4.6) with prompt caching" line and the "Styling treatment: a fixed enumerated list of presets; the AI picks one per variant" line; "Database: Prisma + SQLite … for accounts, site / blocks / variants, and analytics events" → "…site / blocks, and analytics events"; "Tests: … core logic well-tested (auth, analytics math, REST contract, AI variant generation)" → "(auth, analytics math, REST contract)".
- §8 Risks & Open Questions: delete "AI output variability/latency for touch-up and 7-variant generation, and prompt-cache correctness"; "Ensuring the Customer site is genuinely server-rendered for every variant and the placeholder" → "…for the published page and the placeholder"; "Analytics aggregation correctness (gender/age breakdowns vs. totals)" → "Analytics aggregation correctness"; delete the styling-preset-list open question.

**`VISION.md`**
- Elevator Pitch: "…that publishes a server-rendered page whose copy is AI-rewritten for each visitor's gender and age group. One venue description in, a tailored variant out for every visitor — and the whole thing is exposed over a documented REST API that a separate server-side-rendered customer site consumes." → "…that publishes a server-rendered page, exposed over a documented REST API that a separate server-side-rendered customer site consumes."
- Value Proposition: "write a rough description, tap a magic-wand 'touch-up' button, generate audience-targeted copy variants, and Publish" → "write the copy, and Publish"; "a dashboard showing how many people visited, who they were (gender / age group), and how many tapped 'Book Now.'" → "a dashboard showing how many people visited and how many tapped 'Book Now.'"
- Target Users: venue-owner "AI-enhance the venue copy, generate audience-targeted variants, and see who's visiting" → "and see how many people are visiting"; site-visitor "either matched to a visitor type (gender × age group) or unidentified" → delete the clause; "copy that fits them and a clear 'Book Now' call to action" → "a clear 'Book Now' call to action".
- Differentiation: delete bullet 2 ("Audience targeting is automatic — one venue description becomes 6 visitor-type variants…"); keep bullets 1 and 3 (in bullet 3 drop any variant nuance — it renders "published pages", not "the variant").
- (Read the rest of `VISION.md` past line 40 during execution and remove any remaining AI/variant/visitor-type wording the same way.)

**`ROADMAP.md`**
- North Star: "the Next.js SSR customer site renders the right per-visitor-type variant" → "the Next.js SSR customer site renders the published page".
- Milestone Success Criteria: "write venue copy and AI-touch-it-up per Rich Text block, generate all 7 audience variants (male/female × 18–30/31–50/50+ + neutral, each AI-rewritten copy + a styling preset from a fixed list) and Publish" → "write venue copy and Publish"; "renders the neutral variant by default and the matching variant when the demo switcher changes visitor type, shows a friendly placeholder for an unpublished slug" → "renders the published page server-side, shows a friendly placeholder for an unpublished slug"; "the owner dashboard shows total visits, Book Now clicks, Book Now hovers, and gender + age-group breakdowns with correct numbers" → "…Book Now clicks, Book Now hovers with correct numbers"; "core logic (auth, analytics aggregation, REST contract, AI variant generation)" → "(auth, analytics aggregation, REST contract)".
- Features table: rename the `ai-copy-and-variants | planned | Per-block AI "touch-up" + the 7 audience variants …` row → `remove-ai-and-variants | planned | Descope: strip AI copy touch-up, the 7 audience variants, the styling-preset list, and visitor-type targeting (the demo switcher, per-gender/age analytics) from the docs + code; trim the downstream charters.`; `customer-site` notes "renders the variant, demo visitor-type switcher, Book Now confirmation, posts analytics" → "renders the published page, Book Now confirmation, posts analytics"; `analytics-dashboard` notes "total visits, Book Now clicks/hovers, gender + age-group breakdowns" → "total visits, Book Now clicks/hovers".
- "What We're Not Building": "AI-synthesized page layouts or full template designs — AI only authors copy + picks a styling preset; the UI is supplied" → "**AI / LLM features of any kind, and audience-targeted content variants** — the published page is exactly what the owner built"; "Real visitor identification (true gender/age) — Unsolvable here; simulated via the demo switcher" → "Real visitor identification or audience segmentation — not in this edition"; delete the "Novelty visitor types (e.g. an 'alien' gender)" row.
- Workflow: "core logic well-tested (auth, analytics math, the REST API contract, AI variant generation)" → "(auth, analytics math, the REST API contract)"; "Skills: Use `update-database` (Prisma) and the `claude-api` skill when they apply." → "Skills: Use the `update-database` (Prisma) skill when it applies."

**`CLAUDE.md` (root)** — remove all AI/variant/visitor-type references; key spots:
- "What this is": Builder bullet "build a single page (… repeatable Rich Text blocks, at most one Image, at most one Book Now button), AI-touch-up the copy, generate 7 audience-targeted variants, publish, and view an analytics dashboard" → "build a single page (… repeatable Rich Text blocks, at most one Image, at most one Book Now button), publish, and view an analytics dashboard"; Customer bullet "calls the Builder API for the published page (per slug + visitor type), renders it server-side" → "calls the Builder API for the published page (per slug), renders it server-side".
- "Tech stack": delete the entire "**AI:** Anthropic Claude (Sonnet 4.6) with prompt caching — see the `claude-api` skill. Description touch-up + the 7 variants …" bullet.
- "Hard constraints": delete "AI work uses **Anthropic Claude (Sonnet 4.6) with prompt caching** — no other provider."
- "Layout": `apps/builder/` bullet — drop "a place to hang the variants set added by feature 4" from the `Site`-model phrasing; drop the "feature 4 will add `variantsJson String?`" forward-reference; drop "feature 4 will add `variantsJson String?`" wherever else it appears in that bullet; the `prisma/` sub-bullet "feature 4 will add `variantsJson String?`" → remove. `packages/contracts/` bullet — drop "the visitor-type vocabulary (`Gender`, `AgeGroup`, `VisitorType = { gender; ageGroup } | "neutral"`, `VISITOR_TYPES`, `visitorTypeKey()` / `parseVisitorTypeKey()`)," leaving the analytics-event vocabulary (now `AnalyticsEventType` only — `AnalyticsEventInput` = `{ slug; type }`), the envelope, and `createApiClient`. `apps/customer/` bullet — the placeholder home-page line referencing visitor types → reword to the analytics-event count. `.env.example` line — drop `ANTHROPIC_API_KEY` from the listed vars.
- "Build / run / test": confirm no AI refs (none expected).
- "Note": unchanged.

**`plans/00-master-plan.md`**
- §1: "every Prisma/schema change goes through the `update-database` skill; all Anthropic Claude work goes through the `claude-api` skill." → "every Prisma/schema change goes through the `update-database` skill." Drop "A feature plan that touches those areas must say so explicitly." → keep but reword to just the Prisma case.
- §1 file-list comment block: `├── 04-ai-copy-and-variants-plan.md` → `├── 04-remove-ai-and-variants-plan.md`.
- §2 dependency graph: the node label `4. ai-copy-and-variants` → `4. remove-ai-and-variants`. Keep `3 → 4 → 5` (feature 5 still planned after the descope).
- §2 status table: `| 4 | ai-copy-and-variants | not-started | 1, 3 | 6, 7, 20 | claude-api, update-database |` → `| 4 | remove-ai-and-variants | not-started | 1, 3 | — (removes REQ-6, 7, 13, 20; trims 8, 9, 12, 15, 18) | — |`. (On completion → `done ([plan](04-remove-ai-and-variants-plan.md))`.)
- §2 "Notes on ordering": "**ai-copy-and-variants before published-page-api** — the published snapshot includes the 7 variants, so variant generation and the styling-preset enum must exist first." → "**remove-ai-and-variants before published-page-api** — so feature 5 designs the published snapshot (and the REST shape) without variants/visitor types from the start." Drop "exercises SSR, the demo switcher, Book Now" → "exercises SSR, Book Now" in the customer-site note; drop "→ generated variants" from the demo-seed note.
- §3 charters:
  - **Charter 4** — replace with the new `remove-ai-and-variants` charter (see "Charter" section above).
  - **Charter 5 (published-page-api)** — drop "the 7 variants" from the snapshot list; "GET the published page for a given slug + visitor type (gender+age or neutral)" → "GET the published page for a given slug"; "(venue name → ordered blocks with type/content/image URL/Book Now presence + the selected variant's copy + styling preset)" → "(venue name → ordered blocks with type/content/image URL/Book Now presence)"; drop "Document … the visitor-type vocabulary (extend `@mizrahitality/contracts` …)"; drop "the endpoint returns the right variant per visitor type and the default/neutral when none is given" from the tests; keep unknown-vs-unpublished-slug + envelope. Update its `Depends on` (still 1, 3, 4) and `Satisfies` (REQ-8, 12 server side, 16 API side, 18 — unchanged numbers; their content is trimmed in `PRD.md`).
  - **Charter 6 (analytics-api)** — `AnalyticsEvent` model "site/slug, event type ∈ {…}, visitor gender + age group — nullable for neutral/unset, timestamp" → "site/slug, event type ∈ {`visit`, `book-now-hover`, `book-now-click`}, timestamp"; ingest "slug + event type + visitor type, validated against the vocabularies in `@mizrahitality/contracts`" → "slug + event type, validated against the event-type vocabulary in `@mizrahitality/contracts`"; aggregation "total visits, Book Now click count, Book Now hover count, visitor gender breakdown, and visitor age-group breakdown" → "total visits, Book Now click count, Book Now hover count"; tests drop the breakdown-math case.
  - **Charter 7 (analytics-dashboard)** — "showing total visits, Book Now click count, Book Now hover count, the visitor gender breakdown, and the visitor age-group breakdown" → "showing total visits, Book Now click count, and Book Now hover count"; drop "with the breakdowns visibly consistent with totals"; drop "any new metrics beyond the listed five" → "beyond the listed three".
  - **Charter 8 (customer-site)** — drop the entire visitor-type/variant/switcher machinery: "calls the Builder REST API (… with `BUILDER_API_URL`…) for the published page matching the current visitor type and renders the returned JSON entirely server-side — venue name, ordered blocks (…), with the selected variant's copy and its styling preset applied" → "calls the Builder REST API (… with `BUILDER_API_URL`…) for the published page and renders the returned JSON entirely server-side — venue name, ordered blocks (Rich Text sanitized HTML, the one Image by URL, the Book Now button if present)"; delete "an unobtrusive, always-reachable **visitor-type demo switcher** (gender + age group) — initial load shows the **neutral** variant, selecting a type re-renders server-side with that variant, and the choice persists within the session"; "emits a `book-now-click` event tagged with the current visitor type, with hover emitting `book-now-hover`, and each page load emitting exactly one `visit` event" → "emits a `book-now-click` event, with hover emitting `book-now-hover`, and each page load emitting exactly one `visit` event"; "graceful degradation (placeholder or neutral fallback)" → "graceful degradation (placeholder fallback)"; "SSR verifiable … for every variant and the placeholder" → "… for the published page and the placeholder"; tests drop "variant selection by visitor type". Update `Satisfies` to drop REQ-13.
  - **Charter 9 (demo-seed)** — drop "the **7 variants** (use the real generation path, or ship canned variant content to avoid a live Claude call during seeding — decide in the plan and document it)"; "a **published** snapshot of all that, and a handful of sample analytics events so the dashboard isn't empty" stays (the sample events are `{ slug, type, timestamp }`). Update `Depends on` to "3, 5 (and 6 for sample events)".
- §4 cross-cutting rules: delete "**AI = Anthropic Claude (Sonnet 4.6) + prompt caching only** — no other provider; use the `claude-api` skill."; "Shared contract types live in `@mizrahitality/contracts` … the visitor-type vocabulary, the analytics-event vocabulary, the styling-preset enum, and the `ApiSuccess<T>`/`ApiError` envelope all live there." → "Shared contract types live in `@mizrahitality/contracts` … the analytics-event vocabulary and the `ApiSuccess<T>`/`ApiError` envelope live there."; "**SSR is mandatory** for the Customer published page (every variant + the placeholder)" → "(the published page + the placeholder)".
- §5 Definition of done: "owner signs up, creates a site, builds the page with all block types, AI-touches-up copy, generates the 7 variants, publishes" → "… builds the page with all block types, publishes"; "the SSR customer site renders the neutral variant by default and the matching variant on switcher change, shows the placeholder for an unpublished slug" → "the SSR customer site renders the published page, shows the placeholder for an unpublished slug"; "core logic (auth, analytics aggregation, REST contract, AI variant generation)" → "(auth, analytics aggregation, REST contract)".

### Phase 2 — code cleanup

- `apps/builder/package.json`: remove `"@anthropic-ai/sdk": "^0.39.0"` from `dependencies`.
- `apps/builder/.env.example`: remove the `# Anthropic Claude API key …` comment block + `ANTHROPIC_API_KEY=` line. (Also strip it from the local gitignored `apps/builder/.env`.)
- `packages/contracts/src/visitor-types.ts`: **delete the file.**
- `packages/contracts/src/index.ts`: remove `export * from "./visitor-types";` (leaves `analytics`, `envelope`, `client`).
- `packages/contracts/src/analytics.ts`: remove `import type { VisitorType } from "./visitor-types";`; change `AnalyticsEventInput` from `{ slug: string; type: AnalyticsEventType; visitorType: VisitorType; }` to `{ slug: string; type: AnalyticsEventType; }`. Keep `AnalyticsEventType` / `ANALYTICS_EVENT_TYPES`.
- `packages/contracts/src/__tests__/contracts.test.ts`: delete the whole `describe("visitor-type vocabulary", …)` block (the 7-types / round-trip / stable-keys / rejects-unrecognised-keys cases) and remove `VISITOR_TYPES, GENDERS, AGE_GROUPS, isNeutral, visitorTypeKey, parseVisitorTypeKey` from the import. Keep the `analytics vocabulary` and `createApiClient` describes (the `client.post("/api/events", { type: "visit" })` line is fine — it's an untyped test payload).
- `apps/builder/__tests__/smoke.test.ts` and `apps/customer/__tests__/smoke.test.ts`: replace `import { VISITOR_TYPES } from "@mizrahitality/contracts";` + `expect(VISITOR_TYPES).toHaveLength(7);` with `import { ANALYTICS_EVENT_TYPES } from "@mizrahitality/contracts";` + `expect(ANALYTICS_EVENT_TYPES).toHaveLength(3);` (keeps a DB-independent contracts-wiring assertion).
- `apps/customer/app/page.tsx`: replace the `import { VISITOR_TYPES } …` + `{VISITOR_TYPES.length} visitor types are defined in …` placeholder line with `import { ANALYTICS_EVENT_TYPES } …` + `{ANALYTICS_EVENT_TYPES.length} analytics event types are defined in …` (or any neutral placeholder text — the page is a feature-1 stub replaced by feature 8).
- `apps/builder/prisma/schema.prisma`: delete the `/// Feature 4 (ai-copy-and-variants) will add `variantsJson String?` via the same skill.` line; trim the `Site` model's leading comment so it doesn't mention variants.
- `apps/builder/prisma/CHANGELOG.md`: in the `add_site` entry's Notes, remove the line "Feature 4 (ai-copy-and-variants) will add `variantsJson String?` to `Site` via this skill — not pre-added here."; prepend a short entry:
  > `## [2026-05-12] No migration — feature 4 (remove-ai-and-variants)`
  > `**Schema change:** none.` — the previously-anticipated `Site.variantsJson` field is **not** being added; AI copy / the 7 audience variants / the styling-preset enum are descoped. The future `AnalyticsEvent` model (feature 6) will **not** carry visitor gender/age. No `prisma migrate`; `pnpm db:migrate` stays a no-op.
- `pnpm-lock.yaml`: regenerated by `pnpm install` (the `@anthropic-ai/sdk` entries and its transitive deps drop out).

### Phase 3 — verify

1. `pnpm install` (rewrites the lockfile; builder `postinstall` runs `prisma generate` — fine, schema unchanged in shape).
2. `pnpm typecheck` — `tsc --noEmit` in builder + customer + contracts; nothing imports the deleted `visitor-types` or `@anthropic-ai/sdk`.
3. `pnpm lint` — `eslint .`; no unused imports left behind.
4. `pnpm test` — `vitest run` in all workspaces; the trimmed `contracts.test.ts` + both `smoke.test.ts` pass; builder/auth/site suites unaffected.
5. `pnpm build` — `next build` in builder and customer succeed.
6. `pnpm db:migrate` — `prisma migrate deploy` reports no pending migrations (idempotent).
7. Grep sweep: `(?i)anthropic|claude|@anthropic-ai|ai.?touch|touch.?up|7.?variant|seven.?variant|styling.?preset|VISITOR_TYPES|visitorTypeKey|VisitorType|AgeGroup|\bGender\b|demo switcher|visitor type` across the repo — the only hits should be the `(removed)` REQ stubs in `PRD.md`, this plan, and the historical `plans/01–03-*-plan.md` (and harmless CSS `variant` props / `neutral` color tokens). Fix any stragglers.

---

## Data model

**No schema change. No migration.** Only doc-level edits: delete the `variantsJson` forward-reference comment in `apps/builder/prisma/schema.prisma`, strike the matching note in `apps/builder/prisma/CHANGELOG.md`, and append a short "no-migration, decision-only" CHANGELOG entry recording the descope (text in Phase 2). `pnpm db:migrate` stays idempotent. The `update-database` skill is **not** used (nothing for it to do).

---

## API surface

**`@mizrahitality/contracts` changes** (raw TS, consumed via `transpilePackages` — no version bump needed):
- **Removed:** the entire `visitor-types` module — `Gender`, `GENDERS`, `AgeGroup`, `AGE_GROUPS`, `AudienceVisitorType`, `VisitorType`, `NEUTRAL`, `VISITOR_TYPES`, `isNeutral`, `visitorTypeKey`, `parseVisitorTypeKey`.
- **Changed:** `AnalyticsEventInput` — from `{ slug; type; visitorType }` to `{ slug; type }`.
- **Unchanged:** `AnalyticsEventType` / `ANALYTICS_EVENT_TYPES`; the `ApiSuccess<T>` / `ApiError` / `ApiResult<T>` envelope + `apiOk` / `apiErr`; `createApiClient`.
- The styling-preset enum that the old feature-4 plan would have added is **not** added.

No REST endpoints exist yet (features 5/6); their charters (above) are trimmed so they're designed slug-only / totals-only.

---

## Files & directories

```
PRD.md                                            (edit — mark REQ-6/7/13/20 (removed); trim REQ-8/9/12/15/18; scrub §§1,2,3,4,6,7,8)
VISION.md                                         (edit — scrub elevator pitch / value prop / target users / differentiation)
ROADMAP.md                                        (edit — North Star, milestone criteria, features table rename, "Not Building", workflow)
CLAUDE.md                                         (edit — "What this is", tech-stack AI bullet (delete), hard constraints, Layout (contracts + builder + customer + .env), )
plans/00-master-plan.md                           (edit — §1 skills + file list; §2 graph label + status row + ordering notes; §3 charter 4 rewrite + charters 5–9 trim; §4 cross-cutting; §5 DoD)
apps/builder/package.json                          (edit — remove "@anthropic-ai/sdk")
pnpm-lock.yaml                                     (regenerated by `pnpm install`)
apps/builder/.env.example                          (edit — remove ANTHROPIC_API_KEY block)
apps/builder/prisma/schema.prisma                  (edit — delete the variantsJson comment line; trim the Site comment)
apps/builder/prisma/CHANGELOG.md                   (edit — strike the "feature 4 will add variantsJson" note; prepend a no-migration entry)
packages/contracts/src/visitor-types.ts            (DELETE)
packages/contracts/src/index.ts                    (edit — drop the ./visitor-types export)
packages/contracts/src/analytics.ts                (edit — drop visitorType from AnalyticsEventInput; drop the VisitorType import)
packages/contracts/src/__tests__/contracts.test.ts (edit — delete the visitor-type describe block + its imports)
apps/builder/__tests__/smoke.test.ts               (edit — VISITOR_TYPES → ANALYTICS_EVENT_TYPES)
apps/customer/__tests__/smoke.test.ts              (edit — VISITOR_TYPES → ANALYTICS_EVENT_TYPES)
apps/customer/app/page.tsx                          (edit — placeholder: VISITOR_TYPES → ANALYTICS_EVENT_TYPES)
apps/builder/.env                                   (edit — local/gitignored: drop ANTHROPIC_API_KEY)  [developer machine only]
plans/03-site-builder-plan.md                       (optional — one bracketed note where it forward-references feature 4 / variantsJson; history otherwise untouched)
plans/04-remove-ai-and-variants-plan.md             (new — this plan, copied verbatim, Status: in-progress → done)
```

No new directories. No new dependencies.

---

## Tests

No new tests. Existing tests must stay green after the contracts trim:
- `packages/contracts/src/__tests__/contracts.test.ts` — the `analytics vocabulary` + `createApiClient` describes remain and pass; the `visitor-type vocabulary` describe is deleted.
- `apps/builder/__tests__/smoke.test.ts`, `apps/customer/__tests__/smoke.test.ts` — keep a DB-independent contracts-wiring assertion (now `ANALYTICS_EVENT_TYPES` length 3).
- `apps/builder/__tests__/auth/*`, `apps/builder/__tests__/site/*` — untouched (no AI/variant/visitor-type references; verified by grep).

Gates (must be green across the workspace): `pnpm install` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`; `pnpm db:migrate` idempotent (no schema change). Plus the Phase-3 grep sweep showing no dangling references.

---

## Acceptance

This feature owns **no** REQ acceptance criteria — it *removes* REQ-6, REQ-7, REQ-13, REQ-20 and *trims* REQ-8, REQ-9, REQ-12, REQ-15, REQ-18. "Done" means:
- `PRD.md`, `VISION.md`, `ROADMAP.md`, `CLAUDE.md`, and `plans/00-master-plan.md` contain no AI / Anthropic / Claude / "touch-up" / "7 variants" / "styling preset" / visitor-type / "demo switcher" / gender-or-age-breakdown wording except the explicit `(removed)` REQ stubs; the master plan's feature-4 slot is the `remove-ai-and-variants` charter and its downstream charters (5–9) describe a single non-personalized page and totals-only analytics.
- `@mizrahitality/contracts` exports no visitor-type vocabulary; `AnalyticsEventInput = { slug; type }`; `@anthropic-ai/sdk` is not a dependency; `ANTHROPIC_API_KEY` is not in `.env.example`; no source file imports a removed export.
- All workspace gates green; `pnpm db:migrate` idempotent; the Phase-3 grep sweep is clean.
- Demo / verify: `pnpm install && pnpm typecheck && pnpm test && pnpm build` from a clean checkout; open `PRD.md` / `ROADMAP.md` / `CLAUDE.md` and confirm the scope reads as "single published page, no AI, no audience targeting"; `grep -ri 'anthropic\|visitor.type\|VISITOR_TYPES\|7 variant\|styling preset' .` returns only the documented stubs.

---

## Verification (end-to-end)

1. From a clean working tree: `pnpm install` (lockfile updates; `prisma generate` runs on `postinstall`).
2. `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` — all green across builder, customer, contracts (no import of `visitor-types` or `@anthropic-ai/sdk`; `contracts.test.ts` + both `smoke.test.ts` pass).
3. `pnpm db:migrate` — "No pending migrations" (schema unchanged in shape).
4. Grep sweep (Phase 3, step 7) — only the `(removed)` REQ stubs, this plan, and historical `plans/01–03` match.
5. Eyeball `PRD.md` / `VISION.md` / `ROADMAP.md` / `CLAUDE.md` / `plans/00-master-plan.md` — the product is described as: owner signs up → creates a site (venue name → slug) → builds one page (Rich Text ×N, ≤1 Image, ≤1 Book Now) with live preview → Publishes → the SSR customer site at `localhost:5112/<slug>` renders that page (placeholder if unpublished) → Book Now hover/click + one visit per load post to the analytics API → the dashboard shows total visits, Book Now clicks, Book Now hovers. No AI, no variants, no visitor types anywhere.
6. (Optional) `pnpm dev` — both apps still boot on :5111 / :5112; the builder, sign-in, and the customer placeholder render unchanged.

---

## Risks & open questions

- **Wide doc edits.** Five large checked-in docs are rewritten; the executor must catch *every* AI/variant/visitor-type mention, not just the ones listed here — hence the Phase-3 grep sweep is part of "done". Read `VISION.md` past line 40 and the whole `CLAUDE.md` Layout section during execution.
- **`(removed)` REQ stubs vs. renumbering.** Keeping REQ-6/7/13/20 as `(removed)` stubs preserves traceability and avoids touching every "Satisfies REQ-#" reference; the alternative (renumber 1–16) is more invasive and is *not* done here. If the user prefers renumbering, that's a follow-up.
- **Completed plan files.** `plans/01–03-*-plan.md` keep their (now slightly stale) forward-references to feature 4 / `variantsJson`; they're historical records. At most a one-line bracketed note in `03-site-builder-plan.md`. Not a correctness issue.
- **Downstream features not yet planned.** Features 5 (published-page-api), 6 (analytics-api), 8 (customer-site), 9 (demo-seed) don't exist as code yet — this feature only trims their *charters* in the master plan so they're planned correctly later. No code in features 5–9 to clean.
- **`AnalyticsEventInput` shape lock-in.** Dropping `visitorType` now means feature 6's `AnalyticsEvent` model and the ingest endpoint are slug+type+timestamp only — confirmed by the user ("no more visitor types in the system at all").
- **Image resizing.** The owner mentioned "rich text box and image upload and placement + resizing" — image *resizing* is **not** in the current builder and is **not** added by this feature. Flagged as a possible future `site-builder` enhancement; out of scope here.
- **`claude-api` skill.** Now irrelevant (no AI work) — all references to it are removed from `CLAUDE.md`, `ROADMAP.md`, and `plans/00-master-plan.md`. (It also isn't installed on this machine, which is now moot.)
- **No commit** unless the user asks.

---

## Tasks (execution order)

> Progress legend: ✅ done · 🔄 in progress · ⬜ not started.

**Phase 0 — setup**
1. ✅ Copy this plan verbatim to `plans/04-remove-ai-and-variants-plan.md`, status → `in-progress`.

**Phase 1 — strip AI / variant / visitor-type references from the docs**
2. ✅ `PRD.md` — mark REQ-6/7/13/20 `(removed)`; trim REQ-8/9/12/14/15/18/19; scrub §§1, 2, 3, 4, 6, 7, 8 per the edit list.
3. ✅ `VISION.md` — scrub elevator pitch, value proposition, target users, differentiation, context.
4. ✅ `ROADMAP.md` — North Star, milestone success criteria, features-table row rename + published-page/customer-site/dashboard notes, "What We're Not Building", workflow/skills line.
5. ✅ `CLAUDE.md` (root) — "What this is" bullets, deleted the AI tech-stack bullet, deleted the AI hard-constraint, scrubbed the Layout section (contracts vocab, builder `variantsJson` ref, `.env.example` var list) + the Tests bullet.
6. ✅ `plans/00-master-plan.md` — §1 (skills sentence + file-list name), §2 (graph label, status-table row, ordering notes), §3 (rewrote charter 4; trimmed charters 5, 6, 7, 8, 9; added a historical note to charter 3), §4 (cross-cutting rules), §5 (Definition of Done). Charters 1–3 (completed features) left as historical records.
7. ✅ `plans/03-site-builder-plan.md` — one bracketed note where it forward-references feature 4 / `variantsJson`.

**Phase 2 — code cleanup**
8. ✅ `apps/builder/package.json` — removed `@anthropic-ai/sdk`. `apps/builder/.env.example` + local `apps/builder/.env` — removed `ANTHROPIC_API_KEY` block.
9. ✅ Deleted `packages/contracts/src/visitor-types.ts`; `packages/contracts/src/index.ts` — dropped the `./visitor-types` export; `packages/contracts/src/analytics.ts` — dropped `visitorType` from `AnalyticsEventInput` + the `VisitorType` import.
10. ✅ `packages/contracts/src/__tests__/contracts.test.ts` — deleted the `visitor-type vocabulary` describe + its imports. `apps/builder/__tests__/smoke.test.ts` + `apps/customer/__tests__/smoke.test.ts` — `VISITOR_TYPES` → `ANALYTICS_EVENT_TYPES`. `apps/customer/app/page.tsx` — placeholder line `VISITOR_TYPES` → `ANALYTICS_EVENT_TYPES`. (Also: `apps/builder/app/(owner)/dashboard/page.tsx` — trimmed a TODO comment that named "gender + age-group breakdowns".)
11. ✅ `apps/builder/prisma/schema.prisma` — deleted the `variantsJson` comment line. `apps/builder/prisma/CHANGELOG.md` — struck the "feature 4 will add variantsJson" note; prepended the no-migration decision entry.
12. ✅ `pnpm install` — regenerated `pnpm-lock.yaml` (`@anthropic-ai/sdk` + transitive deps gone).

**Phase 3 — verify**
13. ✅ `pnpm typecheck` ✓ → `pnpm lint` ✓ → `pnpm test` ✓ (contracts 4, builder 56, customer 3) → `pnpm build` ✓ (both apps); `pnpm db:migrate` ✓ ("No pending migrations to apply.").
14. ✅ Grep sweep — remaining hits are: the `(removed)` REQ stubs + Non-Goals lines in `PRD.md`, the `remove-ai-and-variants` feature row in `ROADMAP.md`, this plan, the deliberate no-migration `CHANGELOG.md` entry, the historical `plans/01–03-*-plan.md`, and the historical charters 1–3 in `plans/00-master-plan.md` (annotated). No stray references in app/package source.

**Phase 4 — close out**
15. ✅ `plans/00-master-plan.md` §2 status table: feature 4 → `done ([plan](04-remove-ai-and-variants-plan.md))`.
16. ✅ Set this plan's status → `done`; added the "Execution outcome" section. No commit.

---

## Execution outcome

**Executed 2026-05-12.** All phases complete.

**Docs swept** — `PRD.md` (REQ-6/7/13/20 → `(removed)` stubs; REQ-8/9/12/14/15/18/19 trimmed; §§1–4, 6–8 scrubbed), `VISION.md`, `ROADMAP.md`, root `CLAUDE.md`, and `plans/00-master-plan.md` (charter 4 rewritten to `remove-ai-and-variants`; charters 5–9 trimmed to a single non-personalized page + totals-only analytics; §1/§2/§4/§5 scrubbed; status table updated). Charters 1–3 (completed features) and `plans/01–03-*-plan.md` left as historical records; a bracketed historical note added to `plans/03-site-builder-plan.md` and to master-plan charter 3 where they forward-referenced `variantsJson`.

**Code cleaned** — `@anthropic-ai/sdk` dependency removed from `apps/builder/package.json` and dropped from `pnpm-lock.yaml`; `ANTHROPIC_API_KEY` removed from `apps/builder/.env.example` and `apps/builder/.env`; `packages/contracts/src/visitor-types.ts` deleted and its `index.ts` re-export removed; `AnalyticsEventInput` reduced to `{ slug; type }` (and the `VisitorType` import dropped) in `packages/contracts/src/analytics.ts`; `contracts.test.ts` lost the visitor-type `describe` + imports; both `smoke.test.ts` and `apps/customer/app/page.tsx` re-pointed `VISITOR_TYPES` → `ANALYTICS_EVENT_TYPES`; the `variantsJson` forward-reference comment removed from `schema.prisma`; the `CHANGELOG.md` `add_site` note struck and a "no migration — feature 4" decision entry prepended. `apps/builder/app/(owner)/dashboard/page.tsx` had a TODO comment trimmed (it named gender/age breakdowns).

**No schema migration** — `Site.variantsJson` was never added; `pnpm db:migrate` reports "No pending migrations to apply." (idempotent, schema shape unchanged — only a `///` comment removed). The `update-database` skill was not used (nothing for it to do).

**Gates** — `pnpm typecheck`, `pnpm lint`, `pnpm test` (contracts 4 / builder 56 / customer 3, all passing), and `pnpm build` (builder + customer) all green; `pnpm db:migrate` idempotent.

**Note on environment** — during `pnpm install`, the builder `postinstall` (`prisma generate`) hit a transient Windows `EPERM` on renaming the Prisma query-engine `.dll.node` (a file-lock from one of the many running node processes); the generated client `index.d.ts`/`index.js` were still regenerated and the prior engine binary is intact, so typecheck/build/test/migrate all pass. Leftover `*.dll.node.tmp*` files were cleaned up. Not a code issue.

**No commit** (per the standing process — the user has not asked).
