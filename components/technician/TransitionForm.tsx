"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TransitionFormProps {
  complaintId: string;
  currentStatus: string;
  allowedTransitions: string[];
  expectedVersion: number;
  onSuccess: () => void;
}

const TRANSITION_LABELS: Record<string, string> = {
  Acknowledged: "Acknowledge",
  "In Progress": "Start Work",
  Resolved: "Mark Resolved",
};

const TRANSITION_DESCRIPTIONS: Record<string, string> = {
  Acknowledged: "Acknowledge this complaint to let the reporter know you are aware.",
  "In Progress": "Add notes and optional progress photos to show work is underway.",
  Resolved: "Upload a proof-of-fix photo to confirm the issue is resolved.",
};

export function TransitionForm({
  complaintId,
  currentStatus,
  allowedTransitions,
  expectedVersion,
  onSuccess,
}: TransitionFormProps) {
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [staleError, setStaleError] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(expectedVersion);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transitionMutation = useMutation({
    mutationFn: async (payload: {
      toStatus: string;
      expectedVersion: number;
      note?: string;
      photos?: File[];
    }) => {
      const formData = new FormData();
      formData.append(
        "body",
        JSON.stringify({
          toStatus: payload.toStatus,
          expectedVersion: payload.expectedVersion,
          ...(payload.note ? { note: payload.note } : {}),
        }),
      );

      if (payload.photos) {
        payload.photos.forEach((photo, index) => {
          formData.append(`photo${index}`, photo);
        });
      }

      const response = await fetch(
        `/api/technician/queue/${complaintId}/transition`,
        {
          method: "POST",
          body: formData,
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw json;
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["technician-queue"] });
      queryClient.invalidateQueries({
        queryKey: ["technician-complaint", complaintId],
      });
      onSuccess();
    },
    onError: (error: { error?: { code?: string } }) => {
      if (error?.error?.code === "stale_write") {
        setStaleError(true);
        toast.error("Version mismatch. Please refresh and try again.");
      } else if (error?.error?.code === "invalid_photo") {
        toast.error(error.error.message || "Invalid photo");
      } else {
        toast.error("Failed to update status. Please try again.");
      }
    },
  });

  function handleTransition(toStatus: string) {
    setSelectedTransition(toStatus);
    setStaleError(false);

    if (toStatus === "Resolved" && photos.length === 0) {
      toast.error("Proof-of-fix photo is required for Resolved status");
      return;
    }

    transitionMutation.mutate({
      toStatus,
      expectedVersion: currentVersion,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(photos.length > 0 ? { photos } : {}),
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const maxPhotos = selectedTransition === "Resolved" ? 1 : 3;
    setPhotos(files.slice(0, maxPhotos));
  }

  function handleRefresh() {
    setStaleError(false);
    onSuccess();
  }

  if (allowedTransitions.length === 0) {
    return (
      <div className="rounded-lg bg-surface-raised p-4 text-sm text-muted-strong">
        No actions available for the current status.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Update Status</h3>

      <div className="space-y-2">
        {allowedTransitions.map((transition) => (
          <button
            key={transition}
            onClick={() => setSelectedTransition(transition)}
            className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
              selectedTransition === transition
                ? "border-brand-500 bg-brand-500/10"
                : "border-border bg-surface-raised hover:bg-surface-raised/80"
            }`}
          >
            <span className="font-medium text-foreground">
              {TRANSITION_LABELS[transition] ?? transition}
            </span>
            <p className="mt-1 text-xs text-muted-strong">
              {TRANSITION_DESCRIPTIONS[transition]}
            </p>
          </button>
        ))}
      </div>

      {selectedTransition ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes (optional, max 500 chars)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground resize-none"
              placeholder="Add notes about this transition..."
            />
          </div>

          {selectedTransition !== "Acknowledged" ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {selectedTransition === "Resolved"
                  ? "Proof-of-fix photo (required)"
                  : "Progress photos (optional, max 3)"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple={selectedTransition !== "Resolved"}
                onChange={handlePhotoChange}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
              />
              {photos.length > 0 ? (
                <p className="mt-1 text-xs text-muted-strong">
                  {photos.length} photo(s) selected
                </p>
              ) : null}
            </div>
          ) : null}

          {staleError ? (
            <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
              Version mismatch. Another user may have updated this complaint.
              <button
                onClick={handleRefresh}
                className="ml-2 underline hover:no-underline"
              >
                Refresh
              </button>
            </div>
          ) : null}

          <button
            onClick={() => handleTransition(selectedTransition)}
            disabled={transitionMutation.isPending}
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {transitionMutation.isPending
              ? "Updating..."
              : TRANSITION_LABELS[selectedTransition] ?? selectedTransition}
          </button>
        </div>
      ) : null}
    </div>
  );
}
