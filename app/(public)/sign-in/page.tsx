import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in \u00b7 LASU CMS",
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
    <section className="rounded-xl border border-border bg-surface-raised p-6 shadow-lg sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-strong">
          Sign in to submit a maintenance complaint or check your queue.
        </p>
      </header>
      <SignInForm redirectParam={redirectParam} />
      <p className="mt-6 text-sm text-muted-strong">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-brand transition-colors hover:text-brand-strong"
        >
          Create one
        </Link>
        .
      </p>
    </section>
  );
}
