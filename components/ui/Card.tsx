"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

/*
 * Card — four visual variants of the same primitive.
 *
 * Spec 0014 §C: Card radius is locked at `rounded-xl` (16 px = Astryx
 * --radius-container). This is the one radius value that every Card
 * uses. Two rules govern usage:
 *
 *   1. **Card is for widgets, not for data rows.** Astryx Principles
 *      §Anti-Patterns: "Don't wrap every list item or page section in
 *      a Card. Decide the frame first; dense data renders as rows
 *      (Table, List/Item), edge-to-edge with dividers." For data row
 *      rendering (e.g. complaint queues), use <ComplaintRow> from
 *      components/ui/ComplaintRow.tsx.
 *
 *   2. **Card surface is the only big-radius surface.** Inside Cards
 *      you may pad; outside Cards use flat surfaces + 1 px dividers.
 *      The Home `app/page.tsx` hero surface holds the page-level
 *      32 px radius via the .radius-page utility, the one deliberate
 *      break from --radius-container.
 *
 * Variant map:
 *
 *   surface   pure white card on `surface` page bg, with a hairline
 *             border. Use for primary content cards (complaint details,
 *             big forms, login surface).
 *   raised    off-white panel on a white page. Use for grouped sections
 *             within a card (description block, photo grid, recent-
 *             actions feed rows).
 *   overlay   modal background. Same as `surface` but optimised for
 *             absolute positioning over a backdrop.
 *   hero      brand-navy block. The Home marketing hero tile only.
 */
type Variant = "surface" | "raised" | "overlay" | "hero";
type Padding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant | undefined;
  padding?: Padding | undefined;
  interactive?: boolean | undefined;
  asChild?: boolean | undefined;
  children?: ReactNode | undefined;
}

const VARIANT: Record<Variant, string> = {
  // surface sits on bg/surface; the hairline border alone is enough to
  // demarcate a card. Save the lift shadow for interactive states.
  surface: "bg-surface border border-border",
  // raised is used inside a card or grouping — never lift, just shade.
  raised: "bg-surface-raised border border-border",
  // overlay is the modal surface. Soft shadow lifted off the page.
  overlay: "bg-surface-overlay border border-border shadow-lg",
  // hero is a marketing-grade block on the landing page — strongest shadow
  // in the system, but still under the old Tailwind defaults.
  hero: "bg-brand text-white shadow-xl",
};

const PADDING: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "surface",
      padding = "md",
      interactive = false,
      className = "",
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={[
          // Astryx --radius-container (16 px). Locked per Spec 0014 §C.
          "rounded-xl",
          VARIANT[variant],
          PADDING[padding],
          interactive
            ? "transition-[transform,border-color] duration-fast hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            : "",
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

/*
 * SectionHeader — small labeled section within a Card. Designed to be paired
 * with `Card` for things like "SLA deadlines", "Description", "Photos".
 *
 * Spec 0014: uses <Kicker> for the eyebrow and the astryx type scale for
 * the title (H4-style: text-sm). One source of truth for size + kerning.
 */
export function SectionHeader({
  eyebrow,
  title,
  meta,
  className = "",
}: {
  eyebrow?: ReactNode | undefined;
  title: ReactNode;
  meta?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <header className={`mb-3 flex flex-wrap items-end justify-between gap-2 ${className}`}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-sm font-semibold tracking-[-0.01em] text-foreground-strong">
          {title}
        </h2>
      </div>
      {meta ? <div className="text-xs text-muted-strong">{meta}</div> : null}
    </header>
  );
}
