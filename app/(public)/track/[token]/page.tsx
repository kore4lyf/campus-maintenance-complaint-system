import { notFound } from "next/navigation";
import { format } from "date-fns";
import { connect } from "@/lib/db/connection";
import { ComplaintModel } from "@/lib/db/models/complaint";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { UserModel } from "@/lib/db/models/user";
import { verifyAnonymousToken } from "@/lib/auth/anonymous-token";
import { Card, SectionHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { SlaCountdown } from "@/components/reporter/SlaCountdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Archive, Camera, Bookmark, Lock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
  systemType: string;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await UserModel.findById(claims.sub);
  if (!user) throw new Response("Tracker not found", { status: 404 });
  if (user.anonymousId !== token) {
    throw new Response("Tracker token mismatch", { status: 410 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const complaint = await ComplaintModel.findOne({
    reporterId: user._id,
    isAnonymous: true,
  })
    .sort({ createdAt: -1 })
    .lean();
  if (!complaint) throw new Response("Tracker not found", { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const category = await CategoryModel.findById(complaint.categoryId).lean();
  // eslint-disable-next-line @typescript-eslint/no-explicitany
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
    systemType: category?.systemType ?? "Other",
    isClosedOrMissing: complaint.status === "Closed",
  };
}

export default async function AnonymousTrackerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

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
      <div className="mx-auto w-full max-w-2xl">
        <EmptyState
          variant="wide"
          icon={<Lock className="h-7 w-7" aria-hidden="true" />}
          title="This submission is closed"
          description="No further updates are available for this anonymous submission. The maintenance loop is complete."
          primaryAction={
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
            >
              Submit a new anonymous report
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-3xl">
      <Card padding="lg" variant="surface" className="overflow-hidden">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={view.status} />
            <CategoryBadge
              name={view.categoryName}
              systemType={view.systemType}
            />
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent-strong">
              <Archive className="h-3 w-3" aria-hidden="true" />
              Anonymous
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
              Anonymous tracker
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground-strong">
              {view.categoryName}
              <span className="ml-1 font-medium text-muted-strong">
                · {view.locationName}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlaCountdown
              label="Acknowledge"
              deadline={view.slaAcknowledgeBy}
            />
            <SlaCountdown
              label="Resolve"
              deadline={view.slaResolveBy}
            />
            <span className="numeric ml-auto text-xs text-muted-strong">
              Submitted {format(view.createdAt, "PP p")}
            </span>
          </div>
        </header>

        <SectionHeader eyebrow="Description" title="What was reported" />
        <p className="whitespace-pre-wrap rounded-lg bg-surface-raised p-4 text-sm leading-relaxed text-foreground-strong">
          {view.description}
        </p>

        {view.photoUrls.length > 0 ? (
          <>
            <hr className="my-6 border-border" />
            <SectionHeader eyebrow="Photos" title={`${view.photoUrls.length} attached`} />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {view.photoUrls.map((url) => (
                <li
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-raised"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary remote URL */}
                  <img
                    src={url}
                    alt="Reporter photo"
                    className="h-full w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-strong">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            No photos were attached.
          </div>
        )}
      </Card>

      <Card padding="md" variant="raised" className="mt-6 bg-accent-soft/40">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong">
            <Bookmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground-strong">
              Bookmark this page
            </p>
            <p className="mt-1 text-xs text-muted-strong">
              This URL is your private tracker. Open it from any browser to
              check the latest status. The status updates in real time.
            </p>
          </div>
        </div>
      </Card>
    </article>
  );
}
