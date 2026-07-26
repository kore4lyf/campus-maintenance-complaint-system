"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { SeverityBadge } from "./SeverityBadge";
import { SlaCountdown } from "./SlaCountdown";

interface ComplaintCardProps {
  complaint: {
    _id: string;
    status: string;
    categoryId: string;
    locationId: string;
    description: string;
    photoUrls?: string[];
    slaAcknowledgeBy: string;
    slaResolveBy: string;
    createdAt: string;
    priority?: "Critical" | "High" | "Medium" | "Low";
    categoryName?: string;
    locationName?: string;
  };
}

const STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-muted/15 text-muted",
  Acknowledged: "bg-accent/15 text-accent",
  "In Progress": "bg-warning/15 text-warning",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted/15 text-muted",
};

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  const shortDescription =
    complaint.description.length > 200
      ? complaint.description.slice(0, 200) + "..."
      : complaint.description;

  const thumbnailUrl = complaint.photoUrls?.[0] ?? null;

  return (
    <Link
      href={`/complaints/${complaint._id}`}
      className="block rounded-lg border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[complaint.status] ?? "bg-muted/15 text-muted"}`}
            >
              {complaint.status}
            </span>
            {complaint.priority ? (
              <SeverityBadge severity={complaint.priority} />
            ) : null}
          </div>

          <p className="mt-2 text-sm font-medium text-foreground">
            {complaint.categoryName ?? "Complaint"}
            {complaint.locationName ? (
              <span className="text-muted-strong">
                {" "}
                &middot; {complaint.locationName}
              </span>
            ) : null}
          </p>

          <p className="mt-1 text-sm text-muted-strong">{shortDescription}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>
              {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                addSuffix: true,
              })}
            </span>
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

        {thumbnailUrl ? (
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail */}
            <img
              src={thumbnailUrl}
              alt="Complaint photo"
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
