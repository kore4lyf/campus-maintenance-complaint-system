"use client";

import { AlertTriangle } from "lucide-react";

interface QueueRibbonProps {
  escalatedCount: number;
}

export function QueueRibbon({ escalatedCount }: QueueRibbonProps) {
  if (escalatedCount === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="font-medium">
        {escalatedCount} complaint{escalatedCount === 1 ? "" : "s"} with SLA breaches in the last hour
      </span>
    </div>
  );
}
