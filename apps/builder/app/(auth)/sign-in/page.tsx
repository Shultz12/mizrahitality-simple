import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in — Mizrahitality" };

export default function SignInPage() {
  return (
    <main className="w-full max-w-[400px]">
      <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Please enter your details to sign in.
          </p>
        </div>

        <SignInForm />

        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
