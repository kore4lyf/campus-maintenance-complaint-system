import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { paginateOffset } from "@/lib/utils/pagination";

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

  if (!authorizeRole(session, "dicht_admin")) {
    return badRequest("forbidden", "Admin access required", 403);
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const scope = url.searchParams.get("scope") ?? "24h";

  const query: Record<string, unknown> = {
    assignedById: session.user.id,
  };

  if (scope === "24h") {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    query.assignedAt = { $gte: twentyFourHoursAgo };
  }

  const { data: recentAssignments, meta } = await paginateOffset({
    model: AssignmentModel,
    query,
    sort: { assignedAt: -1 },
    pageSize: 10,
    page,
  });

  if (recentAssignments.length === 0) {
    return NextResponse.json(
      { data: [], meta: { nextCursor: null, hasMore: false } },
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  const userIds = new Set<string>();
  for (const a of recentAssignments) {
    userIds.add(String(a.assignedToTechId));
    userIds.add(String(a.assignedById));
  }

  const users = await UserModel
    .find({ _id: { $in: [...userIds] } })
    .lean()
    .then((docs) =>
      Object.fromEntries(docs.map((d) => [String(d._id), d.name])),
    );

  // Fetch complaint titles and categories
  const complaintIds = recentAssignments.map((a) => a.complaintId);
  const [complaints, categories] = await Promise.all([
    ComplaintModel.find({ _id: { $in: complaintIds } })
      .select("categoryId description")
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), { categoryId: String(d.categoryId), description: d.description }])),
      ),
    CategoryModel.find({})
      .select("systemType")
      .lean()
      .then((docs) =>
        Object.fromEntries(docs.map((d) => [String(d._id), d.systemType])),
      ),
  ]);

  const data = recentAssignments.map((a) => {
    const techName = users[String(a.assignedToTechId)] ?? "Unknown";
    const assignerName = users[String(a.assignedById)] ?? "Unknown";
    const complaint = complaints[String(a.complaintId)];
    const categoryName = complaint ? categories[complaint.categoryId] ?? "Complaint" : "Complaint";
    const shortTitle = complaint?.description
      ? complaint.description.slice(0, 40) + (complaint.description.length > 40 ? "..." : "")
      : categoryName;
    return {
      complaintId: String(a.complaintId),
      complaintTitle: categoryName,
      complaintShortTitle: shortTitle,
      assignedByName: assignerName,
      assignedToName: techName,
      changedAt: a.assignedAt,
    };
  });

  return NextResponse.json(
    { data, meta },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
