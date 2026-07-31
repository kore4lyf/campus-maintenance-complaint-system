import Image from "next/image";
import type { ReactNode } from "react";
import { TopNav } from "./TopNav";

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
  children,
  secondaryAction,
  brandPanel,
  reassurance,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-surface text-foreground lg:flex-row">
      {/* ─────────── Brand column ─────────── */}
      <aside
        className="relative isolate hidden flex-col justify-end overflow-hidden bg-brand text-white lg:flex lg:w-[44%] lg:min-h-dvh lg:px-12 lg:py-14 xl:w-[48%] xl:px-16"
        aria-label="Brand introduction"
      >
        {/* Atmospheric depth layers */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 28% 82%, rgba(244,215,106,0.24), transparent 48%), radial-gradient(circle at 78% 8%, rgba(212,160,20,0.10), transparent 55%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        {/* Brand header */}
        <header className="flex items-center gap-2">
          <Image
            src="/cms-lasu-full.png"
            alt="LASU CMS"
            width={2081}
            height={942}
            className="h-10 w-auto pb-4"
            priority
          />
        </header>

        {/* Hero content */}
        <div className="flex flex-col gap-10" />

        {/* Footer note on the navy column */}
        <p className="text-xs leading-[1.5] text-white/55">
          <span className="font-semibold text-white/70">{brandPanel.footerNote}</span>
          <br />
          Built on Next.js · MongoDB · Vercel AI · Ably. © {new Date().getFullYear()}
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
        {/* Mobile brand strip */}
        <div className="lg:hidden">
          <TopNav />
        </div>

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
