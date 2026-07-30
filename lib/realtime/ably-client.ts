"use client";

import Ably from "ably";

let clientPromise: Promise<Ably.Realtime> | null = null;

export async function getAblyClient(): Promise<Ably.Realtime> {
  if (clientPromise) return clientPromise;

  clientPromise = new Promise<Ably.Realtime>((resolve, reject) => {
    const realtime = new Ably.Realtime({
      authUrl: "/api/ably/auth",
      echoMessages: false,
    });

    realtime.connection.on("connected", () => resolve(realtime));
    realtime.connection.on("failed", (stateChange) => {
      reject(
        new Error(
          stateChange.reason?.message || "Ably connection failed",
        ),
      );
    });
    realtime.connection.on("disconnected", () => resolve(realtime));
  });

  return clientPromise;
}
