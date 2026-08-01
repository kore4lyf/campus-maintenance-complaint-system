"use client";

import { useEffect, useState } from "react";
import { AblyProvider } from "ably/react";
import * as Ably from "ably";
import { useSessionStatus } from "@/lib/auth/role-context";

export function AblyClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const sessionStatus = useSessionStatus();

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
    };
  }, [sessionStatus]);

  if (error) {
    return <>{children}</>;
  }

  if (!client) return <>{children}</>;

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
