"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ReportsFilterPanel } from "@/components/admin/ReportsFilterPanel";
import { BarChartCard } from "@/components/admin/BarChartCard";
import { NumericCard } from "@/components/admin/NumericCard";
import { BreachCountCard } from "@/components/admin/BreachCountCard";
import { ExportButtons } from "@/components/admin/ExportButtons";

interface ChartPoint {
  name: string;
  count: number;
}

interface ReportsResponse {
  data: {
    byCategory: ChartPoint[];
    byLocation: ChartPoint[];
    bySeverity: ChartPoint[];
    breachCount: { acknowledgeOverdue: number; resolveOverdue: number };
    avgResolutionMs: number | null;
    backlog: number;
  };
  meta: { generatedAt: string; totalCount: number };
}

interface Location {
  _id: string;
  name: string;
  area: string;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr`;
}

function ReportsFilterPanelClient() {
  const { data: locationData } = useQuery<{ data: Location[] }>({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      if (!response.ok) return { data: [] };
      return response.json();
    },
  });

  return <ReportsFilterPanel locations={locationData?.data ?? []} />;
}

function ReportsContent() {
  const searchParams = useSearchParams();

  const time = searchParams.get("time") ?? "";
  const severity = searchParams.getAll("severity");
  const locationId = searchParams.getAll("locationId");
  const status = searchParams.getAll("status");

  const params = new URLSearchParams();
  if (time) params.set("time", time);
  severity.forEach((s) => params.append("severity", s));
  locationId.forEach((l) => params.append("locationId", l));
  status.forEach((s) => params.append("status", s));

  const { data: reportsData, isLoading: reportsLoading } = useQuery<ReportsResponse>({
    queryKey: ["admin-reports", time, severity.join(","), locationId.join(","), status.join(",")],
    queryFn: async () => {
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const data = reportsData?.data;

  if (reportsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-strong">
            {reportsData?.meta.totalCount ?? 0} complaints in current view
          </p>
        </div>
        <ExportButtons />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BreachCountCard
          acknowledgeOverdue={data?.breachCount.acknowledgeOverdue ?? 0}
          resolveOverdue={data?.breachCount.resolveOverdue ?? 0}
        />
        <NumericCard
          label="Avg Resolution Time"
          value={formatDuration(data?.avgResolutionMs ?? null)}
        />
        <NumericCard
          label="Backlog (older than 7 days)"
          value={data?.backlog ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartCard
          title="Volume by Category"
          data={data?.byCategory ?? []}
        />
        <BarChartCard
          title="Volume by Location"
          data={data?.byLocation ?? []}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartCard
          title="Volume by Severity"
          data={data?.bySeverity ?? []}
        />
        <div className="rounded-lg border border-border bg-surface-raised p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">SLA Breach Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-strong">Acknowledge Overdue</span>
              <span className="text-lg font-bold text-foreground">
                {data?.breachCount.acknowledgeOverdue ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-strong">Resolve Overdue</span>
              <span className="text-lg font-bold text-foreground">
                {data?.breachCount.resolveOverdue ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reports</h1>
      <p className="mt-2 text-muted-strong">
        Campus maintenance analytics and export. Filter by time, severity, location, or status.
      </p>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <ReportsFilterPanelClient />
          </div>
        </div>
        <div className="lg:col-span-3">
          <Suspense
            fallback={
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 animate-pulse rounded-lg bg-surface-raised" />
                ))}
              </div>
            }
          >
            <ReportsContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
