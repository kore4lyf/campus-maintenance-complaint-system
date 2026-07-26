import { Clock } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

interface SlaCountdownProps {
  label: string;
  deadline: Date | string;
  className?: string;
}

function safeDeadline(input: Date | string): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function SlaCountdown({ label, deadline, className }: SlaCountdownProps) {
  const date = safeDeadline(deadline);
  if (!date) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted ${className ?? ""}`}
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
        <span>{label}: unknown</span>
      </span>
    );
  }
  const now = new Date();
  const isFuture = date.getTime() > now.getTime();
  const tone = isFuture ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger";
  const human = isFuture
    ? `in ${formatDistanceToNowStrict(date)}`
    : `${formatDistanceToNowStrict(date)} ago`;
  return (
    <span
      className={`tabular-nums inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${tone} ${className ?? ""}`}
      aria-label={`${label} deadline ${human}`}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      <span>
        {label}: {human}
      </span>
    </span>
  );
}
