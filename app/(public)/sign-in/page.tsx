import type { Metadata } from "next";
import Link from "next/link";
import {
  LogIn,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Send,
  Clock4,
  Camera,
  Bell,
  Mail,
  Lock,
} from "lucide-react";
import { AuthShell } from "@/components/shared/AuthShell";
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
    <AuthShell
      variant="sign-in"
      kicker="Welcome back"
      title={
        <>
          Sign in to{" "}
          <span className="text-brand">continue</span>
        </>
      }
      subtitle="Pick up where you left off. Your complaints, SLA timers, and proof-of-fix photos are right where you saved them."
      brandPanel={{
        eyebrow: "Lagos State University",
        title: "Every repair, finally visible.",
        body: "From a flickering bulb in your hostel to a server outage in Engineering — the entire maintenance loop is open for students, staff, and DICT.",
        features: [
          {
            icon: () => <Send className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "Submit, fast",
            body: "10 categories, 30+ campus locations, photo attachments — filed in under a minute.",
          },
          {
            icon: () => <Clock4 className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "Live SLA timers",
            body: "Acknowledge-by and resolve-by deadlines, ticking in real time on your dashboard.",
          },
          {
            icon: () => <Camera className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "Proof of fix",
            body: "Technicians upload a photo on close-out. Receipt on every repair, every time.",
          },
          {
            icon: () => <Bell className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "AI-assisted triage",
            body: "Free-text interpreted instantly. Always backed by rules-based fallback for offline hours.",
          },
        ],
        footerNote: "Free for the LASU community.",
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
            Create one
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover/create:translate-x-0.5" aria-hidden="true" />
          </Link>
          .{" "}
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Sparkles className="h-3 w-3 text-accent-strong" aria-hidden="true" />
            Anonymous submission is supported for sensitive issues.
          </span>
        </p>
      }
    >
      <SignInForm redirectParam={redirectParam} />
    </AuthShell>
  );
}
