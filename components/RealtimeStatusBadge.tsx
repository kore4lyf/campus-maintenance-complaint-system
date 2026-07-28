"use client";

import { useEffect, useState } from "react";
import { Radio, RadioOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";
import type { QueryKey } from "@tanstack/react-query";

interface RealtimeStatusBadgeProps {
  channelName: string;
  queryKey: QueryKey;
}

const FALLBACK_DELAY_MS = 5000;

export function RealtimeStatusBadge({
  channelName,
  queryKey,
}: RealtimeStatusBadgeProps) {
  const { connectionState } = useAblyChannel({
    name: channelName,
    queryKey,
  });
  // Defer showing the "paused" badge for five seconds so a quick
  // re-handshake doesn't flash as a degraded state to the user.
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (connectionState === "disconnected" || connectionState === "suspended") {
      const timer = setTimeout(() => setShowFallback(true), FALLBACK_DELAY_MS);
      return () => clearTimeout(timer);
    }
    setShowFallback(false);
  }, [connectionState]);

  if (connectionState === "connected") {
    return (
      <Badge
        tone="success"
        leadingIcon={<Radio className="h-3 w-3" aria-hidden="true" />}
      >
        Live · auto-refreshing
      </Badge>
    );
  }

  if (showFallback) {
    return (
      <Badge
        tone="warning"
        leadingIcon={<RadioOff className="h-3 w-3" aria-hidden="true" />}
      >
        Paused · polling fallback
      </Badge>
    );
  }

  return (
    <Badge
      tone="neutral"
      leadingIcon={
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      }
    >
      Connecting…
    </Badge>
  );
}
