"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import {
  Inbox,
  RefreshCw,
  CalendarClock,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { ReportsFilterPanel } from "@/components/admin/ReportsFilterPanel";
import { BarChartCard } from "@/components/admin/BarChartCard";
import { BreachCountCard } from "@/components/admin/BreachCountCard";
import { ExportButtons } from "@/components/admin/ExportButtons";
import { NumericCard } from "@/components/admin/NumericCard";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { H3, Kicker, Supporting } from "@/components/ui/type";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";

/*
 * Reports page — Admin DICT analytics.
 *
 * Modernisation pass: rebuild the page composition around the project
 * typed primitives (NumericCard, BarChartCard, BreachCountCard, Card,
 * Kicker, H3, Supporting) and add a contextual breach ribbon that
 * delegates to Astryx's <Banner status="error">. The rhythm follows
 * Apple's "summary strip → KPI row → evidence row" dashboard pattern,
 * with the proper Astryx spacing scale (16 / 24 / 32 px gutters) and
 * a hairline brand-rule between regions rather than a heavyweight card
 * stack.
 *
 * Colour discipline (Spec 0014 / design.md):
 *   - Gold accent reserved for: kicker label, focus rings, refresh
 *     badge dot, success dot. No large gold fills.
 *   - Severity-only red on BreachCountCard; muted elsewhere.
 *   - No new tokens introduced; every class resolves through the
 *     existing `--color-*` palette.
 */

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
  if (ms === null) return "—";
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

  const { data: reportsData, isLoading: reportsLoading } =
    useQuery<ReportsResponse>({
      queryKey: [
        "admin-reports",
        time,
        severity.join(","),
        locationId.join(","),
        status.join(","),
      ],
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
  const breachTotal =
    (data?.breachCount.acknowledgeOverdue ?? 0) +
    (data?.breachCount.resolveOverdue ?? 0);

  return (
    <div className="space-y-8">
      {/* ---------- Context strip: filter summary + export ---------- */}
      <Card
        padding="md"
        variant="raised"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <Kicker>Filter summary</Kicker>
            <p className="numeric mt-1 text-lg font-semibold tracking-[-0.01em] text-foreground-strong">
              <span className="text-2xl font-semibold">{totalInView}</span>{" "}
              {totalInView === 1 ? "complaint" : "complaints"} in current view
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons />
        </div>
      </Card>

      {/* ---------- Conditional breach banner (Astryx <Banner>) ---------- */}
      {breachTotal > 0 ? (
        <Banner
          status="error"
          container="section"
          title={`${breachTotal} complaint${breachTotal === 1 ? "" : "s"} with SLA breaches in this view`}
          description="Resolve overdue escalates to DICT Director per the SLA policy. Acknowledge overdue is the early-warning band."
          icon={
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/15 text-danger">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
          }
        />
      ) : null}

      {/* ---------- KPI summary strip (3-up numeric grid) ---------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BreachCountCard
          acknowledgeOverdue={data?.breachCount.acknowledgeOverdue ?? 0}
          resolveOverdue={data?.breachCount.resolveOverdue ?? 0}
        />
        <NumericCard
          label="Avg resolution time"
          value={formatDuration(data?.avgResolutionMs ?? null)}
          subtitle="Median time-to-resolve across the closed complaints in this filter set."
          icon={
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          }
          tone="info"
        />
        <NumericCard
          label="Backlog"
          value={data?.backlog ?? 0}
          subtitle="Submitted more than 7 days ago and still not resolved."
          icon={<RefreshCw className="h-5 w-5" aria-hidden="true" />}
          tone="warning"
        />
      </div>

      {/* ---------- Evidence row (charts) ---------- */}
      {reportsLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="lg" variant="surface">
                <SkeletonLines count={3} />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} padding="lg" variant="surface">
                <SkeletonLines count={5} />
              </Card>
            ))}
          </div>
        </div>
      ) : !hasData ? (
        <Card
          padding="lg"
          variant="surface"
          className="flex flex-col items-center gap-3 py-10 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Inbox className="h-6 w-6" aria-hidden="true" />
          </span>
          <H3>No complaints match these filters</H3>
          <Supporting className="max-w-sm">
            Widen the time window or clear severity and location filters to
            see analytics here.
          </Supporting>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard
              eyebrow="By category"
              title="Volume by fault type"
              data={data?.byCategory ?? []}
              axisHint="Top categories"
              totalLabel="Total"
            />
            <BarChartCard
              eyebrow="By location"
              title="Volume by campus location"
              data={data?.byLocation ?? []}
              axisHint="Top hostels, blocks, labs"
              totalLabel="Total"
            />
          </div>
          <BarChartCard
            eyebrow="By severity"
            title="Volume by severity"
            data={data?.bySeverity ?? []}
            axisHint="Severity reflects the AI triage or category default"
            height={160}
            totalLabel="Total"
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-strong">
            Live data
          </span>
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
                      <Card key={i} padding="lg" variant="surface">
                        <SkeletonLines count={3} />
                      </Card>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[1, 2].map((i) => (
                      <Card key={i} padding="lg" variant="surface">
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
