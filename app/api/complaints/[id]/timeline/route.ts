import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { StatusHistoryModel } from "@/lib/db/models/status-history";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { UserModel } from "@/lib/db/models/user";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { getServerSession, type Role } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await connect();
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Complaint not found" } },
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Authentication required" } },
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  if (!isValidObjectId(session.user.id)) {
    return NextResponse.json(
      { error: { code: "invalid_session", message: "Session user id is invalid" } },
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const complaint = await ComplaintModel.findOne({ _id: id }).lean();
  if (!complaint) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Complaint not found" } },
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  const ownerReporterId = complaint.reporterId
    ? String(complaint.reporterId)
    : null;

  if (session.user.role === "reporter") {
    if (!ownerReporterId || ownerReporterId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "forbidden", message: "You can only view your own complaints" } },
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
  } else if (session.user.role === "dicht_technician") {
    const assignment = await AssignmentModel.findOne({
      complaintId: id,
      assignedToTechId: session.user.id,
    }).lean();
    if (!assignment) {
      return NextResponse.json(
        { error: { code: "forbidden", message: "You are not assigned to this complaint" } },
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
  }

  const history = await StatusHistoryModel
    .find({ complaintId: id })
    .sort({ changedAt: -1 })
    .lean();

  const actorIds = [
    ...new Set(
      history
        .filter((h) => h.changedById && !h.changedBySystem)
        .map((h) => String(h.changedById)),
    ),
  ];

  const actors =
    actorIds.length > 0
      ? await UserModel
          .find({ _id: { $in: actorIds } })
          .lean()
          .then(
            (docs) =>
              Object.fromEntries(
                docs.map((d) => [
                  String(d._id),
                  { name: d.name, role: d.role },
                ]),
              ),
          )
      : {};

  const timeline = history.map((entry) => {
    const actor = entry.changedById ? actors[String(entry.changedById)] : null;
    return {
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedById: entry.changedById ? String(entry.changedById) : undefined,
      changedByName: entry.changedBySystem
        ? undefined
        : actor?.name ?? undefined,
      changedByRole: entry.changedBySystem
        ? "system"
        : actor?.role ?? undefined,
      changedBySystem: entry.changedBySystem ?? false,
      note: entry.note ?? undefined,
      photoUrl: entry.photoUrl ?? null,
      changedAt: entry.changedAt
        ? new Date(entry.changedAt).toISOString()
        : new Date().toISOString(),
    };
  });

  return NextResponse.json(
    { data: timeline },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
