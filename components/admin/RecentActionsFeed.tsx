"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";

interface RecentAction {
  complaintId: string;
  assignedToName: string;
  changedAt: string;
}

export function RecentActionsFeed() {
  const { data, isLoading } = useQuery<{
    data: RecentAction[];
  }>({
    queryKey: ["recent-actions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/queue/recent-actions?limit=10");
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const actions = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Recent Actions</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-surface-raised" />
          ))}
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Recent Actions</h3>
        <p className="text-xs text-muted-strong">
          No assignments in the last 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Recent Actions</h3>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <div
            key={`${action.complaintId}-${index}`}
            className="rounded-lg bg-surface-raised p-3 text-xs"
          >
            <p className="text-muted-strong">
              Assigned to{" "}
              <span className="font-medium text-foreground">
                {action.assignedToName}
              </span>
            </p>
            <p className="mt-1 text-muted">
              {formatDistanceToNowStrict(new Date(action.changedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
