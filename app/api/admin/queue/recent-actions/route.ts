import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";

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
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "10", 10) || 10, 1), 50);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentAssignments = await AssignmentModel
    .find({
      assignedById: session.user.id,
      assignedAt: { $gte: twentyFourHoursAgo },
    })
    .sort({ assignedAt: -1 })
    .limit(limit)
    .lean();

  if (recentAssignments.length === 0) {
    return NextResponse.json(
      { data: [] },
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

  const data = recentAssignments.map((a) => {
    const techName = users[String(a.assignedToTechId)] ?? "Unknown";
    return {
      complaintId: String(a.complaintId),
      assignedToName: techName,
      changedAt: a.assignedAt,
    };
  });

  return NextResponse.json(
    { data },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
