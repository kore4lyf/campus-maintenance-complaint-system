import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Send,
  Clock4,
  Camera,
  Bell,
  Mail,
  Lock,
  UserPlus,
} from "lucide-react";
import { AuthShell } from "@/components/shared/AuthShell";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign up · LASU CMS",
  description: "Create an account to submit campus maintenance complaints.",
};

export default function SignUpPage() {
  return (
    <AuthShell
      variant="sign-up"
      kicker="Get started"
      title={
        <>
          Create your <span className="text-brand">account</span>
        </>
      }
      subtitle="One minute to set up. Then you can submit maintenance complaints, attach photos, and see exactly when DICT will act."
      brandPanel={{
        eyebrow: "Lagos State University",
        title: "Join the open maintenance loop.",
        body: "Open an account to start filing faults, attach photos, and receive live SLA updates — or skip the sign-up and file anonymously with a private tracker URL.",
        features: [
          {
            icon: () => <Send className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "Reporter account, auto-approved",
            body: "Sign up, sign in, file your first complaint. No admin wait, no paperwork.",
          },
          {
            icon: () => <Clock4 className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "Live SLA timers",
            body: "See exactly when DICT will acknowledge the fault — and when they commit to resolve it.",
          },
          {
            icon: () => <Camera className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "Photo attachments",
            body: "A picture tells the technician what words can&apos;t. Helpful on the first site visit.",
          },
          {
            icon: () => <Bell className="h-5 w-5 text-accent" aria-hidden="true" />,
            title: "Optional, anonymous",
            body: "Skip the account entirely: file a complaint and bookmark a private tracker URL.",
          },
        ],
        footerNote: "Reporter accounts only.",
      }}
      reassurance={
        <>
          <ShieldCheck
            className="h-3.5 w-3.5 text-accent-strong"
            aria-hidden="true"
          />
          Your session is encrypted. Passwords are never stored in plain text.
        </>
      }
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
          instead.{" "}
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Sparkles className="h-3 w-3 text-accent-strong" aria-hidden="true" />
            DICT accounts are seeded by administrators.
          </span>
        </p>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
