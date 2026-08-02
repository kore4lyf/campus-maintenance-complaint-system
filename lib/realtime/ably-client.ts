"use client";

import Ably from "ably";

let clientPromise: Promise<Ably.Realtime> | null = null;

const CONNECT_TIMEOUT_MS = 10_000;

export async function getAblyClient(): Promise<Ably.Realtime> {
  if (clientPromise) return clientPromise;

  clientPromise = new Promise<Ably.Realtime>((resolve, reject) => {
    const realtime = new Ably.Realtime({
      authUrl: "/api/ably/auth",
      echoMessages: false,
    });

    const timeout = setTimeout(() => {
      clientPromise = null;
      realtime.close();
      reject(new Error("Ably connection timed out"));
    }, CONNECT_TIMEOUT_MS);

    realtime.connection.on("connected", () => {
      clearTimeout(timeout);
      resolve(realtime);
    });

    realtime.connection.on("failed", (stateChange) => {
      clearTimeout(timeout);
      clientPromise = null;
      reject(
        new Error(stateChange.reason?.message || "Ably connection failed"),
      );
    });

    realtime.connection.on("disconnected", () => {
      // Do not resolve — this means the connection dropped.
      // Ably will attempt to reconnect automatically.
    });
  });

  return clientPromise;
}
