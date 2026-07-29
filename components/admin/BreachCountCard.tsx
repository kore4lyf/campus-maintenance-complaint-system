"use client";

import { AlertOctagon } from "lucide-react";
import { Card } from "@/components/ui/Card";

/*
 * BreachCountCard — KPI tile for the SLA-breach headline number.
 *
 * Aesthetically identical to NumericCard with one extra affordance: a
 * tiny inline <progress>-shaped pair of hairline bars under the
 * headline value. The two bars break down "Acknowledge overdue" vs.
 * "Resolve overdue" so the operator can see which deadline is the
 * pressure point at a glance without reading the body copy.
 *
 * Astryx token mapping:
 *   - Card surface = --color-background-surface + --color-border
 *     (.bg-surface / .border-border — lines up with Astryx default Card)
 *   - Icon block    = bg-danger/10 text-danger
 *     (matches Astryx Banner.status="error" tinted icon block)
 *   - Headline      = text-danger-strong (semantic token; AA contrast)
 *   - Bar fills     = .bg-warning and .bg-danger (severity tokens)
 *
 * Composition rule: this primitive must not import or shadow NumericCard;
 * the dashboard composes both via Grid, and they need to be visually
 * distinct enough to scan in <300 ms.
 */
interface BreachCountCardProps {
  acknowledgeOverdue: number;
  resolveOverdue: number;
}

export function BreachCountCard({
  acknowledgeOverdue,
  resolveOverdue,
}: BreachCountCardProps) {
  const total = acknowledgeOverdue + resolveOverdue;
  const acknowledgeRatio = total === 0 ? 0 : acknowledgeOverdue / total;
  const resolveRatio = total === 0 ? 0 : resolveOverdue / total;

  return (
    <Card
      padding="md"
      className="group relative overflow-hidden transition-[border-color] duration-fast hover:border-danger/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-strong">
            SLA breaches
          </p>
          <p className="numeric mt-4 text-4xl font-semibold tracking-[-0.02em] [line-height:1.05] text-danger-strong">
            {total}
          </p>
        </div>
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger transition-transform duration-fast group-hover:scale-[1.04]"
          aria-hidden="true"
        >
          <AlertOctagon className="h-5 w-5" />
        </span>
      </div>

      {/*
       * Mini two-bar segmented meter. Renders two hairline bars
       * stacked with the same hairline-border colour as the page for
       * visual twin with NumericCard's breakdown. When total is zero
       * the bars are replaced with a single "no breaches" stub so the
       * card never collapses.
       */}
      {total === 0 ? (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 py-1 text-xs font-medium text-success-strong">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          No breaches in view
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised"
              role="meter"
              aria-label="Acknowledge overdue proportion"
              aria-valuenow={Math.round(acknowledgeRatio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="block h-full bg-warning transition-[width] duration-medium"
                style={{ width: `${acknowledgeRatio * 100}%` }}
              />
            </span>
            <span className="numeric w-8 text-right text-xs font-semibold tabular-nums text-foreground-strong">
              {acknowledgeOverdue}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised"
              role="meter"
              aria-label="Resolve overdue proportion"
              aria-valuenow={Math.round(resolveRatio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="block h-full bg-danger transition-[width] duration-medium"
                style={{ width: `${resolveRatio * 100}%` }}
              />
            </span>
            <span className="numeric w-8 text-right text-xs font-semibold tabular-nums text-foreground-strong">
              {resolveOverdue}
            </span>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-[1.5] text-muted-strong">
        Resolve overdue escalates to DICT Director per the SLA policy.
      </p>
    </Card>
  );
}
