import type { ReactNode } from "react";

/*
 * EmptyState — three layouts depending on what the surface calls for.
 *
 *   default    icon in a tinted circle, 2-line copy, primary CTA. The
 *              "you haven't yet" pattern used by the reporter dashboard.
 *   wide       large horizontal block with two columns (illustration on the
 *              right, copy + CTA on the left). For the public landing "no
 *              results" or first-run admin scenario.
 *   compact    one-line text-only skip-the-illustration state. For the
 *              queue's "no items match your filters" state.
 */
export type EmptyStateVariant = "default" | "wide" | "compact";

export interface EmptyStateProps {
  icon?: ReactNode | undefined;
  title: string;
  description?: ReactNode | undefined;
  primaryAction?: ReactNode | undefined;
  secondaryAction?: ReactNode | undefined;
  variant?: EmptyStateVariant | undefined;
  className?: string | undefined;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "default",
  className = "",
}: EmptyStateProps) {
  if (variant === "compact") {
    return (
      <div
        className={`flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-surface-raised p-5 ${className}`}
      >
        <p className="text-sm font-semibold text-foreground-strong">{title}</p>
        {description ? (
          <p className="text-sm text-muted-strong">{description}</p>
        ) : null}
        {primaryAction ? <div className="mt-2">{primaryAction}</div> : null}
      </div>
    );
  }

  if (variant === "wide") {
    return (
      <div
        className={`grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface p-8 md:grid-cols-12 ${className}`}
      >
        <div className="md:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
            Heads up
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground-strong">
            {title}
          </h3>
          {description ? (
            <p className="mt-3 max-w-prose text-base text-muted-strong">
              {description}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {primaryAction}
            {secondaryAction}
          </div>
        </div>
        <div className="md:col-span-5">
          <div className="flex aspect-[5/4] items-center justify-center rounded-2xl bg-brand/5">
            {icon ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                {icon}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-16 text-center ${className}`}
    >
      {icon ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-sm">
          {icon}
        </div>
      ) : null}
      <h2 className="mt-5 text-lg font-semibold text-foreground-strong">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-strong">
          {description}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}
