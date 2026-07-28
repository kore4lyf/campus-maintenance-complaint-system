"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface QueueRibbonProps {
  escalatedCount: number;
}

export function QueueRibbon({ escalatedCount }: QueueRibbonProps) {
  if (escalatedCount === 0) {
    return null;
  }

  return (
    <Card padding="md" variant="surface" className="border-danger/40 bg-danger/5 text-danger-strong">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-danger text-white">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {escalatedCount} complaint{escalatedCount === 1 ? "" : "s"} with SLA breaches
            in the last hour
          </p>
          <p className="mt-1 text-xs text-danger">
            Resolution overdue requires DICT Director review per the SLA policy.
          </p>
        </div>
      </div>
    </Card>
  );
}
