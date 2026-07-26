# 0007. Admin queue and assignment

**Date**: 2026-07-25
**Status**: Proposed

## Summary

This spec ships the DICT admin console at `/admin/queue` with filters (severity, age, location), a live SLA breach overlay computed at read time, a click row details dialog with an Assign dropdown of seeded technicians, optimistic concurrency on the assignment write, an audit trail of assignments plus `statusHistory` entries per the spec 0002 forward only state machine, an Ably push to the assigned technician's channel plus a `notifications` row per assignment, and a recent actions feed showing the last ten assignment actions by the current admin in the last 24 hours. Three column desktop matches the spec 0003 ui-context admin pattern; single column mobile uses filters as a top dropdown or drawer.

## Context

The architecture locks Ably push for assignment notifications and the spec 0002 data model ships the `assignments` collection plus the `statusHistory` collection plus the forward only state machine plus the optimistic concurrency pattern (`findOneAndUpdate` with `__v` match). The spec 0003 foundation ships the admin role aware layout at `app/(admin)/` plus the `AdminQueueEmpty` composite plus the three column desktop layout pattern plus the severity to colour mapping. Spec 0004 ships `useCurrentUser` plus the project root proxy plus the auth DAL that together enforce admin RBAC plus per page `requireRole` defense in depth. Spec 0005 ships the submission flow that populates the queue. Spec 0006 ships the reporter dashboard plus the reusable `lib/utils/pagination.ts` cursor helper.

The SLA sweep cron is Feature 9 (Slice 3) and is not part of Feature 7; the SLA breach overlay must therefore compute breach status at the route handler read time rather than rely on a stored flag, so the admin queue is correct from day one without depending on the cron landing. The admin assignment action is the canonical entry point for new `assignments` rows plus `statusHistory` rows that the technician queue reads from Feature 8.

## Requirements

**User stories**:

- As a DICT admin I want the queue at `/admin/queue` to show every active claim plus its SLA breach status so I can see what needs attention right now without reloading.
- As a DICT admin I want to filter the queue by severity, by age, and by location so I can focus on one slice of campus when needed.
- As a DICT admin I want to click a row and assign it to a technician in one or two clicks so a complaint does not sit unassigned overnight.
- As a DICT admin I want reassignment to leave a clear audit trail (who had it before, who has it now, when it moved) so accountability is preserved across the lifecycle.
- As a developer I want the SLA breach overlay computed at read time so it does not depend on a cron that lives in a later slice.
- As a developer I want Ably push to fire on every assignment plus reassignment so the technician gets the right notification without busy work.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: An admin visiting `/admin/queue` sees a queue of all non `Closed` claims sorted by SLA urgency (earliest `slaAcknowledgeBy` first, then earliest `slaResolveBy` first); breached claims are visually floated to the top with a red border colour from the ui-context severity mapping. Verifies the "see SLA breach indicators" half of the scope Done when line.
- **AC-2**: The queue supports three filters that compose: severity (one of `Critical`, `High`, `Medium`, `Low`), age (today, last 7 days, last 30 days, all), location (any of the seeded `locations` rows). Filters are exposed as chip toggles in the left column on desktop plus a top dropdown on mobile. The filter state syncs with the URL `?severity=...&age=...&locationId=...` so a link can be shared. Verifies the "filter the queue" half of the scope Done when line.
- **AC-3**: SLA breach state is computed at read time in `GET /api/admin/queue` from `now > slaAcknowledgeBy && status === 'Submitted'` plus `now > slaResolveBy && status in [Acknowledged, In Progress]`. A complaint is breach acknowledged when the first condition is true and breach resolved when the second is true. Each breach state drives the row border colour per the ui-context severity mapping (`danger` red on either state). Verifies the live compute path independent of the SLA sweep cron (Feature 9).
- **AC-4**: Clicking a row opens an Astryx `Dialog` (or a slide over on desktop) showing the complaint summary, the SLA breach state, the current assignee (or "unassigned" when there is none), the previous assignee list from prior `assignments`, and an Assign dropdown listing technicians seeded by spec 0004 AC-9 with their display name and role. The dialog also shows the report's description plus photo URLs. Verifies the "assign complaint to a technician" half of the scope Done when line.
- **AC-5**: Pressing Assign posts to `POST /api/admin/queue/assign` with `{ complaintId, assignedToTechId, expectedVersion: __v, note? }`. The route handler `findOneAndUpdate({ _id, __v: expectedVersion }, ...)` per spec 0002 AC-12 returns 200 on success, 409 `stale_write` on version mismatch. On success a new `assignments` row is created (`complaintId`, `assignedToTechId`, `assignedById`, `assignedAt: now()`) plus a `statusHistory` row per the spec 0002 forward only state machine marking the assignment transition (admin assignment does not change `complaints.status` per the locked state machine; the technician acknowledgement does, in Feature 8). Verifies "assign a complaint" plus the audit trail in the same write.
- **AC-6**: Reassigning a complaint that has a prior assignment creates a new `assignments` row leaving the previous row untouched (`assignedAt` unchanged), so the audit trail is queryable for the Slice 4 admin reporting feature. The detail dialog shows both the current assignee and the previous assignees in chronological order. Verifies "reassign with audit" half of the scope Done when line.
- **AC-7**: On every assignment plus reassignment, an Ably push is published to the assigned technician's channel plus a `notifications` row is created with `type: 'assignment'`, `complaintId`, `recipientId: assignedToTechId`, plus a short message. Ably push failures are best effort (per spec 0002 process invariant for Ably pushes) and surface a Sonner toast without blocking the assignment write. Verifies the Ably push on assignment per the architecture.
- **AC-8**: Defense in depth: the project root proxy plus the auth DAL combine to enforce admin RBAC per spec 0004. The route handler calls `getServerSession` plus `authorizeRole(session, "dicht_admin")` from the DAL. The page level calls `requireRole("dicht_admin")` from the DAL. The route handler returns 403 when the requester is not an admin. The assign action is authorised to admins only (technicians cannot reassign per spec 0002 process invariants).
- **AC-9**: The admin queue renders a recent actions feed in a side panel showing the last ten assignment actions by the current admin in the last 24 hours, joined from `assignments` plus `statusHistory`, sorted descending. Each entry shows the complaint id, the previous assignee, the new assignee, and the absolute timestamp via `date-fns` `formatDistanceToNowStrict`. The feed re renders whenever a new assignment is created.
- **AC-10**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; end to end smoke covers filter queue by severity, age, location; SLA breach overlay appears for a manually time shifted complaint; assign creates an audit trail row plus an Ably notification; reassign creates a second row leaving the first intact; recent actions feed reflects the latest action.

## Options considered

### Option 1: Three column filters plus queue plus detail; live SLA compute; full audit (chosen)

A three column desktop layout with filters in the left column, the queue centre, and a detail panel right when a row is selected. SLA breach is computed at read time. Each assignment creates a new `assignments` row; reassignments preserve the previous rows. Ably push plus a `notifications` row on every assignment. A recent actions feed in a side panel for the last 24 hours.

**Pros**:

- Matches spec 0003 three column admin layout pattern plus the foundation's `AdminQueueEmpty` composite.
- Live compute means no dependency on the Feature 9 SLA sweep cron landing first.
- Audit trail is queryable end to end and the Slice 4 reporting dashboard can build against it directly.
- Ably push is the architecture's locked behaviour so the Feature 8 technician queue reads the same notifications.

**Cons**:

- Live compute runs on every page load; small overhead, but stable at pilot scale.
- The audit trail plus the live compute plus the recent actions feed means three places compute related state; the reconciliation happens at the route boundary.
- The recent actions feed adds another side panel that the admin's eye has to track.

### Option 2: Delegate breach to a stored flag set by the cron

Use the `escalated` boolean field on the complaint, set by the Feature 9 SLA sweep cron; defer the breach overlay until Feature 9 ships.

**Pros**:

- Zero compute on page load; the read is a single field check.

**Cons**:

- Feature 7 ships incomplete: no breach overlay until Feature 9 lands; the admin's Done when line "see SLA breach indicators" is unmet.
- Larger coupling between Slice 2 and Slice 3 than the architecture envisions.
- The admin would silently see no breach indicators during pilots until the cron lands.

### Option 3: Inline assign dropdown in each row

A small dropdown in each row that posts directly to the assignment action without opening a side panel.

**Pros**:

- One fewer click per assignment.

**Cons**:

- Lacks room for the SLA breach plus the assignee history plus the description context that informs the right technician choice.
- Conflicts with the spec 0003 three column desktop layout pattern.
- Risk of accidental assignment without seeing the full picture.

## Decision

**Chosen option**: Option 1: three column filters plus queue plus detail; live SLA compute; full audit.

Admin can filter by severity, age, location at `/admin/queue`; click a row to see full detail in a dialog or slider; assign or reassign with one click plus an optional note; Ably push fires on every assignment; a recent actions feed surfaces the last 24 hours.

**Implementation skills**: `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — App Router plus Server Component boundaries, racefree route handlers in App Router. `using-ably` pattern from spec 0003 plus the architecture Ably client at `lib/realtime/ably.ts`.

## Rationale

Two specific forces from Context drive the choice. First, the admin queue's "SLA breach indicators" half of the Done when line is the foundation's primary value to DICT; if Feature 7 ships without it the admin would make decisions blind to breach state until Feature 9 lands, which contradicts the architecture's MVP intent. Computing breach at read time is the smallest path that meets the Done when line without depending on a sibling slice. Second, every assignment and reassignment must leave a complete audit trail because the Slice 4 admin reporting feature plus the academic doc's audit accountability claim both require the historical `assignments` rows plus the `statusHistory` rows to be queryable end to end. Overwriting an existing `assignments` row would lose the previous owner and contradict the audit invariant.

The Ably push on every assignment matches the architecture's locked behaviour; deferring it would leave the technician's queue (Feature 8) blind to new assignments until the polling cron lands. The recent actions feed is a small affordance but it gives the admin an in session memory of what they just changed without leaving the page; without it, the admin would lose track after a few quick assignments.

The optimistic concurrency check via `findOneAndUpdate` with `__v` match per spec 0002 AC-12 keeps two admins assigning the same complaint from stepping on each other silently; the alternative (last write wins) would silently overwrite the prior assignment in a way that the audit trail cannot recover from.

## Feature design

**Data model sketch**:

This feature is additive. Zero schema changes to the locked eight Mongoose collections.

- `complaints` (locked at spec 0002): no field changes. The queue reads `categoryId`, `locationId`, `description`, `photoUrls`, `status`, `priority`, `slaAcknowledgeBy`, `slaResolveBy`, `createdAt`, `isAnonymous`, `parentComplaintId`, plus `__v` for optimistic concurrency.
- `assignments` (locked at spec 0002): no field changes. Each assignment creates a new row; reassignment creates another row leaving the previous row untouched; the queue's "current assignee" is the latest row per `complaintId`.
- `statusHistory` (locked at spec 0002): no field changes. The assignment action writes a row marking the transition with `changedBySystem: false` (admin actor, not system) per spec 0002 AC-3 plus AC-7.
- `notifications` (locked at spec 0002): no field changes. Every assignment plus reassignment writes a row with `type: 'assignment'`, `complaintId`, `recipientId: assignedToTechId`, and a short message.
- `users` (locked): no field changes. The Assign dropdown reads from the seeded users with `role: 'dicht_technician'` (plus the `dicht_admin` rows when an admin wants to self assign in the pilot).

**State transitions** (if applicable):

The assignment action does not change `complaints.status` directly per the spec 0002 forward only state machine (`Submitted → Acknowledged → In Progress → Resolved → Closed`); the technician's acknowledgement action is the one that transitions to `Acknowledged`, which Feature 8 owns. The admin assignment action only writes `assignments` plus `statusHistory` plus `notifications` plus the Ably push.

**API surface**:

| Endpoint | Method | Auth | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| `/api/admin/queue` | `GET` | admin session | `?severity` optional, `?age` optional (`today`, `7d`, `30d`, `all`), `?locationId` optional, `?cursor` optional | `{ data: complaintPublicJSON[], meta: { nextCursor, hasMore } }` plus SLA breach overlay attachment | 401, 403 |
| `/api/admin/queue/assign` | `POST` | admin session | `{ complaintId, assignedToTechId, expectedVersion, note? }` | `{ data: { assignmentId, statusHistoryId, notificationId, ablyPushOk } }` | 401, 403, 404 (invalid technician), 409 stale_write (version mismatch), 422 invalid_input (technician role mismatch) |
| `/api/admin/queue/recent-actions` | `GET` | admin session | `?limit` optional, default 10 | `{ data: recentActionPublicJSON[] }` | 401, 403 |
| `/admin/queue` (page) | `GET` | admin session | none | rendered page HTML with three column layout | 401, 403 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Queue row: status badge | status string | `complaints.status` (not transitioned by assignment per spec 0002 forward only state machine) |
| Queue row: severity badge | priority | `complaints.priority` |
| Queue row: category name | string | `categories.findById(complaint.categoryId).systemType` |
| Queue row: location name | string | `locations.findById(complaint.locationId).name` |
| Queue row: created timestamp | string | `date-fns formatDistanceToNowStrict(complaints.createdAt)` |
| Queue row: SLA resolve by | string | `date-fns formatDistanceToNowStrict(complaints.slaResolveBy)`. Precise when within 24 hours |
| Queue row: breach border | severity tint | per `## Key invariants` section below |
| Queue sort: order | ranked | `breached first`, then `slaAcknowledgeBy asc`, then `slaResolveBy asc`, then `createdAt asc` |
| Queue row: assignee name | string | `users.findById(latestAssignments.complaintId.complaintId).findOne(...).assignedToTechId).name` (latest assignment per complaint via join) |
| Detail dialog: SLA breach state | computed at read time | `now > slaAcknowledgeBy && status === 'Submitted'` OR `now > slaResolveBy && status in [Acknowledged, In Progress]` |
| Detail dialog: previous assignees | list | `assignments.find({ complaintId }).sort({ assignedAt: asc })` excluding the latest |
| Assign dropdown options | list | `users.find({ role: 'dicht_technician', email: { $exists: true } })` excluding any user whose own session role is `dicht_admin` for the pilot |
| Assign action: new assignment row | `{ complaintId, assignedToTechId, assignedById: req.session.user._id, assignedAt: now() }` | server computed plus the admin's session id |
| Assign action: statusHistory row | `{ complaintId, fromStatus: complaints.status, toStatus: complaints.status, changedById: admin._id, changedBySystem: false, note }` | spec 0002 forward only state machine plus the optional note |
| Assign action: notifications row | `{ complaintId, recipientId: assignedToTechId, type: 'assignment', message: '<admin name> assigned this complaint to you', read: false }` | server computed |
| Assign action: Ably push | event on technician's channel via `lib/realtime/ably.ts` | best effort; failure surfaces a Sonner toast |
| Recent actions feed: each entry | `{ complaintId, previousAssigneeName, newAssigneeName, changedAt }` | join of `assignments` plus `users` plus `statusHistory` (`changedBySystem: false`) filtered by `assignedById === admin._id` and `changedAt >= now - 24h` |

**Key invariants** (rules that must always hold):

- Breach acknowledged: `now > complaints.slaAcknowledgeBy && complaints.status === 'Submitted'`. This is the spec 0002 invariant surfaced as a red border plus a tooltip.
- Breach resolved: `now > complaints.slaResolveBy && complaints.status in ['Acknowledged', 'In Progress']`. This is also a red border plus a tooltip explaining which deadline is missed.
- The default queue excludes `Closed`; flipping a filter to show `Closed` reveals them sorted to the bottom of the list (or filtered out per AC-2 filter composition).
- Reassigning a complaint increments the `assignments` row count by one; the prior row's `assignedAt` is unchanged.
- The admin queue's URL state syncs with the filter values, so a refresh of the page preserves the filters.
- The optimistic concurrency check via `findOneAndUpdate` returns 409 on mismatch without rolling back the new `assignments` row, but the route handler does not write the row until the version match succeeds; the atomic write is per spec 0002 AC-11 (concurrent writers do not silently overwrite).
- The technician's first assignment publishes an Ably event on the technician's user channel plus appends to `notifications`; subsequent assignments target the same channel plus append.

**Security model**:

- Authentication: BetterAuth session probed via `getServerSession` from `lib/auth/dal.ts` plus per page `requireRole` per spec 0004.
- Authorization: server side filter ensures the requester's role is `dicht_admin`; technician role is rejected with 403 via `authorizeRole` in the route handler (plus a server side `requireRole("dicht_admin")` in the page); the assign action reads the technician's role server side from `users` and rejects 422 if the requested `assignedToTechId` is not `dicht_technician`.
- The `note` field on the assignment action is bounded (max 500 chars) and recorded as is on the `statusHistory.note` row.
- Ably push: the channel name is `user:<assignedToTechId>` scoped to the technician; the publish payload includes only the complaint id plus the admin's display name plus a short message; no PII beyond what the technician already has access to via Feature 8.
- PII discipline: the queue response applies `toPublicJSON` per spec 0002 AC-13 stripping AI rationale plus cost fields; the recent actions feed strips AI cost fields too.

**Configuration required**:

None. No new env var.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: an admin filters by `severity: Critical`, sees only Critical complaints; flips the filter to `age: today`, sees the same set minus any older claims; flips to `locationId: <library>` and sees only library claims. The three filters compose. Verifies **AC-1**, **AC-2**.
- **Failure case**: a complaint whose `slaAcknowledgeBy` is set in the past with `status === 'Submitted'` is rendered at the top of the queue with a red border plus a tooltip "Acknowledgement overdue by 3h 12m". The state is computed at read time, not stored. Verifies **AC-3**, **AC-1**.
- **Happy path**: an admin clicks a row; the dialog opens with a summary, the SLA breach state, the description, photos, the assignee dropdown seeded with technicians. Pressing Assign posts to the assign route; on 200 the dialog reflects the new owner; an `assignments` row plus a `statusHistory` row are present in the database; a `notifications` row of `type: 'assignment'` is present; Ably push fires on the technician's channel. Verifies **AC-4**, **AC-5**, **AC-7**.
- **Failure case**: a second admin assigns the same complaint at the same time; the optimistic concurrency check returns 409 stale_write; the second admin's dialog shows the latest server state plus a retry button. No `assignments` row is written by the loser. Verifies **AC-5** optimistic concurrency.
- **Happy path**: an admin reassigns a previously assigned complaint; a second `assignments` row is created leaving the first intact; the dialog shows both the current and previous assignees in chronological order; the recent actions feed reflects the new action. Verifies **AC-6**, **AC-9**.
- **Auth/permission**: a reporter requests `/api/admin/queue`; the route handler returns 403 from `authorizeRole(session, "dicht_admin")` returning false in the DAL. The page level `requireRole("dicht_admin")` redirects a reporter to `/` if they reach the admin page directly. Verifies **AC-8**.
- **Build gates plus smoke**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; Playwright covers filter, breach overlay, assign, reassign, recent actions feed. Verifies **AC-10**.

## Build plan

Tracer Bullet ordering: stand up the queue list end to end (filters plus live breach compute plus row click handler) before thickening with the assign action plus the Ably push plus the recent actions feed. Each task tagged with the AC or ACs it satisfies.

1. **Build `/lib/sla/breach-detection.ts`** exporting `evaluateBreachState({ complaint, now })` returning `{ kind: 'none' | 'acknowledge_overdue' | 'resolve_overdue', overdueMs, asOf: now }`. Pure function, no DB or external deps. Used by the route handler in this spec and reused by the SLA sweep cron in Feature 9 plus the reporting dashboard in Feature 11. Satisfies **AC-3** core.

2. **Build `GET /api/admin/queue`** route handler at `app/api/admin/queue/route.ts`. Order: session probe (defense in depth), admin role check, server side filter composition (`severity`, `age`, `locationId` plus the default exclusion of `Closed`), cursor pagination via `lib/utils/pagination.ts` from spec 0006, breach state computed per row via `evaluateBreachState`, response shape `{ data, meta: { nextCursor, hasMore } }`, `toPublicJSON` per spec 0002 AC-13. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-8**.

3. **Build `POST /api/admin/queue/assign`** route handler at `app/api/admin/queue/assign/route.ts`. Order: session probe, admin role check, Zod validate body (`complaintId`, `assignedToTechId`, `expectedVersion`, optional `note`), conditional `findOneAndUpdate({ _id, __v: expectedVersion }, ...)` per spec 0002 AC-12, return 409 on mismatch; on success write the new `assignments` row plus the `statusHistory` row plus the `notifications` row, then publish to Ably via `lib/realtime/ably.ts`, then return the response bundle `{ assignmentId, statusHistoryId, notificationId, ablyPushOk }`. Ably failures are best effort and do not block the response. Satisfies **AC-5**, **AC-7**, **AC-8**.

4. **Build `app/(admin)/queue/page.tsx`** as a Server Component reading the queue plus the assignee options (technician users); renders a three column layout (filters left, queue centre, recent actions right) using spec 0003 design tokens plus the existing `AdminQueueEmpty` composite; on row click opens an Astryx `Dialog` (or a slide over on desktop via the dialog) showing the detail plus the assign form. The page mounts `<RecentActionsFeed />` plus `<QueueRow />` plus `<AssignDialog />` plus `<FilterPanel />`. Page level `getSession()` confirms admin role. Mobile single column with filters as a top dropdown. Satisfies **AC-1**, **AC-2**, **AC-4**, **AC-9**.

5. **Build `app/api/admin/queue/recent-actions/route.ts`** plus `components/admin/RecentActionsFeed.tsx`. The route reads the join of `assignments` (`assignedById === admin._id`, `assignedAt >= now - 24h`) joined to `statusHistory` (`changedBySystem: false`, `changedAt >= now - 24h`) for the same `complaintId`, sorted desc with limit 10. The component renders date-fns formatted timestamps plus click through to the complaint detail. Satisfies **AC-9**.

6. **Build `components/admin/{FilterPanel,QueueRow,AssignDialog}.tsx`** as Client Components. `FilterPanel` is a chip group bound to the URL state via `useRouter` plus `useSearchParams`. `QueueRow` is a row with the breach border colour plus a tap target. `AssignDialog` is the form for the assign action with the optimistic concurrency mismatch retry affordance. These compose on the queue page from step 4. Satisfies **AC-2**, **AC-4**, **AC-5**.

7. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. `npm run dev` boots. Hand exercise or Playwright covers filter flip, breach overlay on a time shifted complaint, single assign writes the audit row plus the notifications row plus fires Ably, double assign with version mismatch returns 409, reassign preserves the prior row, recent actions feed reflects the latest action. Verifies **AC-10**.

## Consequences

**Positive**:

- Admin can see the queue plus breach state plus assignee history at a glance.
- The audit trail of assignments plus status transitions is queryable end to end; the Slice 4 reporting dashboard can power charts straight from `assignments` join `statusHistory`.
- Ably push matches the architecture lock; the technician queue (Feature 8) reads the same `notifications` rows plus the Ably channel.
- Live breach compute means the admin queue is correct from day one without depending on the Slice 3 cron.

**Negative / tradeoffs**:

- Live breach compute runs on every page load; small overhead, stable at pilot scale.
- The recent actions feed adds another side panel that the admin's eye tracks.
- Optimistic concurrency 409 surfaces a retry affordance but it is a small UX wrinkle for the rare double click race.
- The statusHistory note field is optional; some admins will skip it, which the audit trail accepts as normal non annotated state.

**Neutral**:

- No new env var.
- New files: `lib/sla/breach-detection.ts`, `lib/realtime/ably.ts` (already at code-standards location), `app/api/admin/queue/route.ts`, `app/api/admin/queue/assign/route.ts`, `app/api/admin/queue/recent-actions/route.ts`, `app/(admin)/queue/page.tsx`, plus the four components in `components/admin/`. Consistent with the locked file organization.
- The optimsitic concurrency pattern is reused verbatim from spec 0002 AC-12.

## Follow-up

- [ ] When the Feature 9 SLA sweep cron lands, also flip `complaints.escalated` to `true` so that downstream consumers (the admin reporting dashboard, the technician queue, the technician push notification) read it as a denormalised flag; recompute breach on read so live compute and stored flag coexist.
- [ ] The `notifications` row plus Ably push on every reassignment could be throttled if pilot shows excessive noise; defer to the Slice 4 admin reporting feature.
- [ ] `/api/admin/queue` could expose a CSV export for offline triage; defer to Feature 11.
- [ ] The recent actions feed currently shows the last 24 hours; surface a longer window as a date range filter in Slice 4.
- [ ] Consider installing the `using-ably` and `mongodb` community skills into `AGENTS.md` so future agent sessions land on the canonical patterns; recommended but not blocking.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 7 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (Ably push locked at §Stack Real-time; route group allowlist at §Auth and Access Model; optimistic concurrency pattern at §Invariants; the spec 0002 forward only state machine at §Invariants)
- `context/code-standards.md` (Server Component plus Client Component boundaries; the API route handler ordering with auth, rate limit, validate, side effects, persist, return; the centralised `toPublicJSON` mapper; the file organization `/lib/realtime/ably.ts`, `/lib/sla/breach-detection.ts`, `/components/admin/`)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist before moving to the next unit; the cross spec amendment rule)
- `docs/specs/0002-data-model.md` (locked `assignments` and `statusHistory` collections; AC-3 forward only state machine; AC-7 `notifications` required fields; AC-12 optimistic concurrency pattern via `findOneAndUpdate` with `__v`; AC-13 `toPublicJSON` PII redaction)
- `docs/specs/0003-design-system-ui-foundation.md` (the admin role aware layout at `app/(admin)/`; the `AdminQueueEmpty` composite re used as the empty state; the three column desktop layout pattern; the severity to colour mapping consumed by the breach border)
- `docs/specs/0004-authentication/` (build spec `index.md`, rationale `rationale.md`, verify `verify.md`); the `useCurrentUser` hook; the auth DAL plus the project root proxy that together enforce RBAC; the seeded admin and technician users that populate the Assign dropdown from spec 0004 AC-9)
- `docs/specs/0005-complaint-submission.md` (the protected categories plus locations plus `slaAcknowledgeHrs` join; the AI fallback to `defaultSeverity`; the locked eight collections)
- `docs/specs/0006-reporter-dashboard.md` (the `lib/utils/pagination.ts` cursor helper reused for the queue pagination; the `toPublicJSON` use convention)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line in `scope.md`: prove the whole pipe works before building any part of it fully)
- Live compute of SLA breach versus stored `escalated` flag (matches spec 0002 invariant plus the architecture's MVP intent)
- Optimistic concurrency pattern via `findOneAndUpdate` with `__v` match (spec 0002 AC-12 verbatim)
- Ably push on every assignment plus reassignment (architecture §Stack Real-time)
- Defence in depth: proxy plus per page `requireRole` plus per route handler `authorizeRole` plus per route handler ownership filter
- Three column desktop pattern with single column mobile fallback (spec 0003 ui-context)
- Audit trail via additive `assignments` rows plus `statusHistory` rows (per spec 0002 forward only state machine)
- Best effort Ably push per spec 0002 process invariant
