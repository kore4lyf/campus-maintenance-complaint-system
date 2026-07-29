import type { ReactNode } from "react";
import { H1, Kicker } from "@/components/ui/type";

/*
 * PageShell — section & rhythm contract for in-app screens.
 *
 * Spec reference: docs/specs/0013-in-app-ui-lift.md (Proposed, 2026-07-28).
 *
 * Why this exists:
 *   The Home page at app/page.tsx has visual rhythm — full-bleed navy CTA
 *   band, raised off-white section bands, gold-accent kicker labels, and a
 *   hero with `pt-16 pb-24 sm:pt-24 sm:pb-32` scale. Every in-app screen
 *   painted a flat single white wall with no rhythm at all. This component
 *   ports the Home's structural pattern once and lets every page adopt it
 *   by wrapping render in <PageShell>.
 *
 * Composition:
 *   - displayVariant "hero"  → renders <HeroBand> + body. Default for
 *     list/index screens (queue, mine, reports, assignments, admin queue).
 *   - displayVariant "flat"  → no HeroBand; chrome wraps a body that
 *     already carries its own local header (complaint detail, new form,
 *     sign-in / sign-up / track when paired with the public layout).
 *   - displayVariant "none"  → no chrome at all; just {children}. Escape
 *     hatch if a future page needs pixel-precise layouts.
 *
 *   <PageShellCtaBand> is opt-in. Most pages do not need a closing navy
 *   band; defaulting it would over-paint institutional screens. Only
 *   /complaints/mine currently opts in, matching the Home's closer.
 *
 * Constraints:
 *   - No data fetching. Server Components can compose <PageShell> because
 *     it is a pure render component and accepts children as ReactNode.
 *   - No new tokens. Backgrounds resolve to var(--color-surface-raised)
 *     and var(--color-brand). Light mode is the single source of truth
 *     since the dark-mode removal on 2026-07-28.
 *   - h1 scale rule lives here once: text-4xl sm:text-5xl tracking-tight
 *     leading-[1.1]. Eleven page files do not redefine this scale.
 *
 * Out of scope (recorded in the spec for traceability):
 *   - Does not retype the per-page Status / Severity badges. Those stay
 *     in components/reporter/CategoryBadge / SeverityBadge.
 *   - Does not change the TopNav or the Mobile Bottom Nav. They keep
 *     their current roles-aware menu.
 */

type DisplayVariant = "hero" | "flat" | "none";

export interface PageShellProps {
  /**
   * "hero" — render the hero band above the body (default).
   * "flat" — render only a body container with no hero band; useful for
   *   pages that already have their own local page header (complaint
   *   detail, new form, sign-in / sign-up inside the public layout).
   * "none" — render only {children} with no shell at all; escape hatch.
   */
  displayVariant?: DisplayVariant | undefined;
  children: ReactNode;
}

export function PageShell({
  displayVariant = "hero",
  children,
}: PageShellProps) {
  if (displayVariant === "none") {
    return <>{children}</>;
  }

  if (displayVariant === "flat") {
    return (
      <div className="bg-surface text-foreground">
        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-12">
          {children}
        </div>
      </div>
    );
  }

  // hero (default)
  return (
    <div className="bg-surface text-foreground">
      {children}
    </div>
  );
}

/* ---------- HeroBand ---------- */

export interface HeroBandProps {
  /**
   * Optional eyebrow line above the h1. Render uppercase letter-spaced
   * text in `text-accent-strong` (gold) so it reads as a brand kicker.
   * Match the Home's rhythm: at most one kicker per page.
   */
  kicker?: ReactNode | undefined;
  /**
   * Page title. Rendered inside an h1 at the in-app scale
   * (text-4xl sm:text-5xl tracking-tight leading-[1.1]). Accepts a
   * string for plain titles or ReactNode so callers can compose one
   * (e.g. brand-coloured span) inline.
   */
  title: ReactNode;
  /**
   * Optional subtitle paragraph. Rendered in `text-muted-strong` at the
   * default body scale with `max-w-2xl`.
   */
  subtitle?: ReactNode | undefined;
  /**
   * Optional slot for a primary action button on the right of the hero
   * (e.g. "New complaint" on /complaints/mine). The slot is right-aligned
   * with the title via `flex-wrap items-end justify-between`.
   */
  actions?: ReactNode | undefined;
}

/**
 * HeroBand — the raised-band hero used by `<PageShell displayVariant="hero">`.
 * Place directly after `<PageShell>` opens. The band paints
 * `bg-surface-raised` with a hairline border above (matching the Home's
 * `DualAudienceSection`) and the page's vertical padding scale
 * (`pt-12 pb-12 sm:pt-16 sm:pb-16`).
 *
 * Spec 0013 §A. Spec 0014 §AC-2 updates the inner render to use the
 * <H1>, <Kicker>, and leading-paragraph primitives — no inline
 * <h1>/<p> styling remains in this file. Single-source rule for the
 * Astryx-aligned type scale.
 */
export function HeroBand({
  kicker,
  title,
  subtitle,
  actions,
}: HeroBandProps) {
  return (
    <section className="section-raised">
      <div className="mx-auto w-full max-w-7xl px-4 pt-12 pb-12 sm:px-6 sm:pt-16 sm:pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            {kicker ? <Kicker>{kicker}</Kicker> : null}
            <div className="mt-3">
              <H1>{title}</H1>
            </div>
            {subtitle ? (
              <p className="mt-3 max-w-2xl text-base leading-[1.55] text-muted-strong sm:text-lg sm:leading-[1.5]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-shrink-0 items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ---------- HeroBody ---------- */

export interface HeroBodyProps {
  children: ReactNode;
}

/**
 * HeroBody — the body container that sits between HeroBand and
 * <PageShellCtaBand>. Paints `bg-surface` (white), uses the same
 * horizontal gutter as the HeroBand (`max-w-7xl px-4 sm:px-6`) and
 * generous vertical padding so the body does not crowd the band.
 */
export function HeroBody({ children }: HeroBodyProps) {
  return (
    <div className="bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 md:pb-24">
        {children}
      </div>
    </div>
  );
}

/* ---------- PageShellCtaBand ---------- */

export interface PageShellCtaBandProps {
  title: string;
  body?: string | undefined;
  /**
   * Single primary action button (or anchor styled as a button). Opt-in
   * per spec AC-4: most pages do not need a closing navy band; only
   * pages that want a "next step" closer use this.
   */
  action: ReactNode;
}

/**
 * PageShellCtaBand — the full-bleed navy closer that matches the Home's
 * closing band (`bg-brand text-white`, `py-16 md:py-20`).
 *
 * Spec 0013 §A subcomponent; AC-4.
 */
export function PageShellCtaBand({
  title,
  body,
  action,
}: PageShellCtaBandProps) {
  return (
    <section className="cta-band-brand">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-6 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {body ? (
            <p className="mt-3 text-lg text-white/70">{body}</p>
          ) : null}
        </div>
        {action}
      </div>
    </section>
  );
}
