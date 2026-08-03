import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LogIn,
  ArrowRight,
  ShieldCheck,
  Bell,
  Mail,
  Lock,
} from "lucide-react";
import { AuthShell } from "@/components/shared/AuthShell";
import { SignInForm } from "./SignInForm";
import { getServerSession } from "@/lib/auth/dal";

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
  const session = await getServerSession();
  if (session) {
    redirect("/complaints/mine");
  }

  const params = await searchParams;
  const redirectParam = params.redirect?.trim() ?? "";

  return (
    <AuthShell
      variant="sign-in"
      kicker="Welcome back"
      title={
        <>
          Sign in to{" "}
          <span className="text-brand">continue</span>
        </>
      }
      brandPanel={{
        footerNote: "Lagos State University — every repair, finally visible.",
      }}
      reassurance={
        <>
          <ShieldCheck
            className="h-3.5 w-3.5 text-accent-strong"
            aria-hidden="true"
          />
          Trouble signing in? Email DICT support — we&apos;re happy to help.
        </>
      }
      secondaryAction={
        <p className="text-sm text-muted-strong">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/sign-up"
            className="group/create inline-flex items-center gap-1 font-semibold text-brand transition-colors hover:text-brand-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Sign up
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover/create:translate-x-0.5" aria-hidden="true" />
          </Link>
          .{" "}
          <span className="text-xs text-muted">
            Anonymous submission is supported for sensitive issues.
          </span>
        </p>
      }
    >
      <SignInForm redirectParam={redirectParam} />
    </AuthShell>
  );
}
