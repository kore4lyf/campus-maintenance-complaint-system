"use client";

import { useEffect, useState } from "react";
import { Radio, RadioOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";
import type { QueryKey } from "@tanstack/react-query";

/*
 * RealtimeStatusBadge — DICT console connection status pill.
 *
 * Aesthetic: an inline status affordance that reads as a hairline-pill
 * with a translucent tone-mapped fill. Uses the project's Badge
 * primitive + semantic tone mapping (success / warning / neutral) so
 * the colour stays in the locked palette. The pulse dot on the
 * "connected" state animates via dot-pulse so a DICT console operator
 * can confirm the channel is wired without leaving the queue.
 *
 * Astryx mapping:
 *   - tone="success" → Astryx Banner.status="success" colour pair.
 *   - the leadingIcon slot uses the project's Lucide pattern.
 *
 * Tokens used (no new tokens):
 *   - bg-success (the live dot & fill)
 *   - bg-warning (polling fallback)
 *   - bg-muted (connecting)
 *   - text-success-strong / text-warning-strong / text-muted-strong
 *     (paired via the existing Badge primitives)
 */

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
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success-strong ring-1 ring-inset ring-success/20"
        aria-label="Live connection active"
      >
        <span
          aria-hidden="true"
          className="relative flex h-1.5 w-1.5 items-center justify-center"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        <Radio className="h-3 w-3" aria-hidden="true" />
        <span>Live · auto-refreshing</span>
      </span>
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
