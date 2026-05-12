# Plan — Feature 3: site-builder

**Status:** done
**Order:** 3 of 9
**Depends on:** feature 1 (monorepo-foundation) — done; feature 2 (owner-auth) — done
**Satisfies:** REQ-3 (site creation & slug), REQ-4 (page builder drag-and-drop blocks), REQ-5 (live preview, P1); touches REQ-10 (technophobe-friendly builder pages)
**Skills:** `update-database` (mandatory — adds the `Site` model + migration + `prisma/CHANGELOG.md` entry)

> Standing process (master plan §1): designed in Plan mode; on approval this file is copied verbatim to `plans/03-site-builder-plan.md` with `Status: in-progress`, then executed; on completion its status → `done` and the master plan §2 status table is ticked. No commit unless the user asks.

---

## Context

Features 1–2 are done. The Builder app (Next.js 15 App Router, port 5111) has Prisma+SQLite (only `OwnerAccount`), `lib/db.ts` (`prisma` singleton), `lib/auth/*` (`getCurrentOwner()` `cache()`-wrapped, `requireOwner()` → `redirect("/sign-in")`; `actions.ts` `"use server"` with `signOutAction`), route groups `app/(auth)/` and `app/(owner)/` (`layout.tsx` gates with `requireOwner()` + header + sign-out; `dashboard/page.tsx` placeholder for feature 7), `app/page.tsx` redirects by auth state, `lib/stock.ts` (`STOCK_IMAGES` — 4 SVGs `/stock/{cafe,restaurant,bar,hotel}.svg`, shape `{id,label,src}`), `lib/utils.ts` (`cn`), `components/ui/{button,card,input,label}` (shadcn new-york; `components.json` configured; `radix-ui` unified pkg installed), `uploads/` (gitignored, `.gitkeep`), `vitest.config.ts` (node env, `@`→app root, `**/*.test.ts`), `next.config.ts` (`transpilePackages:["@mizrahitality/contracts"]`, `eslint.ignoreDuringBuilds`). No Tiptap / dnd-kit / sanitize-html yet. `__tests__/` has `smoke.test.ts` + `auth/*` (all DB-free).

**Why this feature.** Feature 3 turns the authenticated shell into the actual product: a non-technical venue owner creates their **one** site by naming the venue (the slug — the Customer-site URL path + API identity — is derived from the name), then assembles a single landing page from drag-and-drop blocks (a pinned venue-name header + repeatable Rich Text, ≤1 Image, ≤1 Book Now) with a live preview, and saves it. It is the data foundation that feature 4 (AI touch-up + variants) extends, feature 5 (publish + REST API) snapshots, and feature 8 (the SSR customer site) ultimately renders. **Out of scope:** AI touch-up & variant generation (feature 4), the Publish action & published-page API (feature 5), analytics (feature 6).

### Decisions confirmed with the user

1. **Block storage = a single JSON column on `Site`** (`contentJson` holds `{ "blocks": Block[] }`; the venue-name/header text lives in `Site.name`, not as a block) — no child tables.
2. **Slug is frozen at creation.** Derived once from the venue name (spaces removed, lowercased); the pinned header is edited in place but only updates `Site.name` (display) — the slug never changes.
3. **HTML sanitization = `sanitize-html`** (mature, pure-JS, server-side allowlist; added to `apps/builder`).
4. **Persistence = an explicit "Save" button** via a Server Action (live preview updates client-side without saving; Publish is feature 5 — `Site.isDraft` is carried now but inert).

### Design calls (not user-facing forks; recorded for the executor)

- **Save + image-upload are Server Actions** (`lib/site/actions.ts`, consistent with feature 2's auth actions). The **only** new route handler is `GET /uploads/<file>` (mandated by the charter for serving uploaded images). No new REST endpoints — the Builder↔Customer REST API is features 5/6.
- **Block / page-content TS types stay builder-local** (`apps/builder/lib/site/`) — `@mizrahitality/contracts` is untouched. Feature 5 will define the shared published-page contract.
- **Builder route = `app/(owner)/builder/page.tsx`** — a Server Component that loads the owner's site; no site → render a create-site form; site exists → render the builder client component + a banner showing the frozen slug and the customer URL `http://localhost:5112/<slug>`. The `dashboard` placeholder gets a small "Open the site builder" link.
- **IDs** use `crypto.randomUUID()` (block ids, uploaded filenames) — no new id dependency.
- `isDraft Boolean @default(true)` is added to `Site` now so feature 5's Publish needs no schema change; today every site is `isDraft: true` and nothing reads it.

---

## Charter (master plan §3.3)

Site creation and the single-page drag-and-drop builder. Deliver: the `Site` data model (one per owner; venue name; derived slug; ordered list of blocks; an Image slot; a Book Now flag; a place for the variants set added by feature 4; draft state; timestamps) via `update-database` — blocks modeled as a JSON column (decided). Site creation: the owner enters a venue name (English letters + spaces only — reject digits/specials with a clear message), the slug is derived by removing spaces and lowercasing, slug collisions are rejected ("that venue name is taken — pick another"), the slug is shown. The builder page: a pinned venue-name header (always present, edited in place — updates `Site.name`, slug frozen); a "Drag into site" tray with Rich Text (Tiptap: bold/italic/headings/bullet+numbered lists/links; stored as sanitized HTML), repeatable; Image, ≤1; Book Now button, ≤1; drag from tray onto the page, drag to reorder, delete — all via `@dnd-kit/core` + `@dnd-kit/sortable`; when Image/Book Now is placed its tray item is greyed and the greyed Book Now item shows "Only one is allowed." on hover; live preview reflecting edits without refresh and matching the published layout; image handling — upload a file (stored under `apps/builder/uploads/`, served by `GET /uploads/<file>`) or pick from the committed stock set; block order and content persisted (explicit Save). Tests: slug derivation + name validation + collision, HTML sanitization round-trip, the at-most-one constraint, persistence of block order. Out of scope: AI (feature 4), Publish & published-page API (feature 5), analytics (feature 6).

---

## In scope

- New deps in `apps/builder`: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `sanitize-html` (+ `@types/sanitize-html` dev). shadcn additions: `dialog`, `tooltip`, `separator` (`textarea` optional).
- `update-database` run: the `Site` Prisma model + `OwnerAccount.site` back-relation + migration `add_site` + `prisma/CHANGELOG.md` entry.
- `lib/site/*`: `types.ts`, `slug.ts` (pure), `content.ts` (pure), `sanitize.ts`, `site.ts` (Prisma helpers), `actions.ts` (`"use server"`), `uploads-dir.ts` (the `uploads/` path constant).
- `app/(owner)/builder/page.tsx` (Server Component) + `create-site-form.tsx` (`"use client"`, `useActionState`); `app/(owner)/dashboard/page.tsx` edit (link to `/builder`).
- `app/uploads/[file]/route.ts` — `GET` handler streaming files from `uploads/`, path-traversal guarded.
- `components/site/*`: `site-builder.tsx` (DndContext + tray + canvas + preview + Save), `block-tray.tsx`, `sortable-block.tsx`, `rich-text-editor.tsx` (Tiptap + toolbar), `image-block-editor.tsx` (stock grid + upload + alt), `book-now-block.tsx`, `block-view.tsx` (server-renderable read-only renderer used by the live preview).
- Tests under `__tests__/site/`: `slug.test.ts`, `content.test.ts`, `sanitize.test.ts` — all DB-independent.
- `CLAUDE.md` `apps/builder/` Layout bullet updated; master plan §2 status table ticked; `plans/03-site-builder-plan.md` (this file copied verbatim).

## Out of scope

AI touch-up & variant generation, the styling-preset enum, `variantsJson` (feature 4). The Publish action, published snapshots, the `GET` published-page REST endpoint, resolving image URLs to absolute (feature 5). Analytics models/endpoints/dashboard (features 6–7). The SSR customer site / its own block renderer (feature 8). `@mizrahitality/contracts` changes. Multi-site / multi-page (PRD non-goal). No edits to `lib/auth/*` beyond reusing `requireOwner()`.

---

## Approach

**The `Site` model.** One row per owner (`ownerId String @unique` ⇒ effective 1:1 with `OwnerAccount`). Fields: `id` (cuid PK), `ownerId` (unique FK, `onDelete: Cascade`), `name` (the venue name = the pinned header text — editing the header updates this), `slug @unique` (derived once at creation, frozen), `contentJson String @default("{\"blocks\":[]}")` (holds `JSON.stringify({ blocks: Block[] })`), `isDraft Boolean @default(true)` (inert until feature 5), `createdAt`/`updatedAt`. `OwnerAccount` gets a back-relation `site Site?`. The header text is held in `Site.name`, **not** in the blocks array. Feature 4 will later add `variantsJson String?` via the same skill — **not pre-added here**.

**Builder-local TS types** (`apps/builder/lib/site/types.ts`):
```ts
type RichTextBlock = { id: string; type: "rich-text"; html: string };
type ImageBlock    = { id: string; type: "image"; imageUrl: string; alt: string };
type BookNowBlock  = { id: string; type: "book-now" };
type Block = RichTextBlock | ImageBlock | BookNowBlock;
type PageContent = { blocks: Block[] };
```
Plus `BLOCK_TYPES = ["rich-text","image","book-now"] as const`, `SINGLETON_BLOCK_TYPES = ["image","book-now"] as const`, `SitePayload = { name: string; blocks: Block[] }`. `id` is a `crypto.randomUUID()` used as the dnd-kit sortable key + React key. `imageUrl` is a **relative** path: `/uploads/<uuid>.<ext>` for uploads, `/stock/<name>.svg` for stock picks (a `// feature 5: resolve absolute against BUILDER_API_URL` comment marks where features 5/8 will rewrite it).

**Slug + name validation + collision — `lib/site/slug.ts` (pure, framework-free, testable).**
- `VENUE_NAME_RE = /^[A-Za-z ]+$/`.
- `slugifyVenueName(name: string): string` → `name.replace(/\s+/g, "").toLowerCase()` (`"Cafe Mizrahi"` → `"cafemizrahi"`).
- `validateVenueName(raw: unknown): { ok: true; value: string; slug: string } | { ok: false; error: string }` — coerce to string, `.trim()`; empty → `"Enter a venue name."`; fails `VENUE_NAME_RE` (or trims to no letters) → `"Use English letters and spaces only — no digits or special characters."`; defensively reject an empty slug; else return `{ ok: true, value: trimmed, slug }`.
- The collision message `"That venue name is taken — pick another."` is produced by the **caller** (`lib/site/site.ts`'s `createSite`, given the DB or an injectable `slugExists` lookup) — keeps `slug.ts` DB-free. `createSite` does `slugExists(slug)` → collision message; on `prisma.site.create` catch a `P2002` on `slug` → same message (handles the race, mirroring feature 2's `accounts.ts`). `createSite` is written DB-injectable so the collision path is unit-tested DB-free.

**`lib/site/content.ts` (pure).**
- `parsePageContent(raw: unknown): PageContent` — tolerant: string → `JSON.parse` in try/catch (→ `{ blocks: [] }` on failure); non-`{ blocks: [...] }` shape → `{ blocks: [] }`; else map over `blocks`, keep only entries that pass `isValidBlock` (assigning a `crypto.randomUUID()` to any block missing an `id` rather than dropping it), and **drop all but the first** `image` and the first `book-now` (defensive de-dup). Used to read `Site.contentJson` and inside `saveSiteAction`.
- `isValidBlock(x): x is Block` — `type` ∈ `BLOCK_TYPES`; `rich-text` needs a string `html`; `image` needs string `imageUrl` + string `alt`; `book-now` needs nothing more.
- `validateBlocks(blocks: Block[]): { ok: true; blocks } | { ok: false; error }` — every `type` ∈ `BLOCK_TYPES`; ≤1 `image` (`"You can only add one Image block."`); ≤1 `book-now` (`"You can only add one Book Now button."`).
- `countByType(blocks)` helper (used by the validator and the tray's `hasImage`/`hasBookNow`).

**`lib/site/sanitize.ts`** — `sanitizeRichTextHtml(html: string): string` over `sanitize-html`:
- `allowedTags`: `["p","br","strong","b","em","i","u","s","h1","h2","h3","ul","ol","li","a","blockquote","code","pre"]`.
- `allowedAttributes`: `{ a: ["href","target","rel"] }`.
- `allowedSchemes`: `["http","https","mailto"]` (drops `javascript:` hrefs).
- `transformTags`: `{ a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) }`.
- `disallowedTagsMode: "discard"`.
Net: `<script>`, any `on*=` attr, `style=`, `javascript:` hrefs, `<iframe>`, `<img>` (images are their own block) all gone; `<strong>/<b>/<em>/<i>/<u>/<s>/<h1-3>/<ul>/<ol>/<li>/<a href>/<blockquote>/<code>/<pre>` kept; surviving links get `rel="noopener noreferrer"`. Server-only module (Node `htmlparser2`) — imported only by `lib/site/actions.ts`, never a `"use client"` file.

**`lib/site/site.ts`** — Prisma-touching helpers (not unit-tested directly): `getOwnerSite(ownerId): Promise<{ id; name; slug; blocks: Block[] } | null>` (findUnique + `parsePageContent`); `slugExists(slug): Promise<boolean>`; `createSite({ ownerId, name }, deps?): Promise<{ ok: true; site } | { ok: false; error }>` (`validateVenueName` → `slugExists` → `prisma.site.create`, `P2002` fallback; `deps` lets tests inject a fake `{ slugExists, create }`).

**`lib/site/actions.ts` (`"use server"`).**
- `createSiteAction(prev: CreateSiteState, formData: FormData): Promise<CreateSiteState>` — `useActionState`-friendly. `await requireOwner()`; if the owner already has a site → `{ error: "You already have a site." }` (guard; the page normally won't show the form then); `createSite({ ownerId, name: formData.get("venueName") })` → on `!ok` `{ error, field: "venueName" }`; on `ok` → `revalidatePath("/builder")` + `redirect("/builder")` (outside any try/catch). `CreateSiteState = { error: string; field?: "venueName" } | null`.
- `saveSiteAction(siteId: string, payload: { name: string; blocks: unknown }): Promise<SaveResult>` — not a form action (called imperatively from `SiteBuilder` inside a `useTransition`). `await requireOwner()`; `prisma.site.findUnique({ where: { id: siteId } })` — if missing or `site.ownerId !== owner.id` → `{ ok: false, error: "Site not found." }` (ownership re-validated server-side; never trust the client `siteId`); `validateVenueName(payload.name)` — on fail return its error (the header text reuses the same rule); **the slug stays `site.slug`, untouched**; `parsePageContent(payload.blocks)` + `validateBlocks` — on fail `{ ok: false, error }`; sanitize each rich-text block's `html` via `sanitizeRichTextHtml`; `prisma.site.update({ where: { id: site.id }, data: { name, contentJson: JSON.stringify({ blocks }) } })`; `revalidatePath("/builder")`; `{ ok: true }`. `SaveResult = { ok: true } | { ok: false; error: string }`.
- `uploadImageAction(formData: FormData): Promise<UploadResult>` — `await requireOwner()`; `const file = formData.get("file")`; guard `file instanceof File`; `file.type` ∈ `{"image/png","image/jpeg","image/webp","image/gif"}` else `{ ok: false, error: "Use a PNG, JPEG, WebP or GIF image." }`; `file.size <= 5 * 1024 * 1024` else `{ ok: false, error: "Image must be 5 MB or smaller." }`; `ext` from the mime; `name = \`${crypto.randomUUID()}.${ext}\``; `await fs.writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()))`; `{ ok: true, url: \`/uploads/${name}\` }`. `UploadResult = { ok: true; url: string } | { ok: false; error: string }`. `UPLOADS_DIR` = `path.join(process.cwd(), "uploads")`, defined once in `lib/site/uploads-dir.ts`.

**`app/uploads/[file]/route.ts` — the only new route handler.** `GET(_req, { params })`: `const { file } = await params` (Next 15 async params); reject if `file` contains `/`, `\`, `..`, or a null byte → `404`; `const full = path.join(UPLOADS_DIR, file)`; verify `path.resolve(full).startsWith(path.resolve(UPLOADS_DIR) + path.sep)` (traversal guard); `fs.readFile(full)` in try/catch → `404` on miss; `Content-Type` from the extension (`png→image/png`, `jpg|jpeg→image/jpeg`, `webp→image/webp`, `gif→image/gif`, `svg→image/svg+xml`, default `application/octet-stream`); `new Response(data, { headers: { "Content-Type": ct, "Cache-Control": "public, max-age=31536000, immutable" } })`. No auth (it's an asset route; the uuid filename isn't enumerable). Stock images at `/stock/*.svg` keep using Next's `public/` mechanism — no handler needed.

**Builder page — `app/(owner)/builder/page.tsx` (Server Component).** `await requireOwner()` → `getOwnerSite(owner.id)`. No site → render `<CreateSiteForm />` in a shadcn `Card` ("Name your venue") — `"use client"`, `useActionState(createSiteAction, null)`, one `Input name="venueName"`, inline `<p role="alert">{state.error}</p>`, a live "Your address will be: `localhost:5112/<slug>`" hint computed client-side via `slugifyVenueName` from the input, submit "Create site". Site exists → render a banner (frozen slug + `http://localhost:5112/<slug>` + a plain-language "this address is permanent" note) then `<SiteBuilder site={{ id, name, slug, blocks }} />`. Add the `(owner)` route; the `dashboard` placeholder gets an "Open the site builder" link to `/builder`.

**dnd-kit wiring — `components/site/site-builder.tsx` + children, all `"use client"`.** State: `blocks: Block[]` and `name: string` via `useState`, seeded from props. Layout: left **tray** ("Drag into site": Rich Text / Image / Book Now), center **canvas** (the droppable "page" + `SortableContext` over the placed blocks, each in a sortable wrapper with a `GripVertical` drag handle + `Trash2` delete + its editor; the pinned venue-name `<h1>` at the top is editable in place — typing updates `name`), right **live preview** pane. One `<DndContext>` (`PointerSensor` + `KeyboardSensor`, `closestCenter`) wraps tray + canvas:
- Tray items: `useDraggable`, ids `"tray:rich-text" | "tray:image" | "tray:book-now"`, `data: { source: "tray", type }`.
- Canvas: `useDroppable({ id: "canvas" })`; placed blocks: `useSortable({ id: block.id, data: { source: "block" } })`; `SortableContext` with `verticalListSortingStrategy` over `blocks.map(b => b.id)`.
- `onDragEnd` branch on `active.data.current?.source`: `"tray"` → if `over` is the canvas or a placed block, build a fresh block of that `type` (`crypto.randomUUID()` id; rich-text starts `html: "<p></p>"`; image `imageUrl: ""`, `alt: ""`) and insert it at the `over` block's index (append if dropped on the canvas itself) — but if `type` is `image`/`book-now` and one already exists, do nothing (the tray item is already disabled — belt-and-braces). `"block"` → `arrayMove(blocks, oldIndex, newIndex)` keyed by `active.id`/`over.id`. (Simplification allowed if needed: tray drops always append, reorder afterward — flag whichever is chosen.)
- Delete: per-block `Trash2` `Button` → `setBlocks(b => b.filter(x => x.id !== id))`.
- At-most-one tray greying: `hasImage = blocks.some(b => b.type === "image")`, `hasBookNow = blocks.some(b => b.type === "book-now")`. Greyed tray item gets `aria-disabled` + `opacity-50 cursor-not-allowed` and isn't draggable; the greyed **Book Now** item wraps in a shadcn `Tooltip` with content `"Only one is allowed."` (Image item may get the same for symmetry — only Book Now is mandated.) Optional `DragOverlay` ghost.
- Save: a "Save" `Button` → `startTransition(() => saveSiteAction(site.id, { name, blocks }))`, showing a "Saved" / error toast (`pending` from `useTransition`). No Publish button (feature 5).

**Tiptap — `components/site/rich-text-editor.tsx` (`"use client"`).** `useEditor({ extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } })], content: block.html, immediatelyRender: false, editorProps: { attributes: { class: "miz-prose focus:outline-none" } }, onUpdate: ({ editor }) => onChange(editor.getHTML()) })`. `immediatelyRender: false` is required under Next App Router SSR (avoids the hydration warning). Toolbar above the editor: `Button`s (lucide icons) for **Bold** (`chain().focus().toggleBold().run()`, active = `editor.isActive("bold")`), **Italic**, **H1/H2/H3** (`toggleHeading({ level })`), **Bullet list** (`toggleBulletList()`), **Ordered list** (`toggleOrderedList()`), **Link** (prompt for a URL → `setLink({ href })`; empty/cancel → `unsetLink()`). `getHTML()` on every change flows into the block's `html` in `blocks` state → the live preview updates with no refresh. (`@tiptap/pm` must be an explicit dep — ProseMirror peer.) Note: StarterKit serializes bold as `<strong>`, italic as `<em>`; pasted content may carry `<b>`/`<i>` — the sanitizer allows all four, so round-tripping is safe.

**Live preview — `components/site/block-view.tsx`.** A pure, **server-renderable** presentational component: given `name: string` + `blocks: Block[]`, render the venue-name `<h1>` then each block — `rich-text` → `<div className="miz-prose" dangerouslySetInnerHTML={{ __html: block.html }} />`; `image` → `<img src={block.imageUrl} alt={block.alt} />` (or a "no image chosen yet" placeholder when `imageUrl === ""`); `book-now` → a shadcn `<Button>Book Now</Button>` (inert in the preview). The builder's right pane renders `<BlockView name={name} blocks={blocks} />` off the live client state. Because it takes only plain data and is server-renderable, feature 8 can mirror it on the Customer app (it lives in the Builder for now — no premature extraction; feature 5 defines the shared shape, feature 8 the customer renderer). "Matches the published layout" is best-effort until feature 8 finalizes that layout.

**Image picker — `components/site/image-block-editor.tsx` (`"use client"`).** Opened from the placed Image block (a shadcn `Dialog`, or an inline panel). Two paths: (1) **Stock** — a grid of `STOCK_IMAGES`; clicking sets `imageUrl = stock.src`, `alt = stock.label`. (2) **Upload** — `<input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/gif">` → `uploadImageAction(formData)` (via `useActionState` or an imperative call) → on `ok` set `imageUrl = url`. Plus an `alt` `Input` (accessibility; defaulted, editable).

**Next 15 notes.** Server Actions receive `FormData` with `File`s (`uploadImageAction`) — `formData.get("file") instanceof File` → `file.arrayBuffer()`. `cookies()`/`headers()` and route-handler `params` are async — `await` them. The Tiptap editor, dnd-kit components, and the create-site form are `"use client"`; `app/(owner)/builder/page.tsx` only loads data and renders. `dangerouslySetInnerHTML` on already-server-sanitized HTML is the standard path (sanitize on write, trust on read). `revalidatePath("/builder")` after save/create keeps the Server Component fresh. Keep `slug.ts` / `content.ts` / `sanitize.ts` Prisma-free so the test suite stays DB-independent.

---

## Data model

Through the **`update-database` skill** — adds the `Site` model, generates the migration, appends a `prisma/CHANGELOG.md` entry, runs `pnpm db:migrate` (`prisma migrate deploy`, idempotent). Migration name: **`add_site`** (→ `prisma/migrations/<ts>_add_site/migration.sql`).

```prisma
/// A venue owner's single site: the venue name (also the pinned header text), the
/// derived slug (frozen at creation), and the page content (ordered blocks) as JSON.
/// Feature 4 (ai-copy-and-variants) will add `variantsJson String?` via the same skill.
model Site {
  id          String       @id @default(cuid())
  ownerId     String       @unique
  owner       OwnerAccount @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name        String
  slug        String       @unique
  contentJson String       @default("{\"blocks\":[]}")
  isDraft     Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```
On `OwnerAccount`, add the back-relation `site Site?`. `contentJson` stores `JSON.stringify({ blocks: Block[] })`; the header text is `name` (not duplicated into a block). `isDraft` carried now so feature 5's Publish needs no schema change. **Do not pre-add `variantsJson`** — feature 4 owns it. No backfill (no existing `Site` rows).

`prisma/CHANGELOG.md` entry (sketch): "**[date] Migration: add_site** — Feature: site-builder (feature 3). Models: Site (new), OwnerAccount (back-relation `site`). `Site` = `id` (cuid PK), `ownerId` (`@unique` FK → OwnerAccount, `onDelete: Cascade`), `name`, `slug` (`@unique`), `contentJson` (String, default `{"blocks":[]}` — stores `{ blocks: Block[] }`; header text is `name`), `isDraft` (Boolean, default true — Publish semantics arrive in feature 5), `createdAt`/`updatedAt`. One site per owner. No backfill. Note: feature 4 will add `variantsJson String?` via this skill."

---

## API surface

**No new REST endpoints.** `@mizrahitality/contracts` is untouched. Builder↔Customer REST is features 5/6.

**Route handler (the only one):** `GET /uploads/<file>` — `app/uploads/[file]/route.ts`. Validates the filename (no separators / `..` / null byte), resolves under `apps/builder/uploads/`, verifies containment, reads + responds `200` with `Content-Type` from the extension + `Cache-Control: public, max-age=31536000, immutable`; missing/rejected → `404` (`text/plain` `"Not found"`). No auth.

**Server Actions** (`lib/site/actions.ts`, `"use server"`):
- `createSiteAction(prev: CreateSiteState, formData: FormData): Promise<CreateSiteState>` — `useActionState`-friendly; `CreateSiteState = { error: string; field?: "venueName" } | null`. On success `revalidatePath("/builder")` + `redirect("/builder")`.
- `saveSiteAction(siteId: string, payload: { name: string; blocks: unknown }): Promise<SaveResult>` — `SaveResult = { ok: true } | { ok: false; error: string }`. Re-auth + ownership check + validate name + parse/validate/sanitize blocks + `prisma.site.update` + `revalidatePath("/builder")`.
- `uploadImageAction(formData: FormData): Promise<UploadResult>` — `UploadResult = { ok: true; url: string } | { ok: false; error: string }`. Re-auth + mime/size validation + write `<uuid>.<ext>` to `uploads/` + return `/uploads/<file>`.

---

## Files & directories

```
apps/builder/
  package.json                                  (edit — add deps; see below)
  prisma/schema.prisma                          (edit — add Site model + `site Site?` on OwnerAccount) — via `update-database`
  prisma/migrations/<ts>_add_site/migration.sql (new — prisma migrate)
  prisma/CHANGELOG.md                           (edit — add_site entry)
  app/(owner)/builder/page.tsx                  (new — Server Component: requireOwner + getOwnerSite → CreateSiteForm | SiteBuilder + slug/URL banner)
  app/(owner)/builder/create-site-form.tsx      (new — "use client", useActionState(createSiteAction), live slug hint)
  app/(owner)/dashboard/page.tsx                (edit — add "Open the site builder" link to /builder)
  app/uploads/[file]/route.ts                   (new — GET handler, path-traversal guarded)
  lib/site/types.ts                             (new — Block union, PageContent, BLOCK_TYPES, SitePayload, …)
  lib/site/slug.ts                              (new — pure: VENUE_NAME_RE, slugifyVenueName, validateVenueName)
  lib/site/content.ts                           (new — pure: parsePageContent, isValidBlock, validateBlocks, countByType)
  lib/site/sanitize.ts                          (new — sanitizeRichTextHtml over sanitize-html; server-only)
  lib/site/site.ts                              (new — getOwnerSite, slugExists, createSite — Prisma helpers; createSite DB-injectable)
  lib/site/uploads-dir.ts                       (new — UPLOADS_DIR = path.join(process.cwd(), "uploads"))
  lib/site/actions.ts                           (new — "use server": createSiteAction, saveSiteAction, uploadImageAction)
  components/site/site-builder.tsx              (new — "use client": DndContext, tray + canvas + preview, Save)
  components/site/block-tray.tsx                (new — "use client": 3 draggable tray items, at-most-one greying, Tooltip "Only one is allowed.")
  components/site/sortable-block.tsx            (new — "use client": useSortable wrapper, drag handle, delete, dispatch to editor)
  components/site/rich-text-editor.tsx          (new — "use client": Tiptap useEditor + toolbar; immediatelyRender:false)
  components/site/image-block-editor.tsx        (new — "use client": stock grid + upload form + alt input; Dialog)
  components/site/book-now-block.tsx            (new — placed Book Now block in the canvas)
  components/site/block-view.tsx                (new — server-renderable read-only renderer; used by the live preview, mirrorable by feature 8)
  components/ui/dialog.tsx                       (new — `shadcn add dialog`)
  components/ui/tooltip.tsx                      (new — `shadcn add tooltip`)
  components/ui/separator.tsx                    (new — `shadcn add separator`)
  components/ui/textarea.tsx                     (new — `shadcn add textarea`) [optional]
  app/globals.css                               (edit — add minimal `.miz-prose` styles for h1-h3/ul/ol/li/strong/em/a, or add @tailwindcss/typography; see Risks)
  __tests__/site/slug.test.ts                   (new)
  __tests__/site/content.test.ts                (new)
  __tests__/site/sanitize.test.ts               (new)
CLAUDE.md                                        (edit — apps/builder/ "Layout" bullet)
plans/00-master-plan.md                          (edit — §2 status table tick)
plans/03-site-builder-plan.md                    (new — this plan, copied verbatim)
```

**`apps/builder/package.json` deps to add** — runtime: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `sanitize-html`; dev: `@types/sanitize-html`. No new id dep (`crypto.randomUUID()`). `shadcn add dialog tooltip separator [textarea]` (may pull `@radix-ui/*` — harmless; the unified `radix-ui` pkg is already present). shadcn's `tooltip` needs a `<TooltipProvider>` near the root — wrap the builder page (or the tray) in one. The migration is the only step that goes through the `update-database` skill; everything else is plain code.

---

## Tests

All under `apps/builder/__tests__/site/`, all **DB-independent** (no `lib/db.ts` import — `slug.ts`/`content.ts`/`sanitize.ts` are pure; `site.ts` `createSite` is exercised with an injected fake; `actions.ts` + the Tiptap/dnd-kit UI are Next-runtime / browser bound and aren't unit-tested, consistent with feature 2). `sanitize-html` runs in vitest's node env.

**`slug.test.ts`** — `slugifyVenueName("Cafe Mizrahi")` → `"cafemizrahi"`; `"  Bar   Tov  "` → `"bartov"`; `"UPPER lower"` → `"upperlower"`. `validateVenueName("Cafe Mizrahi")` → `{ ok: true, value: "Cafe Mizrahi", slug: "cafemizrahi" }`; `"  Cafe Mizrahi  "` → trimmed `value`, same slug. Rejects digits (`"Cafe 23"`), specials (`"Café Mizrahi"`, `"O'Brien"`, `"Bar & Grill"`, `"site_one"`) → `{ ok: false, error: "Use English letters and spaces only — no digits or special characters." }`. Rejects empty / whitespace-only (`""`, `"   "`) → `{ ok: false, error: "Enter a venue name." }`. Coerces non-strings (`123`, `null`, `undefined`) → `ok: false`. **Collision** (via `createSite` with an injected `{ slugExists, create }`): `slugExists = (s) => s === "taken"` → a name slugifying to `"taken"` → `{ ok: false, error: "That venue name is taken — pick another." }`; a different name → `ok: true` and `create` called once; `create` throwing `{ code: "P2002" }` (race) → same taken message.

**`content.test.ts`** — `parsePageContent('{"blocks":[]}')` → `{ blocks: [] }`. Tolerant: `'not json'`, `'{}'`, `'{"blocks":"nope"}'`, `null`, `undefined` → `{ blocks: [] }`. `parsePageContent(JSON.stringify({ blocks: [validRichText, { type: "bogus" }, validImage] }))` → keeps the two valid, drops the bogus. Two image blocks in the input → keeps only the first; same for two book-now. A block missing `id` → survives with a generated `id`. `isValidBlock`: accepts well-formed rich-text/image/book-now; rejects `{ type:"image", imageUrl: 5 }`, `{ type:"rich-text" }`, `{ type:"link" }`. `validateBlocks([])` → `ok: true`; `[oneImage]` → `ok: true`; `[oneBookNow]` → `ok: true`; `[img1, img2]` → `{ ok: false, error: "You can only add one Image block." }`; `[bn1, bn2]` → `{ ok: false, error: "You can only add one Book Now button." }`; `[rt1, rt2, rt3]` → `ok: true` (repeatable); `[{ type:"weird" } as any]` → `ok: false`. **Order persistence**: `parsePageContent(JSON.stringify({ blocks: [c, a, b] })).blocks.map(x => x.id)` === `[c.id, a.id, b.id]`.

**`sanitize.test.ts`** — `sanitizeRichTextHtml('<p>hi</p><script>alert(1)</script>')` → no `<script>`, keeps `<p>hi</p>`. `'<p onclick="x()">hi</p>'` → no `onclick`, keeps `<p>hi</p>`. `'<a href="javascript:alert(1)">x</a>'` → result has no `javascript:`. `'<a href="https://example.com">x</a>'` → keeps the `href` **and** contains `rel="noopener noreferrer"`. Keeps allowed marks/blocks: `<strong>`, `<b>`, `<em>`, `<i>`, `<h1>`/`<h2>`/`<h3>`, `<ul><li>…`, `<ol><li>…` survive a round-trip; `<style>`/`<iframe>`/`<img>` are stripped. Idempotent: `sanitizeRichTextHtml(sanitizeRichTextHtml(x)) === sanitizeRichTextHtml(x)` for a bold/italic/heading/list/link document.

Gates: `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` green across the workspace; `pnpm db:migrate` applies `add_site` idempotently. Live builder UI smoke (drag/edit/upload/save with `pnpm dev`) done manually when port 5111 is free — if it's still held by the sibling `../Mizrahitality` dev server (as in feature 2), fall back to `next build` (route compilation + type-checks every page/layout/action/route-handler) + the pure-module suite and note "live builder UI smoke pending".

---

## Acceptance (REQ-# this feature owns)

- **REQ-3 — Site creation & slug (P0).** `/builder` shows `<CreateSiteForm>` when the owner has no site. `createSiteAction`: `validateVenueName` enforces letters-and-spaces-only (digits/specials → inline `"Use English letters and spaces only — no digits or special characters."`); `slugifyVenueName` derives the slug (spaces removed, lowercased — `"Cafe Mizrahi"` → `cafemizrahi`); `slugExists` (+ `P2002` fallback) rejects a colliding slug with `"That venue name is taken — pick another."`; on success the site is created and `/builder` re-renders with a banner showing the **frozen slug** + `http://localhost:5112/<slug>`. *Verified by:* `slug.test.ts` (derivation, validation incl. rejects digits/specials/empty/non-strings, collision via injected lookup + `P2002`); *demo:* `pnpm dev` → sign in → `/builder` → "Cafe Mizrahi" → site created, banner shows `cafemizrahi` + URL; another account, same name → "that venue name is taken"; "Cafe 23" → inline char error.
- **REQ-4 — Page builder, drag-and-drop blocks (P0).** `<SiteBuilder>` renders the pinned venue-name `<h1>` header (edited in place — updates `name`, persisted by `saveSiteAction`; slug frozen), a "Drag into site" tray with **Rich Text** (repeatable), **Image** (≤1), **Book Now** (≤1), all via `@dnd-kit/core` + `@dnd-kit/sortable` (`DndContext`, `useDraggable` tray, `useDroppable` canvas, `useSortable` blocks, `arrayMove` reorder). Drag a tray item onto the page → a new block; drag a placed block → reorder; trash button → delete. When Image/Book Now is placed, its tray item is greyed (`aria-disabled` + `opacity-50`); the greyed Book Now shows **"Only one is allowed."** on hover (shadcn `Tooltip`). The Image block picks from `STOCK_IMAGES` (`/stock/<name>.svg`) or an upload (`uploadImageAction` → `/uploads/<uuid>.<ext>`, served by `GET /uploads/[file]`). Rich Text uses Tiptap (bold/italic/H1–H3/bullet+numbered lists/links) → `getHTML()` into block state; **on Save**, `saveSiteAction` validates the at-most-one constraints server-side, sanitizes each rich-text block's HTML (`sanitize-html`; links get `rel="noopener noreferrer"`), and persists `contentJson` + `name`; block order is preserved through the JSON round-trip. *Verified by:* `content.test.ts` (parse tolerance, at-most-one validator accepts 0/1 rejects 2, allowlist, order preserved), `sanitize.test.ts` (strips script/onclick/`javascript:`, keeps allowed tags/marks, rel added, idempotent); *demo:* drag a Rich Text block, type & format, drag an Image → pick a stock image (then re-pick via upload), drag a Book Now, reorder by dragging, delete one, Save → reload `/builder` → page, formatting, image, order intact; a second Image/Book Now tray attempt is greyed with the hover note.
- **REQ-5 — Live preview (P1).** The builder's right pane renders `<BlockView name={name} blocks={blocks} />` off the same client state — Tiptap `onUpdate`, drag/reorder/delete, header edits, and image picks all flow into that state, so the preview reflects every edit with **no manual refresh**. `BlockView` is the same presentational component the published page will use (server-renderable; feature 8 mirrors it). "Reflects the same layout the published page will use" — best-effort until feature 8 finalizes the customer layout. *Verified by:* *demo:* type in a Rich Text block / drag a block / pick an image → the preview updates instantly. (No automated test — UI/browser-bound, per the cross-cutting rule.)
- **REQ-10 — Technophobe-friendly UX, builder pages (touched).** `/builder` is a clean shadcn layout: a `Card`-based create form with a live "your address will be …" hint and inline `role="alert"` errors; the builder's tray/canvas/preview use shadcn `Button`/`Card`/`Dialog`/`Tooltip`/`Separator` and lucide icons (`GripVertical`, `Trash2`, bold/italic/heading/list/link — the magic wand left for feature 4); the frozen-slug banner explains the customer URL in plain language; no raw/unstyled screens in the demo path. *Verified by:* visual inspection in the demo. (UI, not unit-tested.)

---

## Verification (end-to-end)

1. `pnpm install` (picks up the new deps; builder `postinstall` runs `prisma generate`); `pnpm db:migrate` applies `add_site` (idempotent). `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` green across the workspace.
2. `pnpm dev` → sign in → `/builder`: no site → "Name your venue" card. Enter `"Cafe 23"` → inline char error; `"Cafe Mizrahi"` → site created, banner shows `cafemizrahi` + `http://localhost:5112/cafemizrahi`.
3. In the builder: drag a Rich Text block onto the page; type text, bold/italic some, add an H2, a bullet list, and a link → the preview updates live. Drag an Image block; pick a stock café image; then re-pick via upload (a small PNG) → the preview shows it; the Image tray item is now greyed. Drag a Book Now button; hover the now-greyed Book Now tray item → "Only one is allowed." tooltip. Reorder blocks by dragging; delete one. Edit the pinned header text. Click **Save** → "Saved".
4. Reload `/builder` → the page, formatting, image, header text, and block order are all intact (persisted in `Site.contentJson` / `Site.name`).
5. `GET http://localhost:5111/uploads/<the-uploaded-file>` returns the image with the right `Content-Type`; `GET /uploads/../something` or a missing file → `404`.
6. (If port 5111 is held by `../Mizrahitality` — as in feature 2 — rely on `next build` + the test suite and note "live builder UI smoke pending"; the pure logic — slug/validation/collision, content parsing/at-most-one/order, sanitization — is unit-tested.)

---

## Risks & open questions

- **dnd-kit "drag from tray into a sortable list".** No first-class palette→list primitive; the standard pattern (one `DndContext`, `useDraggable` tray with `data.source="tray"`, `useDroppable` canvas, `useSortable` blocks, branch in `onDragEnd`) works but the executor handles: dropping on the empty canvas (append), dropping onto/between blocks (insert at the over-index), and the singleton guard. **Simplification allowed:** tray drops always append (reorder afterward) — pick in execution and note it.
- **Tiptap SSR / `immediatelyRender: false`.** Required under Next App Router (avoids the hydration warning); the editor component must be `"use client"`; `@tiptap/pm` must be an explicit dep.
- **`prose` styling for rich text.** Tiptap's `<h1>/<ul>/<strong>/…` render unstyled under bare Tailwind v4. Pick one: a hand-rolled minimal `.miz-prose` block (~15 lines in `globals.css` — leaner, no new dep — recommended) **or** `@tailwindcss/typography` + a `@plugin` line + `prose` classes. Note which.
- **`sanitize-html` is server-only.** Node library — imported only by `lib/site/actions.ts`, never a `"use client"` module. Client-side, Tiptap's schema already constrains the markup; the authoritative sanitization is on Save.
- **Image URL is relative now** (`/uploads/<file>` or `/stock/<name>.svg`). Features 5/8 will resolve it absolutely against `BUILDER_API_URL` (the Customer app can't fetch a `/uploads/...` path relative to itself). Leave a `// feature 5: resolve absolute against BUILDER_API_URL` comment near `imageUrl` usage.
- **"Live preview matches the published layout" is best-effort** — the published-page layout isn't designed until feature 8; `BlockView` is the shared seed but its final styling is tuned there. Acceptable for REQ-5 (P1).
- **`process.cwd()` for `uploads/`** — assumes the Builder process runs with `apps/builder` as cwd (true for `pnpm -F builder dev` / `scripts/dev.mjs` / `next build|start`). Keep the path in one place (`lib/site/uploads-dir.ts`) so it's easy to harden later.
- **No unit tests for the Server Actions / Tiptap / dnd-kit UI** — Next-runtime / browser bound; their logic is thin over the well-tested pure modules. Consistent with feature 2 and the cross-cutting "smoke tests must be DB-independent" rule. The DB round-trip (save → reload) is exercised manually and again by feature 9's seed.
- **`isDraft` carried but inert** — added now so feature 5 needs no schema change; nothing reads it yet. Flagged so it isn't mistaken for live functionality.
- **Live builder UI smoke may be deferred** if port 5111 is still held by the sibling `../Mizrahitality` dev server (as in feature 2) — fall back to `next build` + the pure-module suite and note "live builder UI smoke pending; recommend a manual `pnpm dev` pass when 5111 is free."
- **No commit** unless the user asks.

---

## Tasks (execution order)

> Progress legend: ✅ done · 🔄 in progress · ⬜ not started. (All ⬜ until execution starts.)

1. ✅ Copy this plan verbatim to `plans/03-site-builder-plan.md`, status → `in-progress`.
2. ✅ Add deps to `apps/builder`: `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sanitize-html` (+ `-D @types/sanitize-html`); `shadcn add dialog tooltip separator`; `pnpm install`. (Tiptap v3 installed — StarterKit v3 bundles `Link`, so the editor configures it via `StarterKit.configure({ link: … })` rather than adding `@tiptap/extension-link` to the extensions array.)
3. ✅ **`update-database` skill:** added the `Site` model + `OwnerAccount.site` back-relation to `prisma/schema.prisma`; created migration `20260512102520_add_site`; `prisma/CHANGELOG.md` entry; `pnpm db:migrate` (idempotent — "No pending migrations").
4. ✅ `lib/site/types.ts` — `Block` union, `PageContent`, `BLOCK_TYPES`, `SINGLETON_BLOCK_TYPES`, `SitePayload`, `BuilderSite`.
5. ✅ `lib/site/slug.ts` — `VENUE_NAME_RE`, `slugifyVenueName`, `validateVenueName` (pure).
6. ✅ `lib/site/content.ts` — `parsePageContent`, `isValidBlock`, `validateBlocks`, `countByType` (pure).
7. ✅ `lib/site/sanitize.ts` — `sanitizeRichTextHtml` over `sanitize-html` (server-only).
8. ✅ `lib/site/uploads-dir.ts` — `UPLOADS_DIR`.
9. ✅ `lib/site/site.ts` — `getOwnerSite`, `slugExists`, `createSite` (DB-injectable via `CreateSiteDeps`; the real Prisma client is lazy-`import()`-ed so the unit tests stay DB-free).
10. ✅ `lib/site/actions.ts` — `"use server"`: `createSiteAction`, `saveSiteAction`, `uploadImageAction`.
11. ✅ `app/uploads/[file]/route.ts` — `GET` handler, path-traversal guarded.
12. ✅ `components/site/block-view.tsx` — server-renderable read-only renderer.
13. ✅ `components/site/rich-text-editor.tsx` — Tiptap v3 (`StarterKit.configure({ link: … })`) + toolbar (`immediatelyRender:false`, `shouldRerenderOnTransaction:true`).
14. ✅ `components/site/image-block-editor.tsx` — stock grid + upload + alt (`Dialog`).
15. ✅ `components/site/book-now-block.tsx`; `components/site/sortable-block.tsx`; `components/site/block-tray.tsx` (at-most-one greying + `Tooltip` "Only one is allowed.").
16. ✅ `components/site/site-builder.tsx` — `DndContext` + tray + canvas + live preview + Save (`useTransition`).
17. ✅ `app/(owner)/builder/page.tsx` (Server Component) + `app/(owner)/builder/create-site-form.tsx` (`useActionState`); `app/globals.css` — hand-rolled `.miz-prose` styles.
18. ✅ `app/(owner)/dashboard/page.tsx` — "Open the site builder" link to `/builder`.
19. ✅ Tests: `__tests__/site/{slug,content,sanitize}.test.ts` (all DB-independent — 33 tests).
20. ✅ Gates: `pnpm install` → `pnpm db:migrate` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build` all green across the workspace (56 builder tests + 3 customer + contracts). Live smoke: dev server on :5111 boots; unauthenticated `/builder` → 307 `/sign-in`; an authenticated owner with a site gets the full builder page (header input, frozen-slug banner, live preview rendering the sanitized rich-text); `GET /uploads/<file>` → 200 `image/png` + immutable cache header, missing/traversal → 404/400. Interactive drag/drop/upload-via-the-UI smoke recommended as a manual browser pass.
21. ✅ `CLAUDE.md` — `apps/builder/` "Layout" bullet updated.
22. ✅ `plans/00-master-plan.md` §2 status table: feature 3 site-builder → `done ([plan](03-site-builder-plan.md))`.
23. ✅ Close out: status → `done`; "Execution outcome" section added. No commit (user hasn't asked).

---

## Execution outcome

Executed 2026-05-12. All 23 tasks done; status → `done`.

**Delivered as planned**, with these decisions/notes recorded during execution:

- **Tiptap v3** was installed (`@tiptap/*@^3.23.1`), not v2. StarterKit v3 bundles the `Link` extension, so `rich-text-editor.tsx` configures it via `StarterKit.configure({ link: { openOnClick:false, autolink:true, HTMLAttributes:{ rel:"noopener noreferrer", target:"_blank" } } })` rather than adding `@tiptap/extension-link` to the `extensions` array (the package is still a direct dep, as the plan listed, but unimported). The editor uses `immediatelyRender:false` (SSR) and `shouldRerenderOnTransaction:true` so the toolbar's active states stay in sync.
- **Tray drops insert at the over-block's index** (append when dropped on the empty canvas / the canvas droppable). The plan's allowed "always append" simplification was not needed. The singleton guard is enforced both by greying the tray item (`useDraggable({ disabled })`) and re-checked in `onDragEnd` (belt-and-braces), and again server-side in `saveSiteAction` via `validateBlocks`.
- **`.miz-prose`** is a hand-rolled ~20-line block in `app/globals.css` (no `@tailwindcss/typography`), styling `h1-h3 / p / ul / ol / li / a / strong,b / em,i / u / s / blockquote / code / pre` against the shared CSS vars; used by both `BlockView` and the Tiptap editor surface.
- **`lib/site/site.ts` lazy-imports `@/lib/db`** (inside `defaultCreateSiteDeps` / `getOwnerSite` / `slugExists`) — never at module top — so `slug.test.ts` can import `createSite` and inject a fake without loading `@prisma/client`. Mirrors `lib/auth/accounts.ts`.
- **`saveSiteAction` is tolerant of the client `blocks` payload shape** — it wraps a bare array as `{ blocks }` before `parsePageContent` (the builder client sends `Block[]`).
- **`app/(owner)/layout.tsx` was left at `max-w-4xl`** (not in the plan's edit list). The 3-column builder grid is `lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]` and collapses to a single column below `lg`; comfortably usable at 896px for the demo, though a wider layout would be nicer — fine to revisit if a real design lands.
- The migration is `prisma/migrations/20260512102520_add_site/`. `pnpm db:migrate` re-applies it idempotently.

**Verification.** `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` all green across the workspace (builder: 56 vitest tests incl. the 33 new `__tests__/site/*`; customer: 3; contracts: green). Live smoke with `pnpm -F builder dev` on :5111: server boots; `GET /sign-in` → 200; `GET /builder` unauthenticated → 307 → `/sign-in`; with a forged-but-valid session for a temp owner+site, `GET /builder` → 200 and the HTML contains the SiteBuilder header input, the frozen-slug banner (`localhost:5112/<slug>`), the "Live preview" pane, and the server-rendered sanitized rich-text; `GET /uploads/<real.png>` → 200 `Content-Type: image/png` + `Cache-Control: public, max-age=31536000, immutable`; `GET /uploads/<missing>` → 404; `%2f`-encoded traversal → 400 (Next rejects it before the handler). Interactive drag/reorder/delete/upload via the browser UI was not exercised by an automated agent — recommended as a quick manual `pnpm dev` pass.

**No commit** — left to the user.
