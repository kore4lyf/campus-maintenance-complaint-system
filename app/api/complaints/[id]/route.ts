import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { getServerSession, type Role } from "@/lib/auth/dal";
import { toPublicComplaint } from "@/lib/utils/pii";
import { ApiError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SessionRoleOrNull = Role | null;

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function reporterView(doc: Record<string, unknown>): Record<string, unknown> {
  const publicDoc = toPublicComplaint(doc) as unknown as Record<string, unknown>;
  const {
    aiSuggestion: _aiSuggestion,
    escalated: _escalated,
    priority: _priority,
    ...rest
  } = publicDoc;
  void _aiSuggestion;
  void _escalated;
  void _priority;
  return rest;
}

function technicianView(doc: Record<string, unknown>): Record<string, unknown> {
  const publicDoc = toPublicComplaint(doc) as unknown as Record<string, unknown>;
  const { aiSuggestion: _aiSuggestion, ...rest } = publicDoc;
  void _aiSuggestion;
  return rest;
}

function adminView(doc: Record<string, unknown>): Record<string, unknown> {
  return toPublicComplaint(doc) as unknown as Record<string, unknown>;
}

function mapperFor(role: SessionRoleOrNull) {
  if (role === "dicht_admin") return adminView;
  if (role === "dicht_technician") return technicianView;
  return reporterView;
}

async function resolveSessionUser(): Promise<{
  userId: string;
  role: Role;
} | null> {
  const session = await getServerSession();
  if (!session) {
    return null;
  }
  if (!isValidObjectId(session.user.id)) {
    return null;
  }
  return { userId: session.user.id, role: session.user.role };
}

function notFound() {
  return NextResponse.json(
    { error: { code: "not_found", message: "Complaint not found" } },
    { status: 404, headers: { "content-type": "application/json" } },
  );
}

function forbidden(message = "Forbidden") {
  return NextResponse.json(
    { error: { code: "forbidden", message } },
    { status: 403, headers: { "content-type": "application/json" } },
  );
}

function unauthorised() {
  return NextResponse.json(
    { error: { code: "unauthenticated", message: "Authentication required" } },
    { status: 401, headers: { "content-type": "application/json" } },
  );
}

async function isAssigned(
  complaintId: string,
  technicianId: string,
): Promise<boolean> {
  const assignment = await AssignmentModel.findOne({
    complaintId,
    assignedToTechId: technicianId,
  }).lean();
  return Boolean(assignment);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await connect();
  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return notFound();
  }

  const session = await resolveSessionUser();
  if (!session) {
    return unauthorised();
  }

  let complaint: Record<string, unknown> | null = null;
  try {
    const doc = await ComplaintModel.findOne({ _id: id }).lean();
    complaint = doc ? (doc as unknown as Record<string, unknown>) : null;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status, headers: { "content-type": "application/json" } },
      );
    }
    throw err;
  }
  if (!complaint) {
    return notFound();
  }

  const ownerReporterId = complaint.reporterId
    ? String(complaint.reporterId)
    : null;

  if (session.role === "reporter") {
    if (!ownerReporterId || ownerReporterId !== session.userId) {
      return forbidden("You can only view your own complaints");
    }
  } else if (session.role === "dicht_technician") {
    const assigned = await isAssigned(id, session.userId);
    if (!assigned) {
      return forbidden("You are not assigned to this complaint");
    }
  }

  const view = mapperFor(session.role)(complaint);
  return NextResponse.json(
    { data: view },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
