import Link from "next/link";
import { Wrench, ArrowRight, Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/*
 * TechnicianQueueEmpty — empty surface for the technician queue.
 *
 * Aesthetic: same pattern as ReporterDashboardEmpty and AdminQueueEmpty —
 * brand-tinted icon block, hairline CTA stack, restrained footnote. The
 * compact variant (when filters are active) keeps the surface a single
 * line of dashed panel copy without re-painting with a fresh visual.
 */

interface TechnicianQueueEmptyProps {
  hasFilters?: boolean | undefined;
  onClearFilters?: (() => void) | undefined;
}

const TOOL_ICON = (props: { className?: string }) => (
  // Wrap in a brand-tinted block so it pairs with the EmptyState icon-as-
  // accent pattern shared on reporter / admin counterparts.
  <span
    className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand"
    aria-hidden="true"
  >
    <Wrench className={props.className} />
  </span>
);

const INBOX_ICON = (props: { className?: string }) => (
  <span
    className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand"
    aria-hidden="true"
  >
    <Inbox className={props.className} />
  </span>
);

export function TechnicianQueueEmpty({
  hasFilters,
  onClearFilters,
}: TechnicianQueueEmptyProps) {
  if (hasFilters) {
    return (
      <EmptyState
        variant="compact"
        icon={<INBOX_ICON className="h-4 w-4" />}
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
      icon={<TOOL_ICON className="h-6 w-6" />}
      title="No assigned complaints"
      description="You don't have any assigned complaints yet. New assignments appear here in real time with a priority badge and an SLA timer."
      primaryAction={
        <Link href="/technician/assignments">
          <Button
            variant="secondary"
            size="md"
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Refresh queue
          </Button>
        </Link>
      }
    />
  );
}
