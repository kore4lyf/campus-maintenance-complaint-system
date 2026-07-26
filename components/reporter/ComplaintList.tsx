"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComplaintCard } from "./ComplaintCard";
import { ClosedClaimsToggle } from "./ClosedClaimsToggle";
import { ReporterDashboardEmpty } from "./ReporterDashboardEmpty";

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
  categoryName?: string;
  locationName?: string;
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

  const { data, isLoading, isError } = useQuery<ComplaintListResponse>({
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
            className="h-28 animate-pulse rounded-lg border border-border bg-surface-raised"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
        Failed to load complaints. Please try again.
      </div>
    );
  }

  const firstPage = data.data ?? [];
  const allItems = [...firstPage, ...pages.flat()];

  if (allItems.length === 0) {
    return (
      <div>
        <ReporterDashboardEmpty />
      </div>
    );
  }

  const currentNextCursor = pages.length === 0 ? data.meta.nextCursor : nextCursor;
  const currentHasMore = pages.length === 0 ? data.meta.hasMore : hasMore;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {allItems.length} complaint{allItems.length !== 1 ? "s" : ""}
        </p>
        <ClosedClaimsToggle
          includeClosed={includeClosed}
          onToggle={handleToggle}
        />
      </div>

      <div className="flex flex-col gap-3">
        {allItems.map((complaint) => (
          <ComplaintCard key={complaint._id} complaint={complaint} />
        ))}
      </div>

      {currentHasMore ? (
        <button
          type="button"
          onClick={() => {
            setPages((prev) => [...prev, []]);
            setNextCursor(currentNextCursor);
            setHasMore(currentHasMore);
            void handleLoadMore();
          }}
          className="mt-2 w-full rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}
