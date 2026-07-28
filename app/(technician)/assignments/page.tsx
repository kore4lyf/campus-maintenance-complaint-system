"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { Wrench, ChevronRight, Inbox } from "lucide-react";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";

interface Complaint {
  _id: string;
  status: string;
  priority: string;
  description: string;
  categoryName: string | null;
  locationName: string | null;
  slaAcknowledgeBy: string;
  slaResolveBy: string;
  createdAt: string;
  breachKind: "none" | "acknowledge_overdue" | "resolve_overdue";
  overdueMs: number;
}

interface QueueResponse {
  data: Complaint[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

const BREACH_ACCENT: Record<Complaint["breachKind"], string> = {
  none: "border-l-transparent",
  acknowledge_overdue: "border-l-danger",
  resolve_overdue: "border-l-danger-strong",
};

export default function TechnicianQueuePage() {
  const { data: queueData, isLoading } = useQuery<QueueResponse>({
    queryKey: ["technician-queue"],
    queryFn: async () => {
      const response = await fetch("/api/technician/queue");
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const complaints = queueData?.data ?? [];

  return (
    <PageShell>
      <HeroBand
        kicker="Technician Console"
        title="My assignments"
        subtitle={
          isLoading
            ? "Loading…"
            : `${complaints.length} assigned to you · sorted by SLA urgency`
        }
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-strong">
            <Wrench className="h-3 w-3" aria-hidden="true" />
            Refreshes every 30 s
          </div>
        }
      />
      <HeroBody>

      {isLoading ? (
        <Card padding="lg" variant="surface">
          <SectionHeader eyebrow="In your queue" title="Loading…" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-border bg-surface-raised p-4"
              >
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </Card>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-9 w-9" aria-hidden="true" />}
          title="No assignments right now"
          description="When DICT routes work to you, it lands here in real time. The queue auto-refreshes every 30 seconds."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {complaints.map((complaint) => {
            const shortDescription =
              complaint.description.length > 140
                ? complaint.description.slice(0, 140) + "…"
                : complaint.description;

            return (
              <Card
                key={complaint._id}
                padding="none"
                className="group overflow-hidden p-0"
              >
                <Link
                  href={`/technician/assignments/${complaint._id}`}
                  aria-label={`Open ${complaint.categoryName ?? "complaint"} ${complaint._id}`}
                  className={`block border-l-4 ${BREACH_ACCENT[complaint.breachKind]} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`}
                >
                  <div className="flex items-stretch gap-5 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill status={complaint.status} />
                        <SeverityBadge
                          severity={
                            complaint.priority as
                              | "Critical"
                              | "High"
                              | "Medium"
                              | "Low"
                          }
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-foreground-strong">
                        <span>{complaint.categoryName ?? "Complaint"}</span>
                        {complaint.locationName ? (
                          <span className="ml-1 font-medium text-muted-strong">
                            · {complaint.locationName}
                          </span>
                        ) : null}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-strong">
                        {shortDescription}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        {complaint.breachKind !== "none" ? (
                          <span className="numeric inline-flex items-center gap-1 font-medium text-danger">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
                            {complaint.breachKind === "acknowledge_overdue"
                              ? "Acknowledgement overdue"
                              : "Resolution overdue"}
                            <span className="text-muted-strong">·</span>
                            <span>{formatOverdueDuration(complaint.overdueMs)}</span>
                          </span>
                        ) : (
                          <span className="numeric text-muted">
                            Resolve by{" "}
                            {formatDistanceToNowStrict(
                              new Date(complaint.slaResolveBy),
                              { addSuffix: true },
                            )}
                          </span>
                        )}
                        <span className="numeric text-muted">
                          Filed{" "}
                          {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className="h-4 w-4 flex-shrink-0 self-center text-muted-strong transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
      </HeroBody>
    </PageShell>
  );
}
