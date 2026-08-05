"use client";

import { useState, useCallback, memo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ComplaintRow } from "@/components/ui/ComplaintRow";
import {
  ComplaintFilters,
  type ComplaintFiltersState,
} from "./ComplaintFilters";
import { ReporterDashboardEmpty } from "./ReporterDashboardEmpty";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChevronDown, Inbox, RefreshCw } from "lucide-react";
import { Kicker, Supporting } from "@/components/ui/type";

interface ComplaintListItem {
  _id: string;
  status: string;
  isAnonymous?: boolean;
  categoryId: string;
  locationId: string;
  description: string;
  photoUrls?: string[];
  slaAcknowledgeBy: string;
  slaResolveBy: string;
  createdAt: string;
  priority?: "Critical" | "High" | "Medium" | "Low";
  categoryName?: string;
  locationName?: string;
  systemType?: string;
}

interface ComplaintListResponse {
  data: ComplaintListItem[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

const DEFAULT_FILTERS: ComplaintFiltersState = {
  includeClosed: false,
  anonymousOnly: false,
  status: "",
};

async function fetchComplaints(
  cursor: string | null,
  filters: ComplaintFiltersState,
): Promise<ComplaintListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.includeClosed) params.set("includeClosed", "true");
  if (filters.anonymousOnly) params.set("anonymousOnly", "true");
  if (filters.status) params.set("status", filters.status);

  const res = await fetch(`/api/complaints?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to load complaints");
  }
  return res.json();
}

const QueueCount = memo(function QueueCount({
  count,
}: {
  count: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-1.5 w-1.5 rounded-full bg-accent"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-foreground-strong">
        <span className="numeric text-base font-semibold">{count}</span>{" "}
        complaint{count !== 1 ? "s" : ""}{" "}
        <span className="text-muted-strong">in your queue</span>
      </p>
    </div>
  );
});

export function ComplaintList() {
  const [filters, setFilters] = useState<ComplaintFiltersState>(DEFAULT_FILTERS);
  const [pages, setPages] = useState<ComplaintListItem[][]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<ComplaintListResponse>({
      queryKey: ["complaints", filters],
      queryFn: () => fetchComplaints(null, filters),
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      placeholderData: keepPreviousData,
    });

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    const result = await fetchComplaints(nextCursor, filters);
    setPages((prev) => [...prev, result.data]);
    setNextCursor(result.meta.nextCursor);
    setHasMore(result.meta.hasMore);
  }, [nextCursor, filters]);

  const handleFilterChange = useCallback((newFilters: ComplaintFiltersState) => {
    setFilters(newFilters);
    setPages([]);
    setNextCursor(null);
    setHasMore(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-surface-raised"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card padding="lg" variant="surface" className="text-center">
        <div className="flex flex-col items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger"
            aria-hidden="true"
          >
            <Inbox className="h-6 w-6" />
          </span>
          <Kicker>Could not load your queue</Kicker>
          <p className="text-sm font-semibold text-foreground-strong">
            Network error or session expired.
          </p>
          <Supporting>
            Try again in a moment — we&apos;ll re-query quietly in the
            background.
          </Supporting>
          <Button
            variant="primary"
            size="md"
            onClick={() => refetch()}
            leadingIcon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const firstPage = data.data ?? [];
  const allItems = [...firstPage, ...pages.flat()];

  const currentNextCursor =
    pages.length === 0 ? data.meta.nextCursor : nextCursor;
  const currentHasMore = pages.length === 0 ? data.meta.hasMore : hasMore;

  const hasActiveFilters =
    filters.includeClosed || filters.anonymousOnly || filters.status !== "";

  return (
    <div className="flex flex-col gap-6">
      {/* Summary + filters */}
      <Card padding="sm" variant="raised" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
          <div className="flex items-center gap-3">
            <QueueCount count={allItems.length} />
            {isFetching ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-strong">
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                refreshing…
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ComplaintFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>
      </Card>

      {/* Empty states */}
      {allItems.length === 0 && !hasActiveFilters && (
        <ReporterDashboardEmpty />
      )}

      {allItems.length === 0 && hasActiveFilters && (
        <EmptyState
          icon={<Inbox className="h-9 w-9" aria-hidden="true" />}
          title="No complaints match"
          description="Try adjusting your filters to see more results."
        />
      )}

      {/* List */}
      {allItems.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {allItems.map((complaint) => (
            <ComplaintRow
              key={complaint._id}
              complaint={complaint}
              kind="navigate"
            />
          ))}
        </ul>
      )}

      {currentHasMore ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setPages((prev) => [...prev, []]);
              setNextCursor(currentNextCursor);
              setHasMore(currentHasMore);
              void handleLoadMore();
            }}
            trailingIcon={<ChevronDown className="h-4 w-4" aria-hidden="true" />}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
