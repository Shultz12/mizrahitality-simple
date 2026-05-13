import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account — Mizrahitality" };

export default function SignUpPage() {
  return (
    <main className="w-full max-w-[400px]">
      <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Sign up to build and publish your venue&apos;s site.
          </p>
        </div>

        <SignUpForm />

        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
