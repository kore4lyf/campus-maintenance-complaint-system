import Link from "next/link";
import { Wrench, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

interface TechnicianQueueEmptyProps {
  hasFilters?: boolean | undefined;
  onClearFilters?: (() => void) | undefined;
}

export function TechnicianQueueEmpty({
  hasFilters,
  onClearFilters,
}: TechnicianQueueEmptyProps) {
  if (hasFilters) {
    return (
      <EmptyState
        variant="compact"
        icon={<Wrench className="h-4 w-4" aria-hidden="true" />}
        title="Nothing in this view"
        description="Adjust your filters or check back as new assignments come in."
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
      icon={<Wrench className="h-9 w-9" aria-hidden="true" />}
      title="No assigned complaints"
      description="You don't have any assigned complaints yet. New assignments appear here in real time with a priority badge and an SLA timer."
      primaryAction={
        <Link href="/technician/queue">
          <Button variant="secondary" size="md" trailingIcon={<ArrowRight className="h-4 w-4" />}>
            Refresh queue
          </Button>
        </Link>
      }
    />
  );
}
