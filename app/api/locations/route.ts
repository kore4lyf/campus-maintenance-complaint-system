import { NextResponse } from "next/server";
import { connect } from "@/lib/db/connection";
import { LocationModel } from "@/lib/db/models/location";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  await connect();

  const locations = await LocationModel
    .find()
    .sort({ name: 1 })
    .lean();

  const data = locations.map((loc) => ({
    _id: String(loc._id),
    name: loc.name,
    area: loc.area,
  }));

  return NextResponse.json(
    { data },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
