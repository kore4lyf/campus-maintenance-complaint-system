"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Circle,
  Clock,
  Cog,
  CircleCheck,
  CheckCircle2,
  PenLine,
  X,
  ZoomIn,
} from "lucide-react";
import { StatusPill, type ComplaintStatus } from "@/components/ui/StatusPill";

/*
 * ComplaintTimeline — Apple-style two-column history list.
 *
 * Visual structure (top → bottom):
 *
 *   ●─────┐
 *   Ack   │   Acknowledged
 *   in 4m │   system · 4 minutes ago
 *         │   ┃ Note from technician: awarded to Eng-team A.
 *         │   ┃  [thumbnail — click to enlarge]
 *   ●─────┘
 *
 * Each row uses a 32 × 32 numbered-status node colored by destination
 * tone, a hairline vertical connector spanning the row's height, and a
 * two-column body. The first column pairs StatusPill with the
 * current/final status; the second column pairs actor label, relative
 * timestamp, note body, and a small proof-photo thumb.
 *
 * Astryx mapping:
 *   - Vertical connector ≡ Astryx ListItem divider (--color-border, 2 px).
 *   - Status node ≡ Astryx icon-in-rounded-square pattern (--radius-element).
 *   - Note bubble ≡ --color-background-muted surface.
 *   - Photo thumb uses .focus-visible:ring-accent (gold) per discipline.
 */
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

const STATUS_META: Partial<
  Record<ComplaintStatus, { Icon: React.ComponentType<{ className?: string }>; tone: string }>
> = {
  Submitted: { Icon: Circle, tone: "neutral" },
  Acknowledged: { Icon: Clock, tone: "info" },
  "In Progress": { Icon: Cog, tone: "warning" },
  Resolved: { Icon: CircleCheck, tone: "success" },
  Closed: { Icon: CheckCircle2, tone: "neutral" },
};

const TONE_BG_CLASS: Record<string, string> = {
  neutral: "bg-muted/15 text-muted-strong ring-muted/20",
  info: "bg-info/15 text-info-strong ring-info/20",
  warning: "bg-warning/15 text-warning-strong ring-warning/20",
  success: "bg-success/15 text-success-strong ring-success/20",
  danger: "bg-danger/15 text-danger-strong ring-danger/20",
};

function actorLabel(entry: TimelineEntry): string {
  if (entry.changedBySystem) return "System automation";
  if (entry.changedByName) {
    const role = entry.changedByRole
      ? ` · ${entry.changedByRole.replace(/^dicht_/, "")}`
      : "";
    return `${entry.changedByName}${role}`;
  }
  return "Unknown";
}

function statusMetaFor(status: string): {
  Icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONE_BG_CLASS;
  label: string;
} {
  const known = STATUS_META[status as ComplaintStatus];
  if (known) {
    return { Icon: known.Icon, tone: known.tone as keyof typeof TONE_BG_CLASS, label: status };
  }
  return { Icon: PenLine, tone: "neutral", label: status };
}

function StatusNode({
  Icon,
  tone,
  step,
  isFirst,
  isLast,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONE_BG_CLASS;
  step: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center self-stretch">
      {/* Top connector (line above) */}
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-border ${isFirst ? "opacity-0" : ""}`}
      />
      {/* Status node */}
      <span
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset ${TONE_BG_CLASS[tone]}`}
        aria-label={`Step ${step}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      {/* Bottom connector (line below) */}
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-8 h-full w-px -translate-x-1/2 bg-border ${isLast ? "opacity-0" : ""}`}
      />
    </div>
  );
}

function ProofPhotoThumb({
  url,
  caption,
  idx,
}: {
  url: string;
  caption: string;
  idx: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View proof of fix photo ${idx + 1}`}
        className="group/photo relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-raised text-left transition-[transform,border-color,box-shadow] duration-fast hover:-translate-y-0.5 hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Image
          src={url}
          alt={`Proof of fix ${idx + 1}`}
          width={56}
          height={56}
          className="h-full w-full object-cover transition-transform duration-medium group-hover/photo:scale-105"
        />
        <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-brand/40 to-transparent opacity-0 transition-opacity duration-fast group-hover/photo:opacity-100">
          <ZoomIn className="m-1 h-3 w-3 text-white drop-shadow" aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Proof of fix photo ${idx + 1}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div
            className="relative max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-surface-overlay shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close preview"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/90 text-muted-strong backdrop-blur transition-colors hover:bg-surface hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <Image
              src={url}
              alt={`Proof of fix ${idx + 1}`}
              width={1200}
              height={900}
              className="max-h-[75vh] w-full object-contain"
            />
            <div className="border-t border-border bg-surface-raised px-5 py-4 text-center">
              <p className="text-sm font-medium text-foreground-strong">
                {caption}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ComplaintTimeline({ entries }: ComplaintTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-raised p-5 text-sm text-muted-strong">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted/15 text-muted-strong">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground-strong">
            No updates yet
          </p>
          <p className="mt-1">
            Status changes from DICT technicians and the assignment system
            will appear here as they happen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol
      role="list"
      className="flex flex-col gap-0"
      aria-label="Complaint status history"
    >
      {entries.map((entry, i) => {
        const meta = statusMetaFor(entry.toStatus);
        const isFirst = i === 0;
        const isLast = i === entries.length - 1;
        return (
          <li
            key={`${entry.changedAt}-${i}`}
            className="group/timeline flex gap-4 py-5 first:pt-1 last:pb-1"
            aria-current={isFirst ? "step" : undefined}
          >
            <StatusNode
              Icon={meta.Icon}
              tone={meta.tone}
              step={i + 1}
              isFirst={isFirst}
              isLast={isLast}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <header className="flex flex-wrap items-center gap-2.5">
                <StatusPill status={entry.toStatus} />
                <span className="text-xs font-medium text-muted-strong">
                  {entry.fromStatus} <span aria-hidden="true">→</span>{" "}
                  {entry.toStatus}
                </span>
                <time
                  className="numeric ml-auto text-[11px] uppercase tracking-[0.12em] text-muted"
                  dateTime={entry.changedAt}
                >
                  {formatDistanceToNowStrict(new Date(entry.changedAt), {
                    addSuffix: true,
                  })}
                </time>
              </header>

              <p className="text-xs leading-[1.5] text-muted-strong">
                <span className="font-medium text-foreground-strong">
                  {actorLabel(entry)}
                </span>
                <span className="mx-1.5 text-border">•</span>
                <span
                  title={format(new Date(entry.changedAt), "PPpp")}
                  className="cursor-help underline-offset-2 hover:underline"
                >
                  {format(new Date(entry.changedAt), "PP p")}
                </span>
              </p>

              {entry.note ? (
                <blockquote className="rounded-r-md border-l-2 border-brand bg-surface-raised px-4 py-3 text-sm leading-[1.55] text-foreground-strong">
                  {entry.note}
                </blockquote>
              ) : null}

              {entry.photoUrl ? (
                <div className="mt-1">
                  <ProofPhotoThumb
                    url={entry.photoUrl}
                    caption={`${entry.fromStatus} → ${entry.toStatus} · ${format(new Date(entry.changedAt), "PP p")}`}
                    idx={entries.slice(0, i + 1).filter((e) => e.photoUrl).length - 1}
                  />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
