import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { evaluateBreachState } from "@/lib/sla/breach-detection";
import { paginateCursor } from "@/lib/utils/pagination";
import { toPublicComplaint } from "@/lib/utils/pii";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function badRequest(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "content-type": "application/json" } },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return badRequest("unauthenticated", "Authentication required", 401);
  }

  if (!authorizeRole(session, "dicht_technician")) {
    return badRequest("forbidden", "Technician access required", 403);
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const techAssignments = await AssignmentModel.find({
    assignedToTechId: session.user.id,
  })
    .sort({ assignedAt: -1 })
    .lean();

  const complaintIds = [...new Set(techAssignments.map((a) => String(a.complaintId)))];

  if (complaintIds.length === 0) {
    return NextResponse.json(
      { data: [], meta: { nextCursor: null, hasMore: false } },
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  const query: Record<string, unknown> = {
    _id: { $in: complaintIds },
    status: { $ne: "Closed" },
  };

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

  const [categories, locations] = await Promise.all([
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
  ]);

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
      locationName: locations[String(doc.locationId)] ?? null,
      breachKind: breachState.kind,
      overdueMs: breachState.overdueMs,
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
