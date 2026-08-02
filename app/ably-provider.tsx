"use client";

import { useEffect, useRef, useState } from "react";
import { AblyProvider } from "ably/react";
import * as Ably from "ably";
import { useSessionStatus } from "@/lib/auth/role-context";

const PLACEHOLDER = new Ably.Realtime({ key: "placeholder:does-not-connect" });

export function AblyClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<Ably.Realtime>(PLACEHOLDER);
  const [error, setError] = useState<Error | null>(null);
  const sessionStatus = useSessionStatus();
  const activeClient = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    let cancelled = false;

    async function init() {
      try {
        const realtime = new Ably.Realtime({
          authUrl: "/api/ably/auth",
          echoMessages: false,
        });

        if (cancelled) {
          realtime.close();
          return;
        }

        realtime.connection.on("failed", (stateChange) => {
          if (!cancelled) {
            setError(
              new Error(
                stateChange.reason?.message || "Ably connection failed",
              ),
            );
          }
        });

        activeClient.current = realtime;
        setClient(realtime);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (activeClient.current) {
        activeClient.current.close();
        activeClient.current = null;
      }
    };
  }, [sessionStatus]);

  if (error) {
    return <>{children}</>;
  }

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
