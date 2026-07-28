"use client";

import { AlertOctagon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface BreachCountCardProps {
  acknowledgeOverdue: number;
  resolveOverdue: number;
}

export function BreachCountCard({
  acknowledgeOverdue,
  resolveOverdue,
}: BreachCountCardProps) {
  const total = acknowledgeOverdue + resolveOverdue;

  return (
    <Card padding="md" className="overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-strong">
            SLA breaches
          </p>
          <p className="numeric mt-3 text-4xl font-semibold tracking-tight text-danger-strong">
            {total}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger">
          <AlertOctagon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="flex items-center gap-2 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-warning" />
          <span className="text-muted-strong">Acknowledge overdue:</span>
          <span className="numeric font-semibold text-foreground-strong">
            {acknowledgeOverdue}
          </span>
        </p>
        <p className="flex items-center gap-2 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-danger" />
          <span className="text-muted-strong">Resolve overdue:</span>
          <span className="numeric font-semibold text-foreground-strong">
            {resolveOverdue}
          </span>
        </p>
      </div>
    </Card>
  );
}
