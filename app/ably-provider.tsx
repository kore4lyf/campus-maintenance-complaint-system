"use client";

import { useEffect, useState } from "react";
import { AblyProvider } from "ably/react";
import * as Ably from "ably";

export function AblyClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) return;

    const realtime = new Ably.Realtime({
      key: apiKey,
      clientId: `lasu-${window.crypto.randomUUID().slice(0, 8)}`,
    });

    setClient(realtime);

    return () => {
      realtime.close();
    };
  }, []);

  if (!client) return <>{children}</>;

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
