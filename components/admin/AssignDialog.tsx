"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { X, UserPlus, AlertTriangle, RefreshCw, Camera } from "lucide-react";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Field, Label, Select, Textarea } from "@/components/ui/Field";
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
  const [currentVersion] = useState(complaint.__v);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Assign ${complaint.categoryName ?? "complaint"}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand/85 p-4"
    >
      <Card
        padding="none"
        variant="overlay"
        className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto"
      >
        {/* ---------- Header strip ---------- */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
              Assign complaint
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground-strong">
              {complaint.categoryName ?? "Complaint"}
              {complaint.locationName ? (
                <span className="ml-1 font-medium text-muted-strong">
                  · {complaint.locationName}
                </span>
              ) : null}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assign dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-5 p-6">
          {/* ---------- Status row ---------- */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={complaint.status} />
            <SeverityBadge
              severity={
                complaint.priority as "Critical" | "High" | "Medium" | "Low"
              }
            />
            <span className="numeric ml-auto text-xs text-muted-strong">
              Filed{" "}
              {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* ---------- Breach banner ---------- */}
          {complaint.breachKind !== "none" ? (
            <Card
              padding="sm"
              variant="surface"
              className="border-danger/40 bg-danger/5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-danger text-white">
                  <AlertTriangle
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <p className="text-sm font-semibold text-danger-strong">
                    {complaint.breachKind === "acknowledge_overdue"
                      ? "Acknowledgement is overdue"
                      : "Resolution is overdue"}
                  </p>
                  <p className="numeric mt-0.5 text-xs text-danger">
                    {formatOverdueDuration(complaint.overdueMs)} past the SLA
                    deadline. DICT escalation may be required.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* ---------- Description ---------- */}
          <Card padding="md" variant="raised">
            <SectionHeader title="Reporter's description" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground-strong">
              {complaint.description}
            </p>
          </Card>

          {/* ---------- Photos ---------- */}
          {complaint.photoUrls.length > 0 ? (
            <Card padding="md" variant="surface">
              <SectionHeader
                eyebrow="Photos"
                title={`${complaint.photoUrls.length} attached`}
                meta={
                  <span className="text-xs text-muted-strong">Click to enlarge</span>
                }
              />
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {complaint.photoUrls.map((url, i) => (
                  <li
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-raised"
                  >
                    <Image
                      src={url}
                      alt={`Complaint photo ${i + 1}`}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <p className="inline-flex items-center gap-2 text-xs text-muted-strong">
              <Camera className="h-3 w-3" aria-hidden="true" />
              No photos attached to this complaint.
            </p>
          )}

          {/* ---------- Assignment form ---------- */}
          <Card padding="lg" variant="surface">
            <SectionHeader
              eyebrow="Assign to technician"
              title={
                complaint.currentAssignee
                  ? "Reassign"
                  : "Pick a technician"
              }
              meta={
                <span className="numeric text-xs text-muted-strong">
                  {technicians.length} on roster
                </span>
              }
            />

            <div className="space-y-5">
              <Field
                label="Technician"
                htmlFor="assign-technician"
                hint={
                  complaint.currentAssignee
                    ? `Currently assigned to ${complaint.currentAssignee.assignedToName}. Choosing a different technician reassigns the complaint and writes a new audit row.`
                    : "Unassigned complaints appear on the chosen technician's queue in real time."
                }
              >
                <Select
                  id="assign-technician"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                >
                  <option value="">Choose a technician…</option>
                  {technicians.map((tech) => (
                    <option key={tech._id} value={tech._id}>
                      {tech.name} · {tech.email}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Note for the technician"
                htmlFor="assign-note"
                hint="Optional. Up to 500 characters. Appears in the audit trail and the technician's queue."
              >
                <Textarea
                  id="assign-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything they should know before picking it up."
                />
              </Field>

              {staleError ? (
                <Card
                  padding="sm"
                  variant="surface"
                  className="border-warning/40 bg-warning/5"
                >
                  <p className="flex items-start gap-2 text-sm text-warning-strong">
                    <RefreshCw
                      className="mt-0.5 h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      Version mismatch — another admin updated this
                      complaint while you were working.
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className="ml-2 font-semibold underline hover:no-underline"
                      >
                        Refresh
                      </button>
                    </span>
                  </p>
                </Card>
              ) : null}
            </div>
          </Card>
        </div>

        {/* ---------- Footer ---------- */}
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
          <p className="text-xs text-muted-strong">
            Assignment is audited under the technician's name with a fresh{" "}
            <span className="numeric">__v</span> version.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={assignMutation.isPending}
              disabled={!selectedTechId}
              leadingIcon={<UserPlus className="h-4 w-4" />}
              onClick={handleAssign}
            >
              {assignMutation.isPending
                ? "Assigning"
                : selectedTechId
                  ? "Assign technician"
                  : "Pick a technician"}
            </Button>
          </div>
        </footer>
      </Card>
    </div>
  );
}
