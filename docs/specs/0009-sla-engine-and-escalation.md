# 0009. SLA engine and escalation

**Date**: 2026-07-25
**Status**: In Progress

## Summary

This spec ships the Vercel cron endpoint at `/api/cron/sla-sweep` that runs every 5 minutes (per `vercel.json` plus the architecture's cron cadence) and detects SLA breaches on the complaint collection. Acknowledge overdue claims (`now > slaAcknowledgeBy && status === 'Submitted'`) raise an `escalation` notification to every `dicht_admin` user via Ably push (best effort) plus a `notifications` row; resolve overdue claims (`now > slaResolveBy && status in [Acknowledged, In Progress]`) do the same with a priority message body. The route is idempotent over a 5 minute window via a dedup query on the `notifications` collection, so Vercel cron retries plus ad hoc manual invocations never double notify. `complaints.escalated` flips to `true` on first escalation; live compute per spec 0007 keeps working because it ignores the flag.

## Context

Spec 0002 locks the `notifications` collection plus the `status` enum plus the process invariant "Vercel cron `sla-sweep` is idempotent: running it twice in the same 5-minute window is a no-op." The locked three role enum is `reporter`, `dicht_admin`, `dicht_technician`; there is no `dicht_director` role, so resolve overdue notifications route to the same `dicht_admin` set with a priority message per Q2-A. Spec 0007 ships `lib/sla/breach-detection.ts` with the `evaluateBreachState({ complaint, now })` pure function; this spec reuses it so the cron and the live admin queue share one source of truth on breach kind plus overdue millis. Spec 0007 also ships the Ably push plus `notifications` row pattern; this spec mirrors the pattern with `type: 'escalation'`. The architecture locks Vercel cron scheduled work through the application tier (per architecture §Cross-cutting concerns), so the cron endpoint shares the same auth plus validation rules as every other route.

The architectural role ambiguity is resolved in favour of every `dicht_admin` user receiving both flavours of escalation. The admin receives both flavours and self triages by severity; the resolve overdue escalation carries a Priority header plus the phrase "DICT Director review required" so the admin's eye knows it is the higher severity. The locked eight Mongoose collections stay byte for byte unchanged; the `complaints.escalated` boolean already exists in the `complaints` schema per spec 0002 for a denormalised flag that downstream consumers (the admin reporting dashboard, the technician queue, the cross spec audit) can read without recomputing.

## Requirements

**User stories**:

- As a DICT admin I want to be alerted within minutes when a claim has breached its acknowledgement deadline so I can step in before the resolve deadline compounds.
- As a DICT admin I want resolve overdue alerts to surface as Priority so I can triage them above acknowledge overdue.
- As a developer I want the sweep to be idempotent across Vercel cron retries plus manual triggers so admin inboxes do not get duplicate notifications every 5 minutes.
- As a developer I want the cron to write a structured log per run so on call rotation can see the sweep health.
- As a developer I want `complaints.escalated` to flip when a claim first breaches so the admin reporting dashboard plus the technician view can read the flag without recomputing.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Vercel cron triggers `POST /api/cron/sla-sweep` every 5 minutes. The route handler validates the `Authorization: Bearer <CRON_SECRET>` header against `process.env.CRON_SECRET` and rejects non matching callers with 401. Verifies the cron cadence half of the scope Done when line.
- **AC-2**: For each `Submitted` complaint whose `slaAcknowledgeBy` is in the past, the sweep raises an `escalation` notification to every `users` with `role: 'dicht_admin'`. The `notifications` row carries `complaintId`, `recipientId: admin._id`, `type: 'escalation'`, `read: false`, plus a short message acknowledging overdue. The route handler then publishes via Ably on the admin queue channel best effort. Verifies the acknowledge breach half of the scope Done when line plus the architecture's "Acknowledge breach notifies DICT Admin."
- **AC-3**: For each complaint whose `slaResolveBy` is in the past and whose `status` is `Acknowledged` or `In Progress`, the sweep raises an escalation notification with a priority message body and the text "DICT Director review required" plus all other admin fields identical to AC-2. The route handler flips `complaints.escalated` to `true` once. Verifies the resolve breach half of the scope Done when line plus the architecture's "resolve breach notifies DICT Director" re routed to admin per Q2-A.
- **AC-4**: The sweep is idempotent over a 5 minute window. For each candidate breach, the route handler queries `notifications.find({ complaintId, type: 'escalation', createdAt >= now - 5 * 60 * 1000 })`; if any row exists, the route handler skips both the `notifications` write plus the Ably push. The route does not crash on a partial claim failure and returns 200 with a structured log summary of `scannedCount`, `escalatedCount`, `skipCount`. Verifies the "idempotent within a 5-minute window" half of the scope Done when line.
- **AC-5**: Defence in depth: bearer token authentication on the route plus the structured logger ensures no admin can accidentally trigger the sweep via a UI affordance. The handler does not require session because it is a server to server call.
- **AC-6**: `complaints.escalated` flips to `true` exactly once per breach. The flag is write once per breach kind (acknowledge overdue plus resolve overdue share the same boolean field because the architecture does not split them); once flipped, the responder does not touch the field again on subsequent sweeps. The live compute from spec 0007 still works because the queue's red border is computed from `now` plus the SLA deadlines regardless of the flag.
- **AC-7**: Ably push is best effort per spec 0002 process invariant. Push failures do not block the `notifications` write nor the response; the structured log captures `ablyPushOk: false` plus the failure message. Admin still sees the escalation in their queue because the `notifications` table is reachable.
- **AC-8**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. End to end smoke covers Vercel cron call triggers a sweep; non matching bearer returns 401; matching bearer triggers one sweep that creates rows; running the sweep twice inside 5 minutes is a no-op on the second invocation (skip count plus zero new rows); manually time shifted `slaAcknowledgeBy` plus `slaResolveBy` produce the right escalation kinds.

## Options considered

### Option 1: Dedup via notifications query; admin receivers scoped by role (chosen)

Each candidate breach is checked against `notifications.find({ complaintId, type: 'escalation', createdAt >= now - 5min })`. If any row exists, skip. Receivers are every `users` with `role: 'dicht_admin'`; the resolve overdue flavour carries a priority message.

**Pros**:

- Zero new collection; the `notifications` collection is the single source of idempotency.
- Resolves the role ambiguity without touching the locked schema.
- Ably push plus `notifications` row pattern reuses spec 0007's pattern verbatim.
- One source of truth for breach kind via the spec 0007 `evaluateBreachState` reuse.

**Cons**:

- Every admin receives both flavours of escalation; admin self triage is required. This is mitigated by the priority copy on the resolve overdue message plus by the live breach overlay on the admin queue.
- The 5 minute window is fixed; an admin could fire a manual sweep outside the window and cause double notification. This is mitigated by ad hoc invocations following the same idempotency window.

### Option 2: Track `lastRunAt` in a tiny `cron_runs` collection

Store one row per run with `runAt`, `scannedCount`, `escalatedCount`, `skipCount`. Skip a row whose `runAt >= now - 5min`.

**Pros**:

- Explicit audit trail of every run; observability separate concern from idempotency.
- One fewer read on `notifications` because the dedup is on `cron_runs`.

**Cons**:

- One more collection to maintain; spec 0002 has fixed the locked eight collections; adding a ninth would need a spec amendment.
- The `notifications` table already serves the audit role (`spec 0002 AC-7` requires recipient and complaint ids).
- The dual read pattern is more code than option 1 without proportional benefit.

### Option 3: No dedup; trust Vercel cron to fire exactly every 5 minutes

The route handler always notifies regardless of prior run state.

**Pros**:

- Simplest handler code.

**Cons**:

- Contradicts spec 0002 process invariant directly.
- A Vercel cron retry plus a manual invocation would create duplicate notifications on the same complaint; admin inbox spirals during an outage.

## Decision

**Chosen option**: Option 1: dedup via notifications query; admin receivers scoped by role.

The cron endpoint at `POST /api/cron/sla-sweep` runs every 5 minutes from Vercel cron per `vercel.json`. Each sweep queries every non Closed complaint plus runs `evaluateBreachState({ complaint, now })` from spec 0007 to determine the breach kind. For each breach, the route checks the dedup window via `notifications`, writes the right `notifications` row plus the Ably push (best effort), and on a first time breach flips `complaints.escalated: true`. The handler returns 200 plus a structured log summary.

**Implementation skills**: `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — App Router route handler plus Server Action decisioning plus Server Component boundaries for the admin queue ribbon. `using-ably` pattern from spec 0007 plus `lib/realtime/ably.ts`. `mongodb` (`earendil-works/community-skills`, `C:/Users/Korede/.agents/skills/mongodb/`) — Mongoose `find` plus index reuse from spec 0002.

## Rationale

Two specific forces from Context drive the choice. First, spec 0002 has shipped the `notifications` collection with the required fields plus a TTL index plus the process invariant that the cron is idempotent over 5 minutes; this spec should reuse that single source of truth rather than invent a second audit table. Second, the locked three role enum has no `dicht_director`; routing every admin with a priority copy on the resolve overdue flavour is the path that preserves the schema lock while delivering the architecture's "DICT Director" intent in the simplest way.

The Ably push plus `notifications` row pattern from spec 0007 is reused verbatim because spec 0007 already proved it works for assignments; the cron just writes to `type: 'escalation'` instead of `type: 'assignment'`. Best effort per spec 0002 process invariant keeps the response stable when Ably is unreachable.

The flag `complaints.escalated` is the denormalised complement to the live compute from spec 0007; the live compute independently decides breach border colour at every queue read, and the cron flag gives downstream consumers (the admin reporting dashboard, the technician queue, plus a future SLA audit) a single field to read without recomputing. The flag flips once per claim per sweep so the write is idempotent.

## Feature design

**Data model sketch**:

This feature is additive. Zero schema changes to the locked eight Mongoose collections.

- `complaints` (locked at spec 0002): the existing `escalated` boolean field is the only field touched by this feature. The sweep flips the field to `true` on first escalation and does not touch it on subsequent sweeps.
- `notifications` (locked at spec 0002): the sweep writes new rows of `type: 'escalation'` for each breached complaint plus recipient. The 5 minute dedup window reads from this collection.
- `users` (locked): the sweep reads every user with `role: 'dicht_admin'` to compute the receiver list. No schema change.

**State transitions** (if applicable):

None. This feature reads the complaint's status plus SLA deadlines plus the beneficiaries; it does not transition status. The forward only state machine from spec 0002 still applies to the technician transitions owned by Feature 8.

**API surface**:

| Endpoint | Method | Auth | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| `/api/cron/sla-sweep` | `POST` | `Authorization: Bearer <CRON_SECRET>` | none (the bearer is the credential; the route handler reads `now` plus the collection state) | `{ data: { scannedCount, escalatedCount, skipCount, runId } }` | 401 (bearer mismatch), 500 (unhandled exception with structured log) |

**Value sourcing** (every value the action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Sweep: candidate breach list | every non Closed complaint | `ComplaintModel.find({ status: { $ne: 'Closed' } })` joined to recent `statusHistory` for sort stability |
| Sweep: breach kind per complaint | `{ kind: 'acknowledge_overdue' \| 'resolve_overdue' \| 'none', overdueMs, asOf }` | `evaluateBreachState` from spec 0007 |
| Sweep: dedup check | boolean per candidate | `NotificationModel.findOne({ complaintId: c._id, type: 'escalation', createdAt: { $gte: new Date(now - 5*60*1000) } })` |
| Sweep: receiver list | array of `_id` | `UserModel.find({ role: 'dicht_admin' })` |
| Sweep: notifications row | `{ complaintId, recipientId: admin._id, type: 'escalation', message, read: false }` | spec 0002 field set; `message` differs by breach kind (acknowledge overdue is a calm notice; resolve overdue is a Priority header plus DICT Director review required) |
| Sweep: Ably push | event on the admin queue channel | `lib/realtime/ably.ts` from spec 0007 (best effort) |
| Sweep: complaints.escalated flip | boolean | `findOneAndUpdate({ _id, escalated: { $ne: true } }, { $set: { escalated: true } })` so the flip is idempotent |
| Sweep: structured log | JSON line per run | `lib/utils/logger.ts` per code-standards file organization; fields `runId`, `scannedCount`, `escalatedCount`, `skipCount`, `startedAt`, `durationMs`, `ablyPushOk` (per receiver), plus per failure |

**Key invariants** (rules that must always hold):

- The 5 minute dedup window is enforced via the `notifications.createdAt >= now - 5min` query, not via an env var or a separate table.
- The route handler returns 200 once the sweep completed, even when zero breaches are found. A 200 is the success indicator for Vercel cron plus ops monitoring; the structured log carries the real signal.
- The cron does not transition `complaints.status`. The forward only state machine from spec 0002 plus the technician transitions from Feature 8 still own the status.
- `complaints.escalated` is write once per claim per sweep; subsequent sweeps do not touch the field because the conditional `findOneAndUpdate` is keyed on `escalated: { $ne: true }`.
- The route handler does not require a BetterAuth session because the bearer is the credential; the bearer mismatches yield 401 with no work done.
- Ably push is best effort; the structured log records `ablyPushOk` per receiver so ops can detect Ably degradation without parsing the response body.

**Security model**:

- Authentication: `Authorization: Bearer <CRON_SECRET>` header validation against `process.env.CRON_SECRET` (already present in `.env.example`).
- Authorization: Vercel cron is the only valid caller; ad hoc manual triggers are allowed only when the operator supplies the right bearer. The route handler does not require a BetterAuth session because no user is involved.
- Cron secrets are never logged in plain text; the structured logger uses a redacted field name `cronSecretPresent: true` per code-standards §PII discipline.
- PII applies: the notifications message body does NOT include reporter PII (no email, no name). When the complaint is anonymous, the message body uses "a complaint" rather than "your complaint by reporter X".
- Ably channel name is `admin:queue` for the admin queue surface; the same channel as the assignment push from spec 0007 so admins subscribe to one feed.

**Configuration required**:

- `CRON_SECRET`: already in `.env.example` per Feature 01 with placeholder `change-me-to-a-random-string`. Add a one line comment in `.env.example` that the same secret is rotated with the Vercel cron credential plus the secret is never logged.
- `vercel.json` plus schedule `*/5 * * * *` for the route: add `vercel.json` with the cron entry plus `CRON_SECRET` referenced (no value, only the env var name).
- No new collection.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: a claim has `slaAcknowledgeBy` shifted to the past with `status === 'Submitted'`. The cron runs once, creates exactly one `notifications` row of type `'escalation'` per admin, the structured log reports `escalatedCount: 1`, the Ably push fires per admin with `ablyPushOk: true`. Verifies **AC-2**, **AC-3** for the acknowledge overdue half, **AC-7**, **AC-8**.
- **Happy path**: a claim has `slaResolveBy` shifted to the past with `status === 'In Progress'`. The cron runs once, the message body carries "Priority" plus "DICT Director review required" plus the structured log reports `escalatedCount: 1`. Verifies **AC-3**, **AC-8**.
- **Failure case (idempotency)**: a claim with a past `slaAcknowledgeBy` is processed; the cron runs a second time within 5 minutes; the second run reports `skipCount: 1`, `escalatedCount: 0`, no new rows. Verifies **AC-4**, **AC-8**.
- **Auth/permission**: a request without the bearer header returns 401 with no notifications writes; a request with a wrong bearer returns 401. Verifies **AC-1**, **AC-5**.
- **Flag idempotency**: a sweep escalates a claim; `complaints.escalated` flips to `true`; a second sweep within 5 minutes does not touch the flag again (the dedup skips the write, but if we run a sweep outside the window manually, the conditional `findOneAndUpdate` confirms `escalated` is already true). Verifies **AC-6**.
- **Ably failure**: Ably publish raises an error in the test mock; the notifications row still writes; the structured log records `ablyPushOk: false` for the affected receiver. Verifies **AC-7**.
- **Build gates plus smoke**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; Playwright covers Vercel cron call (with a mock bearer), double invocation idempotency, time shifted breach scenarios. Verifies **AC-8**.

## Build plan

Tracer Bullet ordering: stand up the route handler end to end (bearer auth plus candidate selection plus breach kind plus dedup plus notifications write plus Ably push plus flag flip plus structured log) before thickening with the simulator script plus the smoke flows.

1. **Build `/api/cron/sla-sweep`** route handler at `app/api/cron/sla-sweep/route.ts`. Order: bearer auth against `process.env.CRON_SECRET`, reject 401 on mismatch; load every non Closed complaint via `ComplaintModel.find({ status: { $ne: 'Closed' } })`; for each, run `evaluateBreachState({ complaint, now })` from spec 0007; for each non none breach, dedup via `NotificationModel.findOne({ complaintId, type: 'escalation', createdAt: { $gte: new Date(now - 5*60*1000) } })`; on miss write a new `NotificationModel.create` row per admin plus publish via `lib/realtime/ably.ts` (best effort) plus conditional `findOneAndUpdate` on `complaints.escalated`; finally return 200 plus a body with the run summary. The structured logger emits one JSON line per run via `lib/utils/logger.ts`. Satisfies **AC-1** through **AC-7**.

2. **Add `vercel.json`** at project root with the cron entry `*/5 * * * *` plus `path` set to `/api/cron/sla-sweep`. The Vercel runtime injects the `CRON_SECRET` env var from the project settings. Reference the cron entry plus the env var in the JSON. Satisfies **AC-1**, **AC-8**.

3. **Build `scripts/sla-sweep.ts`** exporting `runSweep({ nowOverride? })` invoked from `package.json` `scripts.sweep` plus used by `scripts/seed.ts` integration plus Playwright smoke. Reads the same code path as the route handler via a thin refactor: extract the candidate plus breach plus dedup plus persist loop into a shared lib module plus the route handler plus the script reuse it. This is a one time duplication guard. Satisfies **AC-8** for local exercise without waiting for a Vercel cron tick.

4. **Build a small visual ribbon at the top of the admin queue** reading the count of recent escalations from a dedicated endpoint or from a denormalised count on the queue response. The simplest path: extend `GET /api/admin/queue` to return `escalatedRecentCount` plus the count of distinct complaints with `escalated: true` plus `slaResolveBy > now - 60min` so the ribbon surfaces when within the last hour there were new escalations. Falls back to zero when none. The ribbon disappears when the count is zero so the queue is uncluttered.

5. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. `npm run dev` boots. The simulator script `npm run sweep` runs locally and emits a structured log line. Playwright covers Vercel cron call with a mock bearer (the test calls the endpoint directly because Vercel cron integration is not reproducible in CI), then runs a second time within 5 minutes to assert idempotency. Verifies **AC-8**.

## Consequences

**Positive**:

- The SLA sweep cadence matches the architecture plus the scope plus the spec 0002 process invariants; admins receive alerts within minutes of breach.
- The 5 minute dedup window keeps admin inboxes clean even when Vercel retries plus manual triggers happen.
- The `complaints.escalated` flag gives downstream consumers a cheap read for cross feature audit plus reporting.
- Reusing spec 0007's `evaluateBreachState` plus Ably plus notifications patterns means the cron reuses the same audited substrate the admin queue already relies on.

**Negative / tradeoffs**:

- Every admin receives both flavours of escalation; admin self triage is required. Mitigated by the priority message body plus the live breach overlay plus the dedicated ribbon on the queue.
- Best effort Ably push means a complete Ably outage still produces notifications rows but no live banner; the structured log records `ablyPushOk: false` so ops is alerted.
- The 5 minute window is fixed; manually triggering the sweep outside the window produces duplicate notifications. Mitigated by ad hoc invocations following the same idempotency window plus the ops awareness of the structured log.

**Neutral**:

- No new env var. `CRON_SECRET` plus `ABLY_API_KEY` are already set.
- New files: `app/api/cron/sla-sweep/route.ts`, `vercel.json`, `scripts/sla-sweep.ts`, plus a small modification to `components/admin/QueueRibbon.tsx` on the admin queue.
- The cron is not subject to the rate limiting appendices (deferred per scope Deferred list); an attacker who learns the bearer is the only failure mode.

## Follow-up

- [ ] When the AI cost ceiling cron lands in a later slice, refactor the cron run loop plus structured logger into `lib/cron/` plus reuse between `sla-sweep` plus `ai-cost-check`. Deferred to a future maintenance task.
- [ ] Promote `lib/sla/breach-detection.ts` from a per spec helper to a domain level helper when LASU IT provisions a second tenant that needs its own SLA policy overrides.
- [ ] When LASU IT provisions Cloudinary plus Vercel plus MongoDB Atlas credentials in production, the Vercel cron schedule plus the `CRON_SECRET` env are set in the Vercel project settings; the local development verification uses the simulator script and a manually fed value.
- [ ] When the SLA reporting dashboard ships in Slice 4 (Feature 11), the `complaints.escalated` flag plus the breach evaluator feed the breach count by severity chart directly.
- [ ] Consider installing the `using-ably` community skill into `AGENTS.md` `## Agent skills` so future Ably work lands on the canonical patterns; recommended but not blocking.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 9 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (Vercel cron locked at §Cross-cutting concerns; Ably push locked at §Stack Real-time; route group allowlist at §Auth and Access Model; the SLA priority semantics at §Invariants for the locked role enum)
- `context/code-standards.md` (API route handler ordering with auth, rate limit, validate, side effects, persist, return; the file organization for `app/api/cron/`, `scripts/`, `lib/utils/logger.ts`; the PII redact list for the structured logger)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist before moving to the next unit)
- `docs/specs/0002-data-model.md` (locked `notifications` collection with `type` enum including `'escalation'`; the locked `users` enum `reporter`, `dicht_admin`, `dicht_technician`; the `complaints.escalated` boolean already present per spec 0002; AC-7 the `notifications` row field set; the process invariant "Vercel cron `sla-sweep` is idempotent: running it twice in the same 5-minute window is a no-op")
- `docs/specs/0003-design-system-ui-foundation.md` (the admin queue at `app/(admin)/queue` consuming the new ribbon component; the admin three column desktop layout pattern that hosts the ribbon at the top; the provider chain from spec 0003)
- `docs/specs/0004-authentication.md` (`CRON_SECRET` env var referenced from Feature 01 plus present in `.env.example`; the auth DAL plus the project root proxy that together enforce the admin RBAC pattern for the admin queue)
- `docs/specs/0005-complaint-submission.md` (the locked eight collections cross reference for the sweep's source query; the `ComplaintModel` fields the route handler reads)
- `docs/specs/0006-reporter-dashboard.md` (the read only `toPublicJSON` mapper pattern; not directly used by the cron but consistent with the system)
- `docs/specs/0007-admin-queue-and-assignment.md` (`lib/sla/breach-detection.ts` from this spec re used verbatim by the cron; the Ably push plus `notifications` row pattern re used for `type: 'escalation'`; the `UserModel.find({ role: 'dicht_admin' })` receiver scope query)
- `docs/specs/0008-technician-queue-and-status-updates.md` (the technician's transition role plus the cron does not transition status; the spec 0002 forward only state machine is still owned by Feature 8 plus earlier)

**Practices and standards**:

- Vercel cron cadence `*/5 * * * *` for the 5 minute sweep (matches the scope plus spec 0002 process invariant)
- Idempotent dedup via the `notifications` collection (matches the spec 0002 invariant without adding a ninth collection)
- Best effort Ably push per spec 0002 process invariant
- Defence in depth: bearer auth plus structured logger plus no BetterAuth session for cron to server calls
- PII discipline: no reporter PII in notifications message body; cron secret redacted in logs
- Single source of truth via `evaluateBreachState` reuse from spec 0007
- `vercel.json` plus `CRON_SECRET` for Vercel cron credential; plus local simulator script for development plus CI
