import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";
import { evaluateBreachState } from "@/lib/sla/breach-detection";
import { toCsv, formatDateForFilename } from "@/lib/utils/csv";

function parseTimeWindow(time: string | null, from: string | null, to: string | null): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start: Date;

  switch (time) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "custom":
      start = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          Object.assign(end, toDate);
        }
      }
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  if (isNaN(start.getTime())) start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { start, end };
}

const COLUMNS = [
  { key: "complaintId", header: "Complaint ID" },
  { key: "createdAt", header: "Created At" },
  { key: "status", header: "Status" },
  { key: "priority", header: "Priority" },
  { key: "category", header: "Category" },
  { key: "location", header: "Location" },
  { key: "slaAcknowledgeBy", header: "SLA Acknowledge By" },
  { key: "slaResolveBy", header: "SLA Resolve By" },
  { key: "resolvedAt", header: "Resolved At" },
  { key: "breachKind", header: "Breach Kind" },
];

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!authorizeRole(session, "dicht_admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await connect();

  const { searchParams } = new URL(request.url);
  const time = searchParams.get("time");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const severity = searchParams.getAll("severity");
  const locationId = searchParams.getAll("locationId");
  const status = searchParams.getAll("status");

  const { start, end } = parseTimeWindow(time, from, to);

  const matchStage: Record<string, unknown> = {
    createdAt: { $gte: start, $lte: end },
  };

  if (severity.length > 0) {
    matchStage.priority = { $in: severity };
  }

  if (locationId.length > 0) {
    matchStage.locationId = { $in: locationId.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (status.length > 0) {
    matchStage.status = { $in: status };
  }

  const complaints = await ComplaintModel
    .find(matchStage)
    .lean();

  const categoryIds = [...new Set(complaints.map((c) => String(c.categoryId)))];
  const locationIds = [...new Set(complaints.map((c) => String(c.locationId)))];

  const [categories, locations] = await Promise.all([
    categoryIds.length > 0 ? CategoryModel.find({ _id: { $in: categoryIds } }).lean() : [],
    locationIds.length > 0 ? LocationModel.find({ _id: { $in: locationIds } }).lean() : [],
  ]);

  const categoryMap = new Map<string, string>(
    categories.map((c) => [
      String(c._id),
      c.systemType,
    ]),
  );
  const locationMap = new Map<string, string>(
    locations.map((l) => [
      String(l._id),
      l.name,
    ]),
  );

  const now = new Date();
  const rows = complaints.map((c) => {
    const breach = evaluateBreachState({ complaint: c as any, now });
    return {
      complaintId: String(c._id),
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      status: c.status,
      priority: c.priority,
      category: categoryMap.get(String(c.categoryId)) ?? "Unknown",
      location: locationMap.get(String(c.locationId)) ?? "Unknown",
      slaAcknowledgeBy: c.slaAcknowledgeBy instanceof Date ? c.slaAcknowledgeBy.toISOString() : String(c.slaAcknowledgeBy),
      slaResolveBy: c.slaResolveBy instanceof Date ? c.slaResolveBy.toISOString() : String(c.slaResolveBy),
      resolvedAt: c.resolvedAt instanceof Date ? c.resolvedAt.toISOString() : "",
      breachKind: breach.kind,
    };
  });

  const csv = toCsv(rows, COLUMNS);
  const filename = `cms-lasu-report-${formatDateForFilename(now)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
