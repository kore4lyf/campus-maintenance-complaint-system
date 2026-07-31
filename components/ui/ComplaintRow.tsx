import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { Camera, ChevronRight, EyeOff } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { SeverityBadge } from "@/components/reporter/SeverityBadge";
import { CategoryBadge } from "@/components/reporter/CategoryBadge";
import { SlaCountdown } from "@/components/reporter/SlaCountdown";

/*
 * ComplaintRow — edge-to-edge list row, NOT a Card.
 *
 * Spec: docs/specs/0014-astryx-design-alignment.md (AC-3).
 *
 * Why this replaced <ComplaintCard> and the admin <QueueRow>:
 *   Astryx Principles §Anti-Patterns is explicit: "Don't wrap every list
 *   item or page section in a Card. Decide the frame first; dense data
 *   renders as rows (Table, List/Item), edge-to-edge with dividers."
 *
 *   Before spec 0014, every complaint row lived inside <Card> with
 *   rounded-xl corners + a coloured footer separator. The result read
 *   as a stack of mobile-blog cards instead of a continuous tabular
 *   surface. This file is the canonical edge-to-edge row.
 *
 * Anatomy preserved from the previous ComplaintCard / QueueRow:
 *   - left: status / severity / category chip group
 *   - left: category + location title with `·` separator
 *   - left: short description (line-clamp 2 to match admin density)
 *   - left: footer counts (last activity + Acknowledge / Resolve SLA)
 *   - right: photo thumbnail (or dashed "no photo" placeholder)
 *   - right (admin only): breach badge + chevron affordance
 *
 * Visual signature (one signature, applied at the parent list):
 *   - 1px bottom divider (parent ul renders `divide-y divide-border`).
 *   - No rounded-* on the row chrome.
 *   - No <Card> shell, no <div> chrome, no shadow.
 *   - Spacing per Astryx scale: py-5 + px-5 (`spacing-4` horizontal,
 *     a slight bump on vertical for clearance).
 *   - Hover: subtle bg-surface-raised/40 wash.
 *   - Focus-visible: 2px gold ring, brand offset.
 *
 * Composition choices that follow Astryx Principles:
 *   - "Use semantic type tokens" — this row never specifies font-size
 *     or line-height manually outside the Astryx type primitives
 *     pipeline. The .numeric utility handles SLA string stability.
 *   - "Form inputs are controlled" — irrelevant here (we're a row).
 *
 * Out of scope:
 *   - The trailing "View detail →" footer separator is gone; rows
 *     don't have footers. The chevron on admin rows remains.
 *   - Status pill / Severity badge / Category badge are unchanged;
 *     spec 0014 doesn't touch them.
 */

export interface ComplaintRowProps {
  complaint: {
    _id: string;
    status: string;
    isAnonymous?: boolean | undefined;
    categoryId?: string | undefined;
    locationId?: string | undefined;
    description: string;
    photoUrls?: string[] | undefined;
    slaAcknowledgeBy: string;
    slaResolveBy: string;
    createdAt: string;
    priority?: "Critical" | "High" | "Medium" | "Low" | undefined;
    categoryName?: string | undefined;
    locationName?: string | undefined;
    systemType?: string | undefined;
    /**
     * Admin-only breach state. When `kind === "navigate"` (the reporter
     * surface) this is undefined.
     */
    breachKind?: "none" | "acknowledge_overdue" | "resolve_overdue" | undefined;
    /** Admin-only. Milliseconds overdue when breachKind !== "none". */
    overdueMs?: number | undefined;
    /** Admin-only. Currently assigned technician (or null). */
    currentAssignee?:
      | { assignedToTechId: string; assignedToName: string }
      | null
      | undefined;
    /** Admin-only. Used for optimistic-concurrency on the assign mutation. */
    __v?: number | undefined;
  };
  /**
   * `navigate` — wrap row contents in a <Link href="/complaints/[id]">.
   *   Used by the reporter's "My complaints" list.
   * `select` — wrap row contents in a <button> that calls onSelect.
   *   Used by the admin's "Queue" list (assign-dialog trigger).
   */
  kind: "navigate" | "select";
  onSelect?: ((complaint: ComplaintRowProps["complaint"]) => void) | undefined;
}

function breachAccent(
  kind: NonNullable<ComplaintRowProps["complaint"]["breachKind"]>,
): string {
  if (kind === "acknowledge_overdue") return "border-l-danger";
  if (kind === "resolve_overdue") return "border-l-danger-strong";
  return "border-l-transparent";
}

/*
 * Thumbnail on the right of the row. Preserved from the previous
 * Card-wrapped ComplaintCard: 112 × 112 px photo, or a dashed
 * "No photo" placeholder when none was attached.
 */
function Thumbnail({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="hidden h-28 w-28 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-raised text-muted-strong sm:flex">
        <Camera className="h-5 w-5" aria-hidden="true" />
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">
          No photo
        </span>
      </div>
    );
  }
  return (
    <div className="relative hidden h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface-raised sm:block">
      <Image
        src={url}
        alt="Complaint photo"
        fill
        sizes="112px"
        className="object-cover"
      />
    </div>
  );
}

/*
 * Right-side meta column. The reporter surface shows nothing here
 * (the row already ends with SLA chips on the left). The admin
 * surface shows: assigned/unassigned pill + chevron cue.
 */
function MetaColumn({
  breachKind,
  currentAssignee,
}: {
  breachKind: NonNullable<ComplaintRowProps["complaint"]["breachKind"]>;
  currentAssignee: ComplaintRowProps["complaint"]["currentAssignee"];
}) {
  if (currentAssignee === undefined && breachKind === undefined) {
    return null;
  }
  return (
    <div className="flex flex-shrink-0 flex-col items-end justify-between gap-3 text-right">
      {currentAssignee ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/15 px-2.5 py-1 text-xs font-medium text-muted-strong">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-success"
          />
          {currentAssignee.assignedToName}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
          <Camera className="h-3 w-3" aria-hidden="true" />
          Unassigned
        </span>
      )}
      <ChevronRight
        className="h-4 w-4 text-muted-strong transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
        aria-hidden="true"
      />
    </div>
  );
}

export function ComplaintRow({
  complaint,
  kind,
  onSelect,
}: ComplaintRowProps) {
  const shortDescription =
    complaint.description.length > 200
      ? complaint.description.slice(0, 200) + "…"
      : complaint.description;

  const thumbnailUrl = complaint.photoUrls?.[0] ?? null;

  /*
   * Acknowledge overdue check — preserved verbatim from the prior
   * ComplaintCard. eslint-disable because Date.now() at SSR-time is
   * the documented pattern; the page polls every 30s and re-renders.
   */
  // eslint-disable-next-line react-hooks/purity
  const overdueFromAcknowledge =
    new Date(complaint.slaAcknowledgeBy).getTime() < Date.now() &&
    complaint.status === "Submitted";

  /*
   * The left+thumb body is the same in both row kinds. Wrap in a
   * <Link> or <button> depending on `kind`.
   */
  const body = (
    <div className="flex items-stretch gap-5 px-5 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={complaint.status} />
          {complaint.isAnonymous ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/15 px-2 py-0.5 text-[10px] font-medium text-muted-strong">
              <EyeOff className="h-2.5 w-2.5" aria-hidden="true" />
              Anonymous
            </span>
          ) : null}
          {complaint.priority ? (
            <SeverityBadge severity={complaint.priority} />
          ) : null}
          {complaint.systemType ? (
            <CategoryBadge
              name={complaint.categoryName ?? "Complaint"}
              systemType={complaint.systemType}
            />
          ) : null}
        </div>

        <p className="mt-3 text-sm font-semibold text-foreground-strong">
          <span>{complaint.categoryName ?? "Complaint"}</span>
          {complaint.locationName ? (
            <span className="ml-1 font-medium text-muted-strong">
              · {complaint.locationName}
            </span>
          ) : null}
        </p>

        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-strong">
          {shortDescription}
        </p>

        <div className="numeric mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>
            {formatDistanceToNowStrict(new Date(complaint.createdAt), {
              addSuffix: true,
            })}
          </span>
          {complaint.breachKind === undefined ? (
            <>
              <SlaCountdown
                label="Acknowledge"
                deadline={complaint.slaAcknowledgeBy}
                emphasize={overdueFromAcknowledge}
              />
              <SlaCountdown
                label="Resolve"
                deadline={complaint.slaResolveBy}
              />
            </>
          ) : null}
          {complaint.breachKind !== undefined &&
          complaint.breachKind !== "none" ? (
            <span className="inline-flex items-center gap-1 font-medium text-danger">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
              {complaint.breachKind === "acknowledge_overdue"
                ? "Acknowledge overdue"
                : "Resolve overdue"}
            </span>
          ) : null}
          {complaint.breachKind !== undefined ? (
            <span>
              Resolve by{" "}
              {formatDistanceToNowStrict(new Date(complaint.slaResolveBy), {
                addSuffix: true,
              })}
            </span>
          ) : null}
        </div>
      </div>

      <Thumbnail url={thumbnailUrl} />

      {kind === "select" ? (
        <MetaColumn
          breachKind={complaint.breachKind ?? "none"}
          currentAssignee={complaint.currentAssignee}
        />
      ) : null}
    </div>
  );

  /*
   * Wrap in <Link> for navigate, <button> for select. Both share the
   * same focus-visible ring + the row-side hover affordance.
   */
  if (kind === "navigate") {
    return (
      <li className="group transition-colors hover:bg-surface-raised/40 focus-within:bg-surface-raised/40">
        <Link
          href={`/complaints/${complaint._id}`}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li
      className={`group cursor-pointer transition-colors hover:bg-surface-raised/40 focus-within:bg-surface-raised/40 border-l-4 ${breachAccent(complaint.breachKind ?? "none")}`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(complaint)}
        className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        {body}
      </button>
    </li>
  );
}
