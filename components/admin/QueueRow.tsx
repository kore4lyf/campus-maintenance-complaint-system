"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Camera, ChevronRight, EyeOff } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";

/*
 * QueueRow — admin "Queue" surface.
 *
 * Spec 0014 §AC-3: the per-row chrome is no longer a <Card>. The row
 * now renders edge-to-edge with a 4px left accent (the breach-kind
 * color), a 1px hairline divider at the bottom (parent ul provides
 * `divide-y divide-border`), and a hover wash matching the new
 * <ComplaintRow> on the reporter surface.
 */

interface QueueRowProps {
  complaint: {
    _id: string;
    status: string;
    priority: string;
    description: string;
    photoUrls: string[];
    categoryName: string | null;
    locationName: string | null;
    slaAcknowledgeBy: string;
    slaResolveBy: string;
    createdAt: string;
    breachKind: "none" | "acknowledge_overdue" | "resolve_overdue";
    overdueMs: number;
    currentAssignee: { assignedToTechId: string; assignedToName: string } | null;
    __v: number;
    systemType?: string | undefined;
    isAnonymous?: boolean;
    reporterName?: string | null;
    reporterEmail?: string | null;
  };
  onSelect: (complaint: QueueRowProps["complaint"]) => void;
}

function breachAccent(kind: QueueRowProps["complaint"]["breachKind"]): string {
  if (kind === "acknowledge_overdue") return "border-l-danger";
  if (kind === "resolve_overdue") return "border-l-danger-strong";
  return "border-l-transparent";
}

export function QueueRow({ complaint, onSelect }: QueueRowProps) {
  const shortDescription =
    complaint.description.length > 140
      ? complaint.description.slice(0, 140) + "…"
      : complaint.description;

  return (
    <li
      className={`group cursor-pointer border-l-4 ${breachAccent(complaint.breachKind)} transition-colors duration-fast hover:bg-surface-raised/40 focus-within:bg-surface-raised/40`}
    >
      <button
        type="button"
        onClick={() => onSelect(complaint)}
        className="block w-full px-5 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        style={{ minHeight: "44px" }}
      >
        <div className="flex items-stretch gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill status={complaint.status} />
              <SeverityBadge
                severity={complaint.priority as "Critical" | "High" | "Medium" | "Low"}
              />
              {complaint.isAnonymous && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted-strong">
                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                  Anonymous
                </span>
              )}
              {complaint.systemType ? (
                <CategoryBadge
                  name={complaint.categoryName ?? "Complaint"}
                  systemType={complaint.systemType}
                />
              ) : null}
            </div>

            <p className="mt-3 text-sm font-semibold text-foreground-strong">
              <span>{complaint.categoryName ?? "Complaint"}</span>
              {complaint.locationName ? (
                <span className="ml-1 font-medium text-muted-strong">
                  · {complaint.locationName}
                </span>
              ) : null}
            </p>

            {!complaint.isAnonymous && complaint.reporterName ? (
              <p className="mt-1 text-xs text-muted-strong">
                {complaint.reporterName}
                {complaint.reporterEmail ? (
                  <span className="ml-1 text-muted">· {complaint.reporterEmail}</span>
                ) : null}
              </p>
            ) : null}

            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-strong">
              {shortDescription}
            </p>

            <div className="numeric mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {complaint.breachKind !== "none" ? (
                <span className="inline-flex items-center gap-1 font-medium text-danger">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
                  {complaint.breachKind === "acknowledge_overdue"
                    ? "Acknowledgement overdue"
                    : "Resolution overdue"}{" "}
                  · {formatOverdueDuration(complaint.overdueMs)}
                </span>
              ) : (
                <span className="text-muted">
                  Resolve by{" "}
                  {formatDistanceToNowStrict(new Date(complaint.slaResolveBy), {
                    addSuffix: true,
                  })}
                </span>
              )}
              <span className="text-muted">
                Submitted{" "}
                {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col items-end justify-between gap-3 text-right">
            {complaint.currentAssignee ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/15 px-2.5 py-1 text-xs font-medium text-muted-strong">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-success"
                />
                {complaint.currentAssignee.assignedToName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                <Camera className="h-3 w-3" aria-hidden="true" />
                Unassigned
              </span>
            )}
            <ChevronRight
              className="h-4 w-4 text-muted-strong transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand"
              aria-hidden="true"
            />
          </div>
        </div>
      </button>
    </li>
  );
}
