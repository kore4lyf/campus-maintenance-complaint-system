import { Inbox } from "lucide-react";

export function AdminQueueEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-surface-raised p-4">
        <Inbox className="h-10 w-10 text-muted" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        Queue is empty
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-strong">
        Nothing in the queue right now. New complaints will appear here as they
        come in.
      </p>
    </div>
  );
}
