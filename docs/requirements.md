# Requirements — Campus Maintenance Complaint Management System (LASU)

This file is the system of record for what the application must do (FRs) and
how it must do it (NFRs). It mirrors Section 3.3.6.4 (Functional Requirements)
and 3.3.6.5 (Non-Functional Requirements) of the academic doc, restated with
implementation pointers and traceability to feature spec files under
`docs/specs/`.

## How to read this

- **FR-N.M**: Functional Requirements — what the system must do.
- **NFR-N.M**: Non-Functional Requirements — how well it must do it.
- **Each item is testable**: a test, manual, or load plan verifies pass or
  fail.
- **Spec column** points to the implementation contract; **Status** says
  whether it is built and which commit proves it.

### Conformance

- Every requirement has at least one assertion in the relevant spec
  (`docs/specs/000N-*.md`) and a corresponding test (unit, integration,
  or e2e).
- Pre-existing gaps that the build surfaced are tracked in
  `context/progress-tracker.md`.

## Functional Requirements (Section 3.3.6.4)

The functional requirements below specify what the system must do. They
are the source of truth for the developer handover and for the verification
checklist — each module there must trace back to one or more FRs. The FRs are
deliberately written in testable form (each can be verified to pass or fail).

### FR-1 — Complaint Submission

The submission entrance form on the web portal.

- **FR-1.1** A reporter can submit a complaint via the web portal at
  `/complaints/new`.
- **FR-1.2** The submission form accepts: category (dropdown from the
  `categories` collection), location (dropdown from the `locations`
  collection), description (free text, 10–2000 characters), optional photo
  upload (≤ 10 MB, MIME types restricted to JPG/PNG/WebP), and an anonymous
  toggle.
- **FR-1.3** All form fields are validated **server-side**; the
  client-side validation is for UX only and is **not trusted** for
  security.
- **FR-1.4** On successful submission, the reporter receives an
  acknowledgement page with a unique complaint ID and an ETA computed from
  the SLA table.

Spec: `docs/specs/0005-complaint-submission.md`. Status: **Implemented**.

### FR-2 — AI Triage

Every new complaint must be triaged before persistence, with a rules-based
fallback so the reporter is never blocked by an AI outage.

- **FR-2.1** Every new complaint, on successful submission, MUST be
  processed by the AI triage endpoint before persistence.
- **FR-2.2** The AI triage endpoint MUST return a structured object
  conforming to the Zod schema in Section 3.2.5
  (`{ categoryName, severity, rationale }`).
- **FR-2.3** If the AI call fails **and** `AI_TRIAGE_FALLBACK_TO_RULES=
  true`, the system MUST persist the complaint using the rules-based map
  on the reporter's selected category, with `aiSuggestion.fallback = true`.
  **The reporter's submission MUST NOT be blocked by an AI outage.**
- **FR-2.4** If the AI call fails **and** the fallback flag is false, the
  system MUST return a 5xx error with a clear message; no partial persist.
- **FR-2.5** The AI call MUST honour `OPENAI_TIMEOUT_MS` (default 8000 ms).
  Calls beyond this MUST be aborted and treated as failure.

Spec: `docs/specs/0005-complaint-submission.md`. Status:
**Implemented** (FR-2.1, FR-2.2, FR-2.3, FR-2.5);
**Partial** (FR-2.4: error response is shaped per route, fallback flag
default is `true` so this branch is rarely reached).

### FR-3 — Priority and SLA Derivation

Severity is not invented per submission — it is sourced from the AI or
the category's rule, then mapped to SLA deadlines.

- **FR-3.1** Every complaint has a non-null `priority` field with value
  in `{ critical, high, medium, low }`.
- **FR-3.2** Priority is taken from the AI's `severity` output when AI
  succeeds; otherwise from `categories[].defaultSeverity`.
- **FR-3.3** `slaAcknowledgeBy` and `slaResolveBy` are derived from the
  final severity using the SLA table in Section 3.2.1.

Spec: `docs/specs/0009-sla-engine-and-escalation.md` (table);
generated in `app/api/complaints/route.ts`. Status: **Implemented**.

### FR-4 — Authentication and RBAC

BetterAuth session with three role classes and granular per-route RBAC.

- **FR-4.1** Three role classes: Reporter, DICT Admin, DICT Technician.
- **FR-4.2** BetterAuth session, stored in HTTP-only cookie, 7-day
  expiry.
- **FR-4.3** bcrypt hashing via BetterAuth (cost factor ≥ 12).
- **FR-4.4** Route-level RBAC enforced at the application tier:
  `/api/admin/*` is admin-only; `/api/technician/*` is technician-only;
  `/api/complaints` accepts all three; anonymous reporter uses a special
  signed token.
- **FR-4.5** Anonymous mode strips `reporterId` from the persisted
  document; the system does not surface the anonymous complaint to any
  logged-in user.

Spec: `docs/specs/0004-authentication/`. Status: **Implemented**
(FR-4.1, FR-4.2, FR-4.4 path-level, FR-4.5). FR-4.3 cost factor ≥ 12
follows BetterAuth's controlled defaults — verified by config review.

### FR-5 — Assignment

Admin queue view and reassignment rules.

- **FR-5.1** Admin queue view at `/admin/queue` filterable by severity,
  age, location.
- **FR-5.2** Admin assigns one technician at a time; reassignment
  allowed.
- **FR-5.3** Once a complaint is `In Progress`, reassignment requires
  explicit admin override (audit-logged).

Spec: `docs/specs/0007-admin-queue-and-assignment.md`. Status:
**Implemented**.

### FR-6 — Status Lifecycle

Five-state machine with audit trail and forward-only enforcement.

- **FR-6.1** State machine:
  `Submitted → Acknowledged → In Progress → Resolved → Closed`.
- **FR-6.2** Every transition appends a `statusHistory` document carrying
  actor, prev-status, new-status, optional note and optional photo URL.
- **FR-6.3** Transitions are enforced server-side per RBAC: reporter
  cannot transition; technician cannot assign; only admin can reassign.
- **FR-6.4** A complaint with `status = Resolved` MUST have a
  `proofPhotoUrl` recorded in its most recent `statusHistory` entry.

Spec: `lib/db/models/complaint.ts` (state machine helper +
cross-field validators) +
`app/api/complaints/[id]/route.ts` (RBAC-gated transitions). Status:
**Implemented**.

### FR-7 — SLA Engine and Escalation

Vercel-cron SLA sweeper escalates unmet deadlines up the DICT
hierarchy with persisted notification records.

- **FR-7.1** SLA sweep runs every 5 minutes via Vercel cron endpoint
  `/api/cron/sla-sweep`.
- **FR-7.2** Breaches of `slaAcknowledgeBy` (with status `Submitted`) set
  `escalated = true` AND push a notification to the DICT admin.
- **FR-7.3** Breaches of `slaResolveBy` (with status not `Resolved`) push
  a notification to the DICT director.
- **FR-7.4** Every escalation event is recorded in `notifications` with
  `type: 'escalation'`, recipient user ID, complaint ID, message.

Spec: `docs/specs/0009-sla-engine-and-escalation.md`. Status:
**Implemented**.

### FR-8 — Reporter Visibility

Reporter sees only own complaints; anonymous complaints stay anonymous.

- **FR-8.1** Reporter views own complaints at `/complaints/mine`.
- **FR-8.2** Complaint detail page shows: ID, current status, severity,
  SLA deadline, status timeline, proof-of-fix photo (if resolved).
- **FR-8.3** Anonymous reporter: the system does not surface anonymous
  complaints back to a logged-in user; only a saved ID grants access.

Spec: `docs/specs/0006-reporter-dashboard.md`. Status:
**Implemented**.

### FR-9 — Duplicate Detection

Cluster overlapping submissions to reduce AI cost during peak fault
periods.

- **FR-9.1** Before AI triage, query `complaints` for documents with the
  same `categoryId` AND `locationId` AND `createdAt > (now - 30 min)`.
- **FR-9.2** If found, persist the new complaint with
  `parentComplaintId` set to the existing one; skip AI triage for the
  duplicate.
- **FR-9.3** This step runs **before** AI triage to prevent
  unnecessary AI cost during peak fault periods.

Spec: `docs/specs/0005-complaint-submission.md`. Status:
**Implemented**.

### FR-10 — Reporting

Admin reporting dashboard with read-only aggregations.

- **FR-10.1** Admin reporting dashboard at `/admin/reports`.
- **FR-10.2** Aggregations: count by category / location / status /
  severity; average resolution time; SLA-breach count; current backlog.
- **FR-10.3** Filters: time window, severity, location, status.
- **FR-10.4** The dashboard is read-only; no edits flow through it.

Spec: `docs/specs/0011-reporting-dashboard.md`. Status:
**Implemented**.

## Non-Functional Requirements (Section 3.3.6.5)

Non-functional requirements describe how well the system must satisfy
the FRs and other qualitative properties. Each NFR is paired with a
measurable target so that it can be validated in the load-testing
strategy or in the post-build pilot evaluation.

### NFR-1 — Performance

Per-endpoint latency budgets with concrete budget breakdown for the
submission endpoint.

- **NFR-1.1** `POST /api/complaints` (with AI triage) responds in
  under **4 seconds** at p95 under typical load (10 concurrent). The
  budget covers: auth (~50 ms), validation (~30 ms), photo upload
  (~500 ms local / ~2 s cloud), AI call (~1.5–3 s typical for
  `gpt-4o-mini`), persist (~50 ms).
- **NFR-1.2** `GET /api/complaints/:id` responds in under **200 ms**
  at p95.
- **NFR-1.3** `GET /api/admin/queue` responds in under **500 ms** at
  p95 (filtered query).
- **NFR-1.4** SLA sweep cron completes within **60 s** at typical
  complaint volume (< 5,000 active).

Specs: 0005 (submission budget), 0006 (detail budget), 0007 (queue
budget), 0009 (sweep budget). Status: **Plan-defined** — measured via
k6 / JMeter per NFR-1.

### NFR-2 — Reliability

The system stays usable under partial failure.

- **NFR-2.1** All complaint writes are durable: confirmed MongoDB
  write before HTTP 200 to reporter.
- **NFR-2.2** AI triage failure does NOT block submission when
  `AI_TRIAGE_FALLBACK_TO_RULES=true` — the system uses the rules-based
  map as documented in FR-2.3.
- **NFR-2.3** SLA sweep failure does not block other API routes;
  failures are logged.
- **NFR-2.4** Photo upload failure aborts the submission; a complaint
  is never persisted without its accompanying photo if one was
  promised.

Specs: 0005 (NFR-2.1, NFR-2.2, NFR-2.4), 0009 (NFR-2.3). Status:
**Implemented**.

### NFR-3 — Security

HTTPS-only, bcrypt-hashed sessions, RBAC enforced at every protected
edge, PII-stripped AI prompts.

- **NFR-3.1** All API routes are HTTPS-only.
- **NFR-3.2** Passwords are hashed by BetterAuth using bcrypt, cost
  factor ≥ 12.
- **NFR-3.3** BetterAuth session tokens are signed with HS256.
- **NFR-3.4** Session tokens are stored in HTTP-only cookies with
  `sameSite=Lax`.
- **NFR-3.5** AI prompts **MUST NOT** include reporter PII
  (name, email, ID). The `buildPrompt` helper in `src/lib/ai/prompts.ts`
  strips these fields before the API call. *(Located in
  `lib/ai/prompts.ts` in this implementation.)*
- **NFR-3.6** Photo uploads are MIME-type and size validated
  server-side.
- **NFR-3.7** All admin-only and technician-only routes verify RBAC at
  every request via middleware.

Specs: 0001, 0004, 0005, 0012. Status: **Implemented** (NFR-3.2,
NFR-3.4, NFR-3.5, NFR-3.6, NFR-3.7). NFR-3.1 is enforced at the
deployment / Vercel configuration layer. NFR-3.3 follows BetterAuth's
default HS256 token signing.

### NFR-4 — Maintainability

Single sources of truth and clear ownership boundaries.

- **NFR-4.1** All Mongoose collections have explicit schema definitions
  with field types and requiredness flags.
- **NFR-4.2** API routes are organised under `/app/api/<resource>/
  route.ts` per Next.js App Router conventions.
- **NFR-4.3** AI prompt logic is centralised in `src/lib/ai/prompts.ts`
  as the single source-of-truth. *(Located in `lib/ai/prompts.ts` in
  this implementation.)*
- **NFR-4.4** All env vars are documented in `.env.example` with
  example values.

Specs: 0001, 0002, 0005, 0012. Status: **Implemented**.

### NFR-5 — Cost Ceiling

Dollar-denominated AI triage ceiling with auto-fallback.

- **NFR-5.1** AI triage cost per submission MUST be ≤ **$0.001** with
  the default `gpt-4o-mini` model.
- **NFR-5.2** AI triage cost per month MUST be ≤ **$5** for up to 50,000
  submissions/month — sufficient for LASU's projected workload.
- **NFR-5.3** If monthly AI cost exceeds $5, the system MUST switch
  to `AI_TRIAGE_FALLBACK_TO_RULES = true` and notify operations.

Spec: `docs/specs/0005-complaint-submission.md`. Status:
**Implemented** (NFR-5.1 measured per submission via
`aiSuggestion.costUsd`; NFR-5.2 verifiable from costUsd aggregation;
NFR-5.3 threshold switch implementation pending manual operations
toggle in this build).

### NFR-6 — Privacy

Reporters keep their identity; AI never sees emails; AI rationale
stays internal.

- **NFR-6.1** Anonymous mode strips reporter identity from both the
  persisted document AND from any AI prompt.
- **NFR-6.2** Reporter email is never sent to OpenAI.
- **NFR-6.3** AI rationale text is visible only to admins (not to the
  reporter's public dashboard) but is stored on the complaint document
  for audit and supervisor review.

Specs: 0005 (NFR-6.1, NFR-6.2), 0006 (NFR-6.3 — enforced by
`reporterView` stripping `aiSuggestion`). Status: **Implemented**.

### NFR-7 — Transparency / Explainability

Every complaint has an audit-grade AI record, even when the rules
path was taken. Admins see the rationale; the reporter does not.

- **NFR-7.1** Every complaint's `aiSuggestion` field MUST be populated
  (with `fallback=true` if the rules-based path was taken).
- **NFR-7.2** Admins see the AI's rationale in the queue view
  (≤ 240 chars).
- **NFR-7.3** If the AI's suggested category differs from the reporter's
  selected category, the admin queue MUST show a visible warning badge.

Specs: 0005 (NFR-7.1), 0007 (NFR-7.2, NFR-7.3). Status:
**Implemented** (NFR-7.1, NFR-7.2). NFR-7.3 mismatch badge is built
into the admin queue.

### NFR-8 — Internationalisation (current scope)

English-only at launch; multi-language is deferred.

- **NFR-8.1** All user-facing strings are in English at launch.
- **NFR-8.2** The AI system prompt is in English; AI responses are in
  English.
- **NFR-8.3** Yoruba / pidgin / Hausa support is a Phase 2
  enhancement.

Spec: `docs/specs/0001-project-setup-and-dependencies.md`. Status:
**Implemented**.

## Out of Scope (verified exclusions — review must not block on these)

- Native iOS / Android apps.
- IoT sensor instrumentation.
- Multi-institution deployment — single LASU deployment only.
- University SSO / LDAP federation — local BetterAuth credentials only.
- ML-based fine-tuned triage (e.g. Naive Bayes baseline + transformer
  fine-tuning) — rules + AI via OpenAI is the launch state; ML
  fine-tuning is Phase 2.
- Local-language UI (Yoruba, pidgin, Hausa).
- Email / SMS notification channels — in-app / Ably push only at launch.
- Asset / inventory registry beyond the `categories` collection.
- Non-maintenance grievance handling (academic, disciplinary,
  financial, security).
- On-device or self-hosted LLM inference.

## Traceability Matrix

Each row must have a corresponding test. A requirement without a
traceable test is a gap.

| ID    | Spec                                       | Test Source                                | Status      |
|-------|--------------------------------------------|--------------------------------------------|-------------|
| FR-1.1 | `0005-complaint-submission`               | e2e complaint-submission | Implemented  |
| FR-1.2 | `0005-complaint-submission`               | unit ComplaintForm | Implemented  |
| FR-1.3 | `0005-complaint-submission`               | unit/api route tests | Implemented  |
| FR-1.4 | `0005-complaint-submission`               | e2e acknowledgement page | Implemented  |
| FR-2.1 | `0005-compliant-submission`               | unit triage integration | Implemented  |
| FR-2.2 | `0005-compliant-submission`               | unit Zod schema parse | Implemented  |
| FR-2.3 | `0005-compliant-submission`               | unit fallback path | Implemented  |
| FR-2.4 | `0005-compliant-submission`               | unit error path (rare) | Partial       |
| FR-2.5 | `0005-compliant-submission`               | unit timeout mock | Implemented  |
| FR-3.1 | `0009-sla-engine-and-escalation`          | unit/complaint schema | Implemented  |
| FR-3.2 | `0009-sla-engine-and-escalation`          | unit triage integration | Implemented  |
| FR-3.3 | `0009-sla-engine-and-escalation`          | unit sla-sweep | Implemented  |
| FR-4.1 | `0004-authentication`                     | unit dal.test.ts | Implemented  |
| FR-4.2 | `0004-authentication`                     | unit/e2e auth.spec | Implemented  |
| FR-4.3 | `0004-authentication`                     | Config review (BetterAuth default) | Implemented |
| FR-4.4 | `0004-authentication`                     | e2e admin/technician queue redirects | Implemented |
| FR-4.5 | `0004-authentication`                     | unit anonymised token | Implemented  |
| FR-5.1 | `0007-admin-queue-and-assignment`         | e2e admin-queue | Implemented  |
| FR-5.2 | `0007-admin-queue-and-assignment`         | unit/api assign route | Implemented  |
| FR-5.3 | `0007-admin-queue-and-assignment`         | unit reassignment audit | Implemented  |
| FR-6.1 | `lib/db/models/complaint.ts`               | unit transition.test.ts | Implemented  |
| FR-6.2 | `lib/db/models/complaint.ts`               | unit status history tests | Implemented  |
| FR-6.3 | `app/api/complaints/[id]/route.ts`         | unit/api route RBAC | Implemented  |
| FR-6.4 | `lib/db/models/complaint.ts`               | unit cross-field validator | Implemented  |
| FR-7.1 | `0009-sla-engine-and-escalation`          | e2e + unit cron route | Implemented  |
| FR-7.2 | `0009-sla-engine-and-escalation`          | unit escalate path | Implemented  |
| FR-7.3 | `0009-sla-engine-and-escalation`          | unit escalate path | Implemented  |
| FR-7.4 | `0009-sla-engine-and-escalation`          | unit notification doc shape | Implemented  |
| FR-8.1 | `0006-reporter-dashboard`                 | e2e reporter-dashboard | Implemented  |
| FR-8.2 | `0006-reporter-dashboard`                 | unit detail page | Implemented  |
| FR-8.3 | `0006-reporter-dashboard`                 | unit anonymous token | Implemented  |
| FR-9.1 | `0005-compliant-submission`               | unit duplicate.test.ts | Implemented  |
| FR-9.2 | `0005-compliant-submission`               | unit duplicate parent + skip triage | Implemented |
| FR-9.3 | `0005-compliant-submission`               | unit ordering check | Implemented  |
| FR-10.1 | `0011-reporting-dashboard`               | e2e admin-reports | Implemented  |
| FR-10.2 | `0011-reporting-dashboard`               | unit aggregations | Implemented  |
| FR-10.3 | `0011-reporting-dashboard`               | unit filter chain | Implemented  |
| FR-10.4 | `0011-reporting-dashboard`               | e2e read-only | Implemented  |
| NFR-1.x | `0005/0006/0007/0009`                    | k6 plan pending | Plan-defined |
| NFR-2.x | `0005/0009/0012`                         | unit + monitoring | Implemented  |
| NFR-3.x | `0001/0004/0005/0012`                    | unit + manual review | Implemented  |
| NFR-4.x | `0001/0002/0005`                         | lint + structure review | Implemented  |
| NFR-5.x | `0005`                                  | unit + ops review | Implemented  |
| NFR-6.x | `0005/0006`                              | unit + reporterView | Implemented  |
| NFR-7.x | `0005/0007`                              | unit + UI badge check | Implemented  |
| NFR-8.x | `0001`                                  | static check (no Yoruba/pidgin/Hausa) | Implemented |

## Verification

- **Unit + integration:** `npm test` → 58 suites, 316 tests; last
  green sweep `4071224`.
- **E2E smoke:** `npm run test:e2e` → 24 specs across 7 spec files; last
  green sweep `1a4eee6`.
- **Lint / typecheck:** tracked separately. Pre-existing issues
  catalogued in `context/progress-tracker.md`; this commit introduces
  no new regressions.
- **Load (NFR-1.x):** k6 plan derived from the per-endpoint budgets
  above. Plan summary in `context/progress-tracker.md -> Current Goal`.
- **Manual UAT checklist:** reporter / admin / technician flows verified
  against the FR list above during pilot onboarding.

## Authoritative Source

This file restates Sections 3.3.6.4 and 3.3.6.5 of the academic
doc. If a conflict is introduced here, the academic doc wins and a PR
must reconcile both. If the build cannot satisfy an FR or NFR due to a
missing external dependency (Ably free tier, Cloudinary plan, OpenAI
budget), declare it explicitly in `context/progress-tracker.md`
under **Open Questions** and route to `/scope`.
