import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in — Mizrahitality" };

export default function SignInPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back — sign in to manage your venue site.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/sign-up" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </CardFooter>
    </Card>
  );
}
