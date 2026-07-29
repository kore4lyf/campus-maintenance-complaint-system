import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

/*
 * AuthShell — Stripe/Vercel-style split-screen auth surface.
 *
 * Visual structure (lg and up):
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │  NAVY BRAND COLUMN          │   FORM COLUMN       │
 *   │  (depth + atmosphere +      │   (focus + breath)  │
 *   │   value props + live        │                    │
 *   │   timeline preview)         │   brand wordmark    │
 *   │                             │   kicker            │
 *   │                             │   <h1>             │
 *   │                             │   subtitle          │
 *   │                             │   {form island}     │
 *   │                             │   secondary action  │
 *   └──────────────────────────────────────────────────┘
 *
 * On < lg the brand column collapses and only the form column renders.
 * The brand column is filled with `bg-brand` (locked token), an
 * atmospheric gradient using --color-accent-soft at < 0.16 opacity, a
 * depth vignette fade, and a single feature row. NO new colours.
 * Gold accent (#d4a014) appears as a single dot accent per surface.
 *
 * Astryx mapping:
 *   - Brand column = Astryx hero variant (--color-background-section).
 *   - Form column = Astryx default surface (--color-background-surface).
 *   - Feature rows = Astryx ListItem pattern with --spacing-4 gutters.
 *   - Hairline borders = --color-border-strong.
 *
 * Tokens used (every class is project-defined):
 *   - bg-brand (#0c2848 navy)
 *   - from white/0 (semi-transparent) over bg-brand for atmosphere
 *   - text-white, text-accent (gold)
 *   - border-border, border-border-strong for hairline rules
 *   - shadow-2xl for the brand-column depth
 */

interface AuthShellProps {
  /**
   * Optional copy rendered above the form <h1>. One kicker label per
   * page per brand discipline (3–5 places per screen at most).
   */
  kicker: string;
  /**
   * Page <h1>, rendered with the in-app compact scale.
   */
  title: ReactNode;
  /**
   * Optional subtitle paragraph under the <h1>.
   */
  subtitle?: ReactNode;
  /**
   * The form element (a Server Component or Client-Component island).
   */
  children: ReactNode;
  /**
   * Secondary action rendered below the form (e.g. "Create one →
   * sign-up"). Pass full Button + Link markup as ReactNode.
   */
  secondaryAction?: ReactNode;
  /**
   * Brand-column protagonist. Title is the H2 in the navy column.
   * Items render as feature rows with a Lucide-icon-style bullet.
   */
  brandPanel: {
    eyebrow: string;
    title: string;
    body: string;
    features: Array<{
      icon: () => ReactNode;
      title: string;
      body: string;
    }>;
    footerNote: string;
  };
  /**
   * Optional small footer note rendered above the form section.
   */
  reassurance?: ReactNode;
  /**
   * Toggle between sign-in and sign-up branding context so the brand
   * column copy stays correct on each page. Currently has no visual
   * effect, but reads cleanly when copywriters need per-page overrides.
   */
  variant?: "sign-in" | "sign-up" | undefined;
}

export function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  secondaryAction,
  brandPanel,
  reassurance,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-surface text-foreground lg:flex-row">
      {/* ─────────── Brand column ─────────── */}
      <aside
        className="relative isolate hidden flex-col justify-between overflow-hidden bg-brand text-white lg:flex lg:w-[44%] lg:min-h-dvh lg:px-12 lg:py-14 xl:w-[48%] xl:px-16"
        aria-label="Brand introduction"
      >
        {/* Atmospheric depth layers */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 28% 18%, rgba(244,215,106,0.18), transparent 48%), radial-gradient(circle at 78% 92%, rgba(212,160,20,0.10), transparent 55%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        {/* Brand header */}
        <header className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
            <Image
              src="/cms-lasu-icon.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
              priority
            />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent shadow-md" />
          </span>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-white">
              LASU CMS
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
              DICT · Maintenance
            </span>
          </div>
        </header>

        {/* Hero content */}
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
              {brandPanel.eyebrow}
            </p>
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.025em] [line-height:1.08] sm:text-5xl">
              {brandPanel.title}
            </h2>
            <p className="max-w-md text-base leading-[1.55] text-white/75 sm:text-lg sm:leading-[1.5]">
              {brandPanel.body}
            </p>
          </div>

          <ul role="list" className="flex flex-col divide-y divide-white/10 border-y border-white/10">
            {brandPanel.features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <li
                  key={`${feature.title}-${idx}`}
                  className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/20"
                    aria-hidden="true"
                  >
                    <Icon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-[-0.005em] text-white">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-sm leading-[1.55] text-white/70">
                      {feature.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer note on the navy column */}
        <p className="text-xs leading-[1.5] text-white/55">
          <span className="font-semibold text-white/70">{brandPanel.footerNote}</span>
          <br />
          Built on Next.js · MongoDB · Vercel AI · Ably. © {new Date().getFullYear()}{" "}
          Lagos State University.
        </p>

        {/* Bottom hairline brand rule */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-black/40 to-transparent"
        />
      </aside>

      {/* ─────────── Form column ─────────── */}
      <main
        id="main-content"
        className="flex flex-1 flex-col bg-surface"
      >
        {/* Mobile-only brand strip + home link */}
        <header className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3.5 backdrop-blur-sm sm:px-6 lg:hidden">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label="LASU CMS home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand">
              <Image
                src="/cms-lasu-icon.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6"
              />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-brand">
                LASU
              </span>
              <span className="text-sm font-medium text-foreground-strong">
                CMS
              </span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-muted-strong transition-colors hover:text-foreground-strong"
          >
            Home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-12 lg:py-16 xl:px-20">
          <div className="w-full max-w-md">
            {/* Page header */}
            <header className="mb-8 flex flex-col gap-3">
              {/* Hidden on lg because the brand column already carries the
                  wordmark; on mobile it doubles as the brand anchor. */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong lg:hidden">
                {kicker}
              </p>
              {/* On lg, the kicker reappears above the form so it reads in
                  the same rhythm as the brand-panel eyebrow. */}
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong lg:block">
                {kicker}
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.02em] [line-height:1.15] text-foreground-strong sm:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="max-w-md text-base leading-[1.55] text-muted-strong">
                  {subtitle}
                </p>
              ) : null}
            </header>

            {/* The actual form island */}
            <div className="relative">{children}</div>

            {/* Secondary action slot */}
            {secondaryAction ? (
              <div className="mt-7 flex flex-col gap-2 border-t border-border pt-6">
                {secondaryAction}
              </div>
            ) : null}

            {/* Reassurance note */}
            {reassurance ? (
              <p className="mt-6 inline-flex items-center justify-start gap-1.5 text-xs text-muted-strong">
                {reassurance}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
