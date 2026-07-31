import { Clock } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import type { BadgeProps } from "@/components/ui/Badge";

interface SlaCountdownProps {
  label: string;
  deadline: Date | string;
  emphasize?: boolean | undefined;
  className?: string | undefined;
}

function safeDeadline(input: Date | string): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function SlaCountdown({
  label,
  deadline,
  emphasize,
  className,
}: SlaCountdownProps) {
  const date = safeDeadline(deadline);
  if (!date) {
    return (
      <Badge tone="neutral" leadingIcon={<Clock className="h-3 w-3" />} className={className}>
        {label}: unknown
      </Badge>
    );
  }
  const now = new Date();
  const isFuture = date.getTime() > now.getTime();
  const isOverdue = !isFuture;
  const tone: BadgeProps["tone"] = emphasize
    ? "danger"
    : isFuture
      ? "info"
      : "neutral";
  const human = isOverdue
    ? `${formatDistanceToNowStrict(date)} overdue`
    : `in ${formatDistanceToNowStrict(date)}`;
  return (
    <Badge tone={tone} leadingIcon={<Clock className="h-3 w-3" />} className={className}>
      <span>
        {label}: <span className="numeric font-semibold">{human}</span>
      </span>
    </Badge>
  );
}
