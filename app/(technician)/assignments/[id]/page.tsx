"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";
import { TransitionForm } from "@/components/technician/TransitionForm";

interface StatusHistoryEntry {
  _id: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  photoUrl: string | null;
  changedAt: string;
  changedBySystem: boolean;
}

interface ComplaintDetail {
  _id: string;
  status: string;
  priority: string;
  description: string;
  photoUrls: string[];
  categoryName: string | null;
  locationName: string | null;
  reporterName: string;
  slaAcknowledgeBy: string;
  slaResolveBy: string;
  createdAt: string;
  breachKind: "none" | "acknowledge_overdue" | "resolve_overdue";
  overdueMs: number;
  allowedTransitions: string[];
  statusHistory: StatusHistoryEntry[];
  __v: number;
}

const STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-muted/15 text-muted",
  Acknowledged: "bg-accent/15 text-accent",
  "In Progress": "bg-warning/15 text-warning",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted/15 text-muted",
};

export default function TechnicianComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = React.use(params);

  const { data: complaintData, isLoading } = useQuery<{ data: ComplaintDetail }>({
    queryKey: ["technician-complaint", id],
    queryFn: async () => {
      const response = await fetch(`/api/technician/queue/${id}`);
      if (!response.ok) throw new Error("Failed to fetch complaint");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-raised" />
        <div className="h-64 animate-pulse rounded-lg bg-surface-raised" />
      </div>
    );
  }

  if (!complaintData?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-strong">Complaint not found or not assigned to you.</p>
        <button
          onClick={() => router.push("/technician/queue")}
          className="mt-4 text-brand hover:underline"
        >
          Back to queue
        </button>
      </div>
    );
  }

  const complaint = complaintData.data;

  return (
    <div>
      <button
        onClick={() => router.push("/technician/queue")}
        className="text-sm text-muted-strong hover:text-foreground mb-4"
      >
        &larr; Back to queue
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div>
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

            <h1 className="mt-3 text-xl font-semibold text-foreground">
              {complaint.categoryName ?? "Complaint"}
              {complaint.locationName ? (
                <span className="text-muted-strong">
                  {" "}
                  &middot; {complaint.locationName}
                </span>
              ) : null}
            </h1>
          </div>

          {complaint.breachKind !== "none" ? (
            <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
              {complaint.breachKind === "acknowledge_overdue"
                ? "Acknowledgement overdue"
                : "Resolution overdue"}{" "}
              by {formatOverdueDuration(complaint.overdueMs)}
            </div>
          ) : null}

          <div className="rounded-lg bg-surface-raised p-4">
            <h2 className="text-sm font-medium text-foreground mb-2">Description</h2>
            <p className="text-sm text-muted-strong whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-foreground">Reporter:</span>{" "}
              <span className="text-muted-strong">{complaint.reporterName}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Created:</span>{" "}
              <span className="text-muted-strong">
                {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <div>
              <span className="font-medium text-foreground">Acknowledge by:</span>{" "}
              <span className="text-muted-strong">
                {formatDistanceToNowStrict(new Date(complaint.slaAcknowledgeBy), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <div>
              <span className="font-medium text-foreground">Resolve by:</span>{" "}
              <span className="text-muted-strong">
                {formatDistanceToNowStrict(new Date(complaint.slaResolveBy), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {complaint.photoUrls.length > 0 ? (
            <div>
              <h2 className="text-sm font-medium text-foreground mb-2">Photos</h2>
              <div className="flex gap-2 overflow-x-auto">
                {complaint.photoUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Complaint photo ${i + 1}`}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {complaint.statusHistory.length > 0 ? (
            <div>
              <h2 className="text-sm font-medium text-foreground mb-2">Status History</h2>
              <div className="space-y-2">
                {complaint.statusHistory.map((entry) => (
                  <div
                    key={entry._id}
                    className="rounded-lg bg-surface-raised p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[entry.toStatus] ?? "bg-muted/15 text-muted"}`}
                      >
                        {entry.fromStatus} &rarr; {entry.toStatus}
                      </span>
                      <span className="text-muted">
                        {formatDistanceToNowStrict(new Date(entry.changedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {entry.note ? (
                      <p className="mt-1 text-muted-strong">{entry.note}</p>
                    ) : null}
                    {entry.photoUrl ? (
                      <img
                        src={entry.photoUrl}
                        alt="Status photo"
                        className="mt-2 h-16 w-16 rounded object-cover"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="sticky top-24 rounded-lg border border-border bg-surface p-4">
            <TransitionForm
              complaintId={complaint._id}
              currentStatus={complaint.status}
              allowedTransitions={complaint.allowedTransitions}
              expectedVersion={complaint.__v}
              onSuccess={() => {
                // Query will refetch automatically
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
