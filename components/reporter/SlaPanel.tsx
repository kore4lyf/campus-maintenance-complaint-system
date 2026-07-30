"use client";

import type { ReactNode } from "react";
import { Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

/*
 * SlaPanel — Apple-style dual-deadline tile for the Reporter detail page.
 *
 * Why this exists:
 *   The legacy <SlaCountdown> renders two compact Badge chips side by
 *   side. They're hard to scan in <300 ms because the chip surface is
 *   too small to display a digit-scale timer + a label + a secondary
 *   note ("Acknowledge" / "Resolve"). The new design lifts the SLA
 *   affordance into its own two-up tile:
 *
 *   ┌────────────────────────────────────┐
 *   │  ◔ Acknowledge                       │
 *   │  in 4 h 12 m                          │
 *   │  DICT must triage within 4 h.        │
 *   │  [hairline progress: 0 / 4 h]         │
 *   └────────────────────────────────────┘
 *
 *   Each tile is a hairline-bordered white card on a `raised` band
 *   surface; the deadline headline uses 30-px font-semibold tabular
 *   figures with `tracking-[-0.025em]` for the Astryx display
 *   aesthetic; the hairline progress bar animates a fill that reflects
 *   time elapsed against the SLA constraint.
 *
 * Astryx mapping:
 *   - Card surface = .bg-surface + .border + .radius-container (16 px).
 *   - Icon block   = Astryx "icon-in-rounded-square" pattern.
 *   - Progress bar = --color-border-strong → brand/foo when running,
 *     danger/foo when nearing SLA breach.
 *   - Headline numerals share the --font-variant-numeric tabular setting
 *     via the .numeric utility so digits do not jiggle as time decrements.
 *
 * NO new colour tokens. NO brand accent on the panel itself — gold is
 * only used as a tiny dot to call out an "on track" state, never as a
 * surface fill.
 */

export type SlaState = "running" | "imminent" | "overdue" | "done";

export interface SlaPanelProps {
  acknowledgeLabel: string;
  acknowledgeDeadline: Date | string;
  resolveLabel: string;
  resolveDeadline: Date | string;
  /**
   * Optional junction content rendered between the two tiles on wide
   * screens (e.g. an arrow, a divider). On mobile the two tiles stack
   * and the junction is hidden.
   */
  junction?: ReactNode | undefined;
  /**
   * Optional helper text rendered below the tiles. Hidden when omitted.
   */
  caption?: ReactNode | undefined;
  /**
   * When the current status of the complaint is "done" (Resolved/Closed),
   * the timer tiles switch to a calm green-tinted summary mode. Both
   * deadlines are rendered as "Met in N h" rather than ticking.
   */
  isTerminal?: boolean | undefined;
}

function safeDate(input: Date | string): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function classifyState(
  deadline: Date,
  terminal: boolean,
): { state: SlaState; ratio: number; remainingMs: number } {
  if (terminal) {
    return { state: "done", ratio: 1, remainingMs: 0 };
  }
  const remainingMs = deadline.getTime() - Date.now();
  const totalMs = Math.max(remainingMs, 1);
  // Without an absolute creation timestamp we cannot compute the
  // elapsed portion of the SLA window with perfect accuracy. We use
  // a proxy: a 4-hour default deadline inverted from `remainingMs`,
  // clamped to [0, 1]. The bar reads as "remaining time" rather than
  // "elapsed", which is the right semantic for reporters.
  const fourHours = 4 * 60 * 60 * 1000;
  const ratio = Math.max(0, Math.min(1, totalMs / fourHours));
  if (remainingMs < 0) return { state: "overdue", ratio: 0, remainingMs };
  if (remainingMs < 60 * 60 * 1000) return { state: "imminent", ratio, remainingMs };
  return { state: "running", ratio, remainingMs };
}

function headline(state: SlaState, deadline: Date): string {
  if (state === "done") {
    return "Met";
  }
  const diff = formatDistanceToNowStrict(deadline, { addSuffix: false });
  return `in ${diff}`;
}

function tileToneClasses(state: SlaState): {
  border: string;
  iconBg: string;
  iconFg: string;
  dot: string;
  headline: string;
  bar: string;
  barBg: string;
} {
  switch (state) {
    case "running":
      return {
        border: "border-border",
        iconBg: "bg-info/10",
        iconFg: "text-info-strong",
        dot: "bg-info",
        headline: "text-foreground-strong",
        bar: "bg-info",
        barBg: "bg-surface-raised",
      };
    case "imminent":
      return {
        border: "border-warning/30",
        iconBg: "bg-warning/10",
        iconFg: "text-warning-strong",
        dot: "bg-warning",
        headline: "text-warning-strong",
        bar: "bg-warning",
        barBg: "bg-warning/10",
      };
    case "overdue":
      return {
        border: "border-danger/40",
        iconBg: "bg-danger/10",
        iconFg: "text-danger-strong",
        dot: "bg-danger",
        headline: "text-danger-strong",
        bar: "bg-danger",
        barBg: "bg-danger/10",
      };
    case "done":
      return {
        border: "border-success/30",
        iconBg: "bg-success/10",
        iconFg: "text-success-strong",
        dot: "bg-success",
        headline: "text-success-strong",
        bar: "bg-success",
        barBg: "bg-success/10",
      };
  }
}

function SlaTile({
  label,
  hint,
  state,
  ratio,
  headline: headlineText,
  terminal,
}: {
  label: string;
  hint: string;
  state: SlaState;
  ratio: number;
  headline: string;
  terminal: boolean;
}) {
  const t = tileToneClasses(state);
  const fillPct = terminal ? 100 : Math.max(8, ratio * 100);
  const stableFillPct = Math.round(fillPct * 100) / 100;

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-surface p-5 transition-[border-color,transform] duration-fast hover:-translate-y-0.5 hover:shadow-sm ${t.border}`}
      role="group"
      aria-label={`SLA tile: ${label}, ${state}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
            <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
            {label}
          </p>
          <p
            className={`numeric mt-2 text-2xl font-semibold tracking-[-0.025em] [line-height:1.1] ${t.headline}`}
          >
            {headlineText}
          </p>
        </div>
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${t.iconBg}`}
          aria-hidden="true"
        >
          <Clock className={`h-4 w-4 ${t.iconFg}`} />
        </span>
      </header>

      <p className="text-xs leading-[1.5] text-muted-strong">{hint}</p>

      {/* Hairline timeline bar */}
      <div
        className={`relative h-1 overflow-hidden rounded-full ${t.barBg}`}
        role="meter"
        aria-label={`${label} ${terminal ? "completed" : "remaining"} proportion`}
        aria-valuenow={Math.round(stableFillPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          className={`absolute inset-y-0 left-0 block ${t.bar} transition-[width] duration-medium`}
          style={{ width: `${stableFillPct}%` }}
          suppressHydrationWarning
        />
      </div>
    </article>
  );
}

export function SlaPanel({
  acknowledgeLabel,
  acknowledgeDeadline,
  resolveLabel,
  resolveDeadline,
  junction,
  caption,
  isTerminal = false,
}: SlaPanelProps) {
  const ackDate = safeDate(acknowledgeDeadline) ?? new Date();
  const resDate = safeDate(resolveDeadline) ?? new Date();
  const ack = classifyState(ackDate, isTerminal);
  const res = classifyState(resDate, isTerminal);

  return (
    <section
      className="flex flex-col gap-3"
      aria-label="Service level agreement timers"
    >
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <SlaTile
          label={acknowledgeLabel}
          hint="DICT's first response deadline. The clock starts the moment you submit."
          state={ack.state}
          ratio={ack.ratio}
          headline={headline(ack.state, ackDate)}
          terminal={isTerminal}
        />
        {junction ? (
          <div
            className="hidden items-center justify-center md:flex"
            aria-hidden="true"
          >
            {junction}
          </div>
        ) : (
          <ChevronRight
            className="mx-auto hidden h-4 w-4 text-muted-strong md:block"
            aria-hidden="true"
          />
        )}
        <SlaTile
          label={resolveLabel}
          hint="Target time for the technician to close out the fix."
          state={res.state}
          ratio={res.ratio}
          headline={headline(res.state, resDate)}
          terminal={isTerminal}
        />
      </div>
      {caption ? (
        <p className="flex flex-wrap items-center gap-1.5 px-1 text-xs leading-[1.5] text-muted-strong">
          {caption}
        </p>
      ) : null}
    </section>
  );
}
