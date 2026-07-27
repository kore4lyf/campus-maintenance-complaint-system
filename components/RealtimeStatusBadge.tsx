"use client";

import { useState, useEffect } from "react";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";
import type { QueryKey } from "@tanstack/react-query";

export function RealtimeStatusBadge({
  channelName,
  queryKey,
}: {
  channelName: string;
  queryKey: QueryKey;
}) {
  const { connectionState } = useAblyChannel({
    name: channelName,
    queryKey,
  });
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (connectionState === "disconnected" || connectionState === "suspended") {
      const timer = setTimeout(() => setShowFallback(true), 5000);
      return () => clearTimeout(timer);
    }
    setShowFallback(false);
  }, [connectionState]);

  if (connectionState === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Live
      </span>
    );
  }

  if (showFallback) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Live updates paused, using polling fallback
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      Connecting...
    </span>
  );
}
