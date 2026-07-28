"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { format } from "date-fns";
import { Camera } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { SlaCountdown } from "@/components/reporter/SlaCountdown";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { ComplaintTimeline } from "@/components/reporter/ComplaintTimeline";

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

  // Date.now() here is intentional: the deadline-vs-now semantic is asked
  // of the card at SSR time so the page paints with the correct
  // overdue state. The TanStack Query poll below re-renders the
  // component every 10 s, so the comparison stays fresh.
  // eslint-disable-next-line react-hooks/purity
  const overdue = new Date(complaint.slaAcknowledgeBy).getTime() < Date.now() &&
    complaint.status === "Submitted";

  return (
    <article className="mx-auto max-w-3xl">
      <Card padding="lg" variant="surface">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={complaint.status} />
            {complaint.priority ? (
              <SeverityBadge severity={complaint.priority} />
            ) : null}
            {complaint.systemType ? (
              <CategoryBadge
                name={complaint.categoryName ?? "Complaint"}
                systemType={complaint.systemType}
              />
            ) : null}
            <span className="numeric ml-auto text-xs text-muted-strong">
              Submitted {format(new Date(complaint.createdAt), "PP p")}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
              Submission
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground-strong">
              {complaint.categoryName ?? "Complaint"}
              {complaint.locationName ? (
                <span className="ml-1 font-medium text-muted-strong">
                  · {complaint.locationName}
                </span>
              ) : null}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlaCountdown
              label="Acknowledge"
              deadline={complaint.slaAcknowledgeBy}
              emphasize={overdue}
            />
            <SlaCountdown
              label="Resolve"
              deadline={complaint.slaResolveBy}
            />
          </div>
        </header>

        <hr className="my-6 border-border" />

        <SectionHeader eyebrow="Description" title="What was reported" />
        <p className="whitespace-pre-wrap rounded-lg bg-surface-raised p-4 text-sm leading-relaxed text-foreground-strong">
          {complaint.description}
        </p>

        {complaint.photoUrls && complaint.photoUrls.length > 0 ? (
          <>
            <hr className="my-6 border-border" />
            <SectionHeader
              eyebrow="Photos"
              title={`${complaint.photoUrls.length} photo${complaint.photoUrls.length !== 1 ? "s" : ""}`}
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {complaint.photoUrls.map((url) => (
                <li
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-raised"
                >
                  <Image
                    src={url}
                    alt="Complaint photo"
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      <Card padding="lg" variant="surface" className="mt-6">
        <SectionHeader
          eyebrow="History"
          title="Status timeline"
          meta={
            <span className="numeric text-xs text-muted-strong">
              {timeline.length} update{timeline.length !== 1 ? "s" : ""}
            </span>
          }
        />
        {complaint.photoUrls && complaint.photoUrls.length > 0 ? null : (
          <p className="mb-3 inline-flex items-center gap-2 text-xs text-muted-strong">
            <Camera className="h-3 w-3" aria-hidden="true" />
            No photos attached to this submission.
          </p>
        )}
        <ComplaintTimeline entries={timeline} />
      </Card>
    </article>
  );
}
