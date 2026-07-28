# Requirements — Campus Maintenance Complaint Management System (LASU)

This document consolidates the functional and non-functional requirements for
the Campus Maintenance Complaint Management System (LASU). It is the system of
record for what the application must do (FRs) and how it must do it (NFRs).
Feature-level specs in `docs/specs/` elaborate on each FR with acceptance
criteria; this file stays stable as the table of contents.

## Conformance

- Every FR has a feature spec under `docs/specs/000N-*.md` with acceptance
  criteria and verified tests.
- Every NFR is referenced from the spec that owns it (e.g. NFR-1 Performance
  is anchored in 0005/0007/0009).
- Status keywords: **Implemented** (FR built and verified), **Partial**
  (FR partly built; gap named in spec), **Deferred** (FR named in scope but
  scope moved to a later release).

## Actors

| ID | Actor               | Description                                                                                  |
|----|---------------------|----------------------------------------------------------------------------------------------|
| A1 | Reporter            | LASU student or staff who files a maintenance complaint. Has one of: own identity or anonymous. |
| A2 | DICT Administrator  | Reviews the queue, assigns complaints to technicians, owns reporting/escalation.             |
| A3 | DICT Technician     | Acknowledges, works updates, resolves assigned complaints.                                    |
| A4 | DICT Director       | Receives resolution-breach escalations; sets SLA policy; views roll-up reports.              |
| A5 | System (Background) | Cron `sla-sweep`, AI tctriage worker, image pipeline worker.                                 |

## Functional Requirements

### Authentication & Identity

- **FR-1 Sign up.** A new user (A1) can register with email + password (≥ 8
  chars) + name; the account is created with role `reporter` by default. Email
  is stored lowercased; duplicate emails rejected.
  - Spec: `docs/specs/0004-authentication/`. Status: Implemented.
- **FR-2 Sign in.** A registered user (A1/A2/A3) can sign in with email +
  password; a session cookie (HTTP-only, `SameSite=Lax`, 7-day expiry) is set.
  - Spec: 0004. Status: Implemented.
- **FR-3 Sign out.** A signed-in user can end their session; the session
  cookie is cleared; the next request is treated as unauthenticated.
  - Spec: 0004. Status: Implemented.
- **FR-4 Session continuity.** A signed-in user can navigate across protected
  pages without re-signing-in until expiry. The server-side session lookup
  resolves role and identity on every request.
  - Spec: 0004. Status: Implemented.
- **FR-5 RBAC enforcement.** Three roles — `reporter`, `dicht_admin`,
  `dicht_technician` — are enforced at every protected entry point (page,
  route handler). Cross-role access is denied with an appropriate redirect or
  403.
  - Spec: 0004. Status: Implemented.

### Reporter — Submission

- **FR-6 Submit complaint.** A reporter (A1) can submit a complaint with
  required fields: `categoryId` (from `categories`), `locationId` (from
  `locations`), `description` (10–2000 chars); optional: photo (≤ 10 MB,
  JPG/PNG/WebP), anonymous toggle.
  - Spec: `docs/specs/0005-complaint-submission.md`. Status: Implemented.
- **FR-7 Anonymous submission.** A reporter may toggle anonymous mode. When
  on: `reporterId` is omitted from the persisted record; the AI prompt sent
  to the model is stripped of `building`, `floor`, `room`, and any reporter
  context (per NFR Privacy).
  - Spec: 0005. Status: Implemented.
- **FR-8 Photo upload validation.** A non-image MIME is rejected; over-size;
  payload is rejected with a clear inline error.
  - Spec: 0012. Status: Implemented.
- **FR-9 Backlog on submit error.** If the submit to `/api/complaints`
  fails for a network reason, the user sees a recoverable error and a
  retry is one tap away.
  - Spec: 0005. Status: Implemented.

### Reporter — Read

- **FR-10 My complaints dashboard.** A reporter (A1) sees `/complaints/mine`
  listing their own (non-anonymous) complaints with current status, severity,
  category, SLA deadlines, and last update timestamp, with live push
  refreshing it on changes (FR-25).
  - Spec: `docs/specs/0006-reporter-dashboard.md`. Status: Implemented.
- **FR-11 Complaint detail view.** A reporter (A1) sees `/complaints/:id`
  with the status timeline (entries from `statusHistory`) and any
  proof-of-fix photo uploaded by the technician. Priority, AI suggestion, and
  internal escalation count are hidden from reporters (per NFR Privacy).
  - Spec: 0006. Status: Implemented.
- **FR-12 Anonymous tracker URL.** Anonymous submissions return a
  server-generated opaque tracker URL stored in the user's
  `anonymousToken`; re-visiting that URL shows the same status view without
  sign-in.
  - Spec: 0005 + 0006. Status: Implemented.

### Triage & Duplicate Handling

- **FR-13 AI-assisted triage.** For each new non-duplicate complaint, the
  server calls the Vercel AI SDK `generateObject` with an OpenAI
  `gpt-4o-mini` deployment; receives a structured
  `{ categoryName, severity, rationale }` validated by a Zod schema. The
  outcome is persisted on `complaints.aiSuggestion` with model, prompt-
  and completion-token counts, computed `costUsd`, latency, run timestamp,
  and a `fallback` flag.
  - Spec: 0005. Status: Implemented.
- **FR-14 Default-severity fallback.** If the AI call fails or exceeds
  `OPENAI_TIMEOUT_MS` (default 8000 ms), the system falls back to
  `categories[].defaultSeverity` and sets `aiSuggestion.fallback = true`.
  Submission is never blocked by an AI outage.
  - Spec: 0005. Status: Implemented.
- **FR-15 Duplicate detection.** Before AI triage, a check looks for an
  existing complaint with the same `categoryId` + `locationId` created in
  the last 30 minutes; if found, the new submission is clustered to that
  complaint (`parentComplaintId` set) and AI triage is skipped to save cost.
  - Spec: 0005. Status: Implemented.
- **FR-16 Severity to SLA mapping.** Once severity is final (AI or fallback),
  the SLA table maps severity → `{ slaAcknowledgeHrs, slaResolveHrs }`, and
  `slaAcknowledgeBy` / `slaResolveBy` deadlines are computed from the
  complaint's `createdAt`.
  - Spec: `docs/specs/0009-sla-engine-and-escalation.md`. Status: Implemented.

### DICT Admin — Queue & Assignment

- **FR-17 Admin queue view.** An admin (A2) sees `/admin/queue` listing
  complaints filterable by severity, age, location, and assignment status,
  sorted by SLA urgency.
  - Spec: `docs/specs/0007-admin-queue-and-assignment.md`. Status: Implemented.
- **FR-18 Assign complaint.** An admin (A2) can assign a complaint to a
  user with role `dicht_technician` from a dropdown of eligible technicians.
  An `assignments` document is created with `{ complaintId, technicianId,
  assignedAt, assignedByAdminId }`.
  - Spec: 0007. Status: Implemented.
- **FR-19 Reassigment audit.** Admins may reassign. Previous assignments are
  retained; a new `assignments` row is appended and `statusHistory` notes
  the change with `changedByAdminId` and reason.
  - Spec: 0007. Status: Implemented.
- **FR-20 Admin landing page.** `/admin` redirects to `/admin/queue` for
  signed-in admins; signed-out users are redirected to `/sign-in`.
  - Spec: 0007. Status: Implemented.

### DICT Technician — Workflow

- **FR-21 Technician queue.** A technician (A3) sees `/technician/queue`
  showing their assigned complaints (including reassigned ones) sorted by SLA
  urgency, with current status.
  - Spec: `docs/specs/0008-technician-queue-and-status-updates.md`.
    Status: Implemented.
- **FR-22 Acknowledge.** A technician can transition `Submitted →
  Acknowledged` while `now < slaAcknowledgeBy` (else FR-29 escalation
  triggers). This starts the resolution timer.
  - Spec: 0008. Status: Implemented.
- **FR-23 Status update to In Progress.** A technician can move
  `Acknowledged → In Progress`, with optional notes and in-progress photos.
  - Spec: 0008. Status: Implemented.
- **FR-24 Resolve with proof-of-fix photo.** A technician can move
  `In Progress → Resolved`. A proof-of-fix photo is mandatory;
  `complaints.proofPhotoUrl` is set and locked; `statusHistory` records the
  transition.
  - Spec: 0008. Status: Implemented.

### SLA Engine & Escalation

- **FR-25 SLA sweep.** A cron endpoint `/api/cron/sla-sweep` runs every 5
  minutes (Vercel cron). It scans active complaints for breach.
  - Spec: `docs/specs/0009-sla-engine-and-escalation.md`. Status: Implemented.
- **FR-26 Acknowledge-breach escalation.** When
  `now > slaAcknowledgeBy && status === 'Submitted'`: notify all admins
  via Ably (FR-31) and set `complaints.escalated = true`.
  - Spec: 0009. Status: Implemented.
- **FR-27 Resolve-breach escalation.** When
  `now > slaResolveBy && status !== 'Resolved'`: notify the DICT Director
  in-app. Acknowledge breaches chained to resolve breaches use the Director
  channel.
  - Spec: 0009. Status: Implemented.
- **FR-28 SLA breach visibility.** Admins see an SLA-breach overlay on the
  queue view; technicians see their personal SLA warning after a breach on
  AC-2 of their complaints page.
  - Spec: 0009. Status: Implemented.

### Real-Time Push (Ably)

- **FR-29 Assignment push to technician.** When FR-18 executes, an Ably
  message is published on the technician's private channel.
  - Spec: `docs/specs/0010-real-time-notifications.md`. Status: Implemented.
- **FR-30 Status-update fan-out.** When a technician changes a complaint's
  status, Ably publishes on a per-complaint channel. The reporter's
  `/complaints/mine` dashboard refreshes without a page reload.
  - Spec: 0010. Status: Implemented.
- **FR-31 Escalation push.** FR-26 and FR-27 publish to admin / director
  channels and surface in the admin/technician UI.
  - Spec: 0010. Status: Implemented.
- **FR-32 Live status on dashboard.** Status updates on the reporter
  dashboard are pushed within 2 seconds of the underlying change.
  - Spec: 0010. Status: Implemented.

### Reporting & Export

- **FR-33 Admin reporting dashboard.** `/admin/reports` shows volumes by
  category / location / severity, average resolution time, SLA-breach count,
  and backlog. Filters: time window, severity, location, status.
  - Spec: `docs/specs/0011-reporting-dashboard.md`. Status: Implemented.
- **FR-34 PDF export.** A click on the dashboard's *Export PDF* button
  produces a paginated PDF (via `@react-pdf/renderer`) of the same view
  with the same filters applied.
  - Spec: 0011. Status: Implemented.
- **FR-35 CSV export.** A *Export CSV* button produces a downloadable CSV
  with the same filter set, suitable for offline analysis.
  - Spec: 0011. Status: Implemented.

### Image Pipeline

- **FR-36 Server-side ingestion.** A photo upload from any complaint form
  is received as `multipart/form-data`, validated for MIME and size, then
  compressed via `sharp`, then uploaded to Cloudinary. The returned URL is
  persisted in `complaints.photoUrls[]`.
  - Spec: `docs/specs/0012-image-pipeline.md`. Status: Implemented.
- **FR-37 EXIF strip.** All identifying EXIF data is stripped before upload.
  - Spec: 0012. Status: Implemented.
- **FR-38 HTTPS-only storage.** Stored photo URLs must use `https://`; `http://`
  URLs are rejected at write time.
  - Spec: 0012. Status: Implemented.

### Audit & Status History

- **FR-39 Audit trail of status transitions. ** Every transition triggers
  a `statusHistory` entry with `{ fromStatus, toStatus, changedBy, at,
  notes, proofPhotoUrl? }`. The detail view (FR-11) renders the timeline.
  - Spec: 0005/0008. Status: Implemented.
- **FR-40 Notifications archive.** Every notification triggered
  (assignment/breach/escalation) creates a row in `notifications`. The UI
  surfaces the unread badge and inbox.
  - Spec: 0010. Status: Implemented.

### Operational & Support

- **FR-41 Brand palette lock.** `#0c2848` navy + `#d4a014` gold are the
  brand colours sourced from the LASU CMS logo. Bound at
  `app/globals.css` (per `docs/design.md`).
  - Spec: 0003. Status: Implemented.
- **FR-42 Theme system.** DARK / LIGHT / system theme toggle in the header.
  Choice persisted in `localStorage` under key `theme`; no flash on reload;
  theme survives a page reload without re-paint.
  - Spec: 0003. Status: Implemented.
- **FR-43 Keyboard navigation.** Primary interactive elements are reachable
  with Tab order: brand → nav links → theme toggle → stateful buttons.
  Each has an `aria-label` or visible label.
  - Spec: 0003. Status: Implemented.

## Non-Functional Requirements

### Performance

- **NFR-1.1 Submission p95.** `POST /api/complaints` (with AI triage) p95
  must be under **4 s** at typical load (10 concurrent users).
  - Spec: 0005.
- **NFR-1.2 Detail fetch p95.** `GET /api/complaints/:id` p95 must be
  under **200 ms**.
  - Spec: 0006.
- **NFR-1.3 Admin queue p95.** `GET /api/admin/queue` p95 must be under
  **500 ms**.
  - Spec: 0007.
- **NFR-1.4 SLA sweep budget.** `/api/cron/sla-sweep` must complete within
  **60 s** for typical active volume (< 5,000 active complaints).
  - Spec: 0009.
- **NFR-1.5 Error rate.** Error rate must stay **< 1 %** at peak load.
  - Spec: all API routes.

### Reliability & Resilience

- **NFR-2.1 AI fallback.** If the AI call fails or exceeds
  `OPENAI_TIMEOUT_MS` (default **8000 ms**), the system falls back to rules
  and continues submission; the user never sees an HTTP error caused by
  AI.
  - Spec: 0005.
- **NFR-2.2 Cron isolation.** A failure in `/api/cron/sla-sweep` does not
  block any other API route.
  - Spec: 0009.
- **NFR-2.3 Real-time degradation.** If Ably is unavailable, the system
  must continue to serve requests; real-time updates degrade gracefully
  (no broken UI).
  - Spec: 0010.
- **NFR-2.4 Mongoose reconnection.** A transient MongoDB blip triggers a
  reconnection (with exponential backoff) rather than a 500.
  - Spec: 0002.
- **NFR-2.5 Image pipeline retry.** A Cloudinary 409 is retried with a
  deterministic 1 s back-off (max 3 attempts).
  - Spec: 0012.

### Security

- **NFR-3.1 Password hashing.** Passwords stored only as better-auth's
  bcrypt-backed hash; never logged.
  - Spec: 0004.
- **NFR-3.2 Session cookie.** Authorisation cookie is HTTP-only,
  `SameSite=lax`, `Secure` in production. Custom cookie prefix `better-auth`.
  - Spec: 0004.
- **NFR-3.3 Server-side authorization.** Every protected entry point
  (page/route) executes an authoritative role check on the server, not
  only in middleware.
  - Spec: 0004.
- **NFR-3.4 PII stripping.** Anonymous submissions strip
  `building`/`floor`/`room`/reporter context from the AI prompt.
  - Spec: 0005.
- **NFR-3.5 Internal data hidden from reporters.** `priority`,
  `aiSuggestion`, `escalated` are stripped from `reporterView`.
  - Spec: 0006.
- **NFR-3.6 Rate limiting.** Submit and sign-in endpoints use `@upstash/
  ratelimit` per IP and per user.
  - Spec: 0004/0005.

### Privacy & Compliance

- **NFR-4.1 Anonymous mode.** Anonymous submissions never persist
  `reporterId`, never include reporter name/email in any joinable field.
  - Spec: 0005/0006.
- **NFR-4.2 Single LASU deployment.** No multi-tenant config exposed;
  configuration is environment-specific (`.env` only).
  - Spec: 0001.
- **NFR-4.3 EXIF strip** (see also FR-37): all identifying EXIF stripped
  before Cloudinary upload.
  - Spec: 0012.

### Cost

- **NFR-5.1 AI triage budget.** AI triage cost ≤ **$5 / month** for up to
  **50,000 submissions/month** via `gpt-4o-mini`.
  - Spec: 0005.
- **NFR-5.2 Fallback trigger.** If monthly cost threshold is exceeded,
  system flips to fallback-only mode per NFR-2.1.
  - Spec: 0005.
- **NFR-5.3 Cost recorded per submission.** Each `aiSuggestion` row stores
  `costUsd` so monthly rollups are queryable.
  - Spec: 0005.

### Availability & Capacity

- **NFR-6.1 Active complaint capacity.** Designed to handle **< 5,000
  active complaints** concurrently without degradation.
  - Spec: 0009.
- **NFR-6.2 Concurrency model.** `POST /api/complaints` is designed for
  **10 concurrent users** without p95 regression.
  - Spec: 0005.
- **NFR-6.3 Ably free tier.** Ably usage stays within the free tier for
  pilot volume (≤ 200 peak concurrent connections).
  - Spec: 0010.

### Accessibility (WCAG 2.1 AA)

- **NFR-7.1 Keyboard reachability.** All primary interactive elements are
  reachable with Tab in document order.
  - Spec: 0003.
- **NFR-7.2 Accessible names.** Buttons, links, and form controls have
  accessible names (`aria-label` or visible text).
  - Spec: 0003.
- **NFR-7.3 State announced.** State-changing controls (theme toggle, sign
  out) update `aria-label` to match new state.
  - Spec: 0003.
- **NFR-7.4 Contrast.** Text/background Contrast ≥ 4.5:1 in default theme.
  - Spec: 0003.

### Responsiveness

- **NFR-8.1 Desktop + mobile browsers.** Fully usable on desktop browsers
  (1280 × 720 and up) and mobile browsers (375 × 667 and up); no native
  mobile app at launch.
  - Spec: 0003 / 0005.
- **NFR-8.2 No layout shift on theme switch.** Theme toggle on the
  `<html>` does not reflow content.
  - Spec: 0003.

### Localisation

- **NFR-9.1 English only.** UI is English-only at launch. Yoruba / pidgin /
  Hausa deferred.
  - Spec: 0001.

### Maintainability

- **NFR-10.1 Test coverage.** Every PR adds tests for the acceptance
  criteria of the current feature only — no scope drift into adjacent
  features. Target per feature: 3–8 new tests.
- **NFR-10.2 Scope tests live with code.** Scope tests for a feature live
  next to it (`lib/`, `app/`, or `tests/unit/`). Cross-feature
  integration tests live in `tests/integration/`. E2E smoke in
  `tests/e2e/`.
- **NFR-10.3 Lint clean state.** PRs do not introduce new lint or
  typecheck errors; existing pre-existing issues are tracked for a
  dedicated cleanup pass.
- **NFR-10.4 No secrets in repo.** BETTER_AUTH_SECRET, MONGODB_URI, and
  OpenAI keys are env-only. `.env.example` documents required keys.

### Observability

- **NFR-11.1 Status history.** Every transition produces a `statusHistory`
  row (FR-39). Transitions are queryable for debugging.
- **NFR-11.2 Notifications archive.** Notifications are persisted (FR-40)
  and queryable, not just realtime-pushed.
- **NFR-11.3 Escalation visibility.** Admins can see the current
  `escalated` flag and breach timestamps on each row.

### Data Integrity

- **NFR-12.1 Forward-only status transitions.** Status transitions go forward
  through the lifecycle `Submitted → Acknowledged → In Progress → Resolved`;
  admin override is allowed and audited.
  - Spec: 0002.
- **NFR-12.2 Cross-field integrity.** Mongoose enforces
  `anonymous → reporterId null`, `slaAcknowledgeBy < slaResolveBy`,
  `Resolved → proofPhotoUrl set`.
  - Spec: 0002.
- **NFR-12.3 Optimistic concurrency.** Status updates carry a version
  token; stale writes are rejected.
  - Spec: 0002.
- **NFR-12.4 Atomic duplicate detection.** Duplicate-clustering and
  related inserts execute in one Mongoose session; partial state is
  rejected on error.
  - Spec: 0005 / 0002.

### Browser & Runtime Support

- **NFR-13.1 Modern evergreen browsers.** Latest 2 stable Chrome, Firefox,
  Safari, Edge. Notifications and `crypto.subtle` assume a modern baseline.
- **NFR-13.2 Server runtime.** Next.js 16 (App Router) on Node 20+ LTS.
  - Spec: 0001.
- **NFR-13.3 Database.** MongoDB Atlas (replica set) supporting multi-document
  transactions.
  - Spec: 0002.

### Compatibility with Brand

- **NFR-14.1 Brand palette source.** Hex values `#0c2848` and `#d4a014`
  must be sampled from the LASU CMS logo PNG (`public/cms-lasu-full.png`)
  before any palette change is committed.
  - Spec: 0003.
- **NFR-14.2 Logo source of truth.** The PNG logo is the design
  authority. Designer specs are commentary.
  - Spec: 0003.

## Out of Scope (acceptance-criteria exclusions)

The following are explicitly out-of-scope at launch. The system is not
expected to satisfy these requirements and ship-blocking reviews must
not block on them:

- Native iOS / Android apps.
- IoT sensor instrumentation.
- Multi-institution deployment.
- University SSO / LDAP federation.
- ML-based fine-tuned triage models.
- Local-language UI (Yoruba, pidgin, Hausa).
- Email / SMS notification channels (in-app + Ably only at launch).
- Asset / inventory registry beyond `categories`.
- Non-maintenance grievance handling.
- On-device or self-hosted LLM inference.

## Traceability Matrix (summary)

| FR  | Spec                                | Status       |
|-----|-------------------------------------|--------------|
| 1–5 | 0004-authentication                 | Implemented  |
| 6–9 | 0005-complaint-submission           | Implemented  |
| 10–12 | 0006-reporter-dashboard           | Implemented  |
| 13–16 | 0005/0009                         | Implemented  |
| 17–20 | 0007-admin-queue-and-assignment   | Implemented  |
| 21–24 | 0008-technician-queue-and-status-updates | Implemented |
| 25–28 | 0009-sla-engine-and-escalation    | Implemented  |
| 29–32 | 0010-real-time-notifications      | Implemented  |
| 33–35 | 0011-reporting-dashboard          | Implemented  |
| 36–38 | 0012-image-pipeline               | Implemented  |
| 39–40 | 0002/0010                         | Implemented  |
| 41–43 | 0003-design-system-ui-foundation  | Implemented  |

## Verification

- **Unit / integration:** `npm test` — 58 suites, 316 tests (last sweep:
  `4071224`).
- **E2E smoke:** `npm run test:e2e` — 24 specs across 7 spec files (last
  sweep: `1a4eee6`).
- **Lint / typecheck:** tracked separately. Pre-existing issues are
  documented in `context/progress-tracker.md` and queued for a dedicated
  cleanup pass; no new regressions permitted.
- **Load:** Apache JMeter or k6 plans for `/api/complaints` and
  `/api/complaints/:id`. Plans derived from NFR-1, NFR-6.
