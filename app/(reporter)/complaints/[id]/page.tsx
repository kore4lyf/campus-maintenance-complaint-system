import { notFound } from "next/navigation";
import { format } from "date-fns";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { AssignmentModel } from "@/lib/db/models/assignment";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { getSession } from "@/lib/auth/config";
import { ApiError } from "@/lib/utils/errors";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { SlaCountdown } from "@/components/reporter/SlaCountdown";
import type { Severity } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Role = "reporter" | "dicht_admin" | "dicht_technician" | null;

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

interface DetailContext {
  reporterId: string | null;
  role: Role;
}

async function loadContext(): Promise<DetailContext | null> {
  const session = await getSession();
  if (!session?.user) return null;
  const candidate = session.user as {
    id?: string;
    role?: unknown;
  };
  if (!candidate.id || !isValidObjectId(candidate.id)) return null;
  const role: Role =
    candidate.role === "reporter" ||
    candidate.role === "dicht_admin" ||
    candidate.role === "dicht_technician"
      ? candidate.role
      : null;
  return { reporterId: candidate.id, role };
}

interface RenderedComplaint {
  status: string;
  slaAcknowledgeBy: Date;
  slaResolveBy: Date;
  description: string;
  photoUrls: string[];
  createdAt: Date;
  priority?: Severity;
  categoryName?: string;
  locationName?: string;
}

async function loadComplaint(
  id: string,
  ctx: DetailContext,
): Promise<RenderedComplaint> {
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

  const category = await CategoryModel.findById(doc.categoryId).lean();
  const location = await LocationModel.findById(doc.locationId).lean();

  const out: RenderedComplaint = {
    status: doc.status,
    slaAcknowledgeBy: doc.slaAcknowledgeBy as Date,
    slaResolveBy: doc.slaResolveBy as Date,
    description: doc.description,
    photoUrls: doc.photoUrls ?? [],
    createdAt: doc.createdAt as Date,
  };
  if (ctx.role === "dicht_admin" || ctx.role === "dicht_technician") {
    out.priority = doc.priority as Severity;
  }
  if (category) out.categoryName = category.name;
  if (location) out.locationName = location.name;
  return out;
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
  if (!ctx) {
    throw new ApiError("unauthenticated", "Sign in to view this complaint", 401);
  }

  let complaint: RenderedComplaint;
  try {
    complaint = await loadComplaint(id, ctx);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "not_found") notFound();
      throw err;
    }
    throw err;
  }

  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-strong">
          Submission
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {complaint.categoryName ?? "Complaint"}
          {complaint.locationName ? (
            <span className="text-muted-strong"> · {complaint.locationName}</span>
          ) : null}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CategoryBadge
            name={complaint.categoryName ?? "Complaint"}
            systemType="Other"
          />
          {complaint.priority ? (
            <SeverityBadge severity={complaint.priority} />
          ) : null}
          <span className="rounded-full bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted">
            {complaint.status}
          </span>
          <span className="text-xs text-muted-strong">
            Submitted {format(complaint.createdAt, "PP p")}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">SLA deadlines</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SlaCountdown
              label="Acknowledge by"
              deadline={complaint.slaAcknowledgeBy}
            />
            <SlaCountdown
              label="Resolve by"
              deadline={complaint.slaResolveBy}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <p className="whitespace-pre-wrap rounded-md bg-surface px-3 py-2 text-sm text-foreground">
            {complaint.description}
          </p>
        </div>

        {complaint.photoUrls.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">Photo</h2>
            <ul className="flex flex-wrap gap-3">
              {complaint.photoUrls.map((url) => (
                <li key={url} className="overflow-hidden rounded-md border border-border">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- image source is a remote Cloudinary URL */}
                    <img
                      src={url}
                      alt="Reporter photo"
                      className="h-32 w-32 object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </article>
  );
}
