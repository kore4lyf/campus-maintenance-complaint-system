import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Send,
  Clock4,
  Camera,
  Bell,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Wrench,
  Inbox,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { getServerSession } from "@/lib/auth/dal";
import { H1, H2, H3, Kicker, Supporting } from "@/components/ui/type";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAV_ITEMS = [
  { href: "/sign-in", label: "Sign in" },
] as const;

/*
 * Landing page — Apple/Nike-tier hero composition.
 *
 * Aesthetic system:
 *   - Apple tight-spacing rhythm: every gap is a multiple of 8 px
 *     (8, 16, 24, 32, 40, 56, 64, 80). Hero vertical padding is
 *     pt-24 pb-32 lg:pt-32 lg:pb-40 (96 / 128 / 160 px).
 *   - Nike high-contrast typographic statement: the H1 reaches
 *     text-7xl on lg and text-8xl on xl, weight 600, line-height
 *     1.02 (tightest Astryx permits), tracking -0.025em. Two-line
 *     statement with the second line in `text-brand` for the
 *     institutional voice.
 *   - Astryx frame-first: hero sits inside a layered atmospheric
 *     surface; the right column is a layered navy illustration
 *     block (depth-gradient + structural pattern + floating chip).
 *   - Brand discipline: gold accent reserved for three places per
 *     page (kicker label, sparkles dot, the live-status chip). No
 *     full background fills.
 *
 * Sections:
 *   1. Header                       — sticky, translucent, with a
 *                                     hairline separator below.
 *   2. Atmospheric crown            — cream-to-white fade from the
 *                                     hero top into the page.
 *   3. Hero (5/7 + 4/12 split)      — display H1, lead, stats trio,
 *                                     primary + secondary CTAs, live
 *                                     status pulse.
 *   4. Hero illustration (right)    — layered navy panel with the
 *                                     CMS icon, decorative pattern,
 *                                     floating live-status chip.
 *   5. Stats band                   — 3 KPI numbers + sentence
 *                                     (Apple's "what is it" band).
 *   6. The maintenance loop         — numbered 4-step process band,
 *                                     with hairline-divided cards.
 *   7. Two-audience section         — refocused to a feature-rows +
 *                                     side-promo card composition.
 *   8. CTA band                     — full-bleed `bg-brand` closer
 *                                     with gold-on-navy CTA.
 *   9. Footer                       — 4-column hairline-divided.
 *
 * Tokens used (every class resolves through existing tokens):
 *   - bg-brand (#0c2848 navy) on illustration panel, CTA band.
 *   - text-brand on the H1 second line; bg-brand for primary CTA.
 *   - text-accent (gold #d4a014) for kicker labels + sparkles dot.
 *   - bg-accent for the CTA band's gold button.
 *   - bg-accent-soft at <0.4 opacity for atmospheric cream.
 *   - border-border / border-border-strong for hairlines.
 *   - shadow-sm / shadow-md / shadow-xl for depth (Apple-tier stack).
 *   - duration-fast / duration-medium (Astryx motion tokens).
 */

const PRIMARY_NAV = [
  { href: "/sign-in", label: "Sign in" },
] as const;

const STATS_TRIO = [
  { value: "10", label: "Categories", note: "Electrical · Plumbing · HVAC · ICT …" },
  { value: "30+", label: "Campus locations", note: "Hostels · Blocks · Labs · Offices" },
  { value: "24/7", label: "Live SLA timers", note: "Acknowledge + resolve deadlines" },
] as const;

const LOOP_STEPS = [
  {
    n: "01",
    icon: Send,
    title: "Submit",
    body: "Pick a category, choose a location, describe what you saw. Attach a photo if you have one. Filed in under a minute.",
    detail: "Anonymous mode available for sensitive issues.",
  },
  {
    n: "02",
    icon: Inbox,
    title: "Triage",
    body: "AI reads your free-text description and suggests a severity. DICT confirms and assigns the technician in under four hours.",
    detail: "Rule-based fallback keeps submissions flowing offline.",
  },
  {
    n: "03",
    icon: Wrench,
    title: "Resolve",
    body: "The technician arrives, performs the fix, and uploads a photo of the result. DICT approves and closes the loop.",
    detail: "SLA breaches escalate up the hierarchy automatically.",
  },
  {
    n: "04",
    icon: CheckCircle2,
    title: "Receipt",
    body: "You see the proof of fix in your dashboard. The complaint closes. The maintenance loop is open and auditable.",
    detail: "Every fix carries a photo or it never closes.",
  },
] as const;

const AUDIENCE_FEATURES = [
  {
    icon: Camera,
    title: "Photo attachments",
    body: "A picture tells the technician what words can’t. Useful on first-visit diagnosis.",
  },
  {
    icon: Clock4,
    title: "Live SLA timers",
    body: "Acknowledge and resolve deadlines tick on your dashboard in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Optional anonymous",
    body: "Skip the account, file the complaint, get a private tracker URL to bookmark.",
  },
] as const;

const DICT_FEATURES = [
  {
    icon: Bell,
    title: "AI-assisted triage",
    body: "Free text interpreted confidently by gpt-4o-mini. Submission is never blocked.",
  },
  {
    icon: ShieldCheck,
    title: "SLA enforcement",
    body: "Acknowledge + resolve deadlines enforced automatically up the DICT hierarchy.",
  },
  {
    icon: FileText,
    title: "Reports & exports",
    body: "Volume trends, breach counts, PDF and CSV exports for an external audience.",
  },
] as const;

/* ============================================================ Header */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
      />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="LASU CMS home"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-brand shadow-sm ring-1 ring-inset ring-brand-strong/40 transition-transform duration-fast group-hover:scale-[1.02]">
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
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-strong transition duration-fast hover:bg-surface-raised hover:text-foreground-strong"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ============================================================ Hero */

async function Hero() {
  const session = await getServerSession();
  const signedIn = !!session;

  return (
    <section className="relative isolate overflow-hidden">
      {/* Atmospheric depth layer behind the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            // Radial cream-to-white fade in the upper-left quadrant.
            "radial-gradient(circle at 22% 0%, rgba(244,215,106,0.20), transparent 55%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 sm:pt-24 sm:pb-32 lg:px-8 lg:pt-32 lg:pb-40 xl:pt-40 xl:pb-48">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Left: copy column */}
          <div className="flex flex-col gap-7 lg:col-span-7 lg:gap-9">
            {/* Eyebrow: tracked uppercase number + label */}
            <div className="flex items-center gap-3">
              <span className="numeric text-2xl font-semibold leading-none tracking-[-0.02em] text-foreground-strong sm:text-3xl">
                01
              </span>
              <span
                aria-hidden="true"
                className="h-px w-8 bg-border-strong"
              />
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                Lagos State University · DICT
              </p>
            </div>

            <h1 className="text-balance font-semibold tracking-[-0.025em] text-foreground-strong text-5xl leading-[1.02] sm:text-6xl lg:text-7xl xl:text-8xl">
              Campus maintenance,
              <br />
              <span className="text-brand">made transparent.</span>
            </h1>

            <p className="max-w-2xl text-balance text-lg leading-[1.5] text-muted-strong sm:text-xl sm:leading-[1.45]">
              Submit a fault. Track it in real time. See the proof of fix.
              Whether it&apos;s a bulb in the hostel or a server outage in
              Engineering, the entire repair loop is finally visible.
            </p>

            {/* Stats trio — the Nike moment */}
            <ul
              role="list"
              className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface/60 backdrop-blur-sm"
            >
              {STATS_TRIO.map((stat, idx) => (
                <li
                  key={stat.label}
                  className="flex flex-col gap-1 px-4 py-4 sm:px-5 sm:py-5"
                >
                  <p className="numeric text-3xl font-semibold tracking-[-0.025em] text-foreground-strong sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold tracking-[-0.005em] text-foreground-strong">
                    {stat.label}
                  </p>
                  <p className="hidden text-xs leading-[1.5] text-muted-strong sm:block">
                    {stat.note}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!signedIn ? (
                <>
                  <Link
                    href="/complaints/new"
                    className="group/cta inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-base font-semibold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Report a fault
                    <ChevronRight className="h-4 w-4 transition-transform duration-fast group-hover/cta:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/sign-up"
                    className="group/link inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-strong transition-colors duration-fast hover:text-brand sm:self-center"
                  >
                    <span>New here? Create an account</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover/link:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <Link
                  href="/complaints/mine"
                  className="group/cta inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-base font-semibold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Go to your complaints
                  <ChevronRight className="h-4 w-4 transition-transform duration-fast group-hover/cta:translate-x-0.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            <p className="inline-flex items-center gap-1.5 text-sm text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
              Free for LASU students and staff.{" "}
              <Link
                href="/sign-in"
                className="font-medium text-muted-strong underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              or file{" "}
              <Link
                href="/complaints/new"
                className="font-medium text-brand underline-offset-2 hover:underline"
              >
                anonymously
              </Link>
              .
            </p>
          </div>

          {/* Right: layered navy illustration panel */}
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <div className="lg:col-span-5">
      <div className="relative">
        {/* Atmospheric halo behind the panel — gold, low opacity */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-accent-soft/40 via-transparent to-transparent blur-2xl"
        />

        {/* The illustration panel itself */}
        <div className="radius-page relative aspect-[5/6] w-full overflow-hidden bg-brand shadow-2xl ring-1 ring-inset ring-brand-strong/40">
          {/* Decorative pattern: 2-px diagonal hairlines, brand-strong */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full opacity-[0.08]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="diag"
                patternUnits="userSpaceOnUse"
                width="14"
                height="14"
                patternTransform="rotate(-30)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="14"
                  stroke="rgba(255,255,255,1)"
                  strokeWidth="0.7"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#diag)" />
          </svg>

          {/* Two soft radial blooms for depth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 25% 85%, rgba(212,160,20,0.18), transparent 45%), radial-gradient(circle at 78% 18%, rgba(244,215,106,0.14), transparent 40%)",
            }}
          />

          {/* CMS icon — centered in the upper portion */}
          <div className="absolute inset-x-0 top-12 flex justify-center">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-2xl bg-white/8 backdrop-blur-sm"
              />
              <Image
                src="/cms-lasu-icon.png"
                alt="LASU CMS mark"
                width={220}
                height={220}
                className="relative h-44 w-auto drop-shadow-lg sm:h-52"
                priority
              />
            </div>
          </div>

          {/* Wordmark under the icon */}
          <div className="absolute inset-x-0 top-[60%] flex flex-col items-center px-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
              Lagos State University
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Maintenance, in the open.
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-[1.55] text-white/65">
              Every fault enters the same loop. Every fix leaves a photo
              receipt. Everyone watches the queue drain.
            </p>
          </div>

          {/* Live-status chip — top right */}
          <div className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
              Live
            </span>
          </div>

          {/* Bottom hairline status chip */}
          <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-accent">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  DICT Console
                </span>
                <span className="numeric text-sm font-semibold text-white">
                  Queue steady · 0 breaches
                </span>
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              v2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Stats band */

function StatsBand() {
  return (
    <section
      aria-label="At-a-glance"
      className="border-y border-border bg-surface"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul
          role="list"
          className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {[
            {
              kicker: "Acknowledge",
              value: "≤ 4 h",
              note: "DICT responds to a Submitted fault within four hours.",
            },
            {
              kicker: "Resolve",
              value: "≤ 72 h",
              note: "Most categories resolved within three working days.",
            },
            {
              kicker: "Receipt",
              value: "100%",
              note: "Every fix is photographically receipted before closure.",
            },
          ].map((item, idx) => (
            <li
              key={item.kicker}
              className="flex flex-col gap-2 px-2 py-8 sm:px-8 sm:py-10"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong">
                {item.kicker}
              </p>
              <p className="numeric text-4xl font-semibold tracking-[-0.025em] text-foreground-strong sm:text-5xl">
                {item.value}
              </p>
              <p className="max-w-xs text-sm leading-[1.55] text-muted-strong">
                {item.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ============================================================ The loop */

function MaintenanceLoopSection() {
  return (
    <section
      aria-label="How the maintenance loop works"
      className="border-y border-border bg-surface-raised"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <header className="mx-auto flex max-w-3xl flex-col gap-4">
          <p className="inline-flex items-center gap-2 self-start text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            The maintenance loop
          </p>
          <H2 className="text-balance">
            One loop, four beats, every fault closed out loud.
          </H2>
          <Supporting className="max-w-2xl text-base">
            From the moment you press <span className="font-semibold text-foreground-strong">Submit</span>{" "}
            to the moment the ack-timer transitions to{" "}
            <span className="font-semibold text-foreground-strong">Resolved</span>,
            the same loop carries the complaint. Every step is auditable.
            Every step has an SLA.
          </Supporting>
        </header>

        <ol
          role="list"
          className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {LOOP_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.n}
                className="group/step relative flex flex-col gap-5 bg-surface p-7 transition-colors duration-fast hover:bg-surface-raised lg:p-8"
              >
                {/* Step number — large numeric eyebrow */}
                <p
                  aria-hidden="true"
                  className="numeric absolute right-6 top-6 text-3xl font-semibold tabular-nums tracking-[-0.04em] text-muted/40 transition-colors duration-fast group-hover/step:text-muted"
                >
                  {step.n}
                </p>
                {/* Icon block */}
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-sm transition-transform duration-fast group-hover/step:-translate-y-0.5"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                {/* Title */}
                <H3 className="text-xl tracking-[-0.01em]">{step.title}</H3>
                {/* Body */}
                <Supporting className="text-[13px] leading-[1.6] text-muted-strong">
                  {step.body}
                </Supporting>
                {/* Footer detail — tabbed in */}
                <p className="mt-auto text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  {step.detail}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ============================================================ Two audiences */

function DualAudienceSection() {
  return (
    <section
      aria-label="For reporters and DICT"
      className="bg-surface"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-20">
          <AudienceColumn
            eyebrow="For students & staff"
            title="Report a fault in under a minute."
            subtitle="Pick a category and location, describe what happened, optionally attach a photo. Anonymous mode available."
            features={AUDIENCE_FEATURES}
            ctaHref="/sign-up"
            ctaLabel="Create your reporter account"
          />
          <AudienceColumn
            eyebrow="For DICT staff"
            title="Triage, assign, resolve."
            subtitle="The queue, the timers, the breaches, the reports — all in one place. AI helps interpret free text; rules keep the lights on if the AI is offline."
            features={DICT_FEATURES}
            ctaHref="/sign-in"
            ctaLabel="DICT staff sign in"
          />
        </div>
      </div>
    </section>
  );
}

function AudienceColumn({
  eyebrow,
  title,
  subtitle,
  features,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  features: ReadonlyArray<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
  }>;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 self-start text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {eyebrow}
        </p>
        <H2 className="text-balance tracking-[-0.018em]">{title}</H2>
        <Supporting className="max-w-prose text-base">
          {subtitle}
        </Supporting>
      </header>

      <ul role="list" className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <li
              key={`${feature.title}-${idx}`}
              className="flex items-start gap-4 p-5 transition-colors duration-fast first:rounded-t-xl last:rounded-b-xl hover:bg-surface-raised"
            >
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-[-0.005em] text-foreground-strong">
                  {feature.title}
                </p>
                <p className="mt-1 text-sm leading-[1.55] text-muted-strong">
                  {feature.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href={ctaHref}
        className="group/aud inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand transition-colors duration-fast hover:text-brand-strong"
      >
        {ctaLabel}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover/aud:-translate-y-0.5 group-hover/aud:translate-x-0.5" aria-hidden="true" />
      </Link>
    </article>
  );
}

/* ============================================================ CTA band */

function CtaBand() {
  return (
    <section className="relative isolate overflow-hidden bg-brand text-white">
      {/* Atmospheric top fade for visual continuity with the prior white
          section. Brand-strong at low opacity. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-8 px-0 py-20 md:flex-row md:items-center md:justify-between md:py-24 xl:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Join the loop
            </p>
            <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.025em] text-white sm:text-5xl xl:text-6xl">
              A campus that fixes itself,
              <br className="hidden sm:block" />
              <span className="text-accent">in the open.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-[1.5] text-white/75 sm:text-lg sm:leading-[1.45]">
              From the smallest faucet leak to a campus-wide outage, every
              maintenance task passes through the same system. Sign up to
              file, bookmark a tracker URL to follow.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/sign-up"
              className="group/cta inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-brand-strong shadow-sm transition-[background-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:bg-accent-strong hover:text-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              Create your account
              <ChevronRight className="h-4 w-4 transition-transform duration-fast group-hover/cta:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/sign-in"
              className="self-start text-sm font-medium text-white/75 underline-offset-4 transition-colors duration-fast hover:text-white hover:underline sm:self-center"
            >
              Already have one? Sign in →
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade to page bg */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-black/40 to-transparent"
      />
    </section>
  );
}

/* ============================================================ Footer */

function SiteFooter() {
  const cols = [
    {
      title: "Product",
      links: [
        { href: "/sign-up", label: "Reporter account" },
        { href: "/sign-in", label: "Sign in" },
        { href: "/complaints/new", label: "File anonymously" },
      ],
    },
    {
      title: "For DICT",
      links: [
        { href: "/sign-in", label: "DICT staff sign in" },
        { href: "/sign-in", label: "Technician sign in" },
        { href: "/sign-in", label: "Audit log" },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/", label: "Documentation" },
        { href: "/", label: "SLA policy" },
        { href: "/", label: "Built on Next.js" },
      ],
    },
    {
      title: "Contact",
      links: [
        { href: "/", label: "DICT support" },
        { href: "/", label: "Report a bug" },
        { href: "/", label: "LASU DICT" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:gap-12">
          {cols.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-strong">
                {col.title}
              </p>
              <ul role="list" className="flex flex-col gap-2.5">
                {col.links.map((link, idx) => (
                  <li key={`${col.title}-${idx}`}>
                    <Link
                      href={link.href}
                      className="text-sm leading-[1.4] text-muted-strong transition-colors duration-fast hover:text-foreground-strong"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Lagos State University · DICT —
            Campus Maintenance Complaint Management System
          </p>
          <p>
            Built on Next.js · MongoDB · Vercel AI · Ably · Astryx design system
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================ Page */

export default async function LandingPage() {
  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <SiteHeader />
      <Hero />
      <StatsBand />
      <MaintenanceLoopSection />
      <DualAudienceSection />
      <CtaBand />
      <SiteFooter />
    </div>
  );
}
