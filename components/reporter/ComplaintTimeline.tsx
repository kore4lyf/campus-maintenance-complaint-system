"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { X } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";

interface TimelineEntry {
  fromStatus: string;
  toStatus: string;
  changedById: string | undefined;
  changedByName: string | undefined;
  changedByRole: string | undefined;
  changedBySystem: boolean;
  note: string | undefined;
  photoUrl: string | undefined;
  changedAt: string;
}

interface ComplaintTimelineProps {
  entries: TimelineEntry[];
}

function actorLabel(entry: TimelineEntry): string {
  if (entry.changedBySystem) {
    return "system";
  }
  if (entry.changedByName) {
    const role = entry.changedByRole
      ? ` (${entry.changedByRole.replace("dicht_", "")})`
      : "";
    return `${entry.changedByName}${role}`;
  }
  return "unknown";
}

export function ComplaintTimeline({ entries }: ComplaintTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-strong">
        No status history available yet. Updates from DICT technicians and
        the assignment system will appear here.
      </p>
    );
  }

  return (
    <ol className="relative ml-3 space-y-6 border-l-2 border-border pl-6">
      {entries.map((entry, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.875rem] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface ring-2 ring-border">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          </span>

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={entry.toStatus} />
              <span className="text-xs font-medium text-muted-strong">
                {entry.fromStatus} → {entry.toStatus}
              </span>
            </div>

            <p className="text-xs text-muted-strong">
              {actorLabel(entry)} ·{" "}
              <time className="numeric">
                {formatDistanceToNowStrict(new Date(entry.changedAt), {
                  addSuffix: true,
                })}
              </time>
            </p>

            {entry.note ? (
              <p className="rounded-md bg-surface-raised p-3 text-sm leading-relaxed text-foreground-strong">
                {entry.note}
              </p>
            ) : null}

            {entry.photoUrl ? (
              <ProofPhotoThumb
                url={entry.photoUrl}
                caption={`${entry.fromStatus} → ${entry.toStatus} · ${format(new Date(entry.changedAt), "PP p")}`}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ProofPhotoThumb({ url, caption }: { url: string; caption: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 overflow-hidden rounded-md border border-border bg-surface-raised text-left text-xs transition-[border-color,box-shadow] duration-200 hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary proof photo */}
        <img
          src={url}
          alt="Proof of fix photo"
          className="h-12 w-12 object-cover"
        />
        <span className="pr-3 font-medium text-muted-strong">View proof</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand/85 p-4"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Proof of fix photo"
        >
          <div
            className="relative max-w-2xl overflow-hidden rounded-xl bg-surface-overlay shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-muted-strong transition-colors hover:bg-surface hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary proof photo */}
            <img
              src={url}
              alt="Proof of fix photo"
              className="max-h-[70vh] w-full object-contain"
            />
            <p className="border-t border-border bg-surface-raised px-4 py-3 text-center text-sm text-muted-strong">
              {caption}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
