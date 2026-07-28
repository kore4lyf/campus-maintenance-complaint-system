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
import { TransitionForm } from "@/components/technician/TransitionForm";
import { formatOverdueDuration } from "@/lib/sla/breach-detection";

interface StatusHistoryEntry {
  _id: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  photoUrl: string | null;
  changedAt: string;
  changedBySystem: boolean;
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
    );
  }

  if (!payload?.data) {
    return (
      <Card padding="lg" variant="surface" className="mx-auto max-w-md text-center">
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
    );
  }

  const complaint = payload.data;

  return (
    <div>
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
          <Card padding="lg" variant="surface">
            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={complaint.status} />
                <SeverityBadge
                  severity={
                    complaint.priority as "Critical" | "High" | "Medium" | "Low"
                  }
                />
                <span className="ml-auto text-xs text-muted-strong">
                  Filed{" "}
                  {formatDistanceToNowStrict(new Date(complaint.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
                  Assignment
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
            </header>

            {complaint.breachKind !== "none" ? (
              <Card
                padding="sm"
                variant="surface"
                className="mt-5 border-danger/40 bg-danger/5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-danger text-white">
                    <AlertTriangle
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-danger-strong">
                      {complaint.breachKind === "acknowledge_overdue"
                        ? "Acknowledgement is overdue"
                        : "Resolution is overdue"}
                    </p>
                    <p className="numeric mt-0.5 text-xs text-danger">
                      {formatOverdueDuration(complaint.overdueMs)} past the SLA
                      deadline. Resolve or escalate.
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}
          </Card>

          <Card padding="lg" variant="raised">
            <SectionHeader eyebrow="Description" title="Reporter's note" />
            <p className="whitespace-pre-wrap rounded-lg bg-surface px-4 py-3 text-sm leading-relaxed text-foreground-strong">
              {complaint.description}
            </p>
          </Card>

          <Card padding="lg" variant="raised">
            <SectionHeader eyebrow="Meta" title="Reporter and deadlines" />
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <UserCircle
                  className="h-4 w-4 text-muted-strong"
                  aria-hidden="true"
                />
                <dt className="font-medium text-foreground-strong">Reporter</dt>
                <dd className="text-muted-strong">{complaint.reporterName}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-strong" aria-hidden="true" />
                <dt className="font-medium text-foreground-strong">Photos</dt>
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
                  {formatDistanceToNowStrict(new Date(complaint.slaAcknowledgeBy), {
                    addSuffix: true,
                  })}
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
                    className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-raised"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {complaint.statusHistory.length > 0 ? (
            <Card padding="lg" variant="raised">
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
              <ol className="relative ml-3 space-y-5 border-l-2 border-border pl-6">
                {complaint.statusHistory.map((entry) => (
                  <li key={entry._id} className="relative">
                    <span className="absolute -left-[1.875rem] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface ring-2 ring-border">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={entry.toStatus} />
                      <span className="text-xs font-medium text-muted-strong">
                        {entry.fromStatus} → {entry.toStatus}
                      </span>
                      <span className="numeric ml-auto text-xs text-muted-strong">
                        {formatDistanceToNowStrict(new Date(entry.changedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {entry.note ? (
                      <p className="mt-2 rounded-md bg-surface px-3 py-2 text-sm text-foreground-strong">
                        {entry.note}
                      </p>
                    ) : null}
                    {entry.photoUrl ? (
                      <Badge tone="info" className="mt-2">
                        Photo attached · see Proof tab
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ol>
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
          <div className="sticky top-24">
            <TransitionForm
              complaintId={complaint._id}
              currentStatus={complaint.status}
              allowedTransitions={complaint.allowedTransitions}
              expectedVersion={complaint.__v}
              onSuccess={() => {
                /* TanStack Query refetch handles refresh. */
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
