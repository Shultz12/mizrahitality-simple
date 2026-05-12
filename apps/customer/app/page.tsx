import { ANALYTICS_EVENT_TYPES } from "@mizrahitality/contracts";
import { Button } from "@/components/ui/button";
import { BUILDER_API_URL } from "@/lib/env";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Mizrahitality — Customer</h1>
      <p className="text-muted-foreground">
        Foundation scaffold. This site renders a venue&apos;s published page at{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">/&lt;slug&gt;</code>, fetched from the
        Builder API at <code className="rounded bg-muted px-1 py-0.5 text-sm">{BUILDER_API_URL}</code>;{" "}
        {ANALYTICS_EVENT_TYPES.length} analytics event types are defined in{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">@mizrahitality/contracts</code>.
      </p>
      <Button variant="outline">Book Now (placeholder)</Button>
    </main>
  );
}
