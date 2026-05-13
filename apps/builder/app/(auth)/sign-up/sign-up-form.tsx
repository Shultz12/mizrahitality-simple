"use client";

import { useActionState } from "react";

import { signUpAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, null);

  const emailError = state?.field === "email" ? state.error : null;
  const passwordError = state?.field === "password" ? state.error : null;
  const formError = state && !state.field ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@example.com"
          aria-invalid={emailError ? true : undefined}
          className="h-11"
        />
        {emailError ? (
          <p role="alert" className="text-xs text-destructive">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          aria-invalid={passwordError ? true : undefined}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        {passwordError ? (
          <p role="alert" className="text-xs text-destructive">
            {passwordError}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2 h-11 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
