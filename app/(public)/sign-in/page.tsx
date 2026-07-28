import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in · LASU CMS",
  description: "Sign in to submit and track campus maintenance complaints.",
};

type SearchParams = { redirect?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const redirectParam = params.redirect?.trim() ?? "";

  return (
    <div className="w-full max-w-md">
      <Card padding="lg" variant="overlay" className="overflow-hidden">
        <header className="mb-7 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground-strong">
            Sign in to <span className="text-brand">continue</span>
          </h1>
          <p className="text-sm text-muted-strong">
            Submit a maintenance complaint or check your queue. We&apos;ll keep
            you signed in for seven days.
          </p>
        </header>

        <SignInForm redirectParam={redirectParam} />

        <hr className="my-7 border-border" />

        <div className="flex flex-col gap-2 text-sm">
          <p className="text-muted-strong">
            Don&apos;t have an account?
          </p>
          <Link href="/sign-up" className="inline-flex">
            <Button variant="secondary" size="md" trailingIcon={<ArrowRight className="h-4 w-4" />}>
              Create one
            </Button>
          </Link>
        </div>
      </Card>

      <p className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs text-muted-strong">
        <LogIn className="h-3 w-3" aria-hidden="true" />
        Trouble signing in? Contact DICT support.
      </p>
    </div>
  );
}
