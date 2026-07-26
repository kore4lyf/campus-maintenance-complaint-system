import { FileText } from "lucide-react";

export function ReporterDashboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-surface-raised p-4">
        <FileText className="h-10 w-10 text-muted" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        No complaints yet
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-strong">
        You haven&apos;t submitted any complaints yet. Submit your first
        maintenance complaint to get started.
      </p>
      <a
        href="/complaints/new"
        className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
      >
        Submit a complaint
      </a>
    </div>
  );
}
