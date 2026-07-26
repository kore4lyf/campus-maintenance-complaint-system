# 0008. Technician queue and status updates

**Date**: 2026-07-25
**Status**: Proposed

## Summary

This spec ships the technician view at `/technician/queue` with the assigned complaints sorted by SLA urgency, plus the forward only status transition path through `Acknowledged`, `In Progress`, and `Resolved` (with mandatory proof-of-fix photo) per the spec 0002 forward only state machine. Status transitions go through a single `POST /api/technician/queue/[id]/transition` route handler with optimistic concurrency via `__v` per spec 0002 AC-12; each transition writes a `statusHistory` row plus an Ably push to the admin queue channel plus the reporter plus a `notifications` row. In Progress transitions allow a notes field plus up to 3 progress photos; Resolved transitions require exactly one proof-of-fix photo that flows through the same `lib/storage/cloudinary.ts` pipeline used by spec 0005.

## Context

The architecture locks the `statusHistory` collection plus the forward only state machine plus the `assignments` collection plus the optimistic concurrency pattern (Mongoose `versionKey` plus conditional `findOneAndUpdate`) plus the photo upload pipeline (sharp plus Cloudinary). Spec 0002 already ships all of these and Feature 8 composes them. Spec 0003 ships the technician role aware layout at `app/(technician)/` plus the `TechnicianQueueEmpty` composite plus the severity colour mapping that drives the SLA breach overlay. Spec 0004 ships `useCurrentUser` plus the project root proxy plus the auth DAL plus the seeded technician users. Spec 0005 ships the photo upload helper at `lib/storage/cloudinary.ts` plus the Ai triage falls back path that decides `priority`. Spec 0007 ships the admin queue plus the assignment action that creates the `assignments` rows Feature 8 reads.

The technician does not edit `complaints` directly; the route handlers in this spec route every write through the spec 0002 forward only state machine plus the optimistic concurrency pattern plus the `pre('save')` hook that stamps `statusHistory` rows inside the same save call. The technician's role is to acknowledge assigned work, mark progress with notes and photos, and close the loop with a proof-of-fix photo; admin override transitions live in the admin queue path (Feature 7 path plus Feature 7's spec).

## Requirements

**User stories**:

- As a DICT technician I want a queue at `/technician/queue` showing every claim assigned to me plus its SLA urgency so I know what to tackle next.
- As a DICT technician I want to acknowledge an assigned complaint in one or two clicks so the reporter sees progress without delay.
- As a DICT technician I want to update an in progress claim with notes plus optional progress photos so the admin and reporter see the work is under way and the audit trail captures progress.
- As a DICT technician I want to mark a claim resolved only by uploading a proof-of-fix photo so the reporter has tangible evidence the issue is fixed.
- As a developer I want a single transition endpoint per status change so I never have to invent route names or worry about drift between Acknowledge versus In Progress versus Resolve paths.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A signed in technician at `/technician/queue` sees a queue of all complaints assigned to the current technician whose status not in `Closed`, sorted by SLA urgency (breached first by per row border colour, then `slaAcknowledgeBy` ascending, then `slaResolveBy` ascending, then `createdAt` ascending). Verifies the scope's "assigned complaints sorted by SLA urgency" half of the Done when line.
- **AC-2**: Clicking a row opens the technician detail page at `/technician/queue/[id]`. The page shows status, `slaAcknowledgeBy`, `slaResolveBy`, description, photos, severity, location, category, the reporter set to "Anonymous" when `isAnonymous` is true, plus the action affordances for the next valid transition. The technician cannot regress status per spec 0002 process invariants. Empty state on the queue list is the existing `TechnicianQueueEmpty` composite from spec 0003 AC-5.
- **AC-3**: Acknowledge action posts to `POST /api/technician/queue/[id]/transition` with `{ expectedVersion, toStatus: 'Acknowledged', note? }`. On success, the complaint transitions to `Acknowledged`; a `statusHistory` row is written per spec 0002 AC-3 (`fromStatus`, `toStatus`, `changedById: technician._id`, `changedBySystem: false`, optional `note`); an Ably push fires to the admin queue channel plus the reporter's channel; a `notifications` row of type `'status'` is written with `recipientId: assignedByAdminId + reporterId`. Optimistic concurrency via `__v` match returns 409 `stale_write` on mismatch without writing the `statusHistory` row. Verifies the "acknowledge" half of the Done when line.
- **AC-4**: In Progress action accepts a notes textarea (optional, max 500 chars) plus up to 3 progress photos. Each photo flows through `lib/storage/cloudinary.ts` from spec 0005 (sharp resize plus JPEG quality 80 plus Cloudinary upload). On success, the complaint transitions to `In Progress`; a `statusHistory` row is written with the note (if any) plus up to 3 photo URLs on the `statusHistory` entry. Verifies the "update status with notes" half of the Done when line.
- **AC-5**: Resolved action requires exactly one proof-of-fix photo (sharp plus Cloudinary same pipeline) plus an optional notes textarea (max 500 chars). On success, the complaint transitions to `Resolved`, `complaints.proofPhotoUrl` is denormalized onto the complaint document per spec 0002 AC-6, and a `statusHistory` row is written with the proof photo URL on the latest history row per spec 0002 AC-6 plus the optional note. Verifies the "resolve with a proof photo that populates the statusHistory audit trail" half of the Done when line.
- **AC-6**: Forward only plus reverse forbidden per spec 0002 process invariants. Technician cannot trigger `Acknowledged → Submitted` (reverse), `In Progress → Submitted`, `Resolved → In Progress`, or `Resolved → Acknowledged`. The admin only override (`In Progress → Acknowledged`) is gated behind the admin role per spec 0002 plus not exposed at the technician endpoint. `Resolved → Closed` is admin only and lands in the admin queue path (Feature 7 plus a future admin close action).
- **AC-7**: Defence in depth: DAL technician RBAC per spec 0004 plus per page `requireRole("dicht_technician")` plus the route handler `authorizeRole(session, "dicht_technician")` rejects 403 for non technicians. The technician cannot transition a complaint not in their current `assignments` set; the route handler enforces this server side.
- **AC-8**: Image pipeline integration: the technician upload uses `lib/storage/cloudinary.ts` from spec 0005 verbatim (MIME plus size validation rejects with typed `invalid_photo` before any Cloudinary round trip; sharp resize plus JPEG quality 80; HTTPS Cloudinary URL persisted). On an upload failure mid stream, the transition transaction rolls back the status change and the statusHistory row per spec 0002 AC-11 atomic write pattern (or the single save call's `pre('save')` hook that is safe to throw).
- **AC-9**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; end to end smoke covers Acknowledge, In Progress with one progress photo plus a note, Resolved without photo (rejected), Resolved with proof photo, double transition with optimistic concurrency 409, reverse transition attempt rejected with 422 invalid_transition.

## Options considered

### Option 1: Single transition endpoint; mandatory proof-of-fix photo; full forward only (chosen)

One `POST /api/technician/queue/[id]/transition` endpoint that takes `expectedVersion`, `toStatus`, plus optional `note` and `photos`. The route handler enforces the technician's allowlist (Submitted → Acknowledged → In Progress → Resolved with photo) per spec 0002 process invariants plus the optimistic concurrency check. Each transition writes inside the spec 0002 forward only state machine plus the Ably push to admin and reporter plus `notifications` row.

**Pros**:

- One endpoint for all transitions; routes do not drift over time.
- Mandatory proof-of-fix photo on Resolved enforces the spec 0002 AC-6 invariant at write time.
- Forward only plus optimistic concurrency keeps two stale writers from clobbering each other.
- Reuses `lib/storage/cloudinary.ts` from spec 0005 cleanly; no forked image pipeline.

**Cons**:

- One endpoint with a polymorphic body (`toStatus` plus optional fields) is heavier than three thin endpoints.
- Mandatory photo on Resolved is an extra tap in the happy path; the lost work risk on rejection is real (mitigated by the transition form holding the collected inputs across re submit).

### Option 2: One endpoint per status (Acknowledge, In Progress, Resolve)

Three thin endpoints, each with a stable body shape.

**Pros**:

- Body shape never changes; no polymorphic body to document.

**Cons**:

- Routes drift over time as the audit trail evolves.
- Hardcoded transition path means a refactor is required to add `On Hold` or other intermediate states.
- The number of routes grows linearly with status additions; not future proof.

### Option 3: Allow technician override transitions (reverse)

Let technician do `Acknowledged → Submitted` to "unclaim" an assignment.

**Pros**:

- Technician can step back without admin intervention.

**Cons**:

- Contradicts spec 0002 process invariants plus the admin queue's reassignment feature.
- Lets a technician silently drop work the admin assigned overnight.
- Loses the audit trail of who handled the assignment.

## Decision

**Chosen option**: Option 1: single transition endpoint; mandatory proof-of-fix photo; full forward only.

The technician's `/technician/queue` shows assigned claims sorted by SLA urgency; clicking a row opens the detail page with the valid next transition affordances; the affordance posts to `POST /api/technician/queue/[id]/transition` with the appropriate body; on success the spec 0002 forward only state machine writes the new status plus a `statusHistory` row plus an Ably push to admin plus reporter plus a `notifications` row; the proof-of-fix photo on Resolved is mandatory and reuses `lib/storage/cloudinary.ts` from spec 0005.

**Implementation skills**: `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — Server Action alternative decisioning plus Server Component boundaries for the technician list and detail. `mongodb` (`earendil-works/community-skills`, `C:/Users/Korede/.agents/skills/mongodb/`) — Mongoose `pre('save')` hook cross field validator reuse from spec 0002 plus the optimistic concurrency pattern.

## Rationale

Two specific forces from Context drive the choice. First, spec 0002 has shipped the entire write time enforcement layer plus the photo upload helper plus the optimistic concurrency pattern; this feature's spec should compose them, not invent new ones. Second, the technician's Done when line is "acknowledge a complaint, update status with notes, and resolve with a proof photo". Three distinct transitions done through three separate endpoints makes the routing surface grow linearly with status additions; one endpoint with a polymorphic body plus the allowlist as a server side check is the architecture's stable forward path.

The mandatory proof-of-fix photo on Resolved is not negotiable because spec 0002 AC-6 codifies it; without it the reporter has no tangible evidence the issue is fixed which contradicts the academic doc's accountability claim. The same sharp plus Cloudinary pipeline from spec 0005 is reused so the codebase does not fork image handling into two divergent paths.

The reverse transition prohibition is the spec 0002 process invariant recorded by spec 0002 plus the architecture's accountability framing; allowing reverse would let a technician silently drop an assignment and the admin would lose visibility. The admin override (`In Progress → Acknowledged`) is admin only because the technician is the actor in motion, not the policy maker.

The Ably push plus `notifications` row on every transition matches the architecture's locked real time behaviour; the admin queue reads the same `notifications` table for live updates, and the reporter dashboard reads the same Ably channel plus the table for cross reference.

## Feature design

**Data model sketch**:

This feature is additive. Zero schema changes to the locked eight Mongoose collections.

- `complaints` (locked at spec 0002): no field changes. The technician's transitions update `status` plus denormalize `proofPhotoUrl` on Resolved per spec 0002 AC-6.
- `assignments` (locked at spec 0002): no field changes. The technician queue reads `assignments.find({ assignedToTechId: tech._id })` joined with the latest row per `complaintId` to fetch the current assignment set.
- `statusHistory` (locked at spec 0002): no field changes. Every transition writes a new row with `fromStatus`, `toStatus`, `changedById: technician._id`, `changedBySystem: false`, optional `note`, optional `photoUrl` (or `photoUrls` for In Progress multi photo), `changedAt: now()`.
- `notifications` (locked at spec 0002): no field changes. Every transition writes a row with `type: 'status'`, `complaintId`, plus one row per `recipientId` (admin and reporter).
- `users` (locked): no field changes. The technician's `assignedByAdminId` and `reporterId` flow from the existing assignments and complaints documents.

**State transitions** (if applicable):

This feature owns the technician's portion of the forward only state machine: `Submitted → Acknowledged → In Progress → Resolved`. The state diagram (read per spec 0002):

- `Submitted` → `Acknowledged` (technician acknowledges)
- `Acknowledged` → `In Progress` (technician begins work; notes plus optional progress photos)
- `In Progress` → `Resolved` (technician uploads proof-of-fix photo; mandatory)
- `Resolved` → `Closed` (admin only; out of scope for this feature)
- `In Progress` → `Acknowledged` (admin override; out of scope for this feature)
- All reverse transitions forbidden per spec 0002 process invariants

**API surface**:

| Endpoint | Method | Auth | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| `/api/technician/queue` | `GET` | technician session | `?status` optional (defaults to non Closed) | `{ data: complaintPublicJSON[], meta: { nextCursor, hasMore } }` with technician's assignments only | 401, 403 |
| `/api/technician/queue/[id]` | `GET` | technician session | path param | `{ data: complaintPublicJSON }` plus the technician's allowed transition affordances | 401, 403, 404 (not assigned to this technician) |
| `/api/technician/queue/[id]/transition` | `POST` | technician session | `{ expectedVersion, toStatus, note?, photos? }` (`photos` is an array of multipart files when multipart form data; one element when `toStatus: 'Resolved'`) | `{ data: { complaintId, newVersion, statusHistoryId, notificationIds, ablyPushOk } }` | 401, 403, 404, 409 stale_write (version mismatch), 422 invalid_transition (forward only or wrong actor), 422 invalid_photo (size or MIME), 500 on hard upload failure |
| `/technician/queue` (page) | `GET` | technician session | none | rendered page HTML | 401, 403 |
| `/technician/queue/[id]` (page) | `GET` | technician session | path param | rendered detail page HTML with the transition affordance | 401, 403, 404 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| `/api/technician/queue` filter | list of complaints | `assignments.find({ assignedToTechId: tech._id })` joined with `complaints` filtered by status not Closed |
| Queue row: severity badge | priority | `complaints.priority` per spec 0002 priority rules |
| Queue row: SLA urgency sort | breached, then slaAcknowledgeBy asc, then slaResolveBy asc, then createdAt asc | same sort key as spec 0007 admin queue |
| Detail page: reporter label | reporter name or "Anonymous" | `users.findById(complaint.reporterId).name` when `complaint.isAnonymous: false`; literal "Anonymous" when `isAnonymous: true` (the technician does not see reporter PII in that case) |
| Detail page: transition affordances | list of valid next transitions | derived from `complaints.status` plus spec 0002 forward only state machine plus the technician's allowlist |
| Transition handler: next status | the toStatus cast | `req.body.toStatus` plus the `pre('save')` hook on `complaints` for forward only enforcement |
| Transition handler: statusHistory row | full row | spec 0002 AC-3 stamps inside `pre('save')`; photoUrl set from the Cloudinary upload; note set from the request body |
| Transition handler: proof of fix on Resolved | the photo | `lib/storage/cloudinary.ts` from spec 0005 (sharp plus JPEG quality 80) |
| Transition handler: notifications rows | one per recipient | the admin who assigned via `assignments.assignedById` plus the reporter via `complaints.reporterId` (when not anonymous) |
| Transition handler: Ably push | event on the admin queue channel plus the reporter channel | `lib/realtime/ably.ts` from spec 0003 foundation plus spec 0007 reuse |
| Detail page: photo carousel | image URLs | `complaints.photoUrls[]` plus `statusHistory[*].photoUrl`/photoUrls` interleave for proof of fix plus progress |

**Key invariants** (rules that must always hold):

- Forward only state machine per spec 0002; reverse transitions reject with 422 invalid_transition regardless of caller (technician, admin, system).
- Resolved transitions require exactly one proof-of-fix photo; missing photo yields a typed 422 invalid_photo error from `lib/storage/cloudinary.ts`.
- The technician's allowlist is `Submitted → Acknowledged`, `Acknowledged → In Progress`, `In Progress → Resolved`. The `Resolved → Closed` plus `In Progress → Acknowledged` admin override transitions reject at the technician endpoint with 422 invalid_actor.
- Optimistic concurrency: every transition sends `expectedVersion`; the `findOneAndUpdate({ _id, __v: expectedVersion }, ...)` returns 409 stale_write on mismatch without writing the `statusHistory` row.
- The technician's route handler rejects assignments that are not in the technician's current `assignments` set, returning 404 to avoid leaking private data even when the technician happens to know a `complaintId` they are not assigned to.
- `pre('save')` hook on `complaints` from spec 0002 AC-3 stamps the `statusHistory` row plus runs the forward only guard; the route handler cannot bypass.
- Photo uploads are exactly the same pipeline as spec 0005 (sharp resize plus Cloudinary URL). The technician does not bypass MIME or size validation.

**Security model**:

- Authentication: BetterAuth session probed via `getServerSession` from `lib/auth/dal.ts` plus per page `requireRole("dicht_technician")` per spec 0004.
- Authorization: server side filter ensures the requester's role is `dicht_technician`; non technician roles return 403 via `authorizeRole` from the DAL in the route handler; the technician's `assignments` set is the source of truth for which complaints they can touch.
- Notes are bounded (max 500 chars) at the Zod schema layer; oversized notes reject with 422 invalid_input.
- Photo URLs are HTTPS Cloudinary; the technician cannot supply a non HTTPS URL because the route uploads via `lib/storage/cloudinary.ts` which only persists the returned `url`.
- Ably push is best effort (per spec 0002 process invariant); failure surfaces a Sonner toast without blocking the write.
- PII discipline: the technician's response payload applies `toPublicJSON` per spec 0002 AC-13 stripping AI rationale plus cost fields; the reporter section of the detail page shows "Anonymous" when `isAnonymous: true` plus no email or name.

**Configuration required**:

None. No new env var. The `ABLY_API_KEY` plus `CLOUDINARY_*` plus `BETTER_AUTH_SECRET` were already set per spec 0001, plus spec 0004 plus spec 0005.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: a technician signed in sees two assigned complaints in `/technician/queue` sorted by SLA urgency; clicks the first; the detail page opens with status `Submitted` plus an Acknowledge button; pressing Acknowledge posts to the transition endpoint and the row's status becomes `Acknowledged` with a timestamped history row; the admin queue updates after the next poll (or live via Ably push); the reporter dashboard reflects the new status. Verifies **AC-1**, **AC-2**, **AC-3**.
- **Happy path**: from `Acknowledged`, the technician clicks Start Work, fills in a notes textarea plus one progress photo; the transition succeeds; the status is `In Progress`; the statusHistory row carries the note plus the photo URL; the page reflects the new state. Verifies **AC-2**, **AC-4**.
- **Failure case**: from `In Progress`, the technician tries to mark Resolved without a photo; the route handler returns 422 invalid_photo; the status does not transition. Verifies **AC-5**.
- **Happy path**: the technician marks Resolved with the proof-of-fix photo; the transition succeeds; `complaints.proofPhotoUrl` is denormalized; the statusHistory row carries the photo; the reporter dashboard's timeline shows the proof photo and the Resolved transition. Verifies **AC-5**, **AC-8**.
- **Failure case**: a stale `expectedVersion` is sent; the route handler returns 409 stale_write; no statusHistory row is written; the dialog shows the latest server state plus a retry affordance. Verifies **AC-3** plus **AC-8** optimistic concurrency.
- **Failure case**: a technician tries to transition a complaint they are not assigned to; the route handler returns 404 not_assigned. Verifies **AC-7**.
- **Failure case**: a technician tries a reverse transition (`Acknowledged → Submitted`); the route handler returns 422 invalid_transition; the spec 0002 `pre('save')` hook enforces the rejection regardless. Verifies **AC-6**.
- **Build gates plus smoke**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; Playwright covers Acknowledge, In Progress, Resolved with proof photo, double transition with version mismatch, reverse transition rejected. Verifies **AC-9**.

## Build plan

Tracer Bullet ordering: stand up the queue list end to end (read assigned complaints plus sort) before thickening with the transition endpoint plus the photo UI plus the proof-of-fix hardscape. Each task tagged with the AC or ACs it satisfies.

1. **Build `POST /api/technician/queue/[id]/transition`** route handler at `app/api/technician/queue/[id]/transition/route.ts`. Order: session probe, technician role check, complaint ownership check (the technician is in the `assignments` set for the complaint), Zod validate body, conditional `findOneAndUpdate` per spec 0002 AC-12 with `__v` match, return 409 on mismatch. On success call any required photo upload via `lib/storage/cloudinary.ts`, write the `statusHistory` row inside the spec 0002 `pre('save')` hook on the complaint, write the `notifications` rows (admin plus reporter when not anonymous), publish to Ably via `lib/realtime/ably.ts`, return the response bundle. Ably failures are best effort (per spec 0002 process invariant). Satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**.

2. **Build `GET /api/technician/queue`** route handler at `app/api/technician/queue/route.ts`. Order: session probe, technician role check, server side query joining `assignments` and `complaints`, filter by status not Closed, sort by breach first then `slaAcknowledgeBy` then `slaResolveBy` then `createdAt`, cursor pagination via `lib/utils/pagination.ts` from spec 0006, response shape `{ data, meta: { nextCursor, hasMore } }`, `toPublicJSON` per spec 0002 AC-13. Satisfies **AC-1**.

3. **Build `GET /api/technician/queue/[id]`** route handler that fetches a single complaint plus returns the technician's allowed transition affordances derived from the current status and spec 0002 forward only state machine. Server side assignment check rejects 404 when the technician does not own the complaint. Satisfies **AC-2**.

4. **Build `app/(technician)/queue/page.tsx`** as a Server Component fetching the queue plus rendering the cards or the existing `TechnicianQueueEmpty` composite when zero rows; click a row navigates to `/technician/queue/[id]`. Mobile single column plus desktop two column per spec 0003 ui-context. Page level `getSession()` confirms technician role per spec 0004 defense in depth. Satisfies **AC-1**, **AC-2**.

5. **Build `app/(technician)/queue/[id]/page.tsx`** as a Server Component fetching the complaint plus the allowed transition affordances; renders status plus deadlines plus description plus photos plus the transition form. The transition form is a Client Component island that posts to the transition endpoint. Resolved transition shows the mandatory proof photo uploader first; the Submit button is disabled until the photo is set. Satisfies **AC-3**, **AC-4**, **AC-5**.

6. **Build the transition form components** as `components/technician/{InProgressForm,ResolveForm,AcknowledgeForm}.tsx` plus a shared `<ProofPhotoUploader />` that wraps `lib/storage/cloudinary.ts`. The In Progress form carries the notes plus optional 3 photo slots. The Resolve form carries the mandatory 1 photo plus notes. The Acknowledge form is a one button form. Each form uses `react-hook-form` plus Zod resolver plus Astryx form primitives per spec 0003 foundation. Satisfies **AC-3**, **AC-4**, **AC-5**, **AC-8**.

7. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. `npm run dev` boots. Hand exercise or Playwright covers Acknowledge, In Progress with note plus photo, Resolved without photo (rejection path), Resolved with proof photo (happy path), double transition with version mismatch returns 409, reverse transition rejected, Ably push fires (mocked). Verifies **AC-9**.

## Consequences

**Positive**:

- The technician's queue plus transitions wire into the existing audit trail (`assignments` plus `statusHistory` plus `notifications`) without adding a new collection.
- The mandatory proof-of-fix photo enforces the spec 0002 AC-6 invariant at write time, giving the reporter tangible evidence the issue is resolved.
- One transition endpoint with a polymorphic body plus a server side allowlist keeps the routing surface stable as status additions land later (`On Hold` for instance becomes one Zod enum value plus one allowlist entry).
- The forward only state machine plus optimistic concurrency plus the `pre('save')` hook from spec 0002 keep stale and reverse writers from corrupting the audit trail.
- Reusing `lib/storage/cloudinary.ts` from spec 0005 keeps the image pipeline consistent.

**Negative / tradeoffs**:

- Polymorphic body for the transition endpoint is heavier to document than three thin endpoints; the allowlist grows with status additions.
- Mandatory photo on Resolved adds an extra tap on the happy path; lost work risk on rejection is real and mitigated by form retention of inputs across submit.
- Ably push failures are best effort and surface a Sonner toast without rolling back the write (consistent with spec 0002 process invariant for Ably pushes).

**Neutral**:

- No new env var.
- New files at `app/api/technician/queue/route.ts`, `app/api/technician/queue/[id]/route.ts`, `app/api/technician/queue/[id]/transition/route.ts`, plus the two Server Component pages plus the four form components. Consistent with the locked file organization.
- The technician view does not add a separate status indicator on the queue page for the admin perspective; the admin queue per spec 0007 sees the same status updates through the Ably channel.

## Follow-up

- [ ] When the Feature 9 SLA sweep cron lands, surface a "this technician has X overdue acknowledgements" small badge in the technician's top nav so they spot slippage quickly.
- [ ] When the admin close action lands in a future spec, the technician endpoint's server side allowlist gains a relaxed entry for the admin role only when the technician session is impersonating.
- [ ] When the real time Ably push lands on admin queue with full Ably channels, the technician view's status arrives through the same pickup plus eliminates the admin queue Ably channel round trip in part for same tenant updates.
- [ ] Consider installing the `react-hook-form` community skill into `AGENTS.md` `## Agent skills` so future form builds reference the recommended patterns.
- [ ] When LASU IT provisions Cloudinary credentials in production, the dev only `lib/storage/cloudinary.ts` config defaults are preserved; operationally confirm the production url plus key plus secret are set per `.env.example`.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 8 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (Ably push locked at §Stack Real-time; route group allowlist at §Auth and Access Model; the spec 0002 forward only state machine at §Invariants; the spec 0002 Resolved requires photo invariant at §Invariants; the photo upload pipeline at §Stack Image pipeline)
- `context/code-standards.md` (Server Component plus Client Component boundaries; the API route handler ordering with auth, rate limit, validate, side effects, persist, return; the file organization for `app/api/technician/`, `components/technician/`, plus the photo pipeline at `lib/storage/cloudinary.ts` from spec 0005)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist before moving to the next unit)
- `docs/specs/0002-data-model.md` (locked `assignments`, `statusHistory`, `notifications` collections; AC-3 forward only state machine; AC-6 Resolved requires photo invariant; AC-11 atomic claim transition; AC-12 optimistic concurrency pattern via `findOneAndUpdate` with `__v`; AC-13 `toPublicJSON` PII redaction)
- `docs/specs/0003-design-system-ui-foundation.md` (the technician role aware layout at `app/(technician)/`; the `TechnicianQueueEmpty` composite re used as the empty state; the Astryx form primitives used by the transition form; the severity to colour mapping consumed by the SLA breach overlay; the foundation providers plus the `lib/realtime/ably.ts`)
- `docs/specs/0004-authentication/` (build spec `index.md`, rationale `rationale.md`, verify `verify.md`); the `useCurrentUser` hook consumed by the technician route handlers; the auth DAL plus the project root proxy that together enforce the technician RBAC; the seeded technician users from spec 0004 AC-9)
- `docs/specs/0005-complaint-submission.md` (the photo upload helper `lib/storage/cloudinary.ts` re used verbatim; the Sharp pipeline reuse; the priority rule from spec 0005 priority value sourcing)
- `docs/specs/0006-reporter-dashboard.md` (the `lib/utils/pagination.ts` cursor helper re used for the queue pagination)
- `docs/specs/0007-admin-queue-and-assignment.md` (the assignments rows plus the technician allowlist; the Ably push plus `notifications` row pattern for assignment plus the same pattern re used for status transitions)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line in `scope.md`: prove the whole pipe works before building any part of it fully)
- Polymorphic transition endpoint with server side allowlist plus optimistic concurrency (matches spec 0002 process invariants)
- Forward only state machine enforced at write time via the spec 0002 `pre('save')` hook (the route handler cannot bypass)
- Mandatory proof-of-fix photo enforced at write time via the spec 0002 AC-6 invariant
- Optimistic concurrency pattern via `findOneAndUpdate` with `__v` match (spec 0002 AC-12 verbatim)
- Ably push plus `notifications` row per transition mirrors the assignment pattern from spec 0007
- Best effort Ably push per spec 0002 process invariant; failure surfaces a Sonner toast without blocking the write
- Defence in depth: proxy plus per page `requireRole` plus per route handler `authorizeRole` plus per route handler ownership plus role check
- Reuse of `lib/storage/cloudinary.ts` from spec 0005 keeps the image pipeline consistent across reporter submission and technician resolution
