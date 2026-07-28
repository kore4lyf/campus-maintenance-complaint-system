"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

/*
 * Card — four visual variants of the same primitive. The default Tailwind
 * recipe (`rounded-lg border border-border bg-surface-raised`) was repeated
 * 14 times across the project. We replace it with intentional variants.
 *
 *   surface   pure white card sitting on `surface` page bg, with a hairline
 *             border. Use for primary content cards (complaint details, big
 *             forms, login surface).
 *   raised    off-white panel on a white page. Use for grouped sections within
 *             a card (description block, photo grid, recent-actions feed rows).
 *   overlay   modal background. Same as `surface` but optimised for absolute
 *             positioning over a backdrop.
 *   hero      brand-navy block. Marketing surfaces and the icon block.
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
  surface:
    "bg-surface border border-border shadow-sm",
  raised:
    "bg-surface-raised border border-border",
  overlay:
    "bg-surface-overlay border border-border shadow-lg",
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
          "rounded-xl",
          VARIANT[variant],
          PADDING[padding],
          interactive
            ? "transition-[shadow,transform,border-color] duration-200 hover:-translate-y-px hover:shadow-md hover:border-border-strong cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-sm font-semibold text-foreground-strong">
          {title}
        </h2>
      </div>
      {meta ? <div className="text-xs text-muted-strong">{meta}</div> : null}
    </header>
  );
}
