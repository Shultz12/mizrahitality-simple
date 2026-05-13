"use client";

// The "Name your venue" form, shown on /builder when the owner has no site yet. `useActionState`
// over `createSiteAction`; the slug hint updates live (client-side `slugifyVenueName`) so the
// owner sees the web address they're about to lock in.

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSiteAction } from "@/lib/site/actions";
import { VENUE_NAME_RE, slugifyVenueName } from "@/lib/site/slug";

export function CreateSiteForm() {
  const [state, formAction, pending] = useActionState(createSiteAction, null);
  const [name, setName] = useState("");

  const trimmed = name.trim();
  const slug = trimmed && VENUE_NAME_RE.test(trimmed) ? slugifyVenueName(trimmed) : "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="venueName">Venue name</Label>
        <Input
          id="venueName"
          name="venueName"
          autoComplete="off"
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={state?.field === "venueName" || undefined}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          English letters and spaces only.{" "}
          {slug ? (
            <>
              Your address will be:{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">localhost:5114/{slug}</code>
            </>
          ) : (
            "We'll turn it into your permanent web address."
          )}
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Creating…" : "Create site"}
      </Button>
    </form>
  );
}
