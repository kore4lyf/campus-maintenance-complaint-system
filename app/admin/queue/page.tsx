"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilterPanel } from "@/components/admin/FilterPanel";
import { QueueRow } from "@/components/admin/QueueRow";
import { Label } from "@/components/ui/type";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AssignDialog } from "@/components/admin/AssignDialog";
import { RecentActionsFeed } from "@/components/admin/RecentActionsFeed";
import { QueueRibbon } from "@/components/admin/QueueRibbon";
import { AdminQueueEmpty } from "@/components/admin/AdminQueueEmpty";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  systemType?: string | undefined;
  isAnonymous?: boolean;
  reporterName?: string | null;
  reporterEmail?: string | null;
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
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
  escalatedRecentCount: number;
  totalCount: number;
  breachedCount: number;
  unassignedCount: number;
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

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function AdminHeroActions() {
  return null;
}

function QueueContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const severity = searchParams.get("severity") ?? "";
  const age = searchParams.get("age") ?? "";
  const locationId = searchParams.get("locationId") ?? "";

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (severity) p.set("severity", severity);
    if (age && age !== "all") p.set("age", age);
    if (locationId) p.set("locationId", locationId);
    if (keyword) p.set("keyword", keyword);
    return p;
  }, [severity, age, locationId, keyword]);

  const { data: queueData, isLoading: queueLoading, isFetching: queueFetching } = useQuery<QueueResponse>({
    queryKey: ["admin-queue", severity, age, locationId, keyword, page],
    queryFn: async () => {
      const p = new URLSearchParams(params.toString());
      p.set("page", String(page));
      const response = await fetch(`/api/admin/queue?${p.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
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
  const totalCount = queueData?.totalCount ?? 0;
  const breachedCount = queueData?.breachedCount ?? 0;
  const unassignedCount = queueData?.unassignedCount ?? 0;
  const meta = queueData?.meta;
  const breached = complaints.filter((c) => c.breachKind !== "none").length;
  const unassigned = complaints.filter(
    (c) => c.currentAssignee === null,
  ).length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [severity, age, locationId, keyword]);

  const queueQueryKey = ["admin-queue", severity, age, locationId, keyword, page] as const;
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
        <ul
          role="list"
          className="mb-4 grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          <li className="flex flex-col gap-1 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
              In view
            </p>
            {queueLoading ? (
              <div className="h-7 w-10 animate-pulse rounded bg-surface-raised" />
            ) : (
              <p className="numeric text-2xl font-semibold tracking-[-0.025em] text-foreground-strong">
                {complaints.length}<span className="text-base text-muted">/{totalCount}</span>
              </p>
            )}
          </li>
          <li className="flex flex-col gap-1 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
              Breached
            </p>
            {queueLoading ? (
              <div className="h-7 w-10 animate-pulse rounded bg-surface-raised" />
            ) : (
              <p
                className={`numeric text-2xl font-semibold tracking-[-0.025em] ${breached > 0 ? "text-danger-strong" : "text-foreground-strong"}`}
              >
                {breached}<span className="text-base text-muted">/{breachedCount}</span>
              </p>
            )}
          </li>
          <li className="flex flex-col gap-1 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
              Unassigned
            </p>
            {queueLoading ? (
              <div className="h-7 w-10 animate-pulse rounded bg-surface-raised" />
            ) : (
              <p
                className={`numeric text-2xl font-semibold tracking-[-0.025em] ${unassigned > 0 ? "text-warning-strong" : "text-foreground-strong"}`}
              >
                {unassigned}<span className="text-base text-muted">/{unassignedCount}</span>
              </p>
            )}
          </li>
        </ul>

        <div className="mb-3 flex items-center justify-between">
          <Label>Queue</Label>
          <span className="text-xs text-muted-strong">
            {complaints.length} result{complaints.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search by description, email, category, or location..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-strong focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <QueueRibbon escalatedCount={escalatedRecentCount} />
        {queueLoading ? (
          <QueueSkeleton />
        ) : complaints.length === 0 ? (
          <AdminQueueEmpty />
        ) : (
          <>
            <div className="relative">
              {queueFetching && !queueLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-surface/60">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                </div>
              )}
              <div className={`max-h-[60vh] overflow-y-auto rounded-xl border border-border transition-opacity ${queueFetching && !queueLoading ? "pointer-events-none opacity-60" : ""}`}>
                <ul className="divide-y divide-border bg-surface">
                  {complaints.map((complaint) => (
                    <QueueRow
                      key={complaint._id}
                      complaint={complaint}
                      onSelect={setSelectedComplaint}
                    />
                  ))}
                </ul>
              </div>
            </div>
            {meta && meta.totalPages > 1 && (
              <nav
                className="mt-3 flex items-center justify-between"
                aria-label="Queue pagination"
              >
                <p className="text-xs text-muted-strong">
                  {meta.totalCount} result{meta.totalCount !== 1 ? "s" : ""} — page {meta.page} of {meta.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={meta.page <= 1 || queueFetching}
                    onClick={() => setPage((p) => p - 1)}
                    leadingIcon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {getPageNumbers(meta.page, meta.totalPages).map((num, i) =>
                      num === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-strong">…</span>
                      ) : (
                        <button
                          key={num}
                          type="button"
                          disabled={queueFetching}
                          onClick={() => setPage(num)}
                          aria-current={num === meta.page ? "page" : undefined}
                          className={`min-w-[2rem] rounded px-2 py-1 text-sm font-medium transition-colors ${
                            num === meta.page
                              ? "bg-brand text-white"
                              : "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong"
                          } disabled:opacity-50`}
                        >
                          {num}
                        </button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={meta.page >= meta.totalPages || queueFetching}
                    onClick={() => setPage((p) => p + 1)}
                    trailingIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
              </nav>
            )}
          </>
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
            queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
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
        actions={<AdminHeroActions />}
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
