import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
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

export async function GET(): Promise<NextResponse> {
  await connect();

  const session = await getServerSession();
  if (!session) {
    return badRequest("unauthenticated", "Authentication required", 401);
  }

  if (!authorizeRole(session, "dicht_admin")) {
    return badRequest("forbidden", "Admin access required", 403);
  }

  const technicians = await UserModel.find({ role: "dicht_technician" })
    .select("name email")
    .lean();

  const data = technicians.map((t) => ({
    _id: String(t._id),
    name: t.name,
    email: t.email,
  }));

  return NextResponse.json(
    { data },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
