// Rendered (with a 404 status) when `app/[slug]/page.tsx` calls `notFound()` for an unknown slug,
// and for any other unmatched path. Friendly, no stack trace. No analytics is posted for an unknown
// slug — the page Server Component branches to `notFound()` before rendering <VisitorAnalytics>.

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t find that venue</h1>
      <p className="text-muted-foreground">
        There&apos;s no venue at this web address. Double-check the link, or ask the venue for their
        page URL.
      </p>
    </main>
  );
}
