import { NextResponse } from "next/server";
import { z } from "zod";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { StatusHistoryModel } from "@/lib/db/models/status-history";
import { NotificationModel } from "@/lib/db/models/notification";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { ApiError } from "@/lib/utils/errors";
import { publishAssignmentNotification } from "@/lib/realtime/ably";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const assignSchema = z.object({
  complaintId: z.string().min(1, "complaintId is required"),
  assignedToTechId: z.string().min(1, "assignedToTechId is required"),
  expectedVersion: z.number().int().min(0, "expectedVersion is required"),
  note: z.string().max(500, "Note must be 500 characters or fewer").optional(),
});

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function badRequest(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "content-type": "application/json" } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return badRequest("unauthenticated", "Authentication required", 401);
  }

  if (!authorizeRole(session, "dicht_admin")) {
    return badRequest("forbidden", "Admin access required", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid_body", "Invalid JSON body", 422);
  }

  const validated = assignSchema.safeParse(body);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    return badRequest("invalid_input", issue?.message ?? "Invalid input", 422);
  }

  const { complaintId, assignedToTechId, expectedVersion, note } = validated.data;

  if (!isValidObjectId(complaintId)) {
    return badRequest("invalid_input", "complaintId is not a valid id", 422);
  }
  if (!isValidObjectId(assignedToTechId)) {
    return badRequest("invalid_input", "assignedToTechId is not a valid id", 422);
  }

  const techUser = await UserModel.findOne({ _id: assignedToTechId }).lean();
  if (!techUser) {
    return badRequest("invalid_technician", "Technician not found", 404);
  }
  if (techUser.role !== "dicht_technician") {
    return badRequest("invalid_technician", "User is not a technician", 422);
  }

  const updated = await ComplaintModel.findOneAndUpdate(
    { _id: complaintId, __v: expectedVersion },
    { $inc: { __v: 1 } },
    { new: true },
  );

  if (!updated) {
    const current = await ComplaintModel.findOne({ _id: complaintId }).lean();
    if (!current) {
      return badRequest("not_found", "Complaint not found", 404);
    }
    return NextResponse.json(
      { error: { code: "stale_write", message: "Version mismatch. Please refresh and try again." } },
      { status: 409, headers: { "content-type": "application/json" } },
    );
  }

  const now = new Date();

  const assignment = await AssignmentModel.create({
    complaintId,
    assignedToTechId,
    assignedById: session.user.id,
    assignedAt: now,
  });

  const statusHistory = await StatusHistoryModel.create({
    complaintId,
    fromStatus: updated.status,
    toStatus: updated.status,
    changedById: session.user.id,
    changedBySystem: false,
    note: note ?? null,
    changedAt: now,
  });

  const notification = await NotificationModel.create({
    complaintId,
    recipientId: assignedToTechId,
    type: "assignment",
    message: `${session.user.name} assigned this complaint to you`,
    read: false,
  });

  let ablyPushOk = false;
  try {
    ablyPushOk = await publishAssignmentNotification({
      technicianId: assignedToTechId,
      complaintId,
      adminName: session.user.name,
    });
  } catch {
    // Ably push is best effort; do not block the assignment write
  }

  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin/queue");
  } catch {
    // Cache revalidation may be unavailable; ignore
  }

  return NextResponse.json(
    {
      data: {
        assignmentId: String(assignment._id),
        statusHistoryId: String(statusHistory._id),
        notificationId: String(notification._id),
        ablyPushOk,
      },
    },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
