"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";
import { TechnicianQueueEmpty } from "@/components/technician/TechnicianQueueEmpty";

interface Complaint {
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
}

interface QueueResponse {
  data: Complaint[];
  meta: { nextCursor: string | null; hasMore: boolean };
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

export default function TechnicianQueuePage() {
  const { data: queueData, isLoading } = useQuery<QueueResponse>({
    queryKey: ["technician-queue"],
    queryFn: async () => {
      const response = await fetch("/api/technician/queue");
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const complaints = queueData?.data ?? [];

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Queue</h1>
        <p className="mt-2 text-muted-strong">
          Complaints assigned to you, sorted by SLA urgency.
        </p>
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">My Queue</h1>
      <p className="mt-2 text-muted-strong">
        Complaints assigned to you, sorted by SLA urgency.
      </p>

      <div className="mt-6">
        {complaints.length === 0 ? (
          <TechnicianQueueEmpty />
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint) => {
              const shortDescription =
                complaint.description.length > 120
                  ? complaint.description.slice(0, 120) + "..."
                  : complaint.description;

              const borderColor =
                BREACH_BORDER[complaint.breachKind] ?? "border-border";

              return (
                <Link
                  key={complaint._id}
                  href={`/technician/queue/${complaint._id}`}
                  className={`block rounded-lg border-l-4 ${borderColor} bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[complaint.status] ?? "bg-muted/15 text-muted"}`}
                        >
                          {complaint.status}
                        </span>
                        <SeverityBadge
                          severity={complaint.priority as "Critical" | "High" | "Medium" | "Low"}
                        />
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

                      <p className="mt-1 text-sm text-muted-strong">
                        {shortDescription}
                      </p>

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
                            {formatDistanceToNowStrict(
                              new Date(complaint.slaResolveBy),
                              { addSuffix: true },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
