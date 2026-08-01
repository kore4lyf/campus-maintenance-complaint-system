import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_ROLES = ["reporter", "dicht_admin", "dicht_technician"] as const;
const PAGE_SIZE = 10;

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

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
  const cursor = url.searchParams.get("cursor");

  const query: Record<string, unknown> = {};

  // Role filter
  if (role && VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    query.role = role;
  }

  // Search: match name or email (case-insensitive)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Cursor pagination
  if (cursor && isValidObjectId(cursor)) {
    query._id = { $lt: cursor };
  }

  const docs = await UserModel.find(query)
    .select("name email role createdAt")
    .sort({ _id: -1 })
    .limit(PAGE_SIZE + 1)
    .lean();

  const hasMore = docs.length > PAGE_SIZE;
  const data = hasMore ? docs.slice(0, PAGE_SIZE) : docs;
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem._id) : null;

  // Total count for current filter (without pagination)
  const totalCount = await UserModel.countDocuments(query);

  return NextResponse.json(
    {
      data: data.map((u) => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt?.toISOString(),
      })),
      meta: { nextCursor, hasMore, totalCount },
    },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
