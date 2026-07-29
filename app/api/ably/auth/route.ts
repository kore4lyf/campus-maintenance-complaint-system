import { NextResponse } from "next/server";
import Ably from "ably";
import { getSession } from "@/lib/auth/config";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Ably is not configured" },
      { status: 500 },
    );
  }

  try {
    const client = new Ably.Rest({ key: apiKey });
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: session.user.id,
      capability: {
        [`notifications:${session.user.id}`]: ["subscribe"],
      },
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenRequest);
  } catch {
    return NextResponse.json(
      { error: "Failed to create Ably token" },
      { status: 500 },
    );
  }
}
