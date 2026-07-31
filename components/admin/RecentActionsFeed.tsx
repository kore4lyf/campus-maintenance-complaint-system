"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { History, ArrowRight, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { H3 } from "@/components/ui/type";

interface RecentAction {
  complaintId: string;
  assignedToName: string;
  changedAt: string;
}

const PAGE_SIZE = 5;

export function RecentActionsFeed() {
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading } = useQuery<{ data: RecentAction[] }>({
    queryKey: ["recent-actions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/queue/recent-actions?limit=50");
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const allActions = data?.data ?? [];
  const displayedActions = showAll ? allActions : allActions.slice(0, PAGE_SIZE);
  const hasMore = allActions.length > PAGE_SIZE;

  return (
    <>
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
        ) : allActions.length === 0 ? (
          <EmptyState
            variant="compact"
            title="No assignment activity"
            description="The last 24 hours have no recent assignments."
          />
        ) : (
          <>
            <ol className="space-y-3">
              {displayedActions.map((action, index) => (
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
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setShowAll(true)}
                >
                  View all
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {showAll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All recent assignments"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowAll(false)}
        >
          <Card
            padding="none"
            variant="overlay"
            className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
              <H3>All recent assignments</H3>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ol className="space-y-3">
                {allActions.map((action, index) => (
                  <li
                    key={`${action.complaintId}-${index}`}
                    className="flex items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-surface-raised"
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
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
