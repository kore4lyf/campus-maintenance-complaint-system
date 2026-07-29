"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { History, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { H3, Kicker } from "@/components/ui/type";

interface RecentAction {
  complaintId: string;
  assignedToName: string;
  changedAt: string;
}

export function RecentActionsFeed() {
  const { data, isLoading } = useQuery<{ data: RecentAction[] }>({
    queryKey: ["recent-actions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/queue/recent-actions?limit=10");
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const actions = data?.data ?? [];

  return (
    <Card padding="md" className="sticky top-24">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
            Recent
          </p>
          <div className="mt-1">
            <H3>Assignment activity</H3>
          </div>
        </div>
        <History className="h-4 w-4 text-muted-strong" aria-hidden="true" />
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonLines count={2} />
            </div>
          ))}
        </div>
      ) : actions.length === 0 ? (
        <EmptyState
          variant="compact"
          title="No assignment activity"
          description="The last 24 hours have no recent assignments."
        />
      ) : (
        <ol className="space-y-3">
          {actions.map((action, index) => (
            <li
              key={`${action.complaintId}-${index}`}
              className="group flex items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-surface-raised"
            >
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground-strong">
                  Assigned to{" "}
                  <span className="font-semibold">{action.assignedToName}</span>
                </p>
                <p className="numeric mt-0.5 text-xs text-muted-strong">
                  {formatDistanceToNowStrict(new Date(action.changedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
