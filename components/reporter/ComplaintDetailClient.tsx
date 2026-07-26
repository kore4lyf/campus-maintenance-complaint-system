"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { SlaCountdown } from "@/components/reporter/SlaCountdown";
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
}

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

interface ComplaintDetailClientProps {
  complaintId: string;
  initialComplaint: ComplaintDetail;
  initialTimeline: TimelineEntry[];
}

const STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-muted/15 text-muted",
  Acknowledged: "bg-accent/15 text-accent",
  "In Progress": "bg-warning/15 text-warning",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted/15 text-muted",
};

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

  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-strong">
          Submission
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {complaint.categoryName ?? "Complaint"}
          {complaint.locationName ? (
            <span className="text-muted-strong">
              {" "}
              &middot; {complaint.locationName}
            </span>
          ) : null}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CategoryBadge
            name={complaint.categoryName ?? "Complaint"}
            systemType="Other"
          />
          {complaint.priority ? (
            <SeverityBadge severity={complaint.priority} />
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[complaint.status] ?? "bg-muted/15 text-muted"}`}
          >
            {complaint.status}
          </span>
          <span className="text-xs text-muted-strong">
            Submitted {format(new Date(complaint.createdAt), "PP p")}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">SLA deadlines</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SlaCountdown
              label="Acknowledge by"
              deadline={complaint.slaAcknowledgeBy}
            />
            <SlaCountdown
              label="Resolve by"
              deadline={complaint.slaResolveBy}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <p className="whitespace-pre-wrap rounded-md bg-surface px-3 py-2 text-sm text-foreground">
            {complaint.description}
          </p>
        </div>

        {complaint.photoUrls && complaint.photoUrls.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">Photos</h2>
            <ul className="flex flex-wrap gap-3">
              {complaint.photoUrls.map((url) => (
                <li
                  key={url}
                  className="overflow-hidden rounded-md border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                  <img
                    src={url}
                    alt="Complaint photo"
                    className="h-32 w-32 object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Status timeline
        </h2>
        <ComplaintTimeline entries={timeline} />
      </section>
    </article>
  );
}
