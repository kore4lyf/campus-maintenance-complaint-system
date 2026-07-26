import { Wrench } from "lucide-react";

export function TechnicianQueueEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-surface-raised p-4">
        <Wrench className="h-10 w-10 text-muted" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        No assigned complaints
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-strong">
        You don&apos;t have any assigned complaints yet. New assignments will
        appear here.
      </p>
    </div>
  );
}
