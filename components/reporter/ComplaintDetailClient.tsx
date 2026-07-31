"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  Camera,
  ClipboardList,
  Clock4,
  Info,
  Link as LinkIcon,
  MapPin,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { StatusPill } from "@/components/ui/StatusPill";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { SlaPanel } from "@/components/reporter/SlaPanel";
import { ComplaintTimeline } from "@/components/reporter/ComplaintTimeline";
import { H1, Kicker, Supporting } from "@/components/ui/type";

/*
 * ComplaintDetailClient — Apple-tier detail page for a single complaint.
 *
 * Aesthetic brief:
 *   - Apple's frame-first instinct: the page is a single 760 px column
 *     sitting on a `surface-raised` band that contrasts the page bg.
 *     The top hero strip has the kicker / h1 / chips + meta cluster on
 *     a raised band; everything below sits on a white surface with
 *     hairline-divided sections.
 *   - Nike's high-contrast hierarchy: a single accent gold dot per
 *     screen (status chip kicker), severity is bright (red/orange) but
 *     reserved, status progression carries colour via the timeline
 *     node — never via big surface fills.
 *   - Astryx token alignment: every gap is a multiple of 8 px;
 *     heads use the Astryx display ladder (text-2xl ... text-3xl);
 *     body is the in-app body scale (16 px / leading 1.55);
 *     hairline dividers (`border-border`) replace the old `gap-3` and
 *     `space-y-*` rhythm; hover/tap micro-interactions are wired
 *     (subtle -translate-y-0.5 + shadow-sm + tone transition).
 *
 * Composition:
 *   1. <HeroStrip>  — kicker + title + chips + meta + share-link affordance.
 *   2. <SlaPanel>   — 2-up timer tiles with hairline progress bars.
 *   3. <DescriptionCard> — blockquoted description on `surface-raised`.
 *   4. <PhotosCard>  — justified 2/3-column photo grid w/ hover-lift.
 *   5. <TimelineCard> — full-bleed timeline on `surface-raised` band.
 *
 * No new tokens. No new colours. Brand identity stays locked.
 */

interface ComplaintDetail {
  _id: string;
  status: string;
  slaAcknowledgeBy: string;
  slaResolveBy: string;
  description: string;
  photoUrls?: string[];
  createdAt: string;
  priority?: "Critical" | "High" | "Medium" | "Low";
  categoryName?: string;
  locationName?: string;
  systemType?: string;
}

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

interface ComplaintDetailClientProps {
  complaintId: string;
  initialComplaint: ComplaintDetail;
  initialTimeline: TimelineEntry[];
}

/* ---------- Hero strip ---------- */

function HeroStrip({
  complaint,
  isFinalState,
}: {
  complaint: ComplaintDetail;
  isFinalState: boolean;
}) {
  // Pre-compute the share URL once per render so the copy-link button
  // does not read `window.location.href` at runtime (server-safe).
  const shareUrl = useMemo(() => {
    return `/complaints/${complaint._id}`;
  }, [complaint._id]);

  function handleShareClick() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${shareUrl}`;
    try {
      void navigator.clipboard?.writeText(url);
      toast.success("Copied");
    } catch {
      toast("Could not copy link", {
        description: url,
      });
    }
  }

  return (
    <section
      aria-label="Complaint summary"
      className="relative overflow-hidden"
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={complaint.status} />
            {complaint.priority ? (
              <SeverityBadge severity={complaint.priority} />
            ) : null}
            {complaint.categoryName ? (
              <CategoryBadge
                name={complaint.categoryName}
                systemType={complaint.systemType ?? "Other"}
              />
            ) : null}
            {isFinalState ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success-strong ring-1 ring-inset ring-success/30">
                Final state
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <Kicker>Complaint #{complaint._id.slice(-6).toUpperCase()}</Kicker>
            <H1 variant="compact">
              {complaint.categoryName ?? "Maintenance complaint"}
              {complaint.locationName ? (
                <span className="ml-2 font-medium text-muted-strong">
                  · {complaint.locationName}
                </span>
              ) : null}
            </H1>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-strong">
            <p className="inline-flex items-center gap-1.5 text-muted-strong">
              <Calendar className="h-3.5 w-3.5 text-muted-strong" aria-hidden="true" />
              <span>Submitted</span>
              <span className="numeric font-medium text-foreground-strong">
                {format(new Date(complaint.createdAt), "PPP")}
              </span>
              <span aria-hidden="true">·</span>
              <span className="numeric">
                {format(new Date(complaint.createdAt), "p")}
              </span>
            </p>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleShareClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-muted-strong transition-[color,border-color] duration-fast hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Copy direct link
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
            Visible to you, your assigned technician, and DICT staff.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Photos ---------- */

function PhotoGrid({ urls }: { urls: string[] }) {
  const valid = urls.filter(Boolean);
  if (valid.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-strong">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted/15 text-muted-strong">
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground-strong">
            No photos attached
          </p>
          <p className="mt-1 text-muted-strong">
            Did not attach any photos when you filed this. If a technician
            uploaded a proof-of-fix photo, find it in the status timeline
            below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul
      role="list"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {valid.map((url, idx) => (
        <li
          key={url}
          className="group/photo relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-raised transition-[border-color,transform] duration-fast hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
        >
          <ImageLightbox
            src={url}
            alt={`Attachment ${idx + 1} for this complaint`}
          />
        </li>
      ))}
    </ul>
  );
}

/* ---------- Inline-fact strip (location, time, ticket meta) ---------- */

function MetaFacts({ complaint }: { complaint: ComplaintDetail }) {
  const items = [
    complaint.locationName
      ? { Icon: MapPin, label: "Location", value: complaint.locationName }
      : null,
    complaint.categoryName
      ? { Icon: ClipboardList, label: "Category", value: complaint.categoryName }
      : null,
    complaint.priority
      ? { Icon: Timer, label: "Severity", value: complaint.priority }
      : null,
  ].filter((item): item is { Icon: typeof MapPin; label: string; value: string } =>
    item !== null,
  );

  if (items.length === 0) return null;

  return (
    <ul
      role="list"
      className="grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      {items.map(({ Icon, label, value }, idx) => (
        <li
          key={`${label}-${idx}`}
          className="flex items-start gap-3 px-4 py-3 first:pt-3 last:pb-3 sm:py-4"
        >
          <span
            className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-strong">
              {label}
            </p>
            <p className="numeric mt-1 truncate text-base font-semibold tracking-[-0.005em] text-foreground-strong">
              {value}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Main ---------- */

export function ComplaintDetailClient({
  complaintId,
  initialComplaint,
  initialTimeline,
}: ComplaintDetailClientProps) {
  const { data: complaintData } = useQuery<ComplaintDetail>({
    queryKey: ["complaint", complaintId],
    queryFn: async () => {
      const res = await fetch(`/api/complaints/${complaintId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    initialData: initialComplaint,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const { data: timelineData } = useQuery<TimelineEntry[]>({
    queryKey: ["complaint-timeline", complaintId],
    queryFn: async () => {
      const res = await fetch(`/api/complaints/${complaintId}/timeline`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    initialData: initialTimeline,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const complaint = complaintData ?? initialComplaint;
  const timeline = timelineData ?? initialTimeline;
  const photoUrls = (complaint.photoUrls ?? []).filter(Boolean);

  // Date.now() here is intentional: the deadline-vs-now semantic is asked
  // of the card at SSR time so the page paints with the correct overdue
  // state. The TanStack Query poll below re-renders the component every
  // 10 s, so the comparison stays fresh.
  // eslint-disable-next-line react-hooks/purity
  const overdue =
    new Date(complaint.slaAcknowledgeBy).getTime() < Date.now() &&
    complaint.status === "Submitted";
  const isFinalState =
    complaint.status === "Resolved" || complaint.status === "Closed";

  return (
    <article className="w-full space-y-6">
      {/* ---------- 1. Hero strip ---------- */}
      <Card
        padding="lg"
        variant="surface"
        className="relative isolate overflow-hidden"
      >
        {/* Soft brand gradient that fades from the upper-left corner
            into the card. Stays brand-respecting: opacity < 0.05, only
            one per surface. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-accent-soft/30 via-transparent to-transparent"
        />
        <HeroStrip complaint={complaint} isFinalState={isFinalState} />
      </Card>

      {/* ---------- 2. SLA panel ---------- */}
      <Card
        padding="md"
        variant="surface"
        className="border-border-strong/50 transition-[border-color] duration-fast hover:border-border-strong"
      >
        <header className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong">
              Service-level agreement
            </p>
            <p className="mt-1 text-base font-semibold tracking-[-0.005em] text-foreground-strong">
              Two deadlines DICT has to honour.
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 text-xs text-muted-strong sm:inline-flex">
            <Info className="h-3 w-3" aria-hidden="true" />
            Auto-refreshes every 10s
          </span>
        </header>

        <SlaPanel
          acknowledgeLabel="Acknowledge"
          acknowledgeDeadline={complaint.slaAcknowledgeBy}
          resolveLabel="Resolve"
          resolveDeadline={complaint.slaResolveBy}
          isTerminal={isFinalState}
          caption={
            overdue ? (
              <span className="numeric font-medium text-danger-strong">
                ⚠ Acknowledgement overdue — DICT escalation will fire on the
                next SLA sweep.
              </span>
            ) : (
              <span>
                Times relative to your submission timestamp. DICT is
                notified the moment you press submit.
              </span>
            )
          }
        />
      </Card>

      {/* ---------- 3. Meta facts strip ---------- */}
      <MetaFacts complaint={complaint} />

      {/* ---------- 4. Description card ---------- */}
      <Card padding="lg" variant="surface">
        <SectionHeader
          eyebrow="What you reported"
          title="Description"
          meta={
            <span className="numeric text-xs text-muted-strong">
              {complaint.description.length.toLocaleString()} characters
            </span>
          }
        />
        <article className="relative">
          {/* Quoted blockquote on raised band — Apple blockquote pattern */}
          <blockquote className="rounded-r-lg border-l-2 border-brand bg-surface-raised px-5 py-4 text-sm leading-[1.7] text-foreground-strong sm:text-base">
            {complaint.description}
          </blockquote>
        </article>
      </Card>

      {/* ---------- 5. Photos card ---------- */}
      <Card padding="lg" variant="surface">
        <SectionHeader
          eyebrow="Your attachments"
          title="Photos you sent"
          meta={
            <span className="numeric text-xs text-muted-strong">
              {photoUrls.length} {photoUrls.length === 1 ? "photo" : "photos"}
            </span>
          }
        />
        <PhotoGrid urls={photoUrls} />
        <Supporting className="mt-3">
          Photos help the technician act faster. Cloudinary-hosted; the
          list above is the exact set linked to your submission.
        </Supporting>
      </Card>

      {/* ---------- 6. Timeline card ---------- */}
      <Card padding="lg" variant="surface" className="overflow-visible">
        <SectionHeader
          eyebrow="Audit log"
          title="Status timeline"
          meta={
            <span className="numeric text-xs text-muted-strong">
              {timeline.length} update{timeline.length !== 1 ? "s" : ""}
            </span>
          }
        />
        <ComplaintTimeline entries={timeline} />
      </Card>
    </article>
  );
}
