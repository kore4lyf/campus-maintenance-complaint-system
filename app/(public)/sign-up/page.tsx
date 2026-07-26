import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign up \u00b7 LASU CMS",
  description: "Create an account to submit campus maintenance complaints.",
};

export default function SignUpPage() {
  return (
    <section className="rounded-xl border border-border bg-surface-raised p-6 shadow-lg sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create account</h1>
        <p className="mt-1 text-sm text-muted-strong">
          Register as a reporter to submit maintenance complaints and track
          their resolution.
        </p>
      </header>
      <SignUpForm />
      <p className="mt-6 text-sm text-muted-strong">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-brand transition-colors hover:text-brand-strong"
        >
          Sign in
        </Link>
        .
      </p>
    </section>
  );
}
