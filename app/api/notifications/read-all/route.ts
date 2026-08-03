import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { NotificationModel } from "@/lib/db/models/notification";
import { getServerSession } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const result = await NotificationModel.updateMany(
    { recipientId: session.user.id, read: false },
    { read: true },
  );

  return NextResponse.json(
    { data: { modifiedCount: result.modifiedCount } },
    { status: 200 },
  );
}
