// The placed Book Now block, as shown in the builder canvas. It carries no data — its presence
// on the page is the data — so the editor view is just a preview plus a note.

import { Button } from "@/components/ui/button";

export function BookNowBlock() {
  return (
    <div className="space-y-1">
      <Button type="button" disabled>
        Book Now
      </Button>
      <p className="text-xs text-muted-foreground">
        Visitors will see this button on your published page.
      </p>
    </div>
  );
}
