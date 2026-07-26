import { notFound, redirect } from "next/navigation";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { StatusHistoryModel } from "@/lib/db/models/status-history";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { UserModel } from "@/lib/db/models/user";
import { getServerSession, type Role } from "@/lib/auth/dal";
import { ApiError } from "@/lib/utils/errors";
import { ComplaintDetailClient } from "@/components/reporter/ComplaintDetailClient";
import type { Severity } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

interface DetailContext {
  reporterId: string;
  role: Role;
}

async function loadContext(): Promise<DetailContext> {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (!isValidObjectId(session.user.id)) {
    redirect("/sign-in");
  }
  return { reporterId: session.user.id, role: session.user.role };
}

interface RenderedComplaint {
  _id: string;
  status: string;
  slaAcknowledgeBy: string;
  slaResolveBy: string;
  description: string;
  photoUrls: string[];
  createdAt: string;
  priority?: Severity;
  categoryName?: string;
  locationName?: string;
}

interface TimelineEntry {
  fromStatus: string;
  toStatus: string;
  changedById?: string;
  changedByName?: string;
  changedByRole?: string;
  changedBySystem?: boolean;
  note?: string;
  photoUrl?: string;
  changedAt: string;
}

async function loadComplaint(
  id: string,
  ctx: DetailContext,
): Promise<{ complaint: RenderedComplaint; timeline: TimelineEntry[] }> {
  await connect();

  const doc = await ComplaintModel.findById(id).lean();
  if (!doc) {
    throw new ApiError("not_found", "Complaint not found", 404);
  }

  const reporterId = doc.reporterId ? String(doc.reporterId) : null;

  if (ctx.role === "reporter") {
    if (!reporterId || reporterId !== ctx.reporterId) {
      throw new ApiError("forbidden", "You can only view your own complaints", 403);
    }
  } else if (ctx.role === "dicht_technician" && ctx.reporterId) {
    const assignment = await AssignmentModel.findOne({
      complaintId: doc._id,
      assignedToTechId: ctx.reporterId,
    }).lean();
    if (!assignment) {
      throw new ApiError("forbidden", "You are not assigned to this complaint", 403);
    }
  }

  const [category, location, history] = await Promise.all([
    CategoryModel.findById(doc.categoryId).lean(),
    LocationModel.findById(doc.locationId).lean(),
    StatusHistoryModel.find({ complaintId: doc._id })
      .sort({ changedAt: -1 })
      .lean(),
  ]);

  const actorIds = [
    ...new Set(
      history
        .filter((h) => h.changedById && !h.changedBySystem)
        .map((h) => String(h.changedById)),
    ),
  ];

  const actors =
    actorIds.length > 0
      ? await UserModel.find({ _id: { $in: actorIds } })
          .lean()
          .then((docs) =>
            Object.fromEntries(
              docs.map((d) => [
                String(d._id),
                { name: d.name, role: d.role },
              ]),
            ),
          )
      : {};

  const complaint: RenderedComplaint = {
    _id: String(doc._id),
    status: doc.status,
    slaAcknowledgeBy: new Date(doc.slaAcknowledgeBy).toISOString(),
    slaResolveBy: new Date(doc.slaResolveBy).toISOString(),
    description: doc.description,
    photoUrls: doc.photoUrls ?? [],
    createdAt: new Date(doc.createdAt).toISOString(),
  };

  if (ctx.role === "dicht_admin" || ctx.role === "dicht_technician") {
    complaint.priority = doc.priority as Severity;
  }
  if (category) complaint.categoryName = category.name;
  if (location) complaint.locationName = location.name;

  const timeline: TimelineEntry[] = history.map((entry) => {
    const actor = entry.changedById ? actors[String(entry.changedById)] : null;
    return {
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedById: entry.changedById ? String(entry.changedById) : undefined,
      changedByName: entry.changedBySystem
        ? undefined
        : actor?.name ?? undefined,
      changedByRole: entry.changedBySystem
        ? "system"
        : actor?.role ?? undefined,
      changedBySystem: entry.changedBySystem ?? false,
      note: entry.note ?? undefined,
      photoUrl: entry.photoUrl ?? undefined,
      changedAt: entry.changedAt
        ? new Date(entry.changedAt).toISOString()
        : new Date().toISOString(),
    };
  });

  return { complaint, timeline };
}

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    notFound();
  }

  const ctx = await loadContext();

  let result: { complaint: RenderedComplaint; timeline: TimelineEntry[] };
  try {
    result = await loadComplaint(id, ctx);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "not_found") notFound();
      throw err;
    }
    throw err;
  }

  return (
    <ComplaintDetailClient
      complaintId={id}
      initialComplaint={result.complaint}
      initialTimeline={result.timeline}
    />
  );
}
