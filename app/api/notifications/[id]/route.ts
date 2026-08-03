import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { NotificationModel } from "@/lib/db/models/notification";
import { getServerSession } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const { id } = await params;

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: id, recipientId: session.user.id },
    { read: true },
    { new: true },
  );

  if (!notification) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Notification not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: notification }, { status: 200 });
}
