import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { NotificationModel } from "@/lib/db/models/notification";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { evaluateBreachState } from "@/lib/sla/breach-detection";
import { paginateOffset } from "@/lib/utils/pagination";
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
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const keyword = url.searchParams.get("keyword")?.trim() ?? "";

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

  // Keyword search: match description, reporter email, category name, or location name
  if (keyword) {
    const regex = { $regex: keyword, $options: "i" };

    // Find matching reporter IDs
    const matchingUsers = await UserModel.find({ email: regex })
      .select("_id")
      .lean();
    const matchingUserIds = matchingUsers.map((u) => u._id);

    // Find matching category IDs
    const matchingCategories = await CategoryModel.find({ name: regex })
      .select("_id")
      .lean();
    const matchingCategoryIds = matchingCategories.map((c) => c._id);

    // Find matching location IDs
    const matchingLocations = await LocationModel.find({ name: regex })
      .select("_id")
      .lean();
    const matchingLocationIds = matchingLocations.map((l) => l._id);

    const orConditions = [
      { description: regex },
      ...(matchingUserIds.length > 0
        ? [{ reporterId: { $in: matchingUserIds } }]
        : []),
      ...(matchingCategoryIds.length > 0
        ? [{ categoryId: { $in: matchingCategoryIds } }]
        : []),
      ...(matchingLocationIds.length > 0
        ? [{ locationId: { $in: matchingLocationIds } }]
        : []),
    ];

    if (orConditions.length > 0) {
      query.$or = orConditions;
    }
  }

  query.status = { $ne: "Closed" };

  // Get all non-closed complaints for KPI counts
  const allNonClosed = await ComplaintModel.find(query)
    .select("_id slaAcknowledgeBy slaResolveBy status")
    .lean();

  const now = new Date();
  const totalCount = allNonClosed.length;
  const breachedCount = allNonClosed.filter((c) => {
    const breach = evaluateBreachState({
      complaint: {
        slaAcknowledgeBy: c.slaAcknowledgeBy as Date,
        slaResolveBy: c.slaResolveBy as Date,
        status: c.status as string,
      },
      now,
    });
    return breach.kind !== "none";
  }).length;

  // Get unassigned count
  const allNonClosedIds = allNonClosed.map((c) => String(c._id));
  const assignedComplaintIds = await AssignmentModel.distinct("complaintId", {
    complaintId: { $in: allNonClosedIds },
  });
  const unassignedCount = totalCount - assignedComplaintIds.length;

  const { data, meta } = await paginateOffset({
    model: ComplaintModel,
    query,
    sort: { slaAcknowledgeBy: 1, slaResolveBy: 1, createdAt: 1 },
    pageSize: 10,
    page,
  });

  const categoryIds = [...new Set(data.map((d) => String(d.categoryId)))];
  const locationIds = [...new Set(data.map((d) => String(d.locationId)))];
  const complaintIds = data.map((d) => d._id);

  const [categories, locations, assignments] = await Promise.all([
    CategoryModel.find({ _id: { $in: categoryIds } })
      .lean()
      .then(
        (docs) =>
          Object.fromEntries(
            docs.map((d) => [
              String(d._id),
              { systemType: d.systemType, defaultSeverity: d.defaultSeverity },
            ]),
          ),
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
  const reporterIds = [...new Set(data.filter((d) => !d.isAnonymous).map((d) => String(d.reporterId)).filter(Boolean))];

  const [techUsers, reporterUsers] = await Promise.all([
    UserModel.find({ _id: { $in: techIds } })
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), d.name])),
      ),
    UserModel.find({ _id: { $in: reporterIds } })
      .select("name email")
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), { name: d.name, email: d.email }])),
      ),
  ]);

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
    const reporter = doc.isAnonymous ? null : reporterUsers[String(doc.reporterId)] ?? null;

    return {
      ...publicDoc,
      categoryName: category?.systemType ?? null,
      categoryDefaultSeverity: category?.defaultSeverity ?? null,
      locationName: locations[String(doc.locationId)] ?? null,
      breachKind: breachState.kind,
      overdueMs: breachState.overdueMs,
      currentAssignee: latestAssignments.get(String(doc._id)) ?? null,
      reporterName: reporter?.name ?? null,
      reporterEmail: reporter?.email ?? null,
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

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const escalatedComplaintIds = await NotificationModel.distinct("complaintId", {
    type: "escalation",
    createdAt: { $gte: oneHourAgo },
  });

  return NextResponse.json(
    { data: publicData, meta, escalatedRecentCount: escalatedComplaintIds.length, totalCount, breachedCount, unassignedCount },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
