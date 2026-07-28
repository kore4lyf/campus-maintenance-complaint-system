import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Send,
  Clock,
  Camera,
  Bell,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { getServerSession } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAV_ITEMS = [
  { href: "/sign-in", label: "Sign in" },
] as const;

export default async function LandingPage() {
  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <SiteHeader />
      <Hero />
      <DualAudienceSection />
      <CtaBand />
      <SiteFooter />
    </div>
  );
}

async function Hero() {
  const session = await getServerSession();
  const signedIn = !!session;

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 lg:pt-32 lg:pb-40">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-muted-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Lagos State University · DICT
            </p>

            <h1 className="mt-7 text-5xl font-semibold tracking-tight text-foreground-strong sm:text-6xl lg:text-7xl [line-height:1.05]">
              Campus maintenance,
              <br />
              <span className="text-brand">made transparent.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-strong sm:text-xl">
              Submit a fault. Track it in real time. See the proof of fix.
              Whether it&apos;s a bulb in the hostel or a server outage in
              Engineering, the entire repair loop is finally visible.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              {!signedIn ? (
                <>
                  <Link
                    href="/complaints/new"
                    className="inline-flex items-center gap-2 rounded-md bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    <Send className="h-4 w-4" />
                    Report a fault
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-6 py-3 text-base font-semibold text-foreground-strong transition hover:bg-surface hover:border-brand hover:text-brand"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/sign-in"
                    className="ml-1 text-sm font-medium text-muted-strong transition hover:text-brand"
                  >
                    Sign in →
                  </Link>
                </>
              ) : (
                <Link
                  href="/complaints/mine"
                  className="inline-flex items-center gap-2 rounded-md bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Go to your complaints
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <p className="mt-6 text-sm text-muted">
              Free for LASU students and staff. Anonymous submission is
              supported for sensitive issues.
            </p>
          </div>

          {/* Hero icon block — the navy mark in a soft brand-tinted card. */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-3xl bg-brand shadow-xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/cms-lasu-icon.png"
                  alt="LASU CMS mark"
                  width={280}
                  height={280}
                  className="h-3/5 w-auto"
                  priority
                />
              </div>
              {/* yellow circle anchor — the touch of yellow rendered here as
                  a soft brand surface accent. */}
              <div className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-xs font-medium text-white">
                  Live status updates
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DualAudienceSection() {
  return (
    <section className="border-t border-border bg-surface-raised">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
              For students &amp; staff
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground-strong">
              Report a fault in under a minute.
            </h2>
            <p className="mt-3 text-base text-muted-strong">
              Pick a category and location, describe what happened, optionally
              attach a photo. Anonymous mode available.
            </p>
            <ul className="mt-8 space-y-5">
              <Feature
                icon={Send}
                title="Submit, fast"
                body="10 category types. 30+ campus locations. Phone-friendly."
              />
              <Feature
                icon={Clock}
                title="Live SLA timer"
                body="See exactly when DICT will acknowledge — and when they commit to resolve."
              />
              <Feature
                icon={Camera}
                title="Proof of fix"
                body="A photo of the repair is required before closure. No more “it’s been fixed” with no receipt."
              />
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
              For DICT staff
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground-strong">
              Triage, assign, resolve.
            </h2>
            <p className="mt-3 text-base text-muted-strong">
              The queue, the timers, the breaches, and the reports — all in
              one place. AI helps interpret free text; rules keep the lights
              on if the AI is offline.
            </p>
            <ul className="mt-8 space-y-5">
              <Feature
                icon={Bell}
                title="AI-assisted triage"
                body="Free text interpreted by gpt-4o-mini. Falls back to the category default severity if AI fails — submission is never blocked."
              />
              <Feature
                icon={ShieldCheck}
                title="SLA enforcement"
                body="Automatic escalation up the chain when acknowledgement or resolution deadlines slip."
              />
              <Feature
                icon={FileText}
                title="Reports &amp; exports"
                body="Volume by category, location, severity; SLA breach counts; CSV and PDF export."
              />
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="bg-brand text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A campus that fixes itself, in the open.
          </h2>
          <p className="mt-3 text-lg text-white/70">
            From the smallest faucet leak to a campus-wide outage, every
            maintenance task passes through the same system.
          </p>
        </div>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-brand-strong shadow-sm transition hover:bg-accent-strong hover:text-brand"
        >
          Create your account
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-3 transition hover:opacity-90"
          aria-label="LASU CMS home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
            <Image
              src="/cms-lasu-icon.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
            />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold tracking-tight text-brand">
              LASU
            </span>
            <span className="text-base font-medium text-foreground-strong">
              CMS
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-strong transition hover:bg-surface-raised hover:text-foreground-strong"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted-strong sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Lagos State University · DICT —
          Campus Maintenance Complaint Management System
        </p>
        <p className="text-muted">
          Built on Next.js · MongoDB · Vercel AI · Ably
        </p>
      </div>
    </footer>
  );
}

function Feature({
  icon: IconComponent,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <IconComponent className="h-5 w-5" />
      </span>
      <div>
        <p className="text-base font-semibold text-foreground-strong">{title}</p>
        <p className="mt-1 text-sm text-muted-strong">{body}</p>
      </div>
    </li>
  );
}
