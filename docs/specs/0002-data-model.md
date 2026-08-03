# 0002. Data model for SLA driven complaint lifecycle

**Date**: 2026-07-25
**Status**: In Progress

## Summary

This spec defines the eight Mongoose collections (`users`, `categories`, `locations`, `complaints` with an embedded `aiSuggestion` sub document, `assignments`, `statusHistory`, `notifications`, and the `reports` aggregate cache) plus the Mongoose validators and hooks that enforce the invariants recorded in `context/architecture.md §Invariants`. The data model is the foundation every later slice (auth, submission, triage, SLA sweep, reporting) builds against, so the spec seals write time enforcement of the forward only status machine, anonymous submission, Resolved requires photo, SLA deadline ordering, and the 90 day reaper on notifications, then commits the build plan to harden the existing shallow test surface into invariant level tests against a real MongoDB Atlas instance.

## Context

The architecture context already locked the eight collection set and named invariants (`context/architecture.md §Storage Model` and `§Invariants`). The implementation work has begun (every schema file exists with field definitions; a connection module and an index bootstrap module exist on `feat/project-setup`). The decisions still open are the write time enforcement mechanisms (forward only transition guard, cross field anonymous invariant, Resolved requires photo enforcement, SLA deadline ordering), the index list including the new ones called for today, the connection pool sizing, the optimistic concurrency strategy for shared writes, the duplicate detection race resolution on the submission path, and the clock source for SLA deadlines. Each of these is enforcement rather than discovery: the data layer has to make the rule invariant under any caller (route handler or future ops script), otherwise the system drifts over time as new code paths write the same fields.

The package already pins `mongoose ^9.8.0` while the architecture text still says Mongoose 8. This is a real decision: pin to 9 (current Mongoose line) and update architecture, or roll the package back. The Mongoose 9 line is the version the team will operate on, and the schema features the spec needs (sub documents, custom validators, pre save hooks, optimistic concurrency via `versionKey`, single document transactions, TTL indexes, `InferSchemaType`) are identical between 8 and 9 for our usage. A larger decision is the absence of `bcrypt` in `package.json` next to `better-auth`. Architecture says bcrypt hash in `users.passwordHash`. BetterAuth handles email plus password hashing internally and writes the resulting hash into the user table. Pinning to BetterAuth keeps the dependency surface minimal and the audit test predictable to one library.

The Mongoose skill (`mongodb`) is installed at `C:/Users/Korede/.agents/skills/mongodb/` and its patterns line up with the architecture: embed `aiSuggestion` (read together with the parent doc, bounded), reference for users and complaints (cross document relations), separate collections for the audit trail and notifications (independent growth and TTL friendly), compound indexes for the 30 minute duplicate detection window, TTL on `notifications.createdAt` (90 day reaper). The skill's patterns are referenced where the spec locks a choice.

## Requirements

**User stories**:

- As a developer, I want every collection to match the locked architecture exactly (entities, fields, types, required and optional, FK references) so that route handlers can rely on a single source of truth and a single `InferSchemaType` per model.
- As a developer, I want every invariant from `context/architecture.md §Invariants` to be enforced at write time by Mongoose so that no caller, including future scripts, can violate the rule.
- As a developer, I want connection pool sized and a graceful shutdown wired so that the SLA sweep cron does not strand sockets when Vercel recycles the worker.
- As a developer, I want idempotent index creation once on first connect so that local dev, CI, and Vercel cron all converge to the same index set without manual ops.
- As a developer, I want a centralized `toPublicJSON` mapper that strips PII fields so that logs and API responses never leak `passwordHash`, `anonymousId`, or AI cost internals.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: The eight collections are defined in `lib/db/models/`, one file per collection, each exporting a Mongoose model and an `InferSchemaType` named export. Field set, types, required and optional, enums, FK references, and timestamps match the field table in `## Feature design`.
- **AC-2**: `users.email` is unique at the index level (creating a second row with the same email raises `E11000`). `categories.systemType` is unique at the index level.
- **AC-3**: `complaints.status` transitions are forward only (Submitted, Acknowledged, In Progress, Resolved, Closed) plus the single admin override (In Progress to Acknowledged). Any other transition rejects with a typed `ApiError(code: 'invalid_transition', status: 422)` regardless of caller.
- **AC-4**: When `complaints.isAnonymous === true` then `complaints.reporterId === null` and `complaints.parentComplaintId` is unaffected, while a sibling system side identifier on the user row (`users.anonymousId`) is populated. The cross field rule is enforced at write time.
- **AC-5**: `complaints.slaAcknowledgeBy < complaints.slaResolveBy` always holds at write time. Violations reject before save.
- **AC-6**: `complaints.status === 'Resolved'` requires `complaints.proofPhotoUrl !== null`. The proof photo URL is denormalized onto the complaint document at the moment the Resolved transition is recorded, while `statusHistory.photoUrl` still records the same URL on the latest history row for the full audit trail.
- **AC-7**: `notifications.complaintId` and `notifications.recipientId` are both required at the schema level. The escalation specific rule from architecture resolves into the schema rule itself (every `notifications` row now carries the breach complaint by construction).
- **AC-8**: The TTL index on `notifications.createdAt` (7776000 seconds, 90 days) is created on first connect. After 90 days the reaper deletes the row without ops intervention.
- **AC-9**: `lib/db/connection.ts` connects with `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`, and registers a `SIGINT` handler that closes the connection cleanly so Vercel cron does not strand sockets.
- **AC-10**: `lib/db/indexes.ts` `createIndexes()` is called once on first connect, is idempotent on MongoDB native level, declares every index in the index list in `## Feature design` (including the TTL and the new `notifications.complaintId`, `statusHistory.complaintId`, and `categories.systemType` unique index), and retries up to 3 times with exponential backoff on transient errors.
- **AC-11**: Duplicate detection in the 30 minute window runs as a single document transaction (read plus claim inside `mongoose.startSession()`). A racing submission from a second reporter attaches to the original via `parentComplaintId` without creating a second parent.
- **AC-12**: Optimistic concurrency on `complaints` is enabled via Mongoose `versionKey` (default). Route handlers do conditional `findOneAndUpdate({ _id, status: prev, __v: prevV }, ...)` so two stale writers fail with a typed `ApiError(code: 'stale_write', status: 409)`.
- **AC-13**: A centralized `toPublicJSON(instance)` helper at `lib/utils/pii.ts` strips `passwordHash`, `anonymousId` (when the related complaint is Resolved or Closed), `aiSuggestion.promptTokens`, `aiSuggestion.completionTokens`, `aiSuggestion.costUsd`, `aiSuggestion.error`, and `aiSuggestion.latencyMs`. Every API route handler runs the response through this helper.
- **AC-14**: End to end schema tests run against a real MongoDB Atlas (or `mongodb-memory-server` plus a CI managed Atlas cluster). The tests assert each invariant (AC-2, AC-3, AC-4, AC-5, AC-6, AC-7) at write time and assert index creation is idempotent across two sequential runs (AC-10). The file `lib/db/__tests__/invariants.test.ts` is the canonical test fixture.
- **AC-15**: `package.json` pins `mongoose ^9.8.0` (no change from current). `context/architecture.md` is updated in the same commit to record Mongoose 9 instead of Mongoose 8. BetterAuth owns password hashing; no `bcrypt` dependency is added.

## Options considered

### Option 1: Pin Mongoose to 8.x to honor existing architecture text

Downgrade the package to `mongoose ^8.x`. Costs a fresh install, risk of small API breaking changes, and the architecture text stays unchanged.

**Pros**:
- Honors the architecture text as written.
- Avoids the "spec drift from package" follow up.

**Cons**:
- The working code is on 9; mixing versions during build risks regressions.
- Requires editing `lib/db/connection.ts` plus model imports if any 8 to 9 API surface changed.

### Option 2: Pin Mongoose to 9.x and update architecture to match (chosen)

Keep the current `mongoose ^9.8.0`. Update `context/architecture.md` to record Mongoose 9 in the same commit as the model hardening.

**Pros**:
- One commit, no downgrade churn.
- Mongoose 9 is the current line the team will operate on; pattern coverage in `mongodb` skill and online docs is current.

**Cons**:
- Requires editing architecture in the same commit, which adds one cross file update to the unit's diff.

### Option 3: Add `bcryptjs` and have BetterAuth use it explicitly

Add a `bcryptjs` dependency so password hashing rounds are explicit and auditable from the test fixture.

**Pros**:
- Hashing rounds and cost factor are visible in code rather than hidden in BetterAuth's defaults.

**Cons**:
- Adds a dependency we do not need; BetterAuth already hashes to its current defaults.
- Tests would have to mock BetterAuth to assert round counts, which couples the test surface to library internals.

## Decision

**Chosen option**: Option 2: pin Mongoose 9 and update architecture; BetterAuth owns password hashing.

All eight Mongoose collections live at `lib/db/models/<collection>.ts` with `InferSchemaType` exports. Write time enforcement uses Mongoose custom validators for cross field rules (anonymous invariant and SLA ordering), a `pre('save')` hook on `complaints` for forward only status transitions and the Resolved requires photo rule, the schema `required: true` for fields that are always populated (`notifications.complaintId` and `notifications.recipientId`), and a TTL index on `notifications.createdAt`. Optimistic concurrency uses Mongoose `versionKey`. Optimistic concurrency uses Mongoose `versionKey`. Connection pool sized at 10, timeouts at 5 and 45 seconds, with a SIGINT handler. Idempotent `createIndexes()` runs once on first connect with retry on transient errors. Duplicate detection runs inside a single document transaction.

**Implementation skills**: `mongodb` (`earendil-works/community-skills`, `C:/Users/Korede/.agents/skills/mongodb/`) — schema design, embedding vs reference patterns, index strategy, Mongoose hooks, single document transactions, TTL indexes.

## Rationale

The architecture already locks the entity set and names the invariants; the open decisions in this spec are mechanism choices, not scope decisions. Mongoose 9 was picked over 8 because the working package is on 9 and the schema features the spec needs (sub documents, custom validators, pre save hooks, optimistic concurrency via `versionKey`, single document transactions, TTL indexes, `InferSchemaType`) are identical between 8 and 9 for our usage; pinning to 9 avoids downgrade churn and the small risk that an 8 to 9 API change surfaces during the index or hook work. BetterAuth was kept as the password hashing source because it already hashes to its current defaults, hash internals are out of scope for the data model, and adding `bcryptjs` would couple the test fixture to library internals. The forward only state machine lives in a `pre('save')` hook on `complaints` rather than in route handlers so scripts and direct admin writes cannot bypass it; the same reasoning applies to the anonymous invariant and the SLA ordering, which are cross field rules that route handlers cannot enforce on their own. Resolved requires photo is enforced by denormalizing the latest proof photo onto `complaints.proofPhotoUrl` and validating at the schema level rather than cross document because cross document enforcement requires an extra read per write and the latest photo URL is small enough to denormalize without bloating the document. Optimistic concurrency via `versionKey` plus conditional `findOneAndUpdate` keeps the route handlers honest under stale writes; the alternative, allowing concurrent valid transitions to overwrite, would silently overwrite the SLA sweep result. The duplicate detection race is closed by a single document transaction because the alternative (a follow up re attachment) leaves a brief window where two parents exist, which the admin queue would surface as a flicker. The 90 day TTL on `notifications` keeps the audit trail small because the canonical record of every notification lives in `statusHistory`. The centralized `toPublicJSON` mapper is the single source of truth for what reaches the API response; the alternative (per model custom toJSON overrides) drifts over time.

## Feature design

**Data model sketch**:

`users` (`lib/db/models/user.ts`): `_id`, `email` (String, unique index, required), `passwordHash` (String, optional, BetterAuth managed), `name` (String, required for humans, nullable for the BetterAuth system row), `role` (Enum, `reporter | dicht_admin | dicht_technician`, required, indexed), `anonymousId` (String, optional, signed token identifier for the anonymous reporter path), `createdAt`, `updatedAt`.

`categories` (`lib/db/models/category.ts`): `_id`, `systemType` (Enum, `Electrical | Plumbing | Carpentry | HVAC | ICT | Cleaning | Security | Other`, required, unique), `defaultSeverity` (Enum, `Critical | High | Medium | Low`, required), `slaAcknowledgeHrs` (Number, required), `slaResolveHrs` (Number, required), `createdAt`, `updatedAt`.

`locations` (`lib/db/models/location.ts`): `_id`, `name` (String, required), `area` (Enum, `hostel | academic | admin | lab | other`, required), `createdAt`, `updatedAt`.

`complaints` (`lib/db/models/complaint.ts`): `_id`, `reporterId` (ObjectId ref `users`, optional, default null), `isAnonymous` (Boolean, default false), `categoryId` (ObjectId ref `categories`, required), `locationId` (ObjectId ref `locations`, required), `description` (String, required, minlength 10, maxlength 2000), `photoUrls` ([String], default []), `priority` (Enum, `Critical | High | Medium | Low`, default Medium), `slaAcknowledgeBy` (Date, required), `slaResolveBy` (Date, required), `status` (Enum, default Submitted), `escalated` (Boolean, default false), `proofPhotoUrl` (String, nullable, required by validator when `status === 'Resolved'`), `aiSuggestion` (sub document: `enabled` Boolean default false; `model` String; `categoryId` ObjectId; `severity` Enum; `rationale` String; `latencyMs` Number; `promptTokens` Number; `completionTokens` Number; `costUsd` Number; `ranAt` Date; `fallback` Boolean default false; `error` String), `parentComplaintId` (ObjectId ref `complaints`, optional), `createdAt`, `updatedAt`. The sub document uses `_id: false`.

`assignments` (`lib/db/models/assignment.ts`): `_id`, `complaintId` (ObjectId ref `complaints`, required, indexed), `assignedToTechId` (ObjectId ref `users`, required), `assignedById` (ObjectId ref `users`, required), `assignedAt` (Date, default now), `createdAt`, `updatedAt`.

`statusHistory` (`lib/db/models/status-history.ts`): `_id`, `complaintId` (ObjectId ref `complaints`, required, indexed), `fromStatus` (String, required), `toStatus` (String, required), `changedById` (ObjectId ref `users`, optional, default null), `changedBySystem` (Boolean, default false, the new field that distinguishes SLA sweep writes from human writes), `note` (String, optional), `photoUrl` (String, optional, set on transitions involving photos), `changedAt` (Date, default now), `createdAt`, `updatedAt`.

`notifications` (`lib/db/models/notification.ts`, TTL 90 days on `createdAt`): `_id`, `complaintId` (ObjectId ref `complaints`, required, indexed, dropped to required from previously optional per this spec), `recipientId` (ObjectId ref `users`, required, indexed), `type` (Enum, `assignment | escalation | status`, required), `message` (String, required), `read` (Boolean, default false), `createdAt`, `updatedAt`.

`reports` (`lib/db/models/report.ts`): `_id`, `period` (String, required, period key such as `2026-W30`), `byCategory` (Mixed, default {}), `byLocation` (Mixed, default {}), `avgResolutionHrs` (Number, default 0), `slaBreachCount` (Number, default 0), `createdAt`, `updatedAt`.

**State transitions** (the only state machine in the model):

`complaints.status` walks `Submitted → Acknowledged → In Progress → Resolved → Closed`. Forward only. The single admin override is `In Progress → Acknowledged`, audited in `statusHistory`. Any other transition rejects with a typed `ApiError(code: 'invalid_transition', status: 422)`.

**API surface** (only the routes the data model owns by virtue of direct collection writes; the route level handlers are specced in their feature specs):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/cron/sla-sweep` | POST (cron) | none | swept count, escalations set | Vercel cron secret | 503 if MongoDB unreachable, 200 with empty body on idempotent rerun |
| helper `submitComplaint(input)` | transaction | reporterId or anonymousId, categoryId, locationId, description, photoUrls (server side validation only) | complaint id, slaAcknowledgeBy, slaResolveBy | reporter (BetterAuth session) or anonymous token | 422 invalid_anonymous or invalid_description, 409 parent_already_exists with parentComplaintId, 500 on hard AI failure (priority falls back to `defaultSeverity`) |

**Value sourcing** (every value the data model depends on that another layer must produce or compute):

| Action | Value produced / displayed | Source |
|---|---|---|
| `submitComplaint` | `slaAcknowledgeBy`, `slaResolveBy` | computed at server time as `now + category.slaAcknowledgeHrs` and `now + category.slaResolveHrs`; storage is Date only |
| `submitComplaint` | `priority` | `aiSuggestion.severity` when `aiSuggestion.enabled && !aiSuggestion.fallback`, else `category.defaultSeverity` |
| `submitComplaint` | `parentComplaintId` | an existing `complaints` row with same `categoryId + locationId` whose `createdAt` is within the last 30 minutes; null if none |
| `transitionStatus` | `statusHistory.fromStatus`, `statusHistory.toStatus` | current row from DB plus the requested transition |
| `transitionStatus` | `complaints.proofPhotoUrl` when `toStatus === 'Resolved'` | set from the technician uploaded Cloudinary URL at transition write time |
| `notify(recipientId, complaintId, ...)` | every field on the row | the calling site (route handler); no data layer derivation |
| `sla-sweep` | `escalated` flag, `notifications` row | read `now > slaResolveBy && status not in [Resolved, Closed]` plus `now > slaAcknowledgeBy && status === 'Submitted'` |
| `toPublicJSON` output | which fields survive | centralized helper; everything else is dropped |

**Key invariants**:

- `users.email` unique (Mongoose unique index).
- `categories.systemType` unique (Mongoose unique index).
- `complaints.status` forward only plus the admin override (Mongoose `pre('save')` hook on Complaint).
- `complaints.isAnonymous === true` implies `complaints.reporterId === null` (custom validator on Complaint).
- `complaints.slaAcknowledgeBy < complaints.slaResolveBy` (custom validator on Complaint).
- `complaints.status === 'Resolved'` implies `complaints.proofPhotoUrl !== null` (custom validator at validate time).
- `notifications.complaintId` and `notifications.recipientId` always present (schema `required: true`).
- TTL on `notifications.createdAt` (90 days).
- Duplicate detection in the 30 minute window is atomic per submission (single document transaction).
- Optimistic concurrency on `complaints` via `versionKey` and conditional update at the route handler boundary.
- Mongoose strict mode (default): unknown fields in writes are rejected.

**Security model**:

Role based read scoping lives at the application tier per `context/architecture.md §System Boundaries`. Reporter queries return only `complaints` where `reporterId === user._id` or where the user's `anonymousId` matches `complaints.parentComplaintId` traversal. DICT admin queries return the full set. Technician queries return only `complaints` whose `complaintId` is in `assignments` where `assignedToTechId === user._id` and `status` is not Closed. The data tier does no internal row scoping; the route handlers construct the filter from the session role. PII discipline: `passwordHash`, `anonymousId` (related to a resolved or closed complaint), `aiSuggestion.promptTokens`, `aiSuggestion.completionTokens`, `aiSuggestion.costUsd`, `aiSuggestion.error`, and `aiSuggestion.latencyMs` are scrubbed by `toPublicJSON` and never appear in API responses or structured logs. Compliance scope is not applicable (the academic doc lists no regulated data class for the LASU complaint system; PII of student or staff email plus name is handled at the redact list level).

**Configuration required**:

- `MONGODB_URI`: the Atlas connection string (already in `.env.example`; no change).

No new environment variables or third party credentials are added by this spec.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- Happy path: select all categories seeded, submit a complaint via the helper, observe `priority` set from AI severity when present, observe `slaAcknowledgeBy` and `slaResolveBy` populated, observe `proofPhotoUrl` required and recorded on the Resolved transition. Verifies **AC-1**, **AC-5**.
- Failure case: a request to transition a complaint from Submitted directly to Resolved is rejected with a typed `invalid_transition` error. A second reporter submits to the same `categoryId + locationId` within 30 minutes; the second submission sets `parentComplaintId` to the first and never creates a second parent. A Resolved transition without a photo URL is rejected. Verifies **AC-3**, **AC-6**, **AC-11**.
- Auth or permission: a reporter's read query against a complaint belonging to a different reporter returns nothing. The `toPublicJSON` output of a `users` row omits `passwordHash` and `anonymousId`. The `toPublicJSON` output of a `complaint` row omits the AI cost fields. Verifies **AC-4**, **AC-13**.
- Idempotency and indexing: `createIndexes()` runs twice in sequence without throwing and produces the same index set. Two writes to `users` with the same email produce exactly one stored row plus an `E11000` mapped to 409 at the route boundary. Verifies **AC-2**, **AC-10**.

## Build plan

Tracer Bullet approach (per `docs/scope/scope.md` header): thin end to end slice first that proves the connect, creates one complaint, transitions it once, and closes the audit trail; harden the invariants in slice 2; add the operational concerns (pool, SIGINT, idempotent index call) in slice 3. Tasks tagged with the AC each satisfies.

1. Update `context/architecture.md` to record Mongoose 9 instead of Mongoose 8, and reconcile the escalation specific notification rule into the schema rule (since `notifications.complaintId` is now required for every row). Single doc edit. Satisfies **AC-15**.
2. Tighten the `users` schema: `name` required for humans with a nullable exception for the BetterAuth system row (validator function on the doc, not a route guard). Satisfies **AC-1**.
3. Add the new fields the spec introduces and tighten required or optional flags per the field table: `statusHistory.changedBySystem`, `complaints.proofPhotoUrl`, `categories.systemType` unique, `notifications.complaintId` required. Satisfies **AC-1**, **AC-7**.
4. Implement the `pre('save')` hook on `complaints` enforcing the forward only status machine plus the single admin override (`In Progress → Acknowledged` allowed when the actor role is `dicht_admin` per a session id passed in via `this.$locals.session`). Reject any other backward move with `ApiError(code: 'invalid_transition', status: 422)`. The hook also stamps `statusHistory` rows inside the same save call. Satisfies **AC-3**.
5. Implement the cross field and ordering custom validators on `complaints`: `isAnonymous` implies `reporterId === null` (AC-4); `slaAcknowledgeBy < slaResolveBy` (AC-5); `status === 'Resolved'` implies `proofPhotoUrl !== null` (AC-6). Validators run in `pre('validate')` so they fire before the `pre('save')` hook.
6. Update `lib/db/connection.ts` with `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`, and the SIGINT handler that closes the connection cleanly. Preserve the singleton pattern (`isConnected`) so multiple callers in the same Node process share the connection. Satisfies **AC-9**.
7. Update `lib/db/indexes.ts` to declare every index in the index list (including the new `notifications.complaintId`, `statusHistory.complaintId`, `categories.systemType` unique, and the TTL on `notifications.createdAt`). Make the call idempotent by relying on MongoDB native index creation plus a one time boot flag in the connection module. Add 3 attempt retry with exponential backoff on transient errors. Satisfies **AC-8**, **AC-10**, plus supports **AC-2**.
8. Create `lib/utils/pii.ts` with the `toPublicJSON` helper that strips the PII field list (`passwordHash`, `anonymousId` conditional on complaint status, AI cost and token fields). Update every existing API route handler placeholder to call the helper. Satisfies **AC-13**.
9. Build the atomic duplicate detection on the submission path: helper function that reads `complaints` for `categoryId + locationId` within 30 minutes, then either attaches via `parentComplaintId` or claims as parent, all inside `mongoose.startSession()` plus `session.startTransaction()`. The compound index for the 30 minute window was declared in step 7. Satisfies **AC-11**.
10. Wire optimistic concurrency at the route handler boundary for transitions: `ComplaintModel.findOneAndUpdate({ _id, status: prev, __v: prevVersion }, ...)`, throwing `ApiError(code: 'stale_write', status: 409)` when null is returned. Keep `versionKey` enabled on the schema (the default). Satisfies **AC-12**.
11. Author `lib/db/__tests__/invariants.test.ts` against a real MongoDB Atlas instance (CI uses the developer managed test cluster; local dev uses the `mongodb-memory-server` plus a fixture Atlas URL when offline). The test file asserts each invariant (AC-2, AC-3, AC-4, AC-5, AC-6, AC-7) at write time and asserts idempotent index creation across two sequential runs. Replace the existing shallow `lib/db/models/*.test.ts` files with the focused invariant cases or move the new test file to `lib/db/__tests__/` and keep the old files as smoke tests. Satisfies **AC-14**.
12. Add a dev seed script at `scripts/seed.ts` (already referenced in `package.json` `seed` script per the session notes on Feature 01) that creates the eight `categories` rows with sensible default severity and SLA hours and seeds the LASU campus `locations` from `scripts/data/locations.json`. The script is idempotent on `categories.systemType` (uses upsert) so re running on an existing dev database is safe. Satisfies supporting work for the **AC-1** schema baseline so dev and CI start in the same known state.

## Consequences

**Positive**:

- Every named invariant in `context/architecture.md §Invariants` is enforced at the data layer; no route handler, future script, or admin tool can break the rule without a schema level violation that surfaces as a typed `ApiError`.
- Connect idempotency plus the SIGINT handler keep the SLA sweep cron safe under Vercel worker recycling, which is the dominant failure mode in Vercel deployed cron jobs.
- Centralized `toPublicJSON` plus the connection encrypt at rest (Atlas default) closes the PII leak path in logs and API responses, important because `users.email` and `users.name` flow through every notification message.

**Negative / tradeoffs**:

- The `pre('save')` hook on `complaints` makes every transition slightly more expensive (one extra round trip to read the current doc for the versionKey and status compare); at volume this is small but worth noting.
- The denormalized `complaints.proofPhotoUrl` introduces a small risk of drift between the complaint doc and the latest `statusHistory.photoUrl` if a future code path writes one without the other; the build plan addresses this by always writing both in the same save call (the `pre('save')` hook).
- The single document transaction on submission adds one session per duplicate hit; this is acceptable because the duplicate path is the minority path and the alternative is a flicker visible in the admin queue.
- TTL on `notifications` removes a useful operational artifact after 90 days; if a future feature needs long lived notifications, an archive bucket must be added before the TTL reaper activates.

**Neutral**:

- One environment variable is unchanged (MONGODB_URI already in `.env.example`).
- One new field per affected collection (`statusHistory.changedBySystem`, `complaints.proofPhotoUrl`) plus one new index (`notifications.createdAt` TTL).
- One architecture text update (Mongoose 9 instead of 8) shipped in the same commit.

## Follow-up

- [ ] `mongodb` skill conventions are not yet captured in the project AGENTS.md. The relevant area's AGENTS.md (a new `lib/db/AGENTS.md` since data layer conventions live alongside models and not at root) should record the embedding versus reference rule, the custom validator pattern, the `pre('save')` hook pattern, and the connection singleton pattern before implementation begins.
- [ ] The seed script at `scripts/seed.ts` references `scripts/data/locations.json` which does not yet exist. Author the locations JSON from the LASU campus map once LASU IT provisions it (per `context/progress-tracker.md` Open Questions item 4).
- [ ] The Centralized `toPublicJSON` mapper (AC-13) is owned by `lib/utils/pii.ts` but also depends on the AI prompt builder's PII strip list (`lib/ai/prompts.ts`). When Feature 5 (Complaint submission with AI triage) is designed, confirm the two redact lists stay in sync.
- [ ] Atlas storage cap: the MongoDB Atlas free tier is 512 MB. Status history is unbounded; if pilot adoption meets the 50 percent target, status history growth plus attachments metadata plus the AI per submission cost log will exceed the cap within the second year. Surface a storage provisioning decision in `context/progress-tracker.md` Open Questions before that line is crossed.

## References

**Project sources** (verifiable, in this repo):

- `context/architecture.md` §Storage Model and §Invariants: the eight collections, the field list, the invariants, the RBAC rule, the index list.
- `context/code-standards.md` §TypeScript and §Data and Storage: TypeScript strict mode, Mongoose only writer rule, centralized response mapper rule.
- `context/architecture.md` §Auth and Access Model: BetterAuth manages password hashing; the spec aligns with this.
- `docs/scope/scope.md` Feature 2 row: scope, Done When, Build approach (Tracer Bullet).
- `AGENTS.md` (project root, Idea to Product context): how context files relate, how updates flow.
- `lib/db/connection.ts` and `lib/db/indexes.ts` (existing code on `feat/project-setup`): the connect singleton and the existing index call; this spec hardens both.
- `package.json`: Mongoose pin (`^9.8.0`); this spec keeps the pin and updates the architecture text to match.

**Practices & standards**:

- Mongoose `InferSchemaType` for end to end type safety (the documented pattern for Mongoose 8 plus 9).
- Cross field invariants via custom validators, ordered in `pre('validate')` so they fire before categorical validators.
- Forward only state machines enforced at the data layer rather than the application tier (so no caller can bypass the rule).
- Optimistic concurrency via Mongoose `versionKey` plus conditional updates.
- Idempotent index creation: rely on MongoDB native index creation which is itself idempotent; wrap in retry on transient errors.
- Centralized response scrubbing (the single source of truth for what reaches the API response).
- TTL indexes for time bounded operational signals (notifications).

**Links** (web verified only):

- None verified during this design conversation. The canonical sources that a human can follow live in the installed `mongodb` skill (`C:/Users/Korede/.agents/skills/mongodb/SKILL.md`, Resources section): MongoDB docs, Mongoose docs, MongoDB University, Atlas docs. A future Stage c landscape check would verify each of these and surface them in this section.
