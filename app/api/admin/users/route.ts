import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_ROLES = ["reporter", "dicht_admin", "dicht_technician"] as const;
const PAGE_SIZE = 10;

function badRequest(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "content-type": "application/json" } },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session) {
    return badRequest("unauthenticated", "Authentication required", 401);
  }

  if (!authorizeRole(session, "dicht_admin")) {
    return badRequest("forbidden", "Admin access required", 403);
  }

  await connect();

  const url = request.nextUrl;
  const search = url.searchParams.get("search")?.trim() ?? "";
  const role = url.searchParams.get("role");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const query: Record<string, unknown> = {};

  if (role && VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    query.role = role;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [totalCount, docs] = await Promise.all([
    UserModel.countDocuments(query),
    UserModel.find(query)
      .select("name email role createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return NextResponse.json(
    {
      data: docs.map((u) => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt?.toISOString(),
      })),
      meta: { page, pageSize: PAGE_SIZE, totalCount, totalPages },
    },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
