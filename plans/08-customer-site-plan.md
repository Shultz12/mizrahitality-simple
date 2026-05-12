# Feature 8 — customer-site — Plan

**Status:** done
**Depends on:** features 1 (monorepo-foundation), 5 (published-page-api), 6 (analytics-api) — all `done`
**Satisfies:** REQ-11, REQ-12, REQ-14, REQ-16, REQ-19 (+ the emission side of REQ-15)
**Skills used:** none (no DB/schema changes → no `update-database`)
**No commits unless the user asks.**

---

## Context

This is the integration feature. Builder-side everything is done: `GET /api/sites/{slug}` returns a published page, `POST /api/events` ingests analytics, and the owner dashboard aggregates them. `apps/customer/` is still just the foundation scaffold (root layout + a placeholder `/` page + `lib/env.ts` exporting `BUILDER_API_URL`/`apiClient`). Feature 8 builds the actual public visitor site: a Next.js App Router page at `localhost:5114/<slug>` that, on each request, fetches the venue's published page from the Builder REST API and renders it **entirely server-side**, shows a friendly "coming soon" placeholder for an existing-but-unpublished slug and a friendly not-found page for an unknown slug, degrades gracefully when the Builder API is down, and from the visitor's browser posts exactly one `visit` per page load plus `book-now-hover`/`book-now-click` events — with Book Now showing a friendly confirmation and no real booking. After this feature the whole product is demoable end-to-end (only `demo-seed` remains).

Mirrors the established pattern from feature 7 (`dashboard-view.ts`): a pure, framework-free view-model module unit-tested across its discriminated-union branches, plus a thin Server Component and a couple of small `"use client"` leaves. The customer renderer mirrors the builder's server-renderable `components/site/block-view.tsx`.

## In scope

- `apps/customer/app/[slug]/page.tsx` — the public per-venue Server Component (SSR on each request, fetch via the REST API, branch on the envelope).
- Server-side rendering of the published page: venue-name `<h1>` + ordered blocks (Rich Text sanitized HTML, the one Image by URL resolved against `BUILDER_API_URL`, the Book Now button if present) — mirroring `block-view.tsx`.
- Friendly "coming soon" placeholder for an existing-but-unpublished slug; a friendly not-found page (`app/not-found.tsx` via Next's `notFound()`) for an unknown slug; a friendly "temporarily unavailable" placeholder (HTTP 200) when the Builder API errors/is unreachable.
- Browser analytics emission: exactly one `visit` per page load (StrictMode-safe), `book-now-hover` on first hover, `book-now-click` on every click — POSTed to `POST /api/events` (CORS-friendly, cross-origin from `:5114` → `:5113`).
- Book Now: renders as a button; clicking shows a friendly inline confirmation toast (no real booking/payment).
- A light tidy of the root `/` index page so it reads as a real landing/index rather than a scaffold.
- Tests (Vitest, customer workspace, all DB-independent): pure view-model branches + image-URL helper, the analytics once-guard, and an SSR-render smoke test on the page renderer.
- Update `CLAUDE.md`'s `apps/customer/` Layout paragraph; tick the master-plan status table on completion; copy this plan to `plans/08-customer-site-plan.md`.

## Out of scope

- The REST API endpoints themselves (features 5 & 6 — unchanged).
- The builder app / owner dashboard (untouched).
- `packages/contracts/*` — every shape/path needed already exists (`PublishedPage`, `PublishedBlock`, `publishedPagePath`, `AnalyticsEventInput`, `analyticsEventsPath`, `ApiResult`, `createApiClient`).
- Any DB / Prisma change. Any new env var. A real design system (a design may come later; build clean simple UI with shadcn `Button` + lucide icons).
- `demo-seed` (feature 9).

## Approach (key decisions)

- **`app/[slug]/page.tsx`** — Server Component, `export const dynamic = "force-dynamic"` (explicit; SSR on each request). `params` is a Promise in Next 15: `const { slug: raw } = await params; const slug = raw.toLowerCase();` (the Builder lower-cases on input anyway; doing it here keeps the analytics slug and the `cache()` key consistent). Fetch + resolve via `loadPublishedView(slug)` from `lib/published-view.ts` (a `cache()`-wrapped function doing `apiClient.get<PublishedPage>(publishedPagePath(slug), { cache: "no-store" })` then `resolvePublishedView(result)`). Branch on the returned view:
  - `kind:"page"` → `<PublishedPage page={...} builderApiUrl={BUILDER_API_URL} />` + `<VisitorAnalytics slug={page.slug} builderApiUrl={BUILDER_API_URL} />`
  - `kind:"placeholder"` (unpublished slug) → `<ComingSoon variant="soon" />` + `<VisitorAnalytics slug={slug} builderApiUrl={BUILDER_API_URL} />` (the API accepts a `visit` for an existing-but-unpublished slug)
  - `kind:"not-found"` (unknown slug) → `notFound()` → renders `app/not-found.tsx`; **no** analytics
  - `kind:"error"` (`network_error`/`bad_response`/`internal_error`/anything else `ok:false`) → `<ComingSoon variant="unavailable" />`, HTTP 200 (graceful degradation per REQ-12, not a 5xx); **no** analytics (can't reach the API anyway).
  - **`generateMetadata`** also calls `loadPublishedView(slug)` (deduped by `cache()` — no second round-trip) and sets `<title>` to the venue name for `kind:"page"`, else a generic title. (Confirmed: include it — small, nicer UX.)
- **`lib/published-view.ts`** — pure view-model, mirrors `lib/analytics/dashboard-view.ts`:
  - `type PublishedView = { kind:"page"; page: PublishedPage } | { kind:"placeholder" } | { kind:"not-found" } | { kind:"error"; message: string }`
  - `resolvePublishedView(result: ApiResult<PublishedPage>): PublishedView` — `ok` → `page`; `error.code === "unpublished"` → `placeholder`; `=== "not_found"` → `not-found`; default → `error` (catches `network_error`/`bad_response`/`internal_error`/unforeseen). No try/catch needed — `apiClient.get` already synthesizes `apiErr` on failure.
  - `absoluteImageUrl(url: string, base: string): string` — empty → unchanged; `^(https?:)?//` or `data:` → unchanged; else `${base without trailing /}/${url without leading /}`.
  - `loadPublishedView = cache(async (slug) => resolvePublishedView(await apiClient.get<PublishedPage>(publishedPagePath(slug), { cache: "no-store" })))`.
- **`components/published-page.tsx`** — Server Component mirroring `apps/builder/components/site/block-view.tsx`. Props `{ page: PublishedPage; builderApiUrl: string }`. Wraps in `<main className="mx-auto max-w-2xl space-y-6 p-8">`, venue `<h1 className="text-3xl font-bold tracking-tight">{page.name || "Your venue"}</h1>`, then per block:
  - `rich-text` → `<div className="miz-prose" dangerouslySetInnerHTML={{ __html: block.html || "<p></p>" }} />` (HTML was sanitized server-side by the builder on save — trusted on read; same comment as the builder).
  - `image` → `<img src={absoluteImageUrl(block.imageUrl, builderApiUrl)} alt={block.alt} className="max-h-96 w-full rounded-md object-cover" />` with the builder's dashed-border "No image chosen yet" fallback when `imageUrl` is empty; `// eslint-disable-next-line @next/next/no-img-element` (mirrors the builder — a remote-loader `next/image` is overkill here).
  - `book-now` → `<BookNowButton slug={page.slug} builderApiUrl={builderApiUrl} />` (a `"use client"` leaf — its initial `<button>` markup still server-renders, so SSR / REQ-19 holds).
- **`.miz-prose` CSS** — copy the ~84-line `.miz-prose` block from `apps/builder/app/globals.css` **verbatim** into `apps/customer/app/globals.css` (after the two `@import`s), with a comment noting the two copies are kept in sync. (Confirmed: copy, not a shared package.) Doesn't affect tests (`vitest.config.ts` already neutralizes postcss; the SSR render test uses `renderToStaticMarkup`, which never loads CSS).
- **`components/coming-soon.tsx`** — Server Component, prop `variant: "soon" | "unavailable"`. `"soon"`: "Coming soon" headline + "This venue is putting the finishing touches on their page — check back shortly." `"unavailable"`: "Temporarily unavailable" + "This venue's page can't be loaded right now — please try again soon." Same centered `<main>` layout for both. Used for `placeholder` and `error`.
- **`app/not-found.tsx`** — Server Component, friendly "We couldn't find a venue at this web address." + a line about the site. (Next renders it with a 404 status; also covers any non-`[slug]` path.)
- **`lib/analytics-client.ts`** — browser-side helpers (testable):
  - module-scoped `const sent = new Set<string>()` — survives React StrictMode's double effect-invoke (a `useRef` is recreated per mount; a module-scoped set is the simplest reliable "once per page load" guard).
  - `postEvent(builderApiUrl, input: AnalyticsEventInput): Promise<void>` — `fetch(`${base}${analyticsEventsPath()}`, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(input), keepalive:true })`; swallows errors (analytics is best-effort).
  - `postEventOnce(builderApiUrl, input): boolean` — key `${input.slug}|${input.type}`; if already sent → `false`; else add key, `void postEvent(...)`, `true`.
  - `__resetAnalyticsGuard(): void` — test-only, clears `sent`.
- **`components/visitor-analytics.tsx`** (`"use client"`) — `useEffect(() => { postEventOnce(builderApiUrl, { slug, type:"visit" }); }, [slug, builderApiUrl])`; returns `null`. Rendered for `page` and `placeholder` views only.
- **`components/book-now-button.tsx`** (`"use client"`) — a shadcn `<Button type="button">Book Now</Button>` with `onMouseEnter`/`onFocus` → `postEventOnce(builderApiUrl, { slug, type:"book-now-hover" })` (once per page load — avoids hover-spam) and `onClick` → `void postEvent(builderApiUrl, { slug, type:"book-now-click" })` (every click) then `setConfirmed(true)`. When `confirmed`: a small fixed toast `<div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 …">` with a lucide `CheckCircle2` icon and "Thanks — we'll be in touch! (This demo doesn't take real bookings.)". (Confirmed: inline toast, no new dep.)
- **`builderApiUrl` plumbing** — `process.env.BUILDER_API_URL` isn't visible in client components unless `NEXT_PUBLIC_`-prefixed. The Server Component imports `BUILDER_API_URL` from `@/lib/env` (server-side) and passes it down as a `builderApiUrl` prop to `<PublishedPage>` (→ `<BookNowButton>`) and `<VisitorAnalytics>`. No new env var.
- **Root `/` (`app/page.tsx`)** — light tidy: reword to read as a real index ("Mizrahitality — visit a venue at `/<slug>`"), drop the placeholder `Button` and the now-unused `ANALYTICS_EVENT_TYPES`/`Button` imports. (Confirmed.)
- **`app/layout.tsx`** — unchanged (static title "Mizrahitality"; `generateMetadata` on the `[slug]` route overrides per-route).

## Tasks (ordered)

1. `apps/customer/vitest.config.ts` — add `"**/*.test.tsx"` to `test.include`.
2. `apps/customer/app/globals.css` — append the `.miz-prose` block (verbatim from `apps/builder/app/globals.css`) with a "keep in sync" comment.
3. Create `apps/customer/lib/published-view.ts` — `PublishedView`, `resolvePublishedView`, `absoluteImageUrl`, `loadPublishedView` (`cache()`-wrapped).
4. Create `apps/customer/lib/analytics-client.ts` — `postEvent`, `postEventOnce`, module-scoped guard, `__resetAnalyticsGuard`.
5. Create `apps/customer/components/visitor-analytics.tsx` (`"use client"`).
6. Create `apps/customer/components/book-now-button.tsx` (`"use client"` — needs a lucide icon: `CheckCircle2`; `lucide-react` is already a dep).
7. Create `apps/customer/components/published-page.tsx` (Server Component) — uses `absoluteImageUrl`, renders `<BookNowButton>`.
8. Create `apps/customer/components/coming-soon.tsx` (Server Component, `variant` prop).
9. Create `apps/customer/app/not-found.tsx` (Server Component).
10. Create `apps/customer/app/[slug]/page.tsx` (Server Component) — `dynamic = "force-dynamic"`, `await params`, lowercase slug, `loadPublishedView`, branch → `<PublishedPage>` + `<VisitorAnalytics>` / `<ComingSoon variant="soon">` + `<VisitorAnalytics>` / `notFound()` / `<ComingSoon variant="unavailable">`; plus `generateMetadata`.
11. `apps/customer/app/page.tsx` — light tidy of the `/` index.
12. Create the three test files (see below).
13. `pnpm -F customer typecheck && pnpm -F customer test && pnpm -F customer lint && pnpm -F customer build`; then workspace-wide `pnpm build && pnpm typecheck && pnpm test && pnpm lint`.
14. Update `CLAUDE.md` — the `apps/customer/` paragraph in "Layout" (currently "for now `app/` has the root layout + a placeholder home page") to describe `[slug]/page.tsx`, `not-found.tsx`, `lib/published-view.ts`, `lib/analytics-client.ts`, the `components/` set, the `.miz-prose` copy, and the new `__tests__/`. No "Build / run / test" change (no new scripts/deps).
15. Copy this plan to `plans/08-customer-site-plan.md` (status `in-progress`); on completion set it `done` and tick row 8 in `plans/00-master-plan.md`'s status table.

## Data model

None. No Prisma/schema change → the `update-database` skill is not used.

## API surface

None added or changed. The customer app **consumes** existing Builder endpoints (no auth; slug is identity; bodies are always JSON envelopes):
- `GET /api/sites/{slug}` → `ApiResult<PublishedPage>`: `200 apiOk({slug,name,blocks})` · `200 apiErr("unpublished",…)` · `404 apiErr("not_found",…)` · `500 apiErr("internal_error",…)`.
- `POST /api/events` body `AnalyticsEventInput {slug,type}` → `ApiResult<{recorded:true}>`: `200 apiOk(...)` · `400 apiErr("invalid_event",…)` · `404 apiErr("not_found",…)` (an existing-but-unpublished slug **is** accepted) · `500`. CORS-friendly (`Access-Control-Allow-Origin: *` + `OPTIONS`). No server-side dedup — "exactly one `visit` per page load" is enforced client-side here.

## Files & directories

**Created:**
- `apps/customer/app/[slug]/page.tsx` — the public per-venue Server Component (+ `generateMetadata`).
- `apps/customer/app/not-found.tsx` — friendly not-found page.
- `apps/customer/lib/published-view.ts` — `PublishedView`, `resolvePublishedView`, `absoluteImageUrl`, `loadPublishedView`.
- `apps/customer/lib/analytics-client.ts` — `postEvent`, `postEventOnce`, once-guard, `__resetAnalyticsGuard`.
- `apps/customer/components/published-page.tsx` — Server Component renderer mirroring `block-view.tsx`.
- `apps/customer/components/coming-soon.tsx` — placeholder / unavailable view.
- `apps/customer/components/visitor-analytics.tsx` — `"use client"`, posts one `visit` on mount.
- `apps/customer/components/book-now-button.tsx` — `"use client"`, hover/click events + inline confirmation toast.
- `apps/customer/__tests__/published-view.test.ts`
- `apps/customer/__tests__/analytics-client.test.ts`
- `apps/customer/__tests__/published-page.test.tsx`
- `plans/08-customer-site-plan.md` — durable copy of this plan.

**Edited:**
- `apps/customer/app/globals.css` — append the `.miz-prose` block.
- `apps/customer/vitest.config.ts` — `include` adds `"**/*.test.tsx"`.
- `apps/customer/app/page.tsx` — light tidy of `/`.
- `CLAUDE.md` (repo root) — `apps/customer/` Layout paragraph; (on completion) the master-plan status table.

**Reference (mirror, do not edit):** `apps/builder/components/site/block-view.tsx`, `apps/builder/app/globals.css` (the `.miz-prose` block), `apps/builder/lib/analytics/dashboard-view.ts` (the pure-module pattern), `packages/contracts/src/{published-page,analytics,client,envelope}.ts`.

**Not touched:** `packages/contracts/*`, `apps/builder/*` (except the read of `block-view.tsx`/`globals.css`), Prisma, `next.config.ts` (already transpiles `@mizrahitality/contracts`), `package.json` (no new deps), `scripts/*`, `.env.example`.

## Tests (Vitest, customer workspace — all DB-independent; the customer app has no DB)

- **`__tests__/published-view.test.ts`**
  - `resolvePublishedView(apiOk({slug,name,blocks}))` → `{kind:"page",page}`
  - `resolvePublishedView(apiErr("unpublished",…))` → `{kind:"placeholder"}`
  - `resolvePublishedView(apiErr("not_found",…))` → `{kind:"not-found"}`
  - `resolvePublishedView(apiErr("network_error","boom"))` → `{kind:"error",message:"boom"}`
  - `apiErr("internal_error",…)` / `apiErr("bad_response",…)` / `apiErr("totally_unknown",…)` → `{kind:"error"}`
  - `absoluteImageUrl("/uploads/x.png","http://localhost:5113")` → `"http://localhost:5113/uploads/x.png"`; with trailing slash on base → same; `"https://cdn.example.com/a.jpg"` → unchanged; `""` → `""`; `"//cdn/x"` → unchanged; `"data:image/png;base64,…"` → unchanged
- **`__tests__/analytics-client.test.ts`** — `vi.fn()` for `global.fetch` (resolves an envelope); `__resetAnalyticsGuard()` in `beforeEach`
  - `postEventOnce(base,{slug:"a",type:"visit"})` → `true`, `fetch` called once; a second identical call → `false`, `fetch` not called again
  - different slug or different type → `true`, `fetch` called again
  - `postEvent` swallows a rejected `fetch` (no throw)
  - `postEvent` POSTs to `${base}/api/events` with `content-type: application/json` and body deep-equal to the input (assert on `fetch.mock.calls`)
- **`__tests__/published-page.test.tsx`** — SSR render smoke (`renderToStaticMarkup` from `react-dom/server`; `react-dom` already a dep; `environment: "node"` is fine — `useEffect`/`useState` are inert under `renderToStaticMarkup`, exactly the SSR-output assertion REQ-11/19 want)
  - page with `name:"Cafe Mizrahi"`, blocks `[{rich-text html:"<p>Hello <strong>world</strong></p>"},{image imageUrl:"/stock/cafe.svg" alt:"Our cafe"},{book-now}]`, `builderApiUrl:"http://localhost:5113"` → output contains `"Cafe Mizrahi"`, the rich-text HTML, `src="http://localhost:5113/stock/cafe.svg"`, `alt="Our cafe"`, `"Book Now"`, and the `miz-prose` class
  - image block with `imageUrl:""` → output contains the "No image" fallback text and no `<img`
- **`__tests__/smoke.test.ts`** — keep unchanged (env defaults, configured client, contracts import).

## Acceptance

- **REQ-11 (Next.js SSR at `/<slug>`, unknown slug handled gracefully)** — `app/[slug]/page.tsx` (`dynamic="force-dynamic"`, RSC) + `app/not-found.tsx`. Verified: load `:5114/<slug>` with JS disabled / `curl` → full content in raw HTML; load `:5114/<nonexistent>` → friendly not-found page.
- **REQ-12 (per-request API fetch & render; API error degrades gracefully)** — `loadPublishedView` → `apiClient.get(... {cache:"no-store"})` each request; `<PublishedPage>` renders venue name + ordered blocks by type; `kind:"error"` → `<ComingSoon variant="unavailable">` HTTP 200. Verified: page reflects API content & order; stop the Builder, reload → friendly placeholder, no stack trace.
- **REQ-14 (Book Now button → click event + confirmation; hover event; no booking)** — `<BookNowButton>` (renders a `<Button>`; click → `book-now-click` + confirmation toast; hover → `book-now-hover`; no navigation/payment). Verified: hover then click → toast appears; dashboard's hover/click counts go up.
- **REQ-16 (placeholder for unpublished slug; real page after publish)** — `kind:"placeholder"` → `<ComingSoon variant="soon">`. Verified: create an unpublished site → `:5114/<slug>` shows "coming soon" (HTTP 200, server-rendered); publish → reload → the real page.
- **REQ-19 (SSR mandatory for published page and placeholder)** — both are RSC trees; the `"use client"` leaves (`VisitorAnalytics` renders `null`; `BookNowButton` renders an inert `<button>`) only add server-rendered initial markup. Verified: JS disabled → both the published page and the placeholder are fully present in the raw HTML.
- **Emission side of REQ-15 (exactly one `visit` per page load)** — `<VisitorAnalytics>` + the module-scoped once-guard (StrictMode-safe). Verified: reload `:5114/<slug>` several times → dashboard visits go up by exactly one each time.

## End-to-end verification

1. `pnpm install` (if needed) → ensure `apps/customer/.env` exists (`CUSTOMER_PORT=5114`, `BUILDER_API_URL=http://localhost:5113`) and `apps/builder/.env` exists → `pnpm db:migrate` → `pnpm dev` (Builder :5113, Customer :5114).
2. Builder (`:5113`): sign up, create a site (note the slug), add a Rich Text block, an Image (stock or upload), a Book Now block, **Publish**.
3. `http://localhost:5114/<slug>` — confirm venue name, rich-text HTML, the image (loads from `:5113/uploads/...` or `:5113/stock/...`), a "Book Now" button. **Disable JS** (or `curl http://localhost:5114/<slug>`) and reload → full page content in the raw HTML. (REQ-11/12/19)
4. Hover Book Now, then click it → friendly confirmation toast; no navigation/payment. (REQ-14)
5. Builder dashboard for that site → visits incremented (one per `:5114/<slug>` load), Book Now hovers incremented (once per page load regardless of hover count), Book Now clicks incremented (one per click). (emission side of REQ-15)
6. Reload `:5114/<slug>` a few times → visits +1 each time, never +2 (StrictMode guard works).
7. Create a second site, **do not publish** → `:5114/<that-slug>` → "coming soon" placeholder, HTTP 200, fully server-rendered; the dashboard for that slug shows a `visit`. (REQ-16/19)
8. Publish that second site → reload → the real page now shows. (REQ-16)
9. `:5114/some-nonexistent-slug` → friendly not-found page, no `visit` posted. (REQ-11)
10. Stop the Builder app, reload `:5114/<slug>` → friendly "temporarily unavailable" placeholder (HTTP 200), not a stack trace/blank; no event posted. (REQ-12)
11. `pnpm build && pnpm typecheck && pnpm test && pnpm lint` — green across the workspace.

## Risks & open questions

- **React StrictMode double `visit`** — handled by the module-scoped `Set` guard in `lib/analytics-client.ts`; verified by step 6.
- **`"use client"` component in a node-env render test** — `renderToStaticMarkup` of a tree containing a `"use client"` component works in plain node (it's a bundling directive, not a runtime one); `useEffect`/`useState` are inert under static rendering, which is what the test wants.
- **`generateMetadata` + page double-fetch** — avoided by wrapping the fetch in React `cache()` (`loadPublishedView`), keyed on the (lower-cased) slug.
- **`book-now-click` granularity** — fires on every click (matches REQ-14 "clicking it records a Book Now click event"); `book-now-hover` fires once per page load (avoids hover-spam); `visit` once per page load (REQ-15).
- **`.miz-prose` duplication** — accepted: copied verbatim into `apps/customer/app/globals.css` with a "keep in sync" comment (chosen over extracting a shared package, which would touch the builder).
- **Resolved decisions:** Book Now confirmation = inline toast, no new dep · `.miz-prose` = copied verbatim into the customer · unknown slug = `notFound()` + `app/not-found.tsx`, API error = friendly "temporarily unavailable" placeholder HTTP 200 · root `/` page = lightly tidied · dynamic `<title>` via `generateMetadata` + `cache()` = yes.
