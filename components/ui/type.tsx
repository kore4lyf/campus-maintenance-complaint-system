import type { ReactNode } from "react";

/*
 * Astryx-aligned text primitives.
 *
 * Spec: docs/specs/0014-astryx-design-alignment.md (Proposed, 2026-07-28).
 *
 * Why these exist:
 *   Astryx's Typography docs (https://astryx.atmeta.com/docs/typography)
 *   say: "Use `Heading` for document headings and `Text` for everything
 *   else; they apply the full type scale automatically" and "Don't set
 *   font-size or line-height manually; use the semantic type scale
 *   tokens so the full ramp stays consistent and 4px-grid-aligned."
 *
 *   Before this file the codebase hand-typed eleven distinct inline
 *   `<h1> / <h2> / <h3>` rules. Every page reinvented the type ladder.
 *   Now: one source. Pick the variant, the Tailwind classes bake in
 *   once.
 *
 * Tailwind 4 + project tokens, not StyleX. Astryx supports both per
 * its own Principles ("StyleX or Tailwind for custom styling; both
 * are first-class"). The project's integration choice is Tailwind 4,
 * locked at spec 0001.
 *
 * Tracking & kerning:
 *   - <H1 default> tracks -0.025em (Astryx uses Figtree 600; we use
 *     Inter 600; the negative kerning approximates the optical weight).
 *   - <H1 display> tracks -0.025em AND increases to text-7xl at lg.
 *     Reserved for marketing surfaces; not for in-app headers.
 *   - Kicker uses tracking-[0.16em] (Astryx H6 convention: 0.625rem
 *     Figtree 600 wide-tracked uppercase).
 *
 * Out of scope:
 *   - Does not retype the per-page Status / Severity / Category
 *     badges. Those stay in components/reporter/.
 *   - Does not enforce the `useLinkComponent()` Astryx rule for
 *     anchors; the project's LinkProvider is in app/providers.tsx
 *     already.
 *   - Does not introduce StyleX. This is a Tailwind 4 codebase.
 */

type ClassValue = string | false | null | undefined;

/*
 * H1 — page-level title.
 *
 * `default` (in-app screens inside HeroBand):
 *     text-4xl sm:text-5xl, tracking-[-0.025em], [line-height:1.1].
 *
 * `display` (marketing surfaces only):
 *     text-5xl → text-6xl → text-7xl (resposes by viewport), tracking-
 *     [-0.025em], [line-height:1.05].
 *
 * `compact` (titles inside a Card / overlay surface like /sign-in,
 *     /sign-up, /track):
 *     text-2xl sm:text-3xl, tracking-[-0.015em], [line-height:1.25].
 *     Card surfaces have less horizontal slack; the in-app scale reads
 *     too loud. This variant bridges the gap without forking the
 *     primitive.
 */
export interface H1Props {
  variant?: "default" | "display" | "compact" | undefined;
  className?: string | undefined;
  children: ReactNode;
}

export function H1({ variant = "default", className, children }: H1Props) {
  const base: ClassValue = "font-semibold tracking-[-0.025em] text-foreground-strong";
  const scale =
    variant === "display"
      ? "text-5xl sm:text-6xl lg:text-7xl xl:text-8xl [line-height:1.02]"
      : variant === "compact"
        ? "text-2xl sm:text-3xl tracking-[-0.015em] [line-height:1.25]"
        : "text-4xl sm:text-5xl [line-height:1.1]";
  const classes = [scale, base, className].filter(Boolean).join(" ");
  return <h1 className={classes}>{children}</h1>;
}

/*
 * H2 — section-level title. Used on Detail page subsections,
 * groups, accordion labels.
 */
export interface H2Props {
  className?: string | undefined;
  children: ReactNode;
}

export function H2({ className, children }: H2Props) {
  const classes = [
    "text-2xl sm:text-3xl font-semibold tracking-[-0.015em]",
    "[line-height:1.2] text-foreground-strong",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <h2 className={classes}>{children}</h2>;
}

/*
 * H3 — subsection / card heading. Used inside Card titles.
 */
export interface H3Props {
  className?: string | undefined;
  children: ReactNode;
}

export function H3({ className, children }: H3Props) {
  const classes = [
    "text-lg sm:text-xl font-semibold tracking-[-0.01em]",
    "[line-height:1.3] text-foreground-strong",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <h3 className={classes}>{children}</h3>;
}

/*
 * Body — paragraph text.
 *
 * tone="default":  standard body copy in `text-foreground`.
 * tone="muted":    secondary copy in `text-muted-strong` (used in
 *                  subtitles below H1, paragraph footnotes, etc.).
 * tone="lead":     emphasised body for hero lead paragraphs.
 */
export interface BodyProps {
  tone?: "default" | "muted" | "lead" | undefined;
  className?: string | undefined;
  children: ReactNode;
}

export function Body({ tone = "default", className, children }: BodyProps) {
  const toneClass =
    tone === "muted"
      ? "text-muted-strong"
      : tone === "lead"
        ? "text-muted-strong text-lg leading-[1.5]"
        : "text-foreground";
  const base =
    tone === "lead" ? "leading-[1.5] text-lg" : "leading-[1.55] text-base";
  const classes = [base, toneClass, "max-w-prose", className]
    .filter(Boolean)
    .join(" ");
  return <p className={classes}>{children}</p>;
}

/*
 * Label — short, on-brand label. Used on form labels and panel
 * titles (Astryx `Label` is 0.875rem · Figtree 500 · 1.4286).
 */
export interface LabelProps {
  className?: string | undefined;
  children: ReactNode;
}

export function Label({ className, children }: LabelProps) {
  const classes = [
    "text-sm font-medium text-foreground-strong leading-[1.4]",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{children}</span>;
}

/*
 * Kicker — uppercase eyebrow label. Reserved for one per page per
 * `ui-context.md` brand discipline rule (3–5 places per screen at
 * most). Gold `text-accent-strong` is the canonical colour.
 *
 * Astryx H6 convention: 0.625rem · Figtree 600 · wide kerned 0.16em.
 * Mapped here to text-xs (Inter nearest equivalent) with the same
 * kerning.
 */
export interface KickerProps {
  className?: string | undefined;
  children: ReactNode;
}

export function Kicker({ className, children }: KickerProps) {
  const classes = [
    "text-xs font-semibold uppercase tracking-[0.16em]",
    "text-accent-strong",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <p className={classes}>{children}</p>;
}

/*
 * Supporting — small secondary text. Astryx Supporting = 0.75rem ·
 * Figtree 400 · 1.6667 (large leading for readability at small size).
 */
export interface SupportingProps {
  className?: string | undefined;
  children: ReactNode;
}

export function Supporting({ className, children }: SupportingProps) {
  const classes = [
    "text-xs leading-[1.5] text-muted-strong",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <p className={classes}>{children}</p>;
}
