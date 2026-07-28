import Link from "next/link";
import { PlusCircle, ArrowRight, Sparkles } from "lucide-react";
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
            leadingIcon={<PlusCircle className="h-4 w-4" />}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Submit a complaint
          </Button>
        </Link>
      }
      secondaryAction={
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-strong">
          <Sparkles className="h-3 w-3 text-accent-strong" aria-hidden="true" />
          Anonymous submission is supported for sensitive issues.
        </span>
      }
    />
  );
}
