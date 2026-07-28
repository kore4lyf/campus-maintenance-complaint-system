import Link from "next/link";
import { Inbox, ListFilter, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { ReactNode } from "react";

interface AdminQueueEmptyProps {
  hasFilters?: boolean | undefined;
  onClearFilters?: (() => void) | undefined;
}

export function AdminQueueEmpty({
  hasFilters,
  onClearFilters,
}: AdminQueueEmptyProps): ReactNode {
  if (hasFilters) {
    return (
      <EmptyState
        variant="compact"
        icon={<ListFilter className="h-4 w-4" aria-hidden="true" />}
        title="No complaints match the current filters"
        description="Try widening the time window or clearing severity and location filters."
        primaryAction={
          onClearFilters ? (
            <Button variant="secondary" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<Inbox className="h-9 w-9" aria-hidden="true" />}
      title="Queue is empty"
      description="No complaints are waiting. New submissions will appear here as they come in, with their AI-inferred severity and SLA timer."
      primaryAction={
        <Link href="/admin/reports">
          <Button variant="secondary" size="md" trailingIcon={<ArrowRight className="h-4 w-4" />}>
            View reports
          </Button>
        </Link>
      }
    />
  );
}
