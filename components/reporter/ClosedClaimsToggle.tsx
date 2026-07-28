"use client";

import { Archive } from "lucide-react";
import { Checkbox } from "@/components/ui/Field";

interface ClosedClaimsToggleProps {
  includeClosed: boolean;
  onToggle: (includeClosed: boolean) => void;
}

export function ClosedClaimsToggle({
  includeClosed,
  onToggle,
}: ClosedClaimsToggleProps) {
  return (
    <Checkbox
      checked={includeClosed}
      onChange={(e) => onToggle(e.target.checked)}
      label={
        <span className="inline-flex items-center gap-1.5">
          <Archive className="h-3.5 w-3.5 text-muted-strong" aria-hidden="true" />
          Show closed complaints
        </span>
      }
      description="Resolves and past-window closure."
    />
  );
}
