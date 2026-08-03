import { Bell } from "lucide-react";

export function NotificationEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/15 text-muted">
        <Bell className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground-strong">
        You&apos;re all caught up
      </p>
      <p className="mt-1 text-xs text-muted">
        No notifications yet. We&apos;ll let you know when something happens.
      </p>
    </div>
  );
}
