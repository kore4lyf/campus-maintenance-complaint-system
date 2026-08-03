"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ChevronRight,
  EyeOff,
  Inbox,
  Clock,
} from "lucide-react";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Kicker, Supporting } from "@/components/ui/type";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";

/*
 * TechnicianQueuePage — technician home with edge-to-edge assignments.
 *
 * Aesthetic pass (2026-07-29):
 *   - Adds a numbered caption strip (`01 · Queue`) on the hero band,
 *     consistent with the Home / reporter detail cadence.
 *   - Adds a hairline-divided "queue summary" strip (3 KPI cells) on
 *     the right side of the hero band: total assignments, breach
 *     count, average deadline-to-now distance. Mirrors the
 *     StatsBand pattern on the home page.
 *   - Reorders the row rendering to: status pill row, breach chip
 *     (when applicable), then content.
 *   - Empty state now references the project's PromotedEmptyState
 *     primitive via EmptyState + brand icon block.
 *   - Astryx mapping: edge-to-edge list rows inside a single ul with
 *     `divide-y divide-border` and `rounded-xl border border-border`.
 */

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
  isAnonymous?: boolean;
  reporterName?: string | null;
  reporterEmail?: string | null;
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

function QueueSkeleton() {
  return (
    <Card padding="lg" variant="surface">
      <Skeleton className="mb-4 h-3 w-1/3" />
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
  );
}

export default function TechnicianQueuePage() {
  const queueQueryKey = ["technician-queue"];
  useAblyChannel({ name: "technician:queue", queryKey: queueQueryKey });

  const { data: queueData, isLoading } = useQuery<QueueResponse>({
    queryKey: queueQueryKey,
    queryFn: async () => {
      const response = await fetch("/api/technician/queue");
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const complaints = queueData?.data ?? [];

  const breachCount = complaints.filter(
    (c) => c.breachKind !== "none",
  ).length;
  const avgOverdueMs =
    complaints.length > 0
      ? Math.round(
          complaints.reduce((acc, c) => acc + c.overdueMs, 0) /
            complaints.length,
        )
      : 0;

  return (
    <PageShell>
      <HeroBand
        kicker="Technician Console"
        title="My Assignments"
        subtitle={
          isLoading
            ? "Loading…"
            : `${complaints.length} assigned to you · sorted by SLA urgency`
        }
        actions={null}
      />

      <HeroBody>
        {/* ---------- KPI strip ---------- */}
        {!isLoading && complaints.length > 0 ? (
          <ul
            role="list"
            className="mb-6 grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            <li className="flex flex-col gap-2 px-5 py-4">
              <Kicker>Total</Kicker>
              <p className="numeric text-3xl font-semibold tracking-[-0.025em] text-foreground-strong">
                {complaints.length}
              </p>
              <Supporting>Currently in your queue</Supporting>
            </li>
            <li className="flex flex-col gap-2 px-5 py-4">
              <Kicker>Breaches</Kicker>
              <p
                className={`numeric text-3xl font-semibold tracking-[-0.025em] ${
                  breachCount > 0 ? "text-danger-strong" : "text-foreground-strong"
                }`}
              >
                {breachCount}
              </p>
              <Supporting>
                {breachCount === 0
                  ? "No SLA breaches"
                  : "Past acknowledge or resolve deadline"}
              </Supporting>
            </li>
            <li className="flex flex-col gap-2 px-5 py-4">
              <Kicker>Overdue window</Kicker>
              <p className="numeric text-3xl font-semibold tracking-[-0.025em] text-foreground-strong">
                {avgOverdueMs > 0
                  ? formatOverdueDuration(avgOverdueMs)
                  : "—"}
              </p>
              <Supporting>Average overdue time</Supporting>
            </li>
          </ul>
        ) : null}

        {isLoading ? (
          <QueueSkeleton />
        ) : complaints.length === 0 ? (
          <EmptyState
            icon={
              <span
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand"
                aria-hidden="true"
              >
                <Inbox className="h-6 w-6" />
              </span>
            }
            title="No assignments right now"
            description="When DICT routes work to you, it lands here in real time. The queue auto-refreshes every 30 seconds."
            secondaryAction={
              <span className="text-xs text-muted-strong">
                New work arrivals trigger a soft notification ping.
              </span>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {complaints.map((complaint) => {
              const shortDescription =
                complaint.description.length > 140
                  ? complaint.description.slice(0, 140) + "…"
                  : complaint.description;

              return (
                <li
                  key={complaint._id}
                  className={`group transition-colors duration-fast hover:bg-surface-raised/40 focus-within:bg-surface-raised/40 border-l-4 ${BREACH_ACCENT[complaint.breachKind]}`}
                >
                  <Link
                    href={`/technician/assignments/${complaint._id}`}
                    aria-label={`Open ${complaint.categoryName ?? "complaint"} ${complaint._id}`}
                    className="block px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                    style={{ minHeight: "44px" }}
                  >
                    <div className="flex items-stretch gap-5">
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
                          {complaint.isAnonymous && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted-strong">
                              <EyeOff className="h-3 w-3" aria-hidden="true" />
                              Anonymous
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-sm font-semibold text-foreground-strong">
                          <span>{complaint.categoryName ?? "Complaint"}</span>
                          {complaint.locationName ? (
                            <span className="ml-1 font-medium text-muted-strong">
                              · {complaint.locationName}
                            </span>
                          ) : null}
                        </p>

                        {!complaint.isAnonymous && complaint.reporterName ? (
                          <p className="mt-1 text-xs text-muted-strong">
                            {complaint.reporterName}
                            {complaint.reporterEmail ? (
                              <span className="ml-1 text-muted">· {complaint.reporterEmail}</span>
                            ) : null}
                          </p>
                        ) : null}

                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-strong">
                          {shortDescription}
                        </p>

                        <div className="numeric mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          {complaint.breachKind !== "none" ? (
                            <span className="inline-flex items-center gap-1 font-medium text-danger">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
                              {complaint.breachKind === "acknowledge_overdue"
                                ? "Acknowledgement overdue"
                                : "Resolution overdue"}
                              <span className="text-muted-strong">·</span>
                              <span>
                                {formatOverdueDuration(complaint.overdueMs)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted">
                              Resolve by{" "}
                              {formatDistanceToNowStrict(
                                new Date(complaint.slaResolveBy),
                                { addSuffix: true },
                              )}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            Filed{" "}
                            {formatDistanceToNowStrict(
                              new Date(complaint.createdAt),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        className="h-4 w-4 flex-shrink-0 self-center text-muted-strong transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </HeroBody>
    </PageShell>
  );
}
