import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/shared/AuthShell";
import { SignUpForm } from "./SignUpForm";
import { getServerSession } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Sign up · LASU CMS",
  description: "Create an account to submit campus maintenance complaints.",
};

export default async function SignUpPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/complaints/mine");
  }

  return (
    <AuthShell
      variant="sign-up"
      kicker="Get started"
      title={
        <>
          Create your <span className="text-brand">account</span>
        </>
      }
      brandPanel={{
        footerNote: "Reporter accounts only.",
      }}
      secondaryAction={
        <p className="text-sm text-muted-strong">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="group/signin inline-flex items-center gap-1 font-semibold text-brand transition-colors hover:text-brand-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover/signin:translate-x-0.5" aria-hidden="true" />
          </Link>{" "}
          instead.
        </p>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
