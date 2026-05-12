"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postEvent, postEventOnce } from "@/lib/analytics-client";

/**
 * The published page's Book Now button. Hovering (or focusing) it posts one `book-now-hover` per
 * page load (avoids hover-spam); every click posts a `book-now-click` and shows a friendly inline
 * confirmation toast — this demo never takes a real booking or payment. The initial `<button>`
 * markup is server-rendered, so the page stays SSR (REQ-19); the analytics/toast behaviour is
 * purely client-side.
 */
export function BookNowButton({ slug, builderApiUrl }: { slug: string; builderApiUrl: string }) {
  const [confirmed, setConfirmed] = useState(false);

  const onHover = () => postEventOnce(builderApiUrl, { slug, type: "book-now-hover" });
  const onClick = () => {
    void postEvent(builderApiUrl, { slug, type: "book-now-click" });
    setConfirmed(true);
  };

  return (
    <div>
      <Button type="button" onMouseEnter={onHover} onFocus={onHover} onClick={onClick}>
        Book Now
      </Button>
      {confirmed && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md border bg-background px-4 py-3 text-sm shadow-lg"
        >
          <CheckCircle2 className="size-4 text-green-600" aria-hidden="true" />
          <span>Thanks — we&apos;ll be in touch! (This demo doesn&apos;t take real bookings.)</span>
        </div>
      )}
    </div>
  );
}
