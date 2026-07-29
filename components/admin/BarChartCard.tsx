"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Inbox } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/*
 * Chart palette — anchored to the project severity tokens so a chart
 * of "Volume by Severity" reads as the same colours as the badges
 * elsewhere in the app. Categories fall back to a brand-tinted
 * sequence that never bleeds into the navy/gold brand.
 *
 * Astryx mapping:
 *   - Axis ticks  use --color-text-secondary (Astryx --color-text-secondary).
 *   - Tooltip     uses --color-background-popover (Astryx default).
 *   - Chart bars  fill from the severity mapping (Astryx Banner statuses).
 *   - Empty       delegates to <EmptyState variant="compact"> from
 *                 project primitives, which already wrap Astryx Card defaults.
 */
const SEVERITY_FILLS: Record<string, string> = {
  Critical: "var(--color-danger)",
  High: "var(--color-warning)",
  Medium: "var(--color-info)",
  Low: "var(--color-success)",
};

const CATEGORY_FILLS = [
  "var(--color-brand)",
  "var(--color-accent)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-brand-soft)",
  "var(--color-accent-strong)",
];

function pickFill(name: string, fallbackPalette: string[]): string {
  if (SEVERITY_FILLS[name]) return SEVERITY_FILLS[name];
  // Deterministic palette index by hash so the same category renders the
  // same colour across renders.
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return fallbackPalette[hash % fallbackPalette.length] ?? fallbackPalette[0]!;
}

interface BarChartCardProps {
  title: string;
  eyebrow?: string;
  data: { name: string; count: number }[];
  emptyMessage?: string | undefined;
  height?: number;
  axisHint?: string;
  // Optional kicker call-out rendered next to the meta slot. Reserves the
  // single gold accent placement for this card surface.
  totalLabel?: string | undefined;
  totalValue?: number | undefined;
}

interface CustomTooltipPayload {
  active?: boolean | undefined;
  payload?: Array<{ value: number }> | undefined;
  label?: string | undefined;
}

function CustomTooltip({
  active,
  payload,
  label,
}: CustomTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div
      role="tooltip"
      className="rounded-md border border-border bg-surface px-3 py-2 text-left shadow-sm"
    >
      <p className="text-xs font-semibold text-foreground-strong">
        {label}
      </p>
      <p className="numeric mt-0.5 text-xs text-muted-strong">
        <span className="font-semibold text-foreground-strong">{value}</span>{" "}
        {value === 1 ? "complaint" : "complaints"}
      </p>
    </div>
  );
}

export function BarChartCard({
  title,
  eyebrow,
  data,
  emptyMessage = "No data for this period",
  height = 220,
  axisHint,
  totalLabel,
  totalValue,
}: BarChartCardProps) {
  const total =
    totalValue ?? data.reduce((acc, entry) => acc + entry.count, 0);

  return (
    <Card
      padding="lg"
      variant="surface"
      className="group transition-[border-color] duration-fast hover:border-border-strong"
    >
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-foreground-strong">
            {title}
          </h3>
        </div>
        {totalLabel || totalValue !== undefined ? (
          <div className="text-right">
            {totalLabel ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-strong">
                {totalLabel}
              </p>
            ) : null}
            <p className="numeric mt-0.5 text-2xl font-semibold tracking-[-0.01em] text-foreground-strong [line-height:1.05]">
              {total}
            </p>
          </div>
        ) : axisHint ? (
          <p className="text-xs text-muted-strong">{axisHint}</p>
        ) : null}
      </header>

      {data.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Inbox className="h-5 w-5" aria-hidden="true" />
            </span>
          }
          title={emptyMessage}
          description="Widen the time window or relax filters to populate this axis."
        />
      ) : (
        <div className="numeric" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
              barCategoryGap="22%"
            >
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-strong)",
                  fontFamily: "var(--font-sans)",
                }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={data.length > 4 ? -25 : 0}
                textAnchor={data.length > 4 ? "end" : "middle"}
                height={data.length > 4 ? 60 : 30}
              />
              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-strong)",
                  fontFamily: "var(--font-sans)",
                }}
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill: "var(--color-brand-soft)",
                  opacity: 0.12,
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={pickFill(entry.name, CATEGORY_FILLS)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
