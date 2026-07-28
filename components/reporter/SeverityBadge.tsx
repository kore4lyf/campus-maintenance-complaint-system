import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import type { Severity } from "@/lib/ai/schemas";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string | undefined;
}

interface SeverityMeta {
  tone: BadgeProps["tone"];
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const META: Record<Severity, SeverityMeta> = {
  Critical: { tone: "danger", Icon: AlertTriangle, label: "Critical" },
  High: { tone: "warning", Icon: AlertCircle, label: "High" },
  Medium: { tone: "info", Icon: Info, label: "Medium" },
  Low: { tone: "success", Icon: CheckCircle2, label: "Low" },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const meta = META[severity]!;
  const Icon = meta.Icon;
  return (
    <Badge tone={meta.tone} leadingIcon={<Icon className="h-3 w-3" />} className={className}>
      {meta.label}
    </Badge>
  );
}
