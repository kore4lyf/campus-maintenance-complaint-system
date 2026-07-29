"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { getAblyClient } from "./ably-client";

type ConnectionState = "connecting" | "connected" | "disconnected" | "suspended";

export function useAblyChannel({
  name,
  queryKey,
}: {
  name: string;
  queryKey: QueryKey;
}) {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<
      typeof import("ably").Realtime.prototype.channels.get
    > | null = null;
    let realtime: import("ably").Realtime | null = null;

    async function subscribe() {
      try {
        realtime = await getAblyClient();
        if (cancelled) return;

        realtime.connection.on(
          (
            stateChange: import("ably").ConnectionStateChange,
          ) => {
            if (cancelled) return;
            const state = stateChange.current as ConnectionState;
            setConnectionState(state);
          },
        );

        const currentState = realtime.connection
          .state as ConnectionState;
        setConnectionState(currentState);

        channel = realtime.channels.get(name);
        channel.subscribe(() => {
          if (cancelled) return;
          queryClient.invalidateQueries({ queryKey });
        });
      } catch {
        if (!cancelled) setConnectionState("disconnected");
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [name, queryKey, queryClient]);

  return { connectionState };
}
