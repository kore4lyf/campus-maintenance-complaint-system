import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuth } from "@/lib/auth/config";
import { connect } from "@/lib/db/connection";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    role?: "reporter" | "dicht_admin" | "dicht_technician";
  };
  const email = body.email ?? `test-user-${Date.now()}@test.lasu.edu.ng`;
  const password = body.password ?? "TestPassword123!";
  const name = body.name ?? "Test User";
  const role = body.role ?? "reporter";

  const auth = await getAuth();

  const result = await auth.api.signUpEmail({
    body: { email, password, name },
    headers: new Headers(),
    asResponse: false,
  });

  if (!result?.user) {
    const errorObj = (result as unknown as { error?: { code?: string; message?: string } })?.error;
    return NextResponse.json(
      { error: errorObj?.message ?? "Sign-up failed", code: errorObj?.code },
      { status: 500 },
    );
  }

  // Better-auth stores the user but does not always set our additional `role`
  // field on the raw document, so patch it through the MongoDB collection
  // so the auth DAL can resolve reporter / admin / technician consistently.
  await connect();
  const db = mongoose.connection.db;
  if (db) {
    await db.collection("user").updateOne(
      { email },
      { $set: { role } },
    );
  }

  return NextResponse.json({ email, userId: result.user.id });
}
