import { BUILDER_API_URL } from "@/lib/env";

// The site root is just an index — there's no venue here. Each venue lives at `/<slug>`, server-
// rendered from the Builder API on every request (see app/[slug]/page.tsx).
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Mizrahitality</h1>
      <p className="text-muted-foreground">
        Visit a venue&apos;s page at{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">/&lt;slug&gt;</code> — its published
        page is fetched server-side from the Builder API at{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">{BUILDER_API_URL}</code> on each
        request.
      </p>
    </main>
  );
}
