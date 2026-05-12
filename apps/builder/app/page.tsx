import { VISITOR_TYPES } from "@mizrahitality/contracts";
import { Button } from "@/components/ui/button";
import { STOCK_IMAGES } from "@/lib/stock";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Mizrahitality — Builder</h1>
      <p className="text-muted-foreground">
        Foundation scaffold. {VISITOR_TYPES.length} visitor types are defined in{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">@mizrahitality/contracts</code>, and{" "}
        {STOCK_IMAGES.length} stock images ship under <code className="rounded bg-muted px-1 py-0.5 text-sm">public/stock/</code>.
      </p>
      <Button>Primary action</Button>
    </main>
  );
}
