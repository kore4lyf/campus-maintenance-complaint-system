export function NotificationSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3">
          <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-muted/15" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/15" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/15" />
          </div>
        </div>
      ))}
    </div>
  );
}
