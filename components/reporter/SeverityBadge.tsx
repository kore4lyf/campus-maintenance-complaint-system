import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import type { Severity } from "@/lib/ai/schemas";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const STYLE_BY_SEVERITY: Record<
  Severity,
  { bg: string; text: string; Icon: typeof AlertTriangle; label: string }
> = {
  Critical: {
    bg: "bg-danger/15",
    text: "text-danger",
    Icon: AlertTriangle,
    label: "Critical",
  },
  High: {
    bg: "bg-warning/15",
    text: "text-warning",
    Icon: AlertCircle,
    label: "High",
  },
  Medium: {
    bg: "bg-accent/15",
    text: "text-accent",
    Icon: Info,
    label: "Medium",
  },
  Low: {
    bg: "bg-success/15",
    text: "text-success",
    Icon: CheckCircle2,
    label: "Low",
  },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const style = STYLE_BY_SEVERITY[severity];
  const { Icon, label, bg, text } = style;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text} ${className ?? ""}`}
      aria-label={`Severity ${label}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
