import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { NotificationModel } from "@/lib/db/models/notification";
import { getServerSession } from "@/lib/auth/dal";
import { paginateCursor } from "@/lib/utils/pagination";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const query: Record<string, unknown> = {
    recipientId: session.user.id,
  };

  if (unreadOnly) {
    query.read = false;
  }

  const { data, meta } = await paginateCursor({
    model: NotificationModel,
    query,
    sort: { createdAt: -1 },
    pageSize: 20,
    cursor,
  });

  // Get unread count (always, regardless of filters)
  const unreadCount = await NotificationModel.countDocuments({
    recipientId: session.user.id,
    read: false,
  });

  return NextResponse.json(
    { data, meta, unreadCount },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
