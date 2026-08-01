import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connect } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AssignRoleSchema = z.object({
  role: z.enum(["reporter", "dicht_admin", "dicht_technician"]),
});

function badRequest(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "content-type": "application/json" } },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session) {
    return badRequest("unauthenticated", "Authentication required", 401);
  }

  if (!authorizeRole(session, "dicht_admin")) {
    return badRequest("forbidden", "Admin access required", 403);
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid_input", "Request body must be valid JSON", 422);
  }

  const parsed = AssignRoleSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid role",
      422,
    );
  }

  await connect();

  const targetUser = await UserModel.findById(id).lean();
  if (!targetUser) {
    return badRequest("not_found", "User not found", 404);
  }

  // Prevent self-demotion
  if (id === session.user.id && parsed.data.role !== "dicht_admin") {
    return badRequest(
      "invalid_operation",
      "You cannot change your own admin role",
      422,
    );
  }

  const updated = await UserModel.findByIdAndUpdate(
    id,
    { $set: { role: parsed.data.role } },
    { new: true },
  ).lean();

  if (!updated) {
    return badRequest("update_failed", "Failed to update user role", 500);
  }

  return NextResponse.json(
    {
      data: {
        _id: String(updated._id),
        email: updated.email,
        name: updated.name,
        role: updated.role,
      },
    },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
