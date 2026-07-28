"use client";

import {
  CheckCircle2,
  Clock,
  Circle,
  Cog,
  CircleCheck,
  AlertOctagon,
} from "lucide-react";
import { Badge, type BadgeProps } from "./Badge";

/*
 * StatusPill — typed wrapper for complaint status states. Maps each state
 * to a tone that's distinct from the brand accent (so "Acknowledged" no
 * longer reads as "the brand colour"). Each state also pairs with an icon.
 *
 * State machine references:
 *   Submitted → Acknowledged → In Progress → Resolved → Closed
 */
export type ComplaintStatus =
  | "Submitted"
  | "Acknowledged"
  | "In Progress"
  | "Resolved"
  | "Closed";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "brand";

interface StatusMeta {
  tone: BadgeProps["tone"];
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const META: Record<ComplaintStatus, StatusMeta> = {
  Submitted: { tone: "neutral", icon: Circle, label: "Submitted" },
  Acknowledged: { tone: "info", icon: Clock, label: "Acknowledged" },
  "In Progress": { tone: "warning", icon: Cog, label: "In progress" },
  Resolved: { tone: "success", icon: CircleCheck, label: "Resolved" },
  Closed: { tone: "neutral", icon: CheckCircle2, label: "Closed" },
};

export function StatusPill({
  status,
  className = "",
}: {
  status: ComplaintStatus | string;
  className?: string | undefined;
}) {
  const meta = META[status as ComplaintStatus] ?? META.Submitted;
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone} leadingIcon={<Icon className="h-3 w-3" />} className={className}>
      {meta.label}
    </Badge>
  );
}

/* Optional alias when the project wants the danger-tone for SLAs that are
   overdue relative to a specific state. */
export function OverduePill({ className = "" }: { className?: string | undefined }) {
  return (
    <Badge tone="danger" leadingIcon={<AlertOctagon className="h-3 w-3" />} className={className}>
      Overdue
    </Badge>
  );
}
