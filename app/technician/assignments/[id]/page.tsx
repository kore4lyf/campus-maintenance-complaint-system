"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  AlertTriangle,
  UserCircle,
  Camera,
  History,
  Wrench,
} from "lucide-react";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SlaPanel } from "@/components/reporter/SlaPanel";
import { ComplaintTimeline } from "@/components/reporter/ComplaintTimeline";
import { TransitionForm } from "@/components/technician/TransitionForm";
import { H1, Kicker, Supporting } from "@/components/ui/type";
import { PageShell } from "@/components/shared/PageShell";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";

/*
 * TechnicianComplaintDetailPage — technician-side composer surface.
 *
 * Aesthetic pass (2026-07-29):
 *   - Fixed the prior missing H1 import (page was rendering `Cannot find
 *     name 'H1'` at runtime).
 *   - Replaces the inline SLA chips with the SlaPanel primitive
 *     previously added for the reporter detail page so the same visual
 *     contract travels across roles.
 *   - Adds a numbered caption strip (`02 · Assignment`) above the H1
 *     so the page reads with the same compositional cadence as the
 *     Home and the reporter detail page.
 *   - Restructures the breach banner into a dedicated Card surface
 *     with a hairline-divided structure (icon block on the left, body
 *     copy on the right) replacing the inline colour wash.
 *   - Status history is delegated to ComplaintTimeline (the rebuilt
 *     Nov component) instead of inlining a vertical timeline. Same
 *     component is now used by reporter / technician / tracker pages.
 *
 * Tokens used (no new tokens):
 *   - text-brand on internal navigation arrows.
 *   - border-border / border-border-strong for hairlines.
 *   - duration-fast for hover micro-interactions on the back button.
 *   - bg-danger / text-danger-strong for the breach banner.
 */

interface StatusHistoryEntry {
  _id: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  photoUrl: string | null;
  changedAt: string;
  changedBySystem: boolean;
  changedByName?: string | null;
  changedByRole?: string | null;
}

interface ComplaintDetail {
  _id: string;
  status: string;
  priority: string;
  description: string;
  photoUrls: string[];
  categoryName: string | null;
  locationName: string | null;
  reporterName: string;
  slaAcknowledgeBy: string;
  slaResolveBy: string;
  createdAt: string;
  breachKind: "none" | "acknowledge_overdue" | "resolve_overdue";
  overdueMs: number;
  allowedTransitions: string[];
  statusHistory: StatusHistoryEntry[];
  __v: number;
}

function formatTimelineEntry(entry: StatusHistoryEntry) {
  return {
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    changedById: undefined,
    changedByName: entry.changedByName ?? undefined,
    changedByRole: entry.changedByRole ?? undefined,
    changedBySystem: entry.changedBySystem,
    note: entry.note ?? undefined,
    photoUrl: entry.photoUrl ?? undefined,
    changedAt: entry.changedAt,
  };
}

export default function TechnicianComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = React.use(params);

  const { data: payload, isLoading } = useQuery<{ data: ComplaintDetail }>({
    queryKey: ["technician-complaint", id],
    queryFn: async () => {
      const response = await fetch(`/api/technician/queue/${id}`);
      if (!response.ok) throw new Error("Failed to fetch complaint");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <PageShell displayVariant="flat">
        <div className="space-y-6">
          <Skeleton className="h-4 w-32" />
          <Card padding="lg">
            <Skeleton className="h-8 w-2/3" />
            <div className="mt-6 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  if (!payload?.data) {
    return (
      <PageShell displayVariant="flat">
        <div className="mx-auto max-w-md">
          <Card padding="lg" variant="surface" className="text-center">
            <p className="text-sm text-muted-strong">
              Complaint not found or not assigned to you.
            </p>
            <Button
              variant="secondary"
              size="md"
              leadingIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.push("/technician/assignments")}
              className="mx-auto mt-5"
            >
              Back to assignments
            </Button>
          </Card>
        </div>
      </PageShell>
    );
  }

  const complaint = payload.data;
  const isTerminal =
    complaint.status === "Resolved" || complaint.status === "Closed";

  return (
    <PageShell displayVariant="flat">
      {/* Back affordance */}
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push("/technician/assignments")}
        className="mb-6 -ml-2"
      >
        Back to assignments
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ---------- Detail column ---------- */}
        <div className="space-y-6 lg:col-span-8">
          {/* Hero strip + status row */}
          <Card padding="lg" variant="surface">
            <header className="flex flex-col gap-5">
              {/* Numbered caption strip — matches Home/Detail cadence */}
              <div className="flex items-center gap-3">
                <span className="numeric text-2xl font-semibold leading-none tracking-[-0.02em] text-foreground-strong">
                  02
                </span>
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-border-strong"
                />
                <Kicker>Assignment</Kicker>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={complaint.status} />
                <SeverityBadge
                  severity={
                    complaint.priority as "Critical" | "High" | "Medium" | "Low"
                  }
                />
                <span className="ml-auto numeric text-xs text-muted-strong">
                  Filed{" "}
                  {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div>
                <H1 variant="compact">
                  {complaint.categoryName ?? "Complaint"}
                  {complaint.locationName ? (
                    <span className="ml-1 font-medium text-muted-strong">
                      · {complaint.locationName}
                    </span>
                  ) : null}
                </H1>
                <p className="numeric mt-2 text-xs uppercase tracking-[0.16em] text-muted">
                  ID #{complaint._id.slice(-6).toUpperCase()}
                </p>
              </div>

              {/* Breach banner — restructured Card surface */}
              {complaint.breachKind !== "none" ? (
                <Card
                  padding="sm"
                  variant="surface"
                  className="border-danger/40 bg-danger/5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-danger text-white">
                      <AlertTriangle
                        className="h-5 w-5"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-danger-strong">
                        {complaint.breachKind === "acknowledge_overdue"
                          ? "Acknowledgement is overdue"
                          : "Resolution is overdue"}
                      </p>
                      <p className="numeric mt-0.5 text-xs text-danger">
                        {formatOverdueDuration(complaint.overdueMs)} past the
                        SLA deadline. Resolve or escalate.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <p className="text-xs text-muted-strong">
                  On track. No SLA breaches on this complaint.
                </p>
              )}
            </header>
          </Card>

          {/* SLA panel — same primitive the reporter uses */}
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
                  Two deadlines for closure.
                </p>
              </div>
            </header>
            <SlaPanel
              acknowledgeLabel="Acknowledge"
              acknowledgeDeadline={complaint.slaAcknowledgeBy}
              resolveLabel="Resolve"
              resolveDeadline={complaint.slaResolveBy}
              isTerminal={isTerminal}
              caption={
                <span>
                  Times relative to the reporter&apos;s submission. DICT is
                  notified the moment the complaint is filed.
                </span>
              }
            />
          </Card>

          {/* Description */}
          <Card padding="lg" variant="raised">
            <SectionHeader eyebrow="Description" title="Reporter's note" />
            <blockquote className="rounded-r-lg border-l-2 border-brand bg-surface px-5 py-4 text-sm leading-[1.7] text-foreground-strong sm:text-base">
              {complaint.description}
            </blockquote>
          </Card>

          {/* Reporter + meta */}
          <Card padding="lg" variant="surface">
            <SectionHeader eyebrow="Meta" title="Reporter and deadlines" />
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <UserCircle
                  className="h-4 w-4 text-muted-strong"
                  aria-hidden="true"
                />
                <dt className="font-medium text-foreground-strong">
                  Reporter
                </dt>
                <dd className="text-muted-strong">{complaint.reporterName}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Camera
                  className="h-4 w-4 text-muted-strong"
                  aria-hidden="true"
                />
                <dt className="font-medium text-foreground-strong">
                  Photos
                </dt>
                <dd className="numeric text-muted-strong">
                  {complaint.photoUrls.length}
                </dd>
              </div>
              <div className="numeric sm:col-span-2 flex items-center gap-2">
                <History
                  className="h-4 w-4 text-muted-strong"
                  aria-hidden="true"
                />
                <dt className="font-medium text-foreground-strong">
                  Acknowledge by
                </dt>
                <dd className="text-muted-strong">
                  {formatDistanceToNowStrict(
                    new Date(complaint.slaAcknowledgeBy),
                    { addSuffix: true },
                  )}
                </dd>
                <span className="mx-1 text-muted-strong">·</span>
                <dt className="font-medium text-foreground-strong">
                  Resolve by
                </dt>
                <dd className="text-muted-strong">
                  {formatDistanceToNowStrict(new Date(complaint.slaResolveBy), {
                    addSuffix: true,
                  })}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Photos grid */}
          {complaint.photoUrls.length > 0 ? (
            <Card padding="lg" variant="raised">
              <SectionHeader
                eyebrow="Photos"
                title={`${complaint.photoUrls.length} attached`}
              />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {complaint.photoUrls.map((url, i) => (
                  <li
                    key={url}
                    className="group/photo relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-raised transition-[border-color,transform] duration-fast hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-medium group-hover/photo:scale-[1.03]"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Status history through the shared primitive */}
          {complaint.statusHistory.length > 0 ? (
            <Card padding="lg" variant="raised" className="overflow-visible">
              <SectionHeader
                eyebrow="Timeline"
                title="Status history"
                meta={
                  <span className="numeric text-xs text-muted-strong">
                    {complaint.statusHistory.length} update
                    {complaint.statusHistory.length !== 1 ? "s" : ""}
                  </span>
                }
              />
              <ComplaintTimeline
                entries={complaint.statusHistory.map(formatTimelineEntry)}
              />
            </Card>
          ) : (
            <Card padding="lg" variant="raised">
              <SectionHeader eyebrow="Timeline" title="Status history" />
              <p className="inline-flex items-center gap-2 text-sm text-muted-strong">
                <Wrench className="h-4 w-4" aria-hidden="true" />
                No updates yet. Acknowledge this complaint to start the
                timeline.
              </p>
            </Card>
          )}
        </div>

        {/* ---------- Action column ---------- */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">
            <TransitionForm
              complaintId={complaint._id}
              currentStatus={complaint.status}
              allowedTransitions={complaint.allowedTransitions}
              expectedVersion={complaint.__v}
              onSuccess={() => {
                /* TanStack Query refetch handles refresh. */
              }}
            />
            <Card padding="md" variant="raised">
              <header className="mb-2 flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
                  Audit reminder
                </p>
              </header>
              <p className="text-xs leading-[1.55] text-muted-strong">
                Every transition writes a new <span className="numeric">__v</span>{" "}
                audit row under your name. Keep the notes short and meaningful —
                they appear on the reporter&apos;s detail page.
              </p>
              <Supporting className="mt-3">
                Need to step away? Use the Back affordance — no state is lost
                mid-transition.
              </Supporting>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
