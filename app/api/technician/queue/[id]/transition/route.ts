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
import { compressAndUpload } from "@/lib/storage/cloudinary";
import { publishToChannel } from "@/lib/realtime/ably";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TECHNICIAN_TRANSITIONS: Record<string, string[]> = {
  Submitted: ["Acknowledged"],
  Acknowledged: ["In Progress"],
  "In Progress": ["Resolved"],
};

const transitionSchema = z.object({
  expectedVersion: z.number().int().min(0),
  toStatus: z.enum(["Acknowledged", "In Progress", "Resolved"]),
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

async function readPhotosFromRequest(
  request: Request,
): Promise<{ buffer: Buffer; mime: string; name: string | null }[]> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return [];
  }

  const form = await request.formData();
  const photos: { buffer: Buffer; mime: string; name: string | null }[] = [];

  for (const [key, value] of form.entries()) {
    if (key.startsWith("photo") && value instanceof File && value.size > 0) {
      photos.push({
        buffer: Buffer.from(await value.arrayBuffer()),
        mime: value.type || "application/octet-stream",
        name: value.name ?? null,
      });
    }
  }

  return photos;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await connect();

  const { id: complaintId } = await params;

  const session = await getServerSession();
  if (!session) {
    return badRequest("unauthenticated", "Authentication required", 401);
  }

  if (!authorizeRole(session, "dicht_technician")) {
    return badRequest("forbidden", "Technician access required", 403);
  }

  if (!isValidObjectId(complaintId)) {
    return badRequest("invalid_input", "Complaint ID is not valid", 422);
  }

  const assignment = await AssignmentModel.findOne({
    complaintId,
    assignedToTechId: session.user.id,
  }).lean();

  if (!assignment) {
    return badRequest("not_found", "Complaint not assigned to you", 404);
  }

  let body: unknown;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const rawBody = form.get("body");
    if (typeof rawBody === "string") {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }
    } else {
      body = {};
    }
  } else {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  const validated = transitionSchema.safeParse(body);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    return badRequest("invalid_input", issue?.message ?? "Invalid input", 422);
  }

  const { expectedVersion, toStatus, note } = validated.data;

  const complaint = await ComplaintModel.findOne({ _id: complaintId }).lean();
  if (!complaint) {
    return badRequest("not_found", "Complaint not found", 404);
  }

  const currentStatus = complaint.status as string;
  const allowed = VALID_TECHNICIAN_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    return badRequest(
      "invalid_transition",
      `Cannot transition from ${currentStatus} to ${toStatus}`,
      422,
    );
  }

  let photos: { buffer: Buffer; mime: string; name: string | null }[] = [];
  try {
    photos = await readPhotosFromRequest(request);
  } catch {
    // Photos are optional for In Progress, required for Resolved
  }

  if (toStatus === "Resolved" && photos.length === 0) {
    return badRequest(
      "invalid_photo",
      "Resolved status requires exactly one proof-of-fix photo",
      422,
    );
  }

  if (toStatus === "Resolved" && photos.length > 1) {
    return badRequest(
      "invalid_photo",
      "Resolved status requires exactly one proof-of-fix photo",
      422,
    );
  }

  let photoUrls: string[] = [];
  if (photos.length > 0) {
    try {
      const uploads = await Promise.all(
        photos.map((photo) =>
          compressAndUpload({
            buffer: photo.buffer,
            mime: photo.mime,
            ...(photo.name ? { originalName: photo.name } : {}),
          }),
        ),
      );
      photoUrls = uploads.map((u) => u.url);
    } catch (err) {
      if (err instanceof ApiError) {
        return badRequest(err.code, err.message, err.status);
      }
      return badRequest("upload_failed", "Failed to upload photo", 500);
    }
  }

  const now = new Date();

  const updateData: Record<string, unknown> = {
    status: toStatus,
  };

  if (toStatus === "Resolved" && photoUrls.length > 0) {
    updateData.proofPhotoUrl = photoUrls[0];
    updateData.resolvedAt = now;
  }

  const updated = await ComplaintModel.findOneAndUpdate(
    { _id: complaintId, __v: expectedVersion },
    { $set: updateData, $inc: { __v: 1 } },
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

  const statusHistory = await StatusHistoryModel.create({
    complaintId,
    fromStatus: currentStatus,
    toStatus,
    changedById: session.user.id,
    changedBySystem: false,
    note: note ?? null,
    photoUrl: photoUrls[0] ?? null,
    changedAt: now,
  });

  const notificationIds: string[] = [];

  const assignmentRecord = await AssignmentModel.findOne({ complaintId })
    .sort({ assignedAt: -1 })
    .lean();

  if (assignmentRecord) {
    const adminNotification = await NotificationModel.create({
      complaintId,
      recipientId: assignmentRecord.assignedById,
      type: "status",
      message: `${session.user.name} changed status to ${toStatus}`,
      read: false,
    });
    notificationIds.push(String(adminNotification._id));
  }

  if (!complaint.isAnonymous && complaint.reporterId) {
    const reporterNotification = await NotificationModel.create({
      complaintId,
      recipientId: complaint.reporterId,
      type: "status",
      message: `Your complaint status has been updated to ${toStatus}`,
      read: false,
    });
    notificationIds.push(String(reporterNotification._id));
  }

  let ablyPushOk = false;
  try {
    if (assignmentRecord) {
      await publishToChannel({
        channelName: `admin-queue`,
        eventName: "status-update",
        data: { complaintId, newStatus: toStatus },
      });
    }

    if (!complaint.isAnonymous && complaint.reporterId) {
      await publishToChannel({
        channelName: `user:${String(complaint.reporterId)}`,
        eventName: "status-update",
        data: { complaintId, newStatus: toStatus },
      });
    }

    ablyPushOk = true;
  } catch {
    // Ably push is best effort
  }

  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/technician/queue");
    revalidatePath(`/technician/queue/${complaintId}`);
    revalidatePath("/admin/queue");
  } catch {
    // Cache revalidation may be unavailable
  }

  return NextResponse.json(
    {
      data: {
        complaintId,
        newVersion: updated.__v as number,
        statusHistoryId: String(statusHistory._id),
        notificationIds,
        ablyPushOk,
      },
    },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
