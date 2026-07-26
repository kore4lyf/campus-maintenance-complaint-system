import { notFound } from "next/navigation";
import { format } from "date-fns";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { UserModel } from "@/lib/db/models/user";
import { verifyAnonymousToken } from "@/lib/auth/anonymous-token";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { SlaCountdown } from "@/components/reporter/SlaCountdown";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AnonymousView {
  status: string;
  slaAcknowledgeBy: Date;
  slaResolveBy: Date;
  description: string;
  photoUrls: string[];
  createdAt: Date;
  categoryName: string;
  locationName: string;
  isClosedOrMissing: boolean;
}

async function loadAnonymousComplaint(token: string): Promise<AnonymousView> {
  let claims: { sub: string; sid: string; iat: number; exp: number };
  try {
    claims = await verifyAnonymousToken({ token });
  } catch {
    throw new Response("Invalid tracker token", { status: 410 });
  }

  await connect();

  const user = await UserModel.findById(claims.sub).lean();
  if (!user) {
    throw new Response("Tracker not found", { status: 404 });
  }
  if (user.anonymousId !== token) {
    throw new Response("Tracker token mismatch", { status: 410 });
  }

  const complaint = await ComplaintModel.findOne({
    reporterId: user._id,
    isAnonymous: true,
  })
    .sort({ createdAt: -1 })
    .lean();
  if (!complaint) {
    throw new Response("Tracker not found", { status: 404 });
  }

  const category = await CategoryModel.findById(complaint.categoryId).lean();
  const location = await LocationModel.findById(complaint.locationId).lean();

  return {
    status: complaint.status,
    slaAcknowledgeBy: complaint.slaAcknowledgeBy as Date,
    slaResolveBy: complaint.slaResolveBy as Date,
    description: complaint.description,
    photoUrls: complaint.photoUrls ?? [],
    createdAt: complaint.createdAt as Date,
    categoryName: category?.name ?? "Complaint",
    locationName: location?.name ?? "Location",
    isClosedOrMissing: complaint.status === "Closed",
  };
}

export default async function AnonymousTrackerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  if (!token || token.length < 16) {
    notFound();
  }
  let view: AnonymousView;
  try {
    view = await loadAnonymousComplaint(token);
  } catch (response) {
    if (response instanceof Response) {
      const text = await response.text();
      throw new Response(text, { status: response.status });
    }
    throw response;
  }

  if (view.isClosedOrMissing) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-border bg-surface-raised p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">
            This submission is closed
          </h1>
          <p className="mt-2 text-sm text-muted-strong">
            No further updates are available for this anonymous submission.
          </p>
        </div>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-strong">
          Anonymous tracker
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {view.categoryName}
          <span className="text-muted-strong"> · {view.locationName}</span>
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CategoryBadge name={view.categoryName} systemType="Other" />
          <span className="rounded-full bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted">
            {view.status}
          </span>
          <span className="text-xs text-muted-strong">
            Submitted {format(view.createdAt, "PP p")}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">SLA deadlines</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SlaCountdown label="Acknowledge by" deadline={view.slaAcknowledgeBy} />
            <SlaCountdown label="Resolve by" deadline={view.slaResolveBy} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <p className="whitespace-pre-wrap rounded-md bg-surface px-3 py-2 text-sm text-foreground">
            {view.description}
          </p>
        </div>

        {view.photoUrls.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">Photo</h2>
            <ul className="flex flex-wrap gap-3">
              {view.photoUrls.map((url) => (
                <li key={url} className="overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- image source is a remote Cloudinary URL */}
                  <img
                    src={url}
                    alt="Reporter photo"
                    className="h-32 w-32 object-cover"
                  />
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-strong">
              Bookmark this page or keep the URL to check the status again later.
            </p>
          </div>
        ) : null}
      </section>
    </article>
  );
}
