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
import { SlaPanel } from "@/components/reporter/SlaPanel";
import { ComplaintTimeline } from "@/components/reporter/ComplaintTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { H1, Kicker, Supporting } from "@/components/ui/type";
import {
  Archive,
  Camera,
  Bookmark,
  Lock,
  Sparkles,
  Copy,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import Link from "next/link";

/*
 * AnonymousTrackerPage — public surface for the anonymous-tracker URL.
 *
 * Aesthetic pass (2026-07-29):
 *   - Numbered caption strip (`01 · Anonymous tracker`) on the hero
 *     card so the page reads with the same compositional cadence as
 *     the rest of the in-app surfaces.
 *   - The previous `<SlaCountdown>` chips are replaced with the
 *     `SlaPanel` primitive (already used on the reporter detail page
 *     and the technician detail page) so the SLA UI is consistent
 *     across roles.
 *   - The bookmark card at the bottom now carries a "Copy URL" CTA
 *     hint though it is intentionally a no-op on the server-render
 *     (the bookmarked URL is the URL itself).
 *   - Closed state delegates to `<EmptyState variant="wide">` and
 *     keeps the brand-icon block.
 *
 * Tokens used (no new tokens):
 *   - bg-surface / bg-surface-raised for card surfaces.
 *   - bg-accent / text-brand-strong on the bookmark accent block.
 *   - text-muted-strong on body copy.
 *   - hairline-divided Card.SectionHeader.
 */

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
      <PageShell displayVariant="flat">
        <div className="mx-auto w-full max-w-2xl">
          <EmptyState
            variant="wide"
            icon={<Lock className="h-7 w-7" aria-hidden="true" />}
            title="This submission is closed"
            description="No further updates are available for this anonymous submission. The maintenance loop is complete."
            primaryAction={
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-fast hover:bg-brand-strong"
              >
                Submit a new anonymous report
              </Link>
            }
          />
        </div>
      </PageShell>
    );
  }

  const isTerminal =
    view.status === "Resolved" || view.status === "Closed";

  return (
    <PageShell displayVariant="flat">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[260px] bg-gradient-to-b from-surface-raised via-surface-raised/60 to-transparent"
        />

        <article className="mx-auto w-full max-w-[820px] space-y-6">
          {/* ---------- Hero strip ---------- */}
          <Card
            padding="lg"
            variant="surface"
            className="relative isolate overflow-hidden"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-accent-soft/30 via-transparent to-transparent"
            />

            <header className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className="numeric text-2xl font-semibold leading-none tracking-[-0.02em] text-foreground-strong">
                  01
                </span>
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-border-strong"
                />
                <Kicker>Anonymous tracker</Kicker>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent-strong ring-1 ring-inset ring-accent/30">
                  <Archive className="h-3 w-3" aria-hidden="true" />
                  Anonymous
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={view.status} />
                <CategoryBadge
                  name={view.categoryName}
                  systemType={view.systemType}
                />
                <span className="numeric ml-auto text-xs text-muted-strong">
                  Submitted {format(view.createdAt, "PP p")}
                </span>
              </div>

              <div>
                <H1 variant="compact">
                  {view.categoryName}
                  <span className="ml-1 font-medium text-muted-strong">
                    · {view.locationName}
                  </span>
                </H1>
              </div>
            </header>
          </Card>

          {/* ---------- SLA panel (now using SlaPanel primitive) ---------- */}
          <Card padding="md" variant="surface">
            <header className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  Service-level agreement
                </p>
                <p className="mt-1 text-base font-semibold tracking-[-0.005em] text-foreground-strong">
                  Time DICT has to acknowledge and resolve.
                </p>
              </div>
            </header>
            <SlaPanel
              acknowledgeLabel="Acknowledge"
              acknowledgeDeadline={view.slaAcknowledgeBy}
              resolveLabel="Resolve"
              resolveDeadline={view.slaResolveBy}
              isTerminal={isTerminal}
              caption={
                <span>
                  Times relative to the submission timestamp. DICT was
                  notified within seconds of filing.
                </span>
              }
            />
          </Card>

          {/* ---------- Description card ---------- */}
          <Card padding="lg" variant="surface">
            <SectionHeader
              eyebrow="What was reported"
              title="Description"
              meta={
                <span className="numeric text-xs text-muted-strong">
                  {view.description.length.toLocaleString()} characters
                </span>
              }
            />
            <blockquote className="rounded-r-lg border-l-2 border-brand bg-surface-raised px-5 py-4 text-sm leading-[1.7] text-foreground-strong sm:text-base">
              {view.description}
            </blockquote>
          </Card>

          {/* ---------- Photos card ---------- */}
          <Card padding="lg" variant="surface">
            <SectionHeader
              eyebrow="Your attachments"
              title="Photos you sent"
              meta={
                <span className="numeric text-xs text-muted-strong">
                  {view.photoUrls.length} {view.photoUrls.length === 1 ? "photo" : "photos"}
                </span>
              }
            />
            {view.photoUrls.length > 0 ? (
              <ul
                role="list"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              >
                {view.photoUrls.map((url, idx) => (
                  <li
                    key={url}
                    className="group/photo relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-raised transition-[border-color,transform] duration-fast hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary remote URL */}
                    <img
                      src={url}
                      alt={`Attachment ${idx + 1} for this submission`}
                      className="h-full w-full object-cover transition-transform duration-medium group-hover/photo:scale-[1.03]"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-strong">
                <span
                  className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted/15 text-muted-strong"
                  aria-hidden="true"
                >
                  <Camera className="h-3.5 w-3.5" />
                </span>
                <span>No photos were attached to this submission.</span>
              </div>
            )}
          </Card>

          {/* ---------- Bookmark card (with copy URL hint) ---------- */}
          <Card
            padding="md"
            variant="raised"
            className="overflow-hidden border-accent/40 bg-accent-soft/30"
          >
            <div className="flex items-start gap-4">
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong shadow-sm"
                aria-hidden="true"
              >
                <Bookmark className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <Kicker>Private tracker</Kicker>
                <p className="mt-1 text-base font-semibold tracking-[-0.005em] text-foreground-strong">
                  Bookmark this page
                </p>
                <Supporting className="text-sm leading-[1.55]">
                  This URL is your private tracker. Open it from any browser
                  to check the latest status. Updates stream in real time.
                </Supporting>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-strong">
                  <Sparkles className="h-3 w-3 text-accent-strong" aria-hidden="true" />
                  Tip: keep this URL private — anyone with the link can view
                  status.
                </p>
              </div>
              <Copy
                className="hidden h-4 w-4 flex-shrink-0 self-start text-muted-strong sm:block"
                aria-hidden="true"
              />
            </div>
          </Card>
        </article>
      </div>
    </PageShell>
  );
}
