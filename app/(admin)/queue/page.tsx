"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterPanel } from "@/components/admin/FilterPanel";
import { QueueRow } from "@/components/admin/QueueRow";
import { AssignDialog } from "@/components/admin/AssignDialog";
import { RecentActionsFeed } from "@/components/admin/RecentActionsFeed";
import { QueueRibbon } from "@/components/admin/QueueRibbon";
import { AdminQueueEmpty } from "@/components/admin/AdminQueueEmpty";
import { RealtimeStatusBadge } from "@/components/RealtimeStatusBadge";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";
import { useSearchParams } from "next/navigation";

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

function QueueContent() {
  const searchParams = useSearchParams();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

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

  const queueQueryKey = ["admin-queue", severity, age, locationId];
  useAblyChannel({ name: "admin:queue", queryKey: queueQueryKey });
  useAblyChannel({ name: "admin:escalations", queryKey: queueQueryKey });

  if (queueLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-raised" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="sticky top-24">
          <FilterPanel locations={locations} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Queue</h2>
          <RealtimeStatusBadge
            channelName="admin:queue"
            queryKey={queueQueryKey}
          />
        </div>
        <QueueRibbon escalatedCount={escalatedRecentCount} />
        {complaints.length === 0 ? (
          <AdminQueueEmpty />
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <QueueRow
                key={complaint._id}
                complaint={complaint}
                onSelect={setSelectedComplaint}
              />
            ))}
          </div>
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
  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
          DICT Console
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground-strong sm:text-4xl">
              Queue
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted-strong">
              Manage and assign incoming complaints. Click a row to view
              details and assign to a technician.
            </p>
          </div>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-raised" />
            ))}
          </div>
        }
      >
        <QueueContent />
      </Suspense>
    </div>
  );
}
