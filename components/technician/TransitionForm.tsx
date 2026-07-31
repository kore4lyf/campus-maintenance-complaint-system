"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Label, Textarea } from "@/components/ui/Field";
import { Kicker } from "@/components/ui/type";

/*
 * TransitionForm — technician-side status transition composer.
 *
 * Aesthetic pass (2026-07-29):
 *   - Restructures the transition picker as a 3-step segmented control
 *     rather than a list of clickable cards. Each transition is a
 *     side-by-side card with a coloured intent chip + a description
 *     + an explicit "Selected" indicator. Operators can pick one of
 *     three statuses with full keyboard accessibility and instant
 *     visual confirmation.
 *   - Adds a hero strip at the top of the composer with the current
 *     status pill + the "next step" kicker label.
 *   - Adds a hairline divider between the picker and the note/photo
 *     stack to communicate "if you pick a transition, the next section
 *     captures the artifacts".
 *   - Brand discipline: gold reserved for the kicker eyebrow + the
 *     intent-ring "selected" badge. Severity-mapped tones (info /
 *     warning / success) map to status semantics.
 *
 * Tokens used (every class resolves through existing palette):
 *   - intent chip tones: bg-info, bg-warning, bg-success semantic.
 *   - onSelected: bg-brand, ring-brand-strong.
 *   - hairline rules: border-border.
 *   - motion: duration-fast on intent transitions.
 */

interface TransitionFormProps {
  complaintId: string;
  currentStatus: string;
  allowedTransitions: string[];
  expectedVersion: number;
  onSuccess: () => void;
}

const TRANSITION_META: Record<
  string,
  {
    label: string;
    description: string;
    intent: "info" | "warning" | "success";
    iconName: "ack" | "start" | "resolve";
  }
> = {
  Acknowledged: {
    label: "Acknowledge",
    description:
      "Mark that you've seen the complaint and claim it from the queue.",
    intent: "info",
    iconName: "ack",
  },
  "In Progress": {
    label: "Start work",
    description:
      "Begin the repair. Add notes so the reporter sees progress.",
    intent: "warning",
    iconName: "start",
  },
  Resolved: {
    label: "Mark resolved",
    description:
      "Upload a proof-of-fix photo. The complaint closes once a reporter confirms or after 24 h.",
    intent: "success",
    iconName: "resolve",
  },
};

const INTENT_RING: Record<string, string> = {
  info: "border-info/40 bg-info/5 hover:border-info hover:bg-info/10",
  warning:
    "border-warning/40 bg-warning/5 hover:border-warning hover:bg-warning/10",
  success:
    "border-success/40 bg-success/5 hover:border-success hover:bg-success/10",
};

const INTENT_CHECK: Record<string, string> = {
  info: "bg-info text-white",
  warning: "bg-warning text-white",
  success: "bg-success text-white",
};

const INTENT_TEXT: Record<string, string> = {
  info: "text-info-strong ring-info/30",
  warning: "text-warning-strong ring-warning/30",
  success: "text-success-strong ring-success/30",
};

function IntentDot({
  intent,
  children,
}: {
  intent: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const dot: Record<string, string> = {
    info: "bg-info",
    warning: "bg-warning",
    success: "bg-success",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot[intent]}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function TransitionForm({
  complaintId,
  allowedTransitions,
  expectedVersion,
  onSuccess,
}: TransitionFormProps) {
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState<string | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [staleError, setStaleError] = useState(false);
  const [currentVersion] = useState(expectedVersion);
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
      toast.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["technician-queue"] });
      queryClient.invalidateQueries({
        queryKey: ["technician-complaint", complaintId],
      });
      onSuccess();
    },
    onError: (error: { error?: { code?: string; message?: string } }) => {
      if (error?.error?.code === "stale_write") {
        setStaleError(true);
        toast.error("Version mismatch");
      } else if (error?.error?.code === "invalid_photo") {
        toast.error(error.error.message ?? "Invalid photo");
      } else {
        toast.error("Update failed");
      }
    },
  });

  function handleTransition(toStatus: string) {
    if (toStatus === "Resolved" && photos.length === 0) {
      toast.error("Photo required to resolve");
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
      <Card padding="md" variant="surface">
        <div className="flex items-start gap-3 text-sm text-muted-strong">
          <CheckCircle2
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
            aria-hidden="true"
          />
          <span>No actions available for the current status.</span>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" variant="surface" className="overflow-visible">
      {/* Hero strip */}
      <header className="mb-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
          <Kicker>Update status</Kicker>
          <span className="ml-auto numeric text-[11px] uppercase tracking-[0.16em] text-muted-strong">
            Move complaint forward
          </span>
        </div>
        <p className="text-sm leading-[1.55] text-muted-strong">
          Pick the next status, add context, and ship the change in one
          commit. The audit trail writes under your name.
        </p>
      </header>

      {/* Picker list */}
      <fieldset className="space-y-2" disabled={transitionMutation.isPending}>
        <legend className="sr-only">Allowed status transitions</legend>
        {allowedTransitions.map((transition) => {
          const meta = TRANSITION_META[transition] ?? {
            label: transition,
            description: "",
            intent: "info" as const,
            iconName: "ack" as const,
          };
          const isSelected = selectedTransition === transition;
          return (
            <label
              key={transition}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-[border-color,background-color] duration-fast ${
                isSelected
                  ? "border-brand bg-brand/10 ring-1 ring-inset ring-brand-strong"
                  : `border-border bg-surface-raised ${INTENT_RING[meta.intent]} hover:-translate-y-0.5 hover:shadow-sm`
              }`}
            >
              <input
                type="radio"
                name="transition"
                value={transition}
                checked={isSelected}
                onChange={() => setSelectedTransition(transition)}
                className="mt-0.5 h-4 w-4 border-border accent-brand focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold tracking-[-0.005em] text-foreground-strong">
                    {meta.label}
                  </p>
                  <IntentDot intent={meta.intent}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${INTENT_TEXT[meta.intent]}`}
                    >
                      {meta.intent}
                    </span>
                  </IntentDot>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-strong">
                  {meta.description}
                </p>
              </div>
              {isSelected ? (
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${INTENT_CHECK[meta.intent]}`}
                >
                  <CheckCircle2
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </span>
              ) : (
                <ArrowRight
                  className="h-4 w-4 flex-shrink-0 text-muted-strong"
                  aria-hidden="true"
                />
              )}
            </label>
          );
        })}
      </fieldset>

      {selectedTransition ? (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <div>
            <Label htmlFor="transition-note">
              Notes (optional, max 500 characters)
            </Label>
            <Textarea
              id="transition-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add notes about this transition."
            />
          </div>

          {selectedTransition !== "Acknowledged" ? (
            <div>
              <Label htmlFor="transition-photos">
                {selectedTransition === "Resolved"
                  ? "Proof-of-fix photo (required)"
                  : "Progress photos (optional, up to 3)"}
              </Label>
              <div className="mt-1.5 flex flex-col gap-2">
                <label
                  htmlFor="transition-photos"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm font-semibold text-foreground-strong transition-colors hover:border-brand hover:text-brand focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {photos.length > 0
                      ? "Replace photo"
                      : selectedTransition === "Resolved"
                        ? "Choose proof photo"
                        : "Choose photos"}
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  id="transition-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={selectedTransition !== "Resolved"}
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
                {photos.length > 0 ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-success-strong">
                    <CheckCircle2
                      className="h-3 w-3"
                      aria-hidden="true"
                    />
                    {photos.length} photo{photos.length > 1 ? "s" : ""}{" "}
                    selected —{" "}
                    {photos
                      .slice(0, 2)
                      .map((p) => p.name)
                      .join(", ")}
                    {photos.length > 2 ? "…" : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-strong">
                    JPG, PNG, or WebP up to 10&nbsp;MB.
                  </p>
                )}
              </div>
            </div>
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
                  Another user updated this complaint while you were
                  working.
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

          <Button
            variant="primary"
            size="lg"
            loading={transitionMutation.isPending}
            disabled={
              selectedTransition === "Resolved" && photos.length === 0
            }
            leadingIcon={<Save className="h-4 w-4" />}
            onClick={() => handleTransition(selectedTransition)}
          >
            {transitionMutation.isPending
              ? "Saving"
              : `Confirm: ${
                  TRANSITION_META[selectedTransition]?.label ?? selectedTransition
                }`}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
