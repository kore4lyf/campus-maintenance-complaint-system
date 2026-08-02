"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { useAbly } from "ably/react";

type ConnectionState = "connecting" | "connected" | "disconnected" | "suspended";

export function useAblyChannel({
  name,
  queryKey,
}: {
  name: string;
  queryKey: QueryKey;
}) {
  const queryClient = useQueryClient();
  const ably = useAbly();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");

  useEffect(() => {
    if (!name || !ably) return;

    let cancelled = false;
    let channel: ReturnType<
      typeof import("ably").Realtime.prototype.channels.get
    > | null = null;

    function attachAndSubscribe() {
      if (cancelled) return;
      
      channel = ably.channels.get(name);
      
      try {
        channel.subscribe(() => {
          if (cancelled) return;
          queryClient.invalidateQueries({ queryKey });
        });
      } catch {
        // Subscribe failed, likely due to connection state
      }
    }

    const currentState = ably.connection.state as ConnectionState;
    setConnectionState(currentState);

    ably.connection.on(
      (
        stateChange: import("ably").ConnectionStateChange,
      ) => {
        if (cancelled) return;
        const state = stateChange.current as ConnectionState;
        setConnectionState(state);
        
        if (state === "connected") {
          attachAndSubscribe();
        }
      },
    );

    if (currentState === "connected") {
      attachAndSubscribe();
    }

    return () => {
      cancelled = true;
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [name, queryKey, queryClient, ably]);

  return { connectionState };
}
