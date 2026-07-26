"use client";

interface ClosedClaimsToggleProps {
  includeClosed: boolean;
  onToggle: (includeClosed: boolean) => void;
}

export function ClosedClaimsToggle({
  includeClosed,
  onToggle,
}: ClosedClaimsToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-strong">
      <input
        type="checkbox"
        checked={includeClosed}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
      />
      Show closed complaints
    </label>
  );
}
