"use client";

import * as Ably from "ably";

let clientPromise: Promise<Ably.Realtime> | null = null;

export function getAblyClient(): Promise<Ably.Realtime> {
  if (clientPromise) return clientPromise;

  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!apiKey) {
    clientPromise = Promise.reject(
      new Error("NEXT_PUBLIC_ABLY_API_KEY is not set"),
    );
    return clientPromise;
  }

  clientPromise = new Promise<Ably.Realtime>((resolve) => {
    const realtime = new Ably.Realtime({
      key: apiKey,
      clientId: `lasu-${typeof window !== "undefined" ? window.crypto.randomUUID().slice(0, 8) : "ssr"}`,
    });
    resolve(realtime);
  });

  return clientPromise;
}
