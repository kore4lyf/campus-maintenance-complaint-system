import Link from "next/link";
import { PlusCircle, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function ReporterDashboardEmpty() {
  return (
    <EmptyState
      icon={<PlusCircle className="h-9 w-9" aria-hidden="true" />}
      title="No complaints yet"
      description="Submit your first maintenance complaint and it will appear here with live status updates, an SLA timer, and proof-of-fix photos."
      primaryAction={
        <Link href="/complaints/new">
          <Button
            size="lg"
            variant="primary"
          >
            Submit a complaint
          </Button>
        </Link>
      }
      secondaryAction={
        <p className="text-xs text-muted-strong">
          Anonymous submission is supported for sensitive issues.
        </p>
      }
    />
  );
}
