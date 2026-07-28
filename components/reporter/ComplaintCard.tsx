import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { Camera } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { SeverityBadge } from "./SeverityBadge";
import { SlaCountdown } from "./SlaCountdown";
import { CategoryBadge } from "./CategoryBadge";

interface ComplaintCardProps {
  complaint: {
    _id: string;
    status: string;
    categoryId: string;
    locationId: string;
    description: string;
    photoUrls?: string[] | undefined;
    slaAcknowledgeBy: string;
    slaResolveBy: string;
    createdAt: string;
    priority?: "Critical" | "High" | "Medium" | "Low" | undefined;
    categoryName?: string | undefined;
    locationName?: string | undefined;
    systemType?: string | undefined;
  };
}

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  const shortDescription =
    complaint.description.length > 200
      ? complaint.description.slice(0, 200) + "…"
      : complaint.description;

  const thumbnailUrl = complaint.photoUrls?.[0] ?? null;
  // Date.now() here is intentional: the deadline-vs-now semantic is asked
  // of the card at SSR time so the page paints with the correct
  // overdue state. The parent page polls every 30 s and re-renders this
  // card, so the comparison stays fresh.
  // eslint-disable-next-line react-hooks/purity
  const overdueFromAcknowledge =
    new Date(complaint.slaAcknowledgeBy).getTime() < Date.now() &&
    complaint.status === "Submitted";

  return (
    <Card padding="md" className="group p-0">
      <Link
        href={`/complaints/${complaint._id}`}
        className="block focus:outline-none"
      >
        <div className="flex items-stretch gap-5 p-5">
          <div className="min-w-0 flex-1">
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
            </div>

            <p className="mt-3 text-sm font-semibold text-foreground-strong">
              <span>{complaint.categoryName ?? "Complaint"}</span>
              {complaint.locationName ? (
                <span className="ml-1 font-medium text-muted-strong">
                  · {complaint.locationName}
                </span>
              ) : null}
            </p>

            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-strong">
              {shortDescription}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="numeric">
                {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                  addSuffix: true,
                })}
              </span>
              <SlaCountdown
                label="Acknowledge"
                deadline={complaint.slaAcknowledgeBy}
                emphasize={overdueFromAcknowledge}
              />
              <SlaCountdown
                label="Resolve"
                deadline={complaint.slaResolveBy}
              />
            </div>
          </div>

          <div className="hidden w-28 flex-shrink-0 sm:block">
            {thumbnailUrl ? (
              <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-border bg-surface-raised">
                <Image
                  src={thumbnailUrl}
                  alt="Complaint photo"
                  fill
                  sizes="112px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-raised text-muted-strong">
                <Camera className="h-5 w-5" aria-hidden="true" />
                <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">
                  No photo
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer separator + arrow cue for the link affordance */}
        <div className="flex items-center justify-end gap-1 border-t border-border bg-surface-raised/50 px-5 py-2 text-xs font-medium text-muted-strong transition-colors group-hover:text-brand">
          <span>View detail</span>
          <span aria-hidden="true">→</span>
        </div>
      </Link>
    </Card>
  );
}
