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
import { PageShell } from "@/components/shared/PageShell";
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
  changedById: string | undefined;
  changedByName: string | undefined;
  changedByRole: string | undefined;
  changedBySystem: boolean;
  note: string | undefined;
  photoUrl: string | undefined;
  changedAt: string;
}

async function loadComplaint(
  id: string,
  ctx: DetailContext,
): Promise<{ complaint: RenderedComplaint; timeline: TimelineEntry[] }> {
  await connect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await ComplaintModel.findOne({ _id: id }).lean();
  if (!doc) {
    throw new ApiError("not_found", "Complaint not found", 404);
  }

  const reporterId = doc.reporterId ? String(doc.reporterId) : null;

  if (ctx.role === "reporter") {
    if (!reporterId || reporterId !== ctx.reporterId) {
      throw new ApiError("forbidden", "You can only view your own complaints", 403);
    }
  } else if (ctx.role === "dicht_technician" && ctx.reporterId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignment = await AssignmentModel.findOne({
      complaintId: doc._id,
      assignedToTechId: ctx.reporterId,
    }).lean();
    if (!assignment) {
      throw new ApiError("forbidden", "You are not assigned to this complaint", 403);
    }
  }

  const [category, location, history] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CategoryModel.findOne({ _id: doc.categoryId }).lean(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LocationModel.findOne({ _id: doc.locationId }).lean(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    StatusHistoryModel.find({ complaintId: doc._id })
      .sort({ changedAt: -1 })
      .lean(),
  ]);

  const actorIds = [
    ...new Set(
      history
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((h: any) => h.changedById && !h.changedBySystem)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((h: any) => String(h.changedById)),
    ),
  ];

  const actors =
    actorIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await UserModel.find({ _id: { $in: actorIds } })
          .lean()
          .then((docs: any[]) =>
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

  const timeline: TimelineEntry[] = history.map((entry: any) => {
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
    <PageShell displayVariant="flat">
      {/*
        Detail-page frame: a raised-band canvas behind the article. The
        body container inside <PageShell> already gives the article
        generous vertical breathing room; we paint a soft
        surface-raised band and round the bottom of the canvas so the
        page does not feel like a flat white wall. No new tokens.
      */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] bg-gradient-to-b from-surface-raised via-surface-raised/60 to-transparent"
        />
        <ComplaintDetailClient
          complaintId={id}
          initialComplaint={result.complaint}
          initialTimeline={result.timeline}
        />
      </div>
    </PageShell>
  );
}
