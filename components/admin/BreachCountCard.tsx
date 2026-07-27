"use client";

interface BreachCountCardProps {
  acknowledgeOverdue: number;
  resolveOverdue: number;
}

export function BreachCountCard({ acknowledgeOverdue, resolveOverdue }: BreachCountCardProps) {
  const total = acknowledgeOverdue + resolveOverdue;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <p className="text-xs font-medium text-muted-strong">SLA Breaches</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{total}</p>
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-strong">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1" />
          Acknowledge overdue: {acknowledgeOverdue}
        </p>
        <p className="text-xs text-muted-strong">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />
          Resolve overdue: {resolveOverdue}
        </p>
      </div>
    </div>
  );
}
