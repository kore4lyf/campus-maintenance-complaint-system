"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";
import { toast } from "sonner";

interface Technician {
  _id: string;
  name: string;
  email: string;
}

interface ComplaintDetail {
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
}

interface AssignDialogProps {
  complaint: ComplaintDetail;
  technicians: Technician[];
  onClose: () => void;
  onAssigned: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-muted/15 text-muted",
  Acknowledged: "bg-accent/15 text-accent",
  "In Progress": "bg-warning/15 text-warning",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted/15 text-muted",
};

export function AssignDialog({
  complaint,
  technicians,
  onClose,
  onAssigned,
}: AssignDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTechId, setSelectedTechId] = useState(
    complaint.currentAssignee?.assignedToTechId ?? "",
  );
  const [note, setNote] = useState("");
  const [staleError, setStaleError] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(complaint.__v);

  const assignMutation = useMutation({
    mutationFn: async (payload: {
      complaintId: string;
      assignedToTechId: string;
      expectedVersion: number;
      note?: string;
    }) => {
      const response = await fetch("/api/admin/queue/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw json;
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Complaint assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      queryClient.invalidateQueries({ queryKey: ["recent-actions"] });
      onAssigned();
      onClose();
    },
    onError: (error: { error?: { code?: string } }) => {
      if (error?.error?.code === "stale_write") {
        setStaleError(true);
        toast.error("Version mismatch. Please refresh and try again.");
      } else {
        toast.error("Failed to assign complaint. Please try again.");
      }
    },
  });

  function handleAssign() {
    if (!selectedTechId) {
      toast.error("Please select a technician");
      return;
    }
    setStaleError(false);
    assignMutation.mutate({
      complaintId: complaint._id,
      assignedToTechId: selectedTechId,
      expectedVersion: currentVersion,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  }

  function handleRefresh() {
    setStaleError(false);
    onAssigned();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Complaint Detail
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            &times;
          </button>
        </div>

        <div className="mt-4 space-y-4">
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

          <div className="text-sm text-muted-strong">
            <p>
              <span className="font-medium text-foreground">Category:</span>{" "}
              {complaint.categoryName ?? "Unknown"}
            </p>
            <p>
              <span className="font-medium text-foreground">Location:</span>{" "}
              {complaint.locationName ?? "Unknown"}
            </p>
            <p>
              <span className="font-medium text-foreground">Created:</span>{" "}
              {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>

          {complaint.breachKind !== "none" ? (
            <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
              {complaint.breachKind === "acknowledge_overdue"
                ? "Acknowledgement overdue"
                : "Resolution overdue"}{" "}
              by {formatOverdueDuration(complaint.overdueMs)}
            </div>
          ) : null}

          <div className="rounded-lg bg-surface-raised p-3">
            <p className="text-sm text-muted-strong">{complaint.description}</p>
          </div>

          {complaint.photoUrls.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              {complaint.photoUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Complaint photo ${i + 1}`}
                  className="h-20 w-20 rounded-md object-cover"
                />
              ))}
            </div>
          ) : null}

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">
              Assign to Technician
            </h3>

            {complaint.currentAssignee ? (
              <p className="text-xs text-muted-strong mb-2">
                Currently assigned to: {complaint.currentAssignee.assignedToName}
              </p>
            ) : (
              <p className="text-xs text-warning mb-2">Currently unassigned</p>
            )}

            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select a technician</option>
              {technicians.map((tech) => (
                <option key={tech._id} value={tech._id}>
                  {tech.name} ({tech.email})
                </option>
              ))}
            </select>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (max 500 chars)"
              maxLength={500}
              className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground resize-none"
              rows={2}
            />

            {staleError ? (
              <div className="mt-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                Version mismatch. Another admin may have updated this complaint.
                <button
                  onClick={handleRefresh}
                  className="ml-2 underline hover:no-underline"
                >
                  Refresh
                </button>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-strong hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assignMutation.isPending || !selectedTechId}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
