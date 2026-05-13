# Adjust Builder owner pages to match `plans/owner-app-pages/` design

## Context

`plans/owner-app-pages/` contains a "Pragmatic Utility System" design pass — auth pages, a sidebar+topbar dashboard chrome, and a styled site-builder shell. The current Builder app uses a simpler shadcn-default look (single horizontal header, no sidebar, neutral OKLCH tokens). The job is to bring the **auth pages**, the **owner chrome**, and the **dashboard tiles** into line with the new design, while leaving the actual **drag-and-drop builder interactions** (3-column tray/canvas/preview, `@dnd-kit`) untouched and only restyling its surrounding chrome.

User-confirmed decisions:
- **Sidebar**: only `Dashboard` + `Site builder`.
- **Topbar**: page-title on the left + owner-email + Sign-out on the right (no search, no account-icon dropdown).
- **Tokens**: update `packages/tailwind-config/tokens.css` to the mockup hex values (canvas `#F9FAFB`, primary slate `#0F172A`, border `#E5E7EB`, etc.). Tokens are shared, so the customer app picks them up too.
- **Font**: adopt **Inter** via `next/font/google` in both apps' root layouts.

The mockups also propose a polished **save-feedback toast** for the builder (bottom-right, success-icon + auto-dismiss). We adopt that pattern in place of the current inline "Saved"/"Published" text — it lives outside the dnd-kit canvas, so the builder rule is honored.

## Scope (deliberately narrow)

In scope:
- Token swap in `packages/tailwind-config/tokens.css`.
- Inter font on both root layouts (`apps/builder/app/layout.tsx`, `apps/customer/app/layout.tsx`).
- Restyle of `(auth)/layout.tsx`, `sign-in/page.tsx`, `sign-in-form.tsx`, `sign-up/page.tsx`, `sign-up-form.tsx`.
- New sidebar+topbar chrome in `(owner)/layout.tsx`.
- Dashboard restyle (`(owner)/dashboard/page.tsx` + `analytics/analytics-metrics.tsx`) — same data, new card aesthetic.
- Builder page wrapper restyle (`(owner)/builder/page.tsx` URL banner + `site-builder.tsx` toolbar). Toast replaces inline status. The canvas, tray, block components, and `BlockView` are untouched.

Out of scope (explicit non-goals):
- No new pages (no Projects, no Settings).
- No changes to the `(customer)` app routes or `PublishedPage` rendering beyond what the shared tokens / font produce automatically.
- No new tests; existing test suites must continue to pass. Visual changes don't change unit behavior.
- No changes to API contracts, server actions, Prisma schema, or analytics logic.

## File-by-file plan

### 1. `packages/tailwind-config/tokens.css` — token swap

Replace the OKLCH neutral palette with the mockup's hex (expressed as OKLCH-equivalents so the rest of shadcn keeps working unchanged). Keep variable names and the `@theme inline` block exactly as they are — only the raw CSS-variable values change.

Key replacements in `:root`:
- `--background: oklch(0.98 0 0)` (≈ `#F9FAFB`, the off-white canvas) — was pure white.
- `--card: oklch(1 0 0)` (`#FFFFFF`, pure white surface) — unchanged.
- `--primary: oklch(0.21 0.034 264.665)` (≈ `#0F172A`, Deep Slate) — was neutral near-black.
- `--border: oklch(0.929 0.013 255.508)` (≈ `#E5E7EB`) — slightly cooler gray.
- `--input: oklch(0.929 0.013 255.508)` (matches `--border`).
- `--muted-foreground: oklch(0.554 0.046 257.417)` (≈ `#6B7280`).
- `--foreground: oklch(0.193 0.041 268.0)` (≈ `#111827`).
- `--destructive` (`#DC2626`) and `--success` are already aligned.

Leave the `.dark` block alone (app opens light per existing DESIGN.md).

Update the existing root DESIGN.md to mention the new palette is "shadcn neutral + slate accent", but only if the user later asks — for now leave DESIGN.md alone (the changes are token-level, not principle-level).

### 2. Inter font on both apps

- `apps/builder/app/layout.tsx` and `apps/customer/app/layout.tsx`: import `Inter` from `next/font/google` with `subsets: ["latin"]`, `variable: "--font-inter"`, `display: "swap"`. Apply `inter.variable` to `<html>` and add `font-sans` to `<body>` (or just rely on `@theme` setting `--font-sans`).
- In `packages/tailwind-config/tokens.css`, add inside `@theme inline`:
  ```css
  --font-sans: var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  ```
  This makes Tailwind's `font-sans` resolve to Inter when present, falling back to system-ui.

### 3. `apps/builder/app/(auth)/layout.tsx` — auth wrapper

Replace the current `grid place-items-center bg-muted/30 p-4` with a body-level **canvas** wrapper that matches the mockup:

```tsx
<div className="min-h-svh flex items-center justify-center bg-background p-6">
  {children}
</div>
```

Keep `getCurrentOwner()` redirect logic verbatim.

### 4. `apps/builder/app/(auth)/sign-in/page.tsx` + `sign-in-form.tsx`

Rebuild the Sign-in card to match `plans/owner-app-pages/sign_in_form/code.html`:
- Card: `w-full max-w-[400px] bg-card border border-border rounded-xl p-6 flex flex-col gap-6`.
- Header (left-aligned): `<h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>` + `<p className="text-sm text-muted-foreground">Please enter your details to sign in.</p>`.
- Form: vertical stack with `gap-4`; each field is `Label` + `Input` (existing shadcn components — input already lands on `h-9`, swap to `h-11` to match the mockup's 44px tap target).
- Field-level inline error message slot below each input (using current `state?.field === "email"` / `"password"` to target the right field).
- Submit: full-width `<Button className="h-11 w-full">` with text "Sign in" / "Signing in…".
- Footer (the existing CardFooter section): `pt-4 border-t border-border text-center` containing "Don't have an account? <Link>Create an account</Link>".

Drop the **CardHeader/CardContent/CardFooter** wrappers — the mockup uses a flat card with one container. Hand-roll the markup (still uses shadcn `Card`-like classes — `bg-card border border-border rounded-xl`). This keeps shadcn's tokens but matches the mockup's structure.

### 5. `apps/builder/app/(auth)/sign-up/page.tsx` + `sign-up-form.tsx`

Mirror the sign-in changes. Header from the mockup: "Create an account" + "Sign up to build and publish your venue's site." (keep existing copy — it's better than the mockup's "Sign in to your enterprise portal" placeholder).

Drop the **brand icon disc** from the mockup (a Material `business` icon in a circle). Reason: the existing DESIGN.md voice rules say no decorative chrome, and our brand wordmark lives in the owner header — auth pages don't need one. If you want it back, the equivalent is `<Building2 className="size-6" aria-hidden />` in a `size-12 rounded-full bg-muted border border-border`.

### 6. `apps/builder/app/(owner)/layout.tsx` — sidebar + topbar chrome

This is the biggest structural change. New layout:

```tsx
<div className="min-h-svh flex bg-background">
  <SidebarNav />                       {/* fixed left, w-60 (240px), border-r */}
  <div className="flex-1 ml-60 flex flex-col">
    <OwnerTopbar email={owner.email} />  {/* sticky top, h-16 (64px), border-b */}
    <main className="p-6 flex-1">
      <div className="mx-auto max-w-5xl">{children}</div>
    </main>
  </div>
</div>
```

- **`SidebarNav`** (new component, e.g. `apps/builder/components/owner/sidebar-nav.tsx`): a `"use client"` component (or split: a server `aside` shell + a client `NavLinks` that uses `usePathname()` to mark the active item). Two links: `Dashboard` (icon: `LayoutDashboard`) and `Site builder` (icon: `Wrench` or `LayoutTemplate`). Brand wordmark at the top (`Mizrahitality` + small "Owner portal" subtitle). Active state from the mockup: `bg-primary text-primary-foreground`; inactive: `text-muted-foreground hover:bg-accent`.
- **`OwnerTopbar`** (new component, `apps/builder/components/owner/owner-topbar.tsx`): server component is fine. Receives the owner email and the page title (derive on server from `headers()` / `usePathname` if simple, or accept `title` prop and the page passes it). Simplest: accept `email` only and render a generic title slot via React children, or just hard-code titles per page by rendering this **inside each page** rather than the layout. **Recommendation**: keep the topbar generic (no title slot), and put each page's own H1 in the page body — closer to current behavior and avoids prop-drilling. Topbar then shows just `owner.email` + `<form action={signOutAction}><Button variant="ghost" size="sm">Sign out</Button></form>` on the right.

Below `lg` breakpoint, the mockup hides the sidebar (the builder rule). For our two pages (dashboard + builder), keep the sidebar visible from `md:` up and collapse to a topbar-only layout below that. Mobile is rare for an owner app — a minimal `md:flex hidden` on the sidebar is sufficient.

### 7. `apps/builder/app/(owner)/dashboard/page.tsx`

Restyle, keep all data flow:
- Page header `<h1 className="text-2xl font-semibold tracking-tight">Your dashboard</h1>` + the venue-name + live-URL line + the optional unpublished nudge (existing copy retained).
- Pass the existing `<AnalyticsMetrics>` (restyled in next step).
- The two empty-states (`no-site`, `error`) keep their current shape — they're already correct shadcn `Card`s; just update their copy slightly if needed (no required change).

### 8. `apps/builder/components/analytics/analytics-metrics.tsx`

Restyle the three metric tiles to match the mockup's `dashboard_layout_wrapper` tile pattern:
- Outer grid: `grid grid-cols-1 md:grid-cols-3 gap-4` (existing).
- Each tile: `bg-card border border-border rounded-xl p-6 flex flex-col justify-between min-h-[160px]` — replacing the current `Card` wrapper with a hand-rolled div (or keep `Card` and let shadcn provide the bg/border/radius; current uses `Card` and that's fine).
- Header row: `<span className="text-sm font-medium text-muted-foreground">{tile.label}</span>` + icon on the right (`<Icon className="size-5 text-primary" />`).
- Number: `<div className="text-3xl font-semibold tabular-nums tracking-tight">{tile.value}</div>` (was `CardTitle` — keep `tabular-nums` which DESIGN.md mandates for metric tiles).
- Hint line: muted, `text-xs text-muted-foreground` (existing).
- Keep the polling logic (`useEffect` + 10s `setInterval`) verbatim. Keep `__resetAnalyticsGuard` semantics. The "Updates automatically — last refreshed …" muted line stays beneath the grid.

### 9. `apps/builder/app/(owner)/builder/page.tsx`

The wrapper around the SiteBuilder. Restyle:
- Page header `<h1 className="text-2xl font-semibold tracking-tight">Site builder</h1>`.
- The "frozen address" banner: keep the current `<div className="rounded-lg border bg-muted/40 p-4">` and align it to the new tokens (it'll re-tint automatically because `--muted` is updated). No structural change required.
- The empty-state `Card` (no site yet — `CreateSiteForm`) keeps its current structure but the input class becomes `h-11` to match the auth pages.

### 10. `apps/builder/components/site/site-builder.tsx` — toolbar + toast

Inside the builder (a `"use client"` component already), replace the inline status text ("Saved" / "Published" / error) with a **toast** rendered in a fixed bottom-right portal. Approach: a small local `<SaveToast>` component rendered at the bottom of the SiteBuilder return, conditional on `status.kind !== "idle"`, auto-dismissing after ~2.5s via `useEffect` + `setTimeout`. Markup from the mockup:

```tsx
<div className="fixed bottom-6 right-6 z-50">
  <div className="bg-card shadow-lg border border-border rounded-md p-4 flex items-center gap-3 min-w-[320px]" role="status">
    <CheckCircle2 className="size-5 text-[var(--success,#059669)]" aria-hidden />
    <div className="flex-1">
      <p className="text-sm font-medium">Success</p>
      <p className="text-xs text-muted-foreground">Changes saved successfully</p>
    </div>
    <button onClick={dismiss} aria-label="Dismiss"><X className="size-4" /></button>
  </div>
</div>
```

For the **error** branch, use `role="alert"`, swap `CheckCircle2`→`AlertTriangle`, and color it `text-destructive`. Title becomes "Couldn't save"; body the existing `status.message`.

The Save/Publish buttons themselves keep their existing handlers and disabled state; only the `status` rendering changes. The publish-state badge above the toolbar ("Not published yet" / "changes that aren't live yet" / "Published — up to date") stays where it is, only re-typed to match the new sizes (`text-sm` / `text-xs` are already correct).

The 3-column grid, the dashed canvas, the SortableBlock list, the BlockTray, and BlockView are **untouched**.

### 11. `(auth)/sign-up/sign-up-form.tsx` and friends — input height bump

Across the auth forms + create-site form, the mockup uses 44px input height (`h-11`). The shadcn `Input` component is `h-9`. Two options:
- (a) Pass `className="h-11"` to each `<Input>` instance where the mockup expects it.
- (b) Modify `components/ui/button.tsx` and `components/ui/input.tsx` to accept a `size="lg"` variant pegged at `h-11`.

Recommend (a) — narrower blast radius, no shared-component change. Touch points: each `<Input>` in `sign-in-form.tsx`, `sign-up-form.tsx`, `create-site-form.tsx`, plus the matching `<Button type="submit">` (which uses `<Button size="default">` → `h-9`; pass `size="lg"` instead which is already `h-10`, or pass `className="h-11"`).

Actually — shadcn's `Button` already has `size: "lg" → h-10 px-6"`. Closer to 44px without a custom variant. Use `size="lg"` for the submit buttons in the auth forms; this matches the mockup intent without a token shim.

## Critical files reference

Existing files (modify):
- `packages/tailwind-config/tokens.css` — token values + `--font-sans`.
- `apps/builder/app/layout.tsx` — Inter font.
- `apps/customer/app/layout.tsx` — Inter font (the tokens propagate; the font has to be wired in each app's root layout because next/font is per-app).
- `apps/builder/app/(auth)/layout.tsx` — canvas wrapper.
- `apps/builder/app/(auth)/sign-in/page.tsx` + `sign-in-form.tsx` — card markup, sizes.
- `apps/builder/app/(auth)/sign-up/page.tsx` + `sign-up-form.tsx` — card markup, sizes.
- `apps/builder/app/(owner)/layout.tsx` — sidebar + topbar.
- `apps/builder/app/(owner)/dashboard/page.tsx` — page H1 + light copy adjustments.
- `apps/builder/app/(owner)/builder/page.tsx` — page H1 + retained URL banner.
- `apps/builder/app/(owner)/builder/create-site-form.tsx` — `h-11` input.
- `apps/builder/components/analytics/analytics-metrics.tsx` — tile aesthetic, keep polling.
- `apps/builder/components/site/site-builder.tsx` — toolbar + toast (only the bits **outside** the dnd-kit canvas).

New files:
- `apps/builder/components/owner/sidebar-nav.tsx` — sidebar with `Dashboard` + `Site builder` links, active state via `usePathname()`.
- (optional) `apps/builder/components/owner/owner-topbar.tsx` — only if I split the topbar out of `(owner)/layout.tsx` for readability; otherwise inline in the layout. Recommend inlining — it's 10 lines.

Untouched (don't modify):
- `apps/builder/components/site/{block-tray,sortable-block,rich-text-editor,image-block-editor,book-now-block,block-view}.tsx` — the inner builder UI.
- `apps/builder/components/ui/*` — shadcn primitives stay at their defaults.
- `apps/builder/lib/**` — no logic changes.
- `apps/customer/components/**` — published page styling carried by token + font changes only.
- Prisma schema, server actions, API routes, tests.

## Reuse / patterns from existing code

- `lib/utils.ts → cn()` for class-merging.
- `usePathname` from `next/navigation` for the active sidebar link.
- `next/font/google` for Inter (Next 15 idiom).
- Existing icons from `lucide-react` (`LayoutDashboard`, `Wrench`, `LogOut`, `CheckCircle2`, `AlertTriangle`, `X`). Already a project dep via shadcn.
- The existing `Card` component is keepable as-is in places — the new "card" aesthetic from the mockup is already what shadcn's `Card` produces once tokens are updated.

## Verification

1. `pnpm install` (if `next/font/google` needs any peer pickup — it's bundled with Next, so usually no change).
2. `pnpm typecheck` — must pass with zero diagnostics across all workspaces.
3. `pnpm lint` — must pass.
4. `pnpm test` — Vitest suites are DB-free; the visual changes shouldn't break any test, but the `published-page.test.tsx` SSR snapshot in the customer app may need adjustment if it asserts on specific neutral classnames (verify; unlikely).
5. `pnpm build` — both apps must build cleanly (`next build`).
6. `pnpm dev` — visit:
   - `http://localhost:5113/sign-in` → see the new left-aligned "Welcome back" card with `h-11` inputs/buttons on the off-white canvas.
   - `http://localhost:5113/sign-up` → mirrored "Create an account" card.
   - Sign in as `demo@mizrahitality.test` / `demo1234` (from `pnpm seed`) → land on `/dashboard` and confirm:
     - 240px left sidebar with `Dashboard` (active) + `Site builder`.
     - Top app bar with the page title, owner email on the right, Sign-out button.
     - Three metric tiles with the new aesthetic, polling working ("last refreshed" timestamp updates).
   - Click `Site builder` → confirm sidebar `Site builder` becomes active; URL-banner intact; toolbar restyled; the 3-column dnd-kit grid (tray / canvas / preview) unchanged.
   - Make any edit (e.g. type in the pinned header) → click `Save` → see the bottom-right toast appear with `CheckCircle2` + auto-dismiss.
   - Click `Publish` → same toast pattern with "Published" copy.
   - Sign out from the topbar → bounced to `/sign-in`.
7. Cross-check the customer app at `http://localhost:5114/hotelmizrahi` → the published page should pick up Inter and the new canvas color via shared tokens; nothing else should change.

## Risk notes

- **Token swap is the broadest change**: it touches every surface that uses `bg-background`, `bg-muted`, `border-border`, etc. — including the public customer site. Mitigation: the shifts are small (off-white canvas, slightly cooler border, slate primary); existing tests don't assert on specific color values; manual `pnpm dev` walk-through covers the surfaces.
- **Inter pulls a Google font at build time**: requires network during `next build`. If we want fully offline builds, fall back to `next/font/local` with a self-hosted woff2. Out of scope unless flagged.
- **Sidebar + topbar are new structural chrome**: the owner pages no longer have their old single horizontal header. Bookmark/screenshot-anchor users may notice; everyone else benefits. No URL changes — every existing route still maps to the same path.
