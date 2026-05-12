// Friendly placeholder shown instead of a published page: either "coming soon" (the slug exists but
// the owner hasn't published yet — REQ-16) or "temporarily unavailable" (the Builder API errored or
// is unreachable — graceful degradation, served with HTTP 200, REQ-12). A plain Server Component.

const COPY = {
  soon: {
    title: "Coming soon",
    body: "This venue is putting the finishing touches on their page — check back shortly.",
  },
  unavailable: {
    title: "Temporarily unavailable",
    body: "This venue's page can't be loaded right now — please try again soon.",
  },
} as const;

export function ComingSoon({ variant }: { variant: "soon" | "unavailable" }) {
  const { title, body } = COPY[variant];
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
    </main>
  );
}
