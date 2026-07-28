import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { getServerSession, authorizeRole } from "@/lib/auth/dal";

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

  const now = new Date();

  const [result] = await ComplaintModel.aggregate([
    { $match: matchStage },
    {
      $facet: {
        byCategory: [
          { $group: { _id: "$categoryId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byLocation: [
          { $group: { _id: "$locationId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        bySeverity: [
          { $group: { _id: "$priority", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        breachCount: [
          {
            $match: {
              status: "Submitted",
              slaAcknowledgeBy: { $lt: now },
            },
          },
          { $count: "acknowledgeOverdue" },
        ],
        resolveBreachCount: [
          {
            $match: {
              status: { $in: ["Acknowledged", "In Progress"] },
              slaResolveBy: { $lt: now },
            },
          },
          { $count: "resolveOverdue" },
        ],
        avgResolution: [
          {
            $match: {
              status: { $in: ["Resolved", "Closed"] },
              resolvedAt: { $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              avgMs: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } },
            },
          },
        ],
        backlog: [
          {
            $match: {
              status: { $nin: ["Resolved", "Closed"] },
              createdAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
          { $count: "count" },
        ],
        totalCount: [{ $count: "total" }],
      },
    },
  ]);

  const byCategoryRaw = result?.byCategory ?? [];
  const byLocationRaw = result?.byLocation ?? [];
  const bySeverityRaw = result?.bySeverity ?? [];
  const breachAck = result?.breachCount?.[0]?.acknowledgeOverdue ?? 0;
  const breachRes = result?.resolveBreachCount?.[0]?.resolveOverdue ?? 0;
  const avgResMs = result?.avgResolution?.[0]?.avgMs ?? null;
  const backlogCount = result?.backlog?.[0]?.count ?? 0;
  const totalCount = result?.totalCount?.[0]?.total ?? 0;

  const categoryIds = byCategoryRaw.map((r: { _id: string }) => r._id);
  const locationIds = byLocationRaw.map((r: { _id: string }) => r._id);

  const [categories, locations] = await Promise.all([
    categoryIds.length > 0 ? CategoryModel.find({ _id: { $in: categoryIds } }).lean() : [],
    locationIds.length > 0 ? LocationModel.find({ _id: { $in: locationIds } }).lean() : [],
  ]);

  const categoryMap = new Map(categories.map((c) => [String(c._id), c.systemType]));
  const locationMap = new Map(locations.map((l) => [String(l._id), l.name]));

  const byCategory = byCategoryRaw.map((r: { _id: string; count: number }) => ({
    name: categoryMap.get(String(r._id)) ?? "Unknown",
    count: r.count,
  }));

  const byLocation = byLocationRaw.map((r: { _id: string; count: number }) => ({
    name: locationMap.get(String(r._id)) ?? "Unknown",
    count: r.count,
  }));

  const bySeverity = bySeverityRaw.map((r: { _id: string; count: number }) => ({
    name: r._id,
    count: r.count,
  }));

  return NextResponse.json(
    {
      data: {
        byCategory,
        byLocation,
        bySeverity,
        breachCount: {
          acknowledgeOverdue: breachAck,
          resolveOverdue: breachRes,
        },
        avgResolutionMs: avgResMs,
        backlog: backlogCount,
      },
      meta: {
        generatedAt: now.toISOString(),
        totalCount,
      },
    },
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
