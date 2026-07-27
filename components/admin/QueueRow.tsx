"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";

interface QueueRowProps {
  complaint: {
    _id: string;
    status: string;
    priority: string;
    description: string;
    categoryName: string | null;
    locationName: string | null;
    slaAcknowledgeBy: string;
    slaResolveBy: string;
    createdAt: string;
    breachKind: "none" | "acknowledge_overdue" | "resolve_overdue";
    overdueMs: number;
    currentAssignee: { assignedToTechId: string; assignedToName: string } | null;
  };
  onSelect: (complaint: QueueRowProps["complaint"]) => void;
}

const STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-muted/15 text-muted",
  Acknowledged: "bg-accent/15 text-accent",
  "In Progress": "bg-warning/15 text-warning",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted/15 text-muted",
};

const BREACH_BORDER: Record<string, string> = {
  none: "border-border",
  acknowledge_overdue: "border-danger",
  resolve_overdue: "border-danger",
};

export function QueueRow({ complaint, onSelect }: QueueRowProps) {
  const shortDescription =
    complaint.description.length > 120
      ? complaint.description.slice(0, 120) + "..."
      : complaint.description;

  const borderColor = BREACH_BORDER[complaint.breachKind] ?? "border-border";

  return (
    <button
      onClick={() => onSelect(complaint)}
      className={`w-full rounded-lg border-l-4 ${borderColor} bg-surface-raised p-4 text-left shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[complaint.status] ?? "bg-muted/15 text-muted"}`}
            >
              {complaint.status}
            </span>
            <SeverityBadge severity={complaint.priority as "Critical" | "High" | "Medium" | "Low"} />
          </div>

          <p className="mt-2 text-sm font-medium text-foreground">
            {complaint.categoryName ?? "Complaint"}
            {complaint.locationName ? (
              <span className="text-muted-strong">
                {" "}
                &middot; {complaint.locationName}
              </span>
            ) : null}
          </p>

          <p className="mt-1 text-sm text-muted-strong">{shortDescription}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>
              {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                addSuffix: true,
              })}
            </span>
            {complaint.breachKind !== "none" ? (
              <span className="text-danger font-medium">
                {complaint.breachKind === "acknowledge_overdue"
                  ? "Acknowledgement overdue"
                  : "Resolution overdue"}{" "}
                by {formatOverdueDuration(complaint.overdueMs)}
              </span>
            ) : (
              <span>
                Resolve by{" "}
                {formatDistanceToNowStrict(new Date(complaint.slaResolveBy), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          {complaint.currentAssignee ? (
            <span className="text-xs text-muted-strong">
              {complaint.currentAssignee.assignedToName}
            </span>
          ) : (
            <span className="text-xs text-warning font-medium">Unassigned</span>
          )}
        </div>
      </div>
    </button>
  );
}
