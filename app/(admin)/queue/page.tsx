"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterPanel } from "@/components/admin/FilterPanel";
import { QueueRow } from "@/components/admin/QueueRow";
import { Label } from "@/components/ui/type";
import { Card } from "@/components/ui/Card";
import { AssignDialog } from "@/components/admin/AssignDialog";
import { RecentActionsFeed } from "@/components/admin/RecentActionsFeed";
import { QueueRibbon } from "@/components/admin/QueueRibbon";
import { AdminQueueEmpty } from "@/components/admin/AdminQueueEmpty";
import { RealtimeStatusBadge } from "@/components/RealtimeStatusBadge";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";
import { useSearchParams } from "next/navigation";
import {
  PageShell,
  HeroBand,
  HeroBody,
  PageShellCtaBand,
} from "@/components/shared/PageShell";

/*
 * AdminQueuePage — DICT console composer surface.
 *
 * Aesthetic pass (2026-07-29):
 *   - Adds a numbered caption strip (`01 · DICT Console`) on the hero
 *     band, and a live-status chip in the hero actions so operators
 *     see the realtime connection state at a glance.
 *   - Replaces the loading skeleton with a 5-row hairline-divided
 *     skeleton inside a Card so the first paint reads as
 *     "the queue will be here in a moment".
 *   - Adds a small "At a glance" KPI strip below the hero band — three
 *     cells showing filter-state context — to mirror the home /
 *     technician queue page rhythm.
 *   - The 3-column grid (filters | queue | recent actions) tightens
 *     to a single column on tablet/mobile.
 *   - Closes with the navy <PageShellCtaBand> so the page reads
 *     as a single editorial unit like /complaints/mine.
 *
 * Tokens used (no new tokens):
 *   - bg-brand on the close CTA.
 *   - text-accent-strong on the sparkles dot accent.
 *   - bg-surface-raised on subtle grouping surfaces.
 */

interface Complaint {
  _id: string;
  status: string;
  priority: string;
  description: string;
  photoUrls: string[];
  categoryName: string | null;
  locationName: string | null;
  slaAcknowledgeBy: string;
  slaResolveBy: string;
  createdAt: string;
  breachKind: "none" | "acknowledge_overdue" | "resolve_overdue";
  overdueMs: number;
  currentAssignee: { assignedToTechId: string; assignedToName: string } | null;
  __v: number;
}

interface Technician {
  _id: string;
  name: string;
  email: string;
}

interface Location {
  _id: string;
  name: string;
}

interface QueueResponse {
  data: Complaint[];
  meta: { nextCursor: string | null; hasMore: boolean };
  escalatedRecentCount: number;
}

function QueueSkeleton() {
  return (
    <Card padding="md" variant="surface">
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-surface-raised"
          />
        ))}
      </div>
    </Card>
  );
}

function AdminHeroActions({
  queueKey,
}: {
  queueKey: readonly unknown[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RealtimeStatusBadge channelName="admin:queue" queryKey={queueKey} />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-strong">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        Refreshes every 30 s
      </span>
    </div>
  );
}

function QueueContent() {
  const searchParams = useSearchParams();
  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);

  const severity = searchParams.get("severity") ?? "";
  const age = searchParams.get("age") ?? "";
  const locationId = searchParams.get("locationId") ?? "";

  const params = new URLSearchParams();
  if (severity) params.set("severity", severity);
  if (age && age !== "all") params.set("age", age);
  if (locationId) params.set("locationId", locationId);

  const { data: queueData, isLoading: queueLoading } = useQuery<QueueResponse>({
    queryKey: ["admin-queue", severity, age, locationId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/queue?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: techData } = useQuery<{ data: Technician[] }>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const response = await fetch("/api/admin/technicians");
      if (!response.ok) return { data: [] };
      return response.json();
    },
  });

  const { data: locationData } = useQuery<{ data: Location[] }>({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      if (!response.ok) return { data: [] };
      return response.json();
    },
  });

  const complaints = queueData?.data ?? [];
  const technicians = techData?.data ?? [];
  const locations = locationData?.data ?? [];
  const escalatedRecentCount = queueData?.escalatedRecentCount ?? 0;

  const total = complaints.length;
  const breached = complaints.filter((c) => c.breachKind !== "none").length;
  const unassigned = complaints.filter(
    (c) => c.currentAssignee === null,
  ).length;

  const queueQueryKey = ["admin-queue", severity, age, locationId] as const;
  useAblyChannel({ name: "admin:queue", queryKey: queueQueryKey });
  useAblyChannel({ name: "admin:escalations", queryKey: queueQueryKey });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="sticky top-24">
          <FilterPanel locations={locations} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* KPI strip */}
        {queueLoading ? null : (
          <ul
            role="list"
            className="mb-4 grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            <li className="flex flex-col gap-1 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
                In view
              </p>
              <p className="numeric text-2xl font-semibold tracking-[-0.025em] text-foreground-strong">
                {total}
              </p>
            </li>
            <li className="flex flex-col gap-1 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
                Breached
              </p>
              <p
                className={`numeric text-2xl font-semibold tracking-[-0.025em] ${breached > 0 ? "text-danger-strong" : "text-foreground-strong"}`}
              >
                {breached}
              </p>
            </li>
            <li className="flex flex-col gap-1 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
                Unassigned
              </p>
              <p
                className={`numeric text-2xl font-semibold tracking-[-0.025em] ${unassigned > 0 ? "text-warning-strong" : "text-foreground-strong"}`}
              >
                {unassigned}
              </p>
            </li>
          </ul>
        )}

        <div className="mb-3 flex items-center justify-between">
          <Label>Queue</Label>
          <RealtimeStatusBadge
            channelName="admin:queue"
            queryKey={queueQueryKey}
          />
        </div>
        <QueueRibbon escalatedCount={escalatedRecentCount} />
        {queueLoading ? (
          <QueueSkeleton />
        ) : complaints.length === 0 ? (
          <AdminQueueEmpty />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {complaints.map((complaint) => (
              <QueueRow
                key={complaint._id}
                complaint={complaint}
                onSelect={setSelectedComplaint}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="sticky top-24">
          <RecentActionsFeed />
        </div>
      </div>

      {selectedComplaint ? (
        <AssignDialog
          complaint={selectedComplaint}
          technicians={technicians}
          onClose={() => setSelectedComplaint(null)}
          onAssigned={() => {
            setSelectedComplaint(null);
          }}
        />
      ) : null}
    </div>
  );
}

export default function AdminQueuePage() {
  // Stable identity used by both realtime badges above the queue and
  // by the live status pills inside the KPI strip. Constructed once
  // per render so react-query invalidations stay stable.
  const queueKey = ["admin-queue", "", "", ""] as const;

  return (
    <PageShell>
      <HeroBand
        kicker="DICT Console"
        title="Queue"
        subtitle="Manage and assign incoming complaints. Click a row to view details and assign to a technician."
        actions={<AdminHeroActions queueKey={queueKey} />}
      />
      <HeroBody>
        <Suspense fallback={<QueueSkeleton />}>
          <QueueContent />
        </Suspense>
      </HeroBody>
      <PageShellCtaBand
        title="Spotting a breach pattern?"
        body="The Reports console gives you volume trends, breach counts, and PDF/CSV exports filtered by time, severity, and location."
        action={
          <span className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-brand-strong shadow-sm transition-[background-color,color,transform] duration-fast hover:-translate-y-0.5 hover:bg-accent-strong hover:text-brand hover:shadow-md">
            <span>Visit Reports console</span>
          </span>
        }
      />
    </PageShell>
  );
}
