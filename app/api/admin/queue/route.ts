import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { evaluateBreachState } from "@/lib/sla/breach-detection";
import { paginateCursor } from "@/lib/utils/pagination";
import { toPublicComplaint } from "@/lib/utils/pii";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function badRequest(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "content-type": "application/json" } },
  );
}

function parseAgeFilter(age: string | null): Date | null {
  if (!age || age === "all") return null;
  const now = new Date();
  if (age === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (age === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (age === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return badRequest("unauthenticated", "Authentication required", 401);
  }

  if (!authorizeRole(session, "dicht_admin")) {
    return badRequest("forbidden", "Admin access required", 403);
  }

  const url = new URL(request.url);
  const severity = url.searchParams.get("severity");
  const age = url.searchParams.get("age");
  const locationId = url.searchParams.get("locationId");
  const cursor = url.searchParams.get("cursor");

  const query: Record<string, unknown> = {};

  if (severity && ["Critical", "High", "Medium", "Low"].includes(severity)) {
    query.priority = severity;
  }

  if (locationId && isValidObjectId(locationId)) {
    query.locationId = locationId;
  }

  const ageFilter = parseAgeFilter(age);
  if (ageFilter) {
    query.createdAt = { $gte: ageFilter };
  }

  query.status = { $ne: "Closed" };

  const { data, meta } = await paginateCursor({
    model: ComplaintModel,
    query,
    sort: { slaAcknowledgeBy: 1, slaResolveBy: 1, createdAt: 1 },
    pageSize: 50,
    cursor,
  });

  const now = new Date();
  const categoryIds = [...new Set(data.map((d) => String(d.categoryId)))];
  const locationIds = [...new Set(data.map((d) => String(d.locationId)))];
  const complaintIds = data.map((d) => d._id);

  const [categories, locations, assignments] = await Promise.all([
    CategoryModel.find({ _id: { $in: categoryIds } })
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), d])),
      ),
    LocationModel.find({ _id: { $in: locationIds } })
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), d.name])),
      ),
    AssignmentModel.find({ complaintId: { $in: complaintIds } })
      .sort({ assignedAt: -1 })
      .lean(),
  ]);

  const latestAssignments = new Map<string, { assignedToTechId: string; assignedToName: string }>();
  for (const assignment of assignments) {
    const complaintId = String(assignment.complaintId);
    if (!latestAssignments.has(complaintId)) {
      latestAssignments.set(complaintId, {
        assignedToTechId: String(assignment.assignedToTechId),
        assignedToName: "",
      });
    }
  }

  const techIds = [...new Set(assignments.map((a) => String(a.assignedToTechId)))];
  const techUsers = await UserModel.find({ _id: { $in: techIds } })
    .lean()
    .then((docs) =>
      Object.fromEntries(docs.map((d) => [String(d._id), d.name])),
    );

  for (const [, value] of latestAssignments) {
    value.assignedToName = techUsers[value.assignedToTechId] ?? "Unknown";
  }

  const publicData = data.map((doc) => {
    const breachState = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: doc.slaAcknowledgeBy as Date,
        slaResolveBy: doc.slaResolveBy as Date,
        status: doc.status as string,
      },
      now,
    });

    const publicDoc = toPublicComplaint(doc as unknown as Record<string, unknown>);
    const category = categories[String(doc.categoryId)];

    return {
      ...publicDoc,
      categoryName: category?.systemType ?? null,
      categoryDefaultSeverity: category?.defaultSeverity ?? null,
      locationName: locations[String(doc.locationId)] ?? null,
      breachKind: breachState.kind,
      overdueMs: breachState.overdueMs,
      currentAssignee: latestAssignments.get(String(doc._id)) ?? null,
      __v: doc.__v,
    };
  });

  publicData.sort((a, b) => {
    if (a.breachKind !== "none" && b.breachKind === "none") return -1;
    if (a.breachKind === "none" && b.breachKind !== "none") return 1;
    if (a.breachKind === "acknowledge_overdue" && b.breachKind !== "acknowledge_overdue") return -1;
    if (b.breachKind === "acknowledge_overdue" && a.breachKind !== "acknowledge_overdue") return 1;
    if (a.breachKind === "resolve_overdue" && b.breachKind === "none") return -1;
    if (b.breachKind === "resolve_overdue" && a.breachKind === "none") return 1;
    const ackA = new Date(a.slaAcknowledgeBy).getTime();
    const ackB = new Date(b.slaAcknowledgeBy).getTime();
    if (ackA !== ackB) return ackA - ackB;
    const resA = new Date(a.slaResolveBy).getTime();
    const resB = new Date(b.slaResolveBy).getTime();
    return resA - resB;
  });

  return NextResponse.json(
    { data: publicData, meta },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
