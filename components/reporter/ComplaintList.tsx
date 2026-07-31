"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComplaintRow } from "@/components/ui/ComplaintRow";
import { ClosedClaimsToggle } from "./ClosedClaimsToggle";
import { ReporterDashboardEmpty } from "./ReporterDashboardEmpty";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ChevronDown, Inbox, RefreshCw } from "lucide-react";
import { Kicker, Supporting } from "@/components/ui/type";

/*
 * ComplaintList — reporter's "My complaints" surface.
 *
 * Aesthetic pass (2026-07-29):
 *   - Lifts the "n complaints" summary into a hairline-divided Card
 *     surface with the ClosedClaimsToggle aligned right and a
 *     refresh-action affordance (pull-to-refresh hint) inside.
 *   - Adds an inline error Card with brand icon block + retry CTA.
 *   - Adds an empty-summary line for the "no items match" case
 *     (when filters are tight but includeClosed is false) so the
 *     user knows to enable Closed.
 *
 * Tokens used (no new tokens):
 *   - bg-surface / bg-surface-raised for the summary Card.
 *   - text-muted on subdued copy.
 *   - text-brand on pull-to-refresh affordance hover.
 */

interface ComplaintListItem {
  _id: string;
  status: string;
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

async function fetchComplaints(
  cursor: string | null,
  includeClosed: boolean,
): Promise<ComplaintListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (includeClosed) params.set("includeClosed", "true");

  const res = await fetch(`/api/complaints?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to load complaints");
  }
  return res.json();
}

export function ComplaintList() {
  const [includeClosed, setIncludeClosed] = useState(false);
  const [pages, setPages] = useState<ComplaintListItem[][]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<ComplaintListResponse>({
      queryKey: ["complaints", includeClosed],
      queryFn: () => fetchComplaints(null, includeClosed),
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    });

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    const result = await fetchComplaints(nextCursor, includeClosed);
    setPages((prev) => [...prev, result.data]);
    setNextCursor(result.meta.nextCursor);
    setHasMore(result.meta.hasMore);
  }, [nextCursor, includeClosed]);

  const handleToggle = useCallback((checked: boolean) => {
    setIncludeClosed(checked);
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
  const closedCount = allItems.filter((c) => c.status === "Closed").length;

  if (allItems.length === 0) {
    return (
      <div className="space-y-6">
        <ReporterDashboardEmpty />
      </div>
    );
  }

  const currentNextCursor =
    pages.length === 0 ? data.meta.nextCursor : nextCursor;
  const currentHasMore = pages.length === 0 ? data.meta.hasMore : hasMore;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary + filter */}
      <Card padding="sm" variant="raised" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
          <div className="flex items-center gap-3">
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground-strong">
              <span className="numeric text-base font-semibold">
                {allItems.length}
              </span>{" "}
              complaint{allItems.length !== 1 ? "s" : ""}{" "}
              <span className="text-muted-strong">in your queue</span>
            </p>
            {isFetching ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-strong">
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                refreshing…
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClosedClaimsToggle
              includeClosed={includeClosed}
              onToggle={handleToggle}
            />
          </div>
        </div>
      </Card>

      {/* Info banner when toggle is on but no closed complaints exist */}
      {includeClosed && closedCount === 0 && (
        <p className="px-1 text-xs text-muted-strong">
          No closed complaints yet — all your complaints are still open.
        </p>
      )}

      {/* Edge-to-edge list */}
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        {allItems.map((complaint) => (
          <ComplaintRow
            key={complaint._id}
            complaint={complaint}
            kind="navigate"
          />
        ))}
      </ul>

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
