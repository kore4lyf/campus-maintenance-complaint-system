import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { UserModel } from "@/lib/db/models/user";
import { StatusHistoryModel } from "@/lib/db/models/status-history";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { evaluateBreachState } from "@/lib/sla/breach-detection";
import { toPublicComplaint } from "@/lib/utils/pii";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TECHNICIAN_TRANSITIONS: Record<string, string[]> = {
  Submitted: ["Acknowledged"],
  Acknowledged: ["In Progress"],
  "In Progress": ["Resolved"],
};

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function badRequest(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "content-type": "application/json" } },
  );
}

export async function GET(
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

  const complaint = await ComplaintModel.findById(complaintId).lean();
  if (!complaint) {
    return badRequest("not_found", "Complaint not found", 404);
  }

  const now = new Date();
  const breachState = evaluateBreachState({
    complaint: {
      slaAcknowledgeBy: complaint.slaAcknowledgeBy as Date,
      slaResolveBy: complaint.slaResolveBy as Date,
      status: complaint.status as string,
    },
    now,
  });

  const category = await CategoryModel.findById(complaint.categoryId).lean();
  const location = await LocationModel.findById(complaint.locationId).lean();

  let reporterName = "Anonymous";
  if (!complaint.isAnonymous && complaint.reporterId) {
    const reporter = await UserModel.findById(complaint.reporterId)
      .select("name")
      .lean();
    reporterName = reporter?.name ?? "Unknown";
  }

  const statusHistory = await StatusHistoryModel.find({ complaintId })
    .sort({ changedAt: -1 })
    .lean();

  const currentStatus = complaint.status as string;
  const allowedTransitions = VALID_TECHNICIAN_TRANSITIONS[currentStatus] ?? [];

  const publicDoc = toPublicComplaint(complaint as unknown as Record<string, unknown>);

  const data = {
    ...publicDoc,
    categoryName: category?.systemType ?? null,
    locationName: location?.name ?? null,
    reporterName,
    breachKind: breachState.kind,
    overdueMs: breachState.overdueMs,
    allowedTransitions,
    statusHistory: statusHistory.map((sh) => ({
      _id: String(sh._id),
      fromStatus: sh.fromStatus,
      toStatus: sh.toStatus,
      note: sh.note,
      photoUrl: sh.photoUrl,
      changedAt: sh.changedAt,
      changedBySystem: sh.changedBySystem,
    })),
    __v: complaint.__v,
  };

  return NextResponse.json(
    { data },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
