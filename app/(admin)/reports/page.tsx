"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Inbox, RefreshCw, Download, CalendarClock } from "lucide-react";
import { ReportsFilterPanel } from "@/components/admin/ReportsFilterPanel";
import { BarChartCard } from "@/components/admin/BarChartCard";
import { BreachCountCard } from "@/components/admin/BreachCountCard";
import { ExportButtons } from "@/components/admin/ExportButtons";
import { Card,
  SectionHeader,
} from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";

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
  if (hours < 24) return `${hours} hr`;
  const days = Math.round(hours / 24);
  return `${days} d`;
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

  const queryString = params.toString();

  const { data: reportsData, isLoading: reportsLoading } = useQuery<ReportsResponse>({
    queryKey: ["admin-reports", time, severity.join(","), locationId.join(","), status.join(",")],
    queryFn: async () => {
      const response = await fetch(`/api/admin/reports?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const data = reportsData?.data;
  const totalInView = reportsData?.meta.totalCount ?? 0;
  const hasData = totalInView > 0;

  return (
    <div className="space-y-6">
      <Card padding="md" variant="raised" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
              Filter summary
            </p>
            <p className="text-base font-semibold text-foreground-strong">
              <span className="numeric">{totalInView}</span>{" "}
              {totalInView === 1 ? "complaint" : "complaints"} in current view
            </p>
          </div>
        </div>
        <ExportButtons />
      </Card>

      {/* ---------- Numeric summary strip ---------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BreachCountCard
          acknowledgeOverdue={data?.breachCount.acknowledgeOverdue ?? 0}
          resolveOverdue={data?.breachCount.resolveOverdue ?? 0}
        />
        <Card padding="md" variant="surface">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-strong">
              Avg resolution time
            </p>
            <CalendarClock className="h-4 w-4 text-muted-strong" aria-hidden="true" />
          </div>
          <p className="numeric mt-3 text-4xl font-semibold tracking-tight text-foreground-strong">
            {formatDuration(data?.avgResolutionMs ?? null)}
          </p>
          <p className="mt-1 text-xs text-muted-strong">
            Median of all resolved complaints in this filter set.
          </p>
        </Card>
        <Card padding="md" variant="surface">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-strong">
              Backlog
            </p>
            <RefreshCw className="h-4 w-4 text-muted-strong" aria-hidden="true" />
          </div>
          <p className="numeric mt-3 text-4xl font-semibold tracking-tight text-foreground-strong">
            {data?.backlog ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-strong">
            Submitted &gt; 7 days ago and not yet resolved.
          </p>
        </Card>
      </div>

      {/* ---------- Charts ---------- */}
      {reportsLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="lg">
                <SkeletonLines count={3} />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} padding="lg">
                <SkeletonLines count={5} />
              </Card>
            ))}
          </div>
        </div>
      ) : !hasData ? (
        <Card padding="lg" variant="surface" className="text-center">
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Inbox className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-semibold text-foreground-strong">
              No complaints match these filters
            </h3>
            <p className="max-w-sm text-sm text-muted-strong">
              Widen the time window or clear severity and location filters
              to see analytics here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard
              eyebrow="By category"
              title="Volume by fault type"
              data={data?.byCategory ?? []}
              axisHint="Top categories"
            />
            <BarChartCard
              eyebrow="By location"
              title="Volume by campus location"
              data={data?.byLocation ?? []}
              axisHint="Top hostels, blocks, labs"
            />
          </div>
          <BarChartCard
            eyebrow="By severity"
            title="Volume by severity"
            data={data?.bySeverity ?? []}
            axisHint="Severity reflects the AI triage or category default"
            height={160}
          />
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <PageShell>
      <HeroBand
        kicker="DICT Console"
        title="Reports"
        subtitle="Campus maintenance analytics. Filter by time, severity, location, or status; export the filtered set as CSV or PDF for an external audience."
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-strong">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Refreshes every 60 s
          </div>
        }
      />
      <HeroBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ReportsFilterPanelClient />
            </div>
          </div>
          <div className="lg:col-span-3">
            <Suspense
              fallback={
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} padding="lg">
                        <SkeletonLines count={3} />
                      </Card>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[1, 2].map((i) => (
                      <Card key={i} padding="lg">
                        <SkeletonLines count={5} />
                      </Card>
                    ))}
                  </div>
                </div>
              }
            >
              <ReportsContent />
            </Suspense>
          </div>
        </div>
      </HeroBody>
    </PageShell>
  );
}
