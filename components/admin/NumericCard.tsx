"use client";

import { Card } from "@/components/ui/Card";

interface NumericCardProps {
  label: string;
  value: number | string | null;
  subtitle?: string | undefined;
  emptyMessage?: string | undefined;
}

export function NumericCard({ label, value, subtitle, emptyMessage = "N/A" }: NumericCardProps) {
  const displayValue = value === null || value === undefined ? emptyMessage : value;

  return (
    <Card padding="md" className="overflow-hidden">
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-strong">
          {label}
        </p>
        {subtitle ? (
          <span className="text-xs font-medium text-muted">{subtitle}</span>
        ) : null}
      </div>
      <p className="numeric mt-3 text-4xl font-semibold tracking-tight text-foreground-strong">
        {displayValue}
      </p>
    </Card>
  );
}
