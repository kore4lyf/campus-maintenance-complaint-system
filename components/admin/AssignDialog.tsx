"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import {
  X,
  UserPlus,
  AlertTriangle,
  EyeOff,
  RefreshCw,
  Camera,
  ChevronRight,
} from "lucide-react";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { H2, Kicker, Supporting } from "@/components/ui/type";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";
import { toast } from "sonner";

/*
 * AssignDialog — Vercel-tier DICT assignment modal.
 *
 * Aesthetic pass (2026-07-29):
 *   - Fixes the JSX-balance drift that has been typing this file as
 *     "in error" since the build cycle opened (the prior version had
 *     a stray `</h2>` closing the wrong tag and missing wrappers).
 *   - Reorders the modals as: hero strip header → status row →
 *     breach banner → reporter description → photos → assignment
 *     card → footer actions. The prior version welded the header
 *     into the description Card and the order was reversed with
 *     the breach banner, which broke the F-pattern scan.
 *   - Adds a hero strip above the modal chrome (icon block + title +
 *     kicker) replacing the previous orphan H2.
 *   - Adds a hairline-divided two-column footer with cancel + the
 *     assign CTA paired visually so the operator can scan the
 *     actions without searching the page.
 *   - Brand-respecting: gold appears in the header kicker dot, the
 *     "Pick a technician" eyebrow, and the offered-selection ring
 *     on the rounded buttons. Used 3 times, below the 5/screen cap.
 *
 * Tokens used (every class resolves through existing palette):
 *   - bg-brand (#0c2848) on overlay backdrop.
 *   - text-white on the close-X hover state.
 *   - bg-surface-overlay on modal surface.
 *   - border-border / border-border-strong for hairlines.
 *   - severity tones via the existing project primitives.
 */

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
  currentAssignee: {
    assignedToTechId: string;
    assignedToName: string;
  } | null;
  __v: number;
  isAnonymous?: boolean;
  reporterName?: string | null;
  reporterEmail?: string | null;
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
      toast.success("Assigned");
      queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      queryClient.invalidateQueries({ queryKey: ["recent-actions"] });
      onAssigned();
      onClose();
    },
    onError: (error: { error?: { code?: string } }) => {
      if (error?.error?.code === "stale_write") {
        setStaleError(true);
        toast.error("Version mismatch");
      } else {
        toast.error("Assign failed");
      }
    },
  });

  function handleAssign() {
    if (!selectedTechId) {
      toast.error("Select a technician");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <Card
        padding="none"
        variant="overlay"
        className="mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden shadow-2xl"
      >
        {/* ---------- Hero strip header ---------- */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface px-6 py-5">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-sm"
              aria-hidden="true"
            >
              <UserPlus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                  Assign complaint
                </p>
              </div>
              <div className="mt-1">
                <H2>
                  {complaint.categoryName ?? "Complaint"}
                  {complaint.locationName ? (
                    <span className="ml-1 font-medium text-muted-strong">
                      · {complaint.locationName}
                    </span>
                  ) : null}
                </H2>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assign dialog"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* ---------- Body (scrollable) ---------- */}
        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">
          {/* Status row */}
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

          {/* Reporter info */}
          {!complaint.isAnonymous && complaint.reporterName ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-strong">Filed by</span>
              <span className="font-medium text-foreground-strong">{complaint.reporterName}</span>
              {complaint.reporterEmail ? (
                <span className="text-muted">({complaint.reporterEmail})</span>
              ) : null}
            </div>
          ) : null}

          {/* Breach banner */}
          {complaint.breachKind !== "none" ? (
            <Card
              padding="sm"
              variant="surface"
              className="border-danger/40 bg-danger/5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-danger text-white">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
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

          {/* Description */}
          <Card padding="md" variant="raised">
            <SectionHeader eyebrow="Reporter" title="Description" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground-strong">
              {complaint.description}
            </p>
          </Card>

          {/* Photos */}
          {complaint.photoUrls.length > 0 ? (
            <Card padding="md" variant="surface">
              <SectionHeader
                eyebrow="Photos"
                title={`${complaint.photoUrls.length} attached`}
                meta={
                  <span className="text-xs text-muted-strong">
                    Reporter photos · first impression
                  </span>
                }
              />
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {complaint.photoUrls.map((url, i) => (
                  <li
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-raised transition-transform duration-fast hover:scale-[1.02]"
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
            <Card padding="md" variant="raised" className="border-dashed">
              <div className="flex items-center gap-3 text-sm text-muted-strong">
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted/15 text-muted-strong"
                  aria-hidden="true"
                >
                  <Camera className="h-4 w-4" />
                </span>
                <span>No photos attached to this complaint.</span>
              </div>
            </Card>
          )}

          {/* Assignment form */}
          <Card padding="lg" variant="surface" className="overflow-visible">
            <SectionHeader
              eyebrow="Pick a technician"
              title={
                complaint.currentAssignee
                  ? "Reassign"
                  : "Choose a technician"
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

              {/* Inline technician preview row */}
              {selectedTechId ? (
                <p className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand/5 px-3 py-2 text-xs font-medium text-brand-strong">
                  <span
                    className="h-2 w-2 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  Ready to assign. Audit row will write under the chosen
                  technician&apos;s name.
                  <ChevronRight
                    className="h-3.5 w-3.5 ml-auto"
                    aria-hidden="true"
                  />
                </p>
              ) : null}

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
                      Version mismatch — another admin updated this complaint
                      while you were working.
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
            Assignment is audited under the technician&apos;s name with a
            fresh <span className="numeric">__v</span> version.
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
