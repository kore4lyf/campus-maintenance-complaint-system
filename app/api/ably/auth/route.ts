import { NextResponse } from "next/server";
import Ably from "ably";
import { getSession } from "@/lib/auth/config";

export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    console.error("[ably/auth] getSession threw:", err);
    return NextResponse.json(
      { error: "Session check failed" },
      { status: 401 },
    );
  }

  if (!session?.user) {
    console.warn("[ably/auth] No session — user not signed in");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.error("[ably/auth] ABLY_API_KEY is not set");
    return NextResponse.json(
      { error: "Ably is not configured" },
      { status: 500 },
    );
  }

  const role = (session.user as { role?: string }).role;
  const userId = session.user.id;

  const capability: { [key: string]: string[] } = {
    [`notifications:${userId}`]: ["subscribe"],
  };

  if (role === "dicht_admin") {
    capability["admin:queue"] = ["subscribe"];
    capability["admin:escalations"] = ["subscribe"];
  } else if (role === "dicht_technician") {
    capability["technician:queue"] = ["subscribe"];
  }

  try {
    const client = new Ably.Rest({ key: apiKey });
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: userId,
      capability: capability as { [key: string]: ("publish" | "subscribe" | "presence")[] },
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenRequest);
  } catch (err) {
    console.error("[ably/auth] createTokenRequest failed:", err);
    return NextResponse.json(
      { error: "Failed to create Ably token" },
      { status: 500 },
    );
  }
}
