"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";

interface TimelineEntry {
  fromStatus: string;
  toStatus: string;
  changedById?: string;
  changedByName?: string;
  changedByRole?: string;
  changedBySystem?: boolean;
  note?: string;
  photoUrl?: string;
  changedAt: string;
}

interface ComplaintTimelineProps {
  entries: TimelineEntry[];
}

const STATUS_COLOURS: Record<string, string> = {
  Submitted: "bg-muted/15 text-muted",
  Acknowledged: "bg-accent/15 text-accent",
  "In Progress": "bg-warning/15 text-warning",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted/15 text-muted",
};

function actorLabel(entry: TimelineEntry): string {
  if (entry.changedBySystem) {
    return `system (${entry.changedByRole ?? "system"})`;
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
      <p className="text-sm text-muted">
        No status history available yet.
      </p>
    );
  }

  return (
    <ol className="relative ml-3 border-l-2 border-border pl-6">
      {entries.map((entry, i) => (
        <li key={i} className="relative mb-6 last:mb-0">
          <div className="absolute -left-[1.625rem] top-1 flex h-3 w-3 items-center justify-center">
            <span
              className={`block h-2.5 w-2.5 rounded-full ${STATUS_COLOURS[entry.toStatus] ?? "bg-muted"}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[entry.toStatus] ?? "bg-muted/15 text-muted"}`}
            >
              {entry.fromStatus} &rarr; {entry.toStatus}
            </span>
            <span className="text-xs text-muted">
              {actorLabel(entry)}
            </span>
          </div>

          {entry.note ? (
            <p className="mt-1 text-sm text-foreground">{entry.note}</p>
          ) : null}

          {entry.photoUrl ? (
            <div className="mt-2">
              <ProofPhotoThumb
                url={entry.photoUrl}
                caption={`${entry.fromStatus} → ${entry.toStatus} · ${format(new Date(entry.changedAt), "PP p")}`}
              />
            </div>
          ) : null}

          <time className="mt-1 block text-xs text-muted">
            {formatDistanceToNowStrict(new Date(entry.changedAt), {
              addSuffix: true,
            })}
          </time>
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
        className="inline-block overflow-hidden rounded-md border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary proof photo */}
        <img
          src={url}
          alt="Proof of fix photo"
          className="h-12 w-12 object-cover"
        />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Proof of fix photo"
        >
          <div
            className="relative max-w-2xl rounded-xl bg-surface-overlay shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 rounded-full bg-surface-raised p-1 text-muted-strong transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary proof photo */}
            <img
              src={url}
              alt="Proof of fix photo"
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
            <p className="px-4 py-3 text-center text-sm text-muted-strong">
              {caption}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
