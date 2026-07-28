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

/*
 * Chart palette — anchored to the project severity tokens so a chart
 * of "Volume by Severity" reads as the same colours as the badges
 * elsewhere in the app. Categories fall back to a brand-tinted
 * sequence that never bleeds into the navy/gold brand.
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
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-foreground-strong">{label}</p>
      <p className="numeric mt-0.5 text-xs text-muted-strong">
        {value} {value === 1 ? "complaint" : "complaints"}
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
}: BarChartCardProps) {
  return (
    <Card padding="lg" variant="surface">
      <SectionHeader eyebrow={eyebrow} title={title} meta={axisHint} />
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised text-muted-strong">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted-strong">{emptyMessage}</p>
        </div>
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
                cursor={{ fill: "var(--color-brand-soft)", opacity: 0.1 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
                {data.map((entry, index) => (
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
