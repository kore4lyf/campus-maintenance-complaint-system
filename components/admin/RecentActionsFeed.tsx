"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { History, ArrowRight, X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { H3 } from "@/components/ui/type";

interface RecentAction {
  complaintId: string;
  complaintTitle: string;
  complaintShortTitle: string;
  assignedByName: string;
  assignedToName: string;
  changedAt: string;
}

interface RecentActionsResponse {
  data: RecentAction[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

const PAGE_SIZE = 5;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export function RecentActionsFeed() {
  const [showAll, setShowAll] = useState(false);
  const [scope, setScope] = useState<"24h" | "all">("24h");

  const { data, isLoading } = useQuery<{ data: RecentAction[] }>({
    queryKey: ["recent-actions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/queue/recent-actions?scope=24h&page=1");
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const allActions = data?.data ?? [];
  const displayedActions = allActions.slice(0, PAGE_SIZE);
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
                      {action.complaintTitle} assigned to{" "}
                      <span className="font-semibold">{action.assignedToName}</span>
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Link
                        href={`/complaints/${action.complaintId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
                      >
                        #{action.complaintId.slice(-6).toUpperCase()}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                      <span className="text-xs text-muted">·</span>
                      <p className="numeric text-xs text-muted-strong">
                        {formatDistanceToNowStrict(new Date(action.changedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
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
        <AllAssignmentsModal
          scope={scope}
          setScope={setScope}
          onClose={() => setShowAll(false)}
        />
      )}
    </>
  );
}

function AllAssignmentsModal({
  scope,
  setScope,
  onClose,
}: {
  scope: "24h" | "all";
  setScope: (s: "24h" | "all") => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery<RecentActionsResponse>({
    queryKey: ["recent-actions-modal", scope, page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/queue/recent-actions?scope=${scope}&page=${page}`);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  const actions = data?.data ?? [];
  const meta = data?.meta;

  function handleScopeChange(newScope: "24h" | "all") {
    setScope(newScope);
    setPage(1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="All recent assignments"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
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
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Scope tabs */}
        <div className="flex gap-1 border-b border-border px-6 py-2">
          <button
            type="button"
            onClick={() => handleScopeChange("24h")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              scope === "24h"
                ? "bg-brand/10 text-brand"
                : "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong"
            }`}
          >
            Last 24 hours
          </button>
          <button
            type="button"
            onClick={() => handleScopeChange("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              scope === "all"
                ? "bg-brand/10 text-brand"
                : "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong"
            }`}
          >
            All time
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <SkeletonLines count={2} />
                </div>
              ))}
            </div>
          ) : actions.length === 0 ? (
            <EmptyState
              variant="compact"
              title="No assignments found"
              description={scope === "24h" ? "No assignments in the last 24 hours." : "No assignments yet."}
            />
          ) : (
            <>
              <div className="relative">
                {isFetching && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface/60">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  </div>
                )}
                <ol className={`space-y-3 transition-opacity ${isFetching ? "pointer-events-none opacity-60" : ""}`}>
                  {actions.map((action, index) => (
                    <li
                      key={`${action.complaintId}-${index}`}
                      className="flex items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-surface-raised"
                    >
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground-strong">
                          <Link
                            href={`/complaints/${action.complaintId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-brand transition-colors hover:text-brand-strong"
                          >
                            {action.complaintShortTitle}
                          </Link>
                          {" "}assigned to{" "}
                          <span className="font-semibold">{action.assignedToName}</span>
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Link
                            href={`/complaints/${action.complaintId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
                          >
                            #{action.complaintId.slice(-6).toUpperCase()}
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                          <span className="text-xs text-muted">·</span>
                          <p className="numeric text-xs text-muted-strong">
                            {formatDistanceToNowStrict(new Date(action.changedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Numbered pagination */}
              {meta && meta.totalPages > 1 && (
                <nav
                  className="mt-4 flex items-center justify-between border-t border-border pt-3"
                  aria-label="Assignments pagination"
                >
                  <p className="text-xs text-muted-strong">
                    {meta.totalCount} assignment{meta.totalCount !== 1 ? "s" : ""} — page {meta.page} of {meta.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={meta.page <= 1 || isFetching}
                      onClick={() => setPage((p) => p - 1)}
                      leadingIcon={<ChevronLeft className="h-4 w-4" />}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {getPageNumbers(meta.page, meta.totalPages).map((num, i) =>
                        num === "..." ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-strong">…</span>
                        ) : (
                          <button
                            key={num}
                            type="button"
                            disabled={isFetching}
                            onClick={() => setPage(num)}
                            aria-current={num === meta.page ? "page" : undefined}
                            className={`min-w-[2rem] rounded px-2 py-1 text-sm font-medium transition-colors ${
                              num === meta.page
                                ? "bg-brand text-white"
                                : "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong"
                            } disabled:opacity-50`}
                          >
                            {num}
                          </button>
                        ),
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={meta.page >= meta.totalPages || isFetching}
                      onClick={() => setPage((p) => p + 1)}
                      trailingIcon={<ChevronRight className="h-4 w-4" />}
                    >
                      Next
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
