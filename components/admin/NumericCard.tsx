"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/*
 * NumericCard — Apple-style single-value display tile.
 *
 * Spec 0014 amendment: numeric cards in the Admin Reports dashboard
 * previously used an inline-div + raw `Card padding="md"` with no icon
 * affordance and no clear visual layer between eyebrow and value. The
 * refined primitive carries:
 *
 *   - Optional leading icon block in a tinted --color-brand/10 square.
 *     Reserved for the dashboard top-strip on Reports. Acts as a focal
 *     point at a glance when the row of three is scanned left-to-right.
 *   - Eyebrow label in the established project type scale.
 *   - Numeric value rendered in font-semibold tabular figures at the
 *     same display-XXX-l scale as before but with tighter letter-spacing.
 *     Hairline border-top / border-strong (1 px) between value and the
 *     sub-line keeps Apple's "display + footnote" rhythm.
 *   - Optional sub-line for footnote/scale commentary.
 *   - Optional emptyMessage slot so the card never collapses when data
 *     is missing — the layout stays calm even before fetch resolves.
 *
 * Astryx mapping: this surface uses the project's typed Card primitive
 * (which maps to Astryx's --radius-container / --color-background-surface)
 * because the project tokens carry our brand identity. The leading-icon
 * block uses Astryx's icon-in-rounded-square pattern (--color-background-card
 * mapping) but resolved through bg-brand/10.
 */

type Tone = "brand" | "danger" | "info" | "success" | "warning";

interface NumericCardProps {
  label: string;
  value: number | string | null;
  subtitle?: ReactNode | undefined;
  emptyMessage?: string | undefined;
  icon?: ReactNode | undefined;
  tone?: Tone | undefined;
  /** Tail-friendly: list of <li> rows rendered as a hairline-divided sub-table. */
  breakdown?: Array<{ dotTone?: Tone | undefined; label: string; value: number | string }> | undefined;
}

const ICON_BG: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

const DOT_BG: Record<Tone, string> = {
  brand: "bg-brand",
  danger: "bg-danger",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
};

const VALUE_FG: Record<Tone, string> = {
  brand: "text-foreground-strong",
  danger: "text-danger-strong",
  info: "text-info-strong",
  success: "text-success-strong",
  warning: "text-warning-strong",
};

export function NumericCard({
  label,
  value,
  subtitle,
  emptyMessage = "—",
  icon,
  tone = "brand",
  breakdown,
}: NumericCardProps) {
  const displayValue = value === null || value === undefined ? emptyMessage : value;

  return (
    <Card
      padding="md"
      className="group relative overflow-hidden transition-[border-color,transform] duration-fast hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-strong">
            {label}
          </p>
        </div>
        {icon ? (
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-fast group-hover:scale-[1.04] ${ICON_BG[tone]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p
        className={`numeric mt-4 text-4xl font-semibold tracking-[-0.02em] [line-height:1.05] ${VALUE_FG[tone]}`}
      >
        {displayValue}
      </p>

      {subtitle ? (
        <p className="mt-2 text-xs leading-[1.55] text-muted-strong">
          {subtitle}
        </p>
      ) : null}

      {breakdown && breakdown.length > 0 ? (
        <ul
          role="list"
          className="mt-4 flex flex-col divide-y divide-border border-t border-border"
        >
          {breakdown.map((row, idx) => (
            <li
              key={`${row.label}-${idx}`}
              className="flex items-center justify-between gap-2 py-1.5 text-xs"
            >
              <span className="inline-flex items-center gap-2 text-muted-strong">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${DOT_BG[row.dotTone ?? "brand"]}`}
                  aria-hidden="true"
                />
                {row.label}
              </span>
              <span className="numeric font-semibold text-foreground-strong">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
