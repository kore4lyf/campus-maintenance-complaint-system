"use client";

interface NumericCardProps {
  label: string;
  value: number | string | null;
  subtitle?: string;
  emptyMessage?: string;
}

export function NumericCard({ label, value, subtitle, emptyMessage = "N/A" }: NumericCardProps) {
  const displayValue = value === null || value === undefined ? emptyMessage : value;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <p className="text-xs font-medium text-muted-strong">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{displayValue}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-strong">{subtitle}</p>}
    </div>
  );
}
