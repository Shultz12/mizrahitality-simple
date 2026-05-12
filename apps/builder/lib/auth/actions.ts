"use server";

// Server Actions backing the auth forms (per the feature plan: no REST route handlers —
// the only mandated REST API is Builder↔Customer, out of scope here). Each action is a
// thin shell over the well-tested pure modules: validate/persist via `accounts.ts`, set the
// cookie via `cookie.ts`, then `redirect()`. `redirect()` throws `NEXT_REDIRECT` to do its
// work, so it is never wrapped in try/catch.

import { redirect } from "next/navigation";

import { authenticateOwner, registerOwner } from "./accounts";
import { clearSessionCookie, setSessionCookie } from "./cookie";

/** `useActionState` state for the sign-in / sign-up forms — `null` until a submit fails. */
export type AuthFormState = { error: string; field?: "email" | "password" } | null;

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await registerOwner({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!result.ok) return { error: result.error, field: result.field };

  await setSessionCookie(result.owner.id);
  redirect("/dashboard");
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await authenticateOwner({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!result.ok) return { error: result.error, field: result.field };

  await setSessionCookie(result.owner.id);
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/sign-in");
}
