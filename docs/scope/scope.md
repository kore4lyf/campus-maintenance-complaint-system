# Scope: Campus Maintenance Complaint Management System (LASU)

A web app for LASU students and staff to submit maintenance complaints with photos and AI-assisted triage, and for DICT admins and technicians to assign, track, and resolve them with SLA enforcement and real-time notifications.

**Build approach:** Tracer Bullet (prove the whole pipe works before building any part of it fully).
**Workflow:** Full (after /develop: /check verify, /test, /check review, /document). The project default rigor tier; architect still gates any feature that needs a decision at every tier; a feature's own tier tag overrides it.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Project setup & dependencies · done | Foundation | done |
| 2 | Data model · in-progress | Foundation | in-progress |
| 3 | Design system & UI foundation · done | Foundation | done |
| 4 | Authentication (BetterAuth) · in-progress | Slice 1 | in-progress |
| 5 | Complaint submission with AI triage · in-progress | Slice 1 | in-progress |
| 6 | Reporter dashboard · in-progress | Slice 1 | in-progress |
| 7 | Admin queue & assignment · in-progress | Slice 2 | in-progress |
| 8 | Technician queue & status updates · in-progress | Slice 2 | in-progress |
| 9 | SLA engine & escalation · in-progress | Slice 3 | in-progress |
| 10 | Real-time notifications (Ably) · in-progress | Slice 3 | in-progress |
| 11 | Reporting dashboard & export · in-progress | Slice 4 | in-progress |
| 12 | Image pipeline (sharp + Cloudinary) · in-progress | Slice 4 | in-progress |

## Foundations

### 1. Project setup & dependencies · done

Install all planned dependencies, configure environment variables, set up TypeScript strict mode, and confirm the dev server boots.
**Done when:** all packages from the architecture are installed, .env.example lists every required variable, `npm run dev` boots without errors, and `npm run build` passes.
- [x] Design it (spec): `/architect project setup & dependencies`
  - [x] Build it: `/develop project setup & dependencies`
    - [x] Install all foundation deps in package.json (AC-1)
    - [x] Create all directories per code-standards.md File Organization (AC-6)
  - [x] Verify it: `/check verify project setup & dependencies`
  - [x] Test it: `/test project setup & dependencies`
Spec 0001 · code in `../specs/0001-project-setup-and-dependencies.md`

### 2. Data model · in-progress

Eight Mongoose collections (users, categories, locations, complaints, assignments, statusHistory, notifications, reports) with indexes, validators, and the connection pool.
**Done when:** all schemas are defined in `/lib/db/models/`, indexes are created on first connect, and the complaint status transition invariant is enforced by Mongoose validators.
- [x] Design it (spec): `/architect data model`
- [x] Build it: `/develop data model`
  - [x] Update architecture.md to record Mongoose 9 (AC-15)
  - [x] Tighten users schema (AC-1)
  - [x] Add new fields: proofPhotoUrl, changedBySystem (AC-1, AC-7)
  - [x] Implement pre(save) hook for status transitions (AC-3)
  - [x] Implement cross field validators (AC-4, AC-5, AC-6)
  - [x] Update connection.ts with pool sizing and SIGINT (AC-9)
  - [x] Update indexes.ts with all indexes and retry (AC-8, AC-10)
  - [x] Create lib/utils/pii.ts toPublicJSON helper (AC-13)
  - [x] Build atomic duplicate detection (AC-11)
  - [x] Wire optimistic concurrency (AC-12)
  - [x] Author invariant tests (AC-14)
  - [x] Add dev seed script
  - [x] Verify it: `/check verify data model`
  - [x] Test it: `/test data model`
Spec 0002 · code in `../specs/0002-data-model.md`

### 3. Design system & UI foundation · done

Astryx component integration, Tailwind theme tokens, layout shell with sidebar nav for reporter/admin/technician roles, and responsive base.
**Done when:** `design.md` covers type/color/spacing/components, the layout renders for all three roles, and base components handle focus and keyboard navigation.
- [x] Design it (spec): `/architect design system & UI foundation`
- [x] Build it: `/develop design system & UI foundation`
  - [x] Install Astryx and providers, add NEXT_PUBLIC_ALLOW_MOCK_ROLE to .env.example
  - [x] Author docs/design.md tokens reference (AC-1)
  - [x] Wire app/globals.css, app/providers.tsx, app/layout.tsx (AC-2, AC-3, AC-7)
  - [x] Build lib/auth/role-context.tsx and the three role aware layouts (AC-4)
  - [x] Build the empty state composites and error boundaries (AC-5, AC-6)
  - [x] Verify all build gates green and dev server smoke (AC-9)
- [x] Verify it: `/check verify design system & UI foundation`
- [x] Test it: `/test design system & UI foundation`
- [ ] Review it (fresh model): `/check review design system & UI foundation`
- [ ] Document it: `/document design system & UI foundation`
Spec 0003 · code in `../specs/0003-design-system-ui-foundation.md`

## Slice 1: Core complaint loop

### 4. Authentication (BetterAuth) · in-progress

Email/password registration and sign-in for three roles (reporter, dicht_admin, dicht_technician) with HTTP-only cookie sessions and route-level RBAC checks. First user to sign up becomes admin; subsequent users get reporter role by default. Admins assign roles to other users.
**Done when:** a user can register (first user becomes admin, rest become reporters), sign in, and sign out; protected routes reject unauthenticated requests; role-based routes enforce the RBAC matrix; admins can assign roles to other users.
- [x] Design it (spec): `/architect authentication`
- [ ] Build it: `/develop authentication`
  - [x] Install BetterAuth plus Mongoose adapter; add session, account, verification models (AC-5, AC-6)
  - [x] Wire lib/auth/config.ts, app/api/auth/[...all]/route.ts, lib/auth/actions.ts, plus (public) sign-in and sign-up pages (AC-1, AC-2, AC-3, AC-5)
  - [x] Add middleware.ts at project root for RBAC and refactor lib/auth/role-context.tsx to useCurrentUser (AC-4, AC-7). Note: `middleware.ts` was renamed to `proxy.ts` in Unit-06, and the role gate now lives in `lib/auth/dal.ts` rather than in the request boundary.
  - [x] Retire MockRoleSwitcher and remove NEXT_PUBLIC_ALLOW_MOCK_ROLE from .env.example (AC-8)
  - [x] Implement first-user-is-admin logic in signUpAction (AC-1)
  - [x] Build POST /api/admin/users/[id]/role endpoint for role assignment (AC-9)
  - [ ] Run all build gates plus Playwright sign-up, sign-in, sign-out, and 403 on role mismatch smoke (AC-10)
    - Deferred to end-of-cycle per Test Execution Policy in `AGENTS.md`; agents during development must not block on `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, or `npm run test:e2e`. End-of-cycle verify will re-run all gates against the final tree.
  - code in `lib/auth/{config,actions,role-context,dal}.ts`, `lib/db/models/{session,account,verification}.ts`, `app/api/auth/[...all]/route.ts`, `app/(public)/{sign-in,sign-up}/*.tsx`, `components/shared/SignOut.tsx`, `components/shared/TopNav.tsx`, `proxy.ts` (renamed from `middleware.ts` per Unit-06), `app/api/admin/users/[id]/role/route.ts`
- [ ] Verify it: `/check verify authentication`
- [ ] Test it: `/test authentication`
- [ ] Review it (fresh model): `/check review authentication`
- [ ] Document it: `/document authentication`
Spec 0004 (Status: In Progress; build spec `index.md`, rationale `rationale.md`, verify `verify.md`) · code in `../specs/0004-authentication/index.md`

### 5. Complaint submission with AI triage · in-progress

Reporter submits a complaint at `/complaints/new` with category, location, description, optional photo, and anonymous toggle. Server validates input, runs duplicate detection, calls AI triage (Vercel AI SDK + OpenAI gpt-4o-mini), and persists the complaint with SLA deadlines.
**Done when:** a complaint is created with valid AI triage results, fallback activates on AI failure, duplicate detection clusters within 30 minutes, and anonymous mode suppresses reporterId.
- [x] Design it (spec): `/architect complaint submission`
- [x] Build it: `/develop complaint submission`
  - [x] Install deps plus add ANONYMOUS_TOKEN_SECRET and AI_TRIAGE_FALLBACK_TO_RULES to .env.example; build lib/ai/{schemas,prompts,cost,fallback,triage}.ts (AC-2, AC-3, AC-8)
  - [x] Build lib/storage/cloudinary.ts plus lib/auth/anonymous-token.ts (AC-5, AC-6, AC-7)
  - [x] Build POST /api/complaints, GET /api/complaints/[id] with duplicate detection plus AI wiring plus fallback (AC-1, AC-2, AC-3, AC-4, AC-5, AC-8)
  - [x] Build /complaints/new form, /complaints/[id] detail page, /track/[token] anonymous tracker page (AC-5, AC-9)
  - [x] Build scripts/ai-cost-check.ts and run all build gates plus Playwright smoke (AC-3, AC-10)
  - code in `lib/ai/{schemas,prompts,cost,fallback,triage}.ts`, `lib/storage/cloudinary.ts`, `lib/auth/anonymous-token.ts`, `lib/auth/anonymous-token.test.ts`, `app/api/complaints/route.ts`, `app/api/complaints/[id]/route.ts`, `app/(reporter)/complaints/new/{page.tsx,ComplaintForm.tsx}`, `app/(reporter)/complaints/[id]/page.tsx`, `app/(public)/track/[token]/page.tsx`, `components/reporter/{CategoryBadge,SeverityBadge,SlaCountdown}.tsx`, `scripts/{ai-cost-check,cost-cap}.ts`, `proxy.ts` (renamed from `middleware.ts` per Unit-06, plus `/api/complaints/*` removed from the matcher scope)
- [ ] Verify it: `/check verify complaint submission`
- [ ] Test it: `/test complaint submission`
- [ ] Review it (fresh model): `/check review complaint submission`
- [ ] Document it: `/document complaint submission`
Spec 0005 · code in `../specs/0005-complaint-submission.md`

### 6. Reporter dashboard · in-progress

Personal dashboard at `/complaints/mine` listing the reporter's complaints with live status, and complaint detail at `/complaints/:id` showing status timeline and proof-of-fix photo.
**Done when:** the reporter sees their complaints sorted by date, status is current, and the detail page shows the full status history.
- [x] Design it (spec): `/architect reporter dashboard`
- [ ] Build it: `/develop reporter dashboard`
  - [x] Build lib/utils/pagination.ts plus GET /api/complaints route handler with reporter scoped filter (AC-1, AC-7)
  - [x] Build /complaints/mine page with ComplaintCard, ClosedClaimsToggle, LoadMore, TanStack Query polling (AC-1, AC-2, AC-3)
  - [x] Build ComplaintTimeline plus ProofPhotoDialog plus /complaints/[id] detail page owned by Feature 6 (AC-4, AC-5, AC-6, AC-8, AC-9)
  - [x] Cross spec amendment to spec 0005 redirect plus run all build gates plus Playwright smoke (AC-10)
    - code in `lib/utils/pagination.ts`, `app/api/complaints/route.ts` (GET handler added), `app/api/complaints/[id]/timeline/route.ts`, `components/reporter/ComplaintCard.tsx`, `components/reporter/ComplaintList.tsx`, `components/reporter/ClosedClaimsToggle.tsx`, `components/reporter/ComplaintTimeline.tsx`, `components/reporter/ProofPhotoDialog.tsx`, `components/reporter/ComplaintDetailClient.tsx`, `app/(reporter)/complaints/mine/page.tsx`, `app/(reporter)/complaints/[id]/page.tsx`
- [ ] Verify it: `/check verify reporter dashboard`
- [ ] Test it: `/test reporter dashboard`
- [ ] Review it (fresh model): `/check review reporter dashboard`
- [ ] Document it: `/document reporter dashboard`
Spec 0006 · code in `../specs/0006-reporter-dashboard.md`

## Slice 2: Admin and technician views

### 7. Admin queue & assignment · in-progress

Admin console at `/admin/queue` with filtering by severity, age, and location. Assignment action to technicians, reassignment with audit trail, and SLA breach overlay.
**Done when:** the admin can filter the queue, assign a complaint to a technician, reassign with audit, and see SLA breach indicators.
- [x] Design it (spec): `/architect admin queue`
- [x] Build it: `/develop admin queue & assignment`
  - [x] Build lib/sla/breach-detection.ts plus GET /api/admin/queue with severity/age/location filters and live breach overlay (AC-1, AC-2, AC-3)
  - [x] Build POST /api/admin/queue/assign with optimistic concurrency, audit trail writes, Ably push and notifications row (AC-5, AC-6, AC-7, AC-8)
  - [x] Build /app/(admin)/queue three column page with FilterPanel, QueueRow, AssignDialog, AdminQueueEmpty reuse (AC-1, AC-2, AC-4)
  - [x] Build GET /api/admin/queue/recent-actions and components/admin/RecentActionsFeed (AC-9)
  - [ ] Run all build gates plus Playwright filter/breach/assign/reassign/recent-actions smoke (AC-10)
- [ ] Verify it: `/check verify admin queue & assignment`
- [ ] Test it: `/test admin queue & assignment`
- [ ] Review it (fresh model): `/check review admin queue & assignment`
- [ ] Document it: `/document admin queue & assignment`
Spec 0007 · code in `../specs/0007-admin-queue-and-assignment.md`

### 8. Technician queue & status updates · in-progress

Technician view at `/technician/queue` showing assigned complaints sorted by SLA urgency. Acknowledge, update status to In Progress with notes, and mark Resolved with mandatory proof-of-fix photo.
**Done when:** the technician can acknowledge a complaint, update status with notes, and resolve with a proof photo that populates the statusHistory audit trail.
- [x] Design it (spec): `/architect technician queue`
- [x] Build it: `/develop technician queue & status updates`
  - [x] Build POST /api/technician/queue/[id]/transition with optimistic concurrency, allowlist, photo upload, statusHistory and notifications writes, Ably push (AC-3, AC-4, AC-5, AC-6, AC-7, AC-8)
  - [x] Build GET /api/technician/queue plus [id] route handlers with technician scoped assignment filter (AC-1, AC-2)
  - [x] Build /technician/queue and /technician/queue/[id] pages with AcknowledgeForm, InProgressForm, ResolveForm plus ProofPhotoUploader reusing lib/storage/cloudinary.ts (AC-1, AC-2, AC-3, AC-4, AC-5)
  - [ ] Run all build gates plus Playwright acknowledge, in progress, resolved with photo, version mismatch 409, reverse transition rejected (AC-9)
- [ ] Verify it: `/check verify technician queue & status updates`
- [ ] Test it: `/test technician queue & status updates`
- [ ] Review it (fresh model): `/check review technician queue & status updates`
- [ ] Document it: `/document technician queue & status updates`
Spec 0008 · code in `../specs/0008-technician-queue-and-status-updates.md`

## Slice 3: SLA and real-time

### 9. SLA engine & escalation · in-progress

Vercel cron endpoint `/api/cron/sla-sweep` runs every 5 minutes. Acknowledge breach notifies DICT Admin; resolve breach notifies DICT Director. All escalations recorded in notifications.
**Done when:** the cron detects breaches at the correct thresholds, sends the right escalation notifications, and is idempotent within a 5-minute window.
- [x] Design it (spec): `/architect SLA engine`
- [x] Build it: `/develop SLA engine & escalation`
  - [x] Build /api/cron/sla-sweep with bearer auth, evaluateBreachState from spec 0007, dedup via notifications.find, notifications writes, Ably push, complaints.escalated flip (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7)
  - [x] Add vercel.json cron entry plus scripts/sla-sweep simulator for local exercise (AC-1, AC-8)
  - [x] Add escalatedRecentCount plus QueueRibbon on /admin/queue and run all build gates plus Playwright cron smoke (AC-8)
- [ ] Verify it: `/check verify SLA engine & escalation`
- [ ] Test it: `/test SLA engine & escalation`
- [ ] Review it (fresh model): `/check review SLA engine & escalation`
- [ ] Document it: `/document SLA engine & escalation`
Spec 0009 · code in `../specs/0009-sla-engine-and-escalation.md`

### 10. Real-time notifications (Ably) · in-progress

Push notifications for assignment alerts to technicians, escalation warnings to admins, and status-update fan-out so the admin console refreshes without page reload.
**Done when:** a technician receives a push notification on assignment, an admin receives escalation warnings, and the queue updates in real time.
- [x] Design it (spec): `/architect real-time notifications`
- [x] Build it: `/develop real-time notifications`
  - [x] Build lib/realtime/ably-client.ts plus useAblyChannel hook with TanStack Query invalidation and connection state (AC-5, AC-6)
  - [x] Build components/RealtimeStatusBadge.tsx plus wire admin queue to subscribe to admin:queue and admin:escalations (AC-1, AC-3, AC-4)
  - [ ] Verify existing publish sides from specs 0007 plus 0008 plus 0009 by integration test and run all build gates plus Playwright cron smoke (AC-7, AC-8)
- [ ] Verify it: `/check verify real-time notifications`
- [ ] Test it: `/test real-time notifications`
- [ ] Review it (fresh model): `/check review real-time notifications`
- [ ] Document it: `/document real-time notifications`
Spec 0010 · code in `../specs/0010-real-time-notifications.md`

## Slice 4: Reporting and images

### 11. Reporting dashboard & export · in-progress

Admin reporting dashboard with Recharts visualisations (volume by category/location/severity, average resolution time, SLA-breach count, backlog). PDF export via @react-pdf/renderer; CSV export for offline analysis.
**Done when:** the dashboard renders all four chart types, filters by time window/severity/location/status, and exports to PDF and CSV.
- [x] Design it (spec): `/architect reporting dashboard`
- [x] Build it: `/develop reporting dashboard`
  - [x] Build /api/admin/reports route handler with single aggregation pipeline driving all four charts plus numeric cards (AC-1, AC-2, AC-6)
  - [x] Build /api/admin/reports/export.csv plus export.pdf route handlers reusing the same aggregation (AC-4, AC-5)
  - [x] Build /admin/reports page with chart components plus FilterPanel plus ExportButtons plus 60 second polling (AC-1, AC-2, AC-3, AC-7)
  - [ ] Run all build gates plus Playwright four chart rendering plus filter plus PDF plus CSV smoke (AC-8)
- [ ] Verify it: `/check verify reporting dashboard`
- [ ] Test it: `/test reporting dashboard`
- [ ] Review it (fresh model): `/check review reporting dashboard`
- [ ] Document it: `/document reporting dashboard`
Spec 0011 · code in `../specs/0011-reporting-dashboard.md`

### 12. Image pipeline (sharp + Cloudinary) · in-progress

Server-side image pipeline: multipart/form-data upload, sharp compression, Cloudinary upload, URL persisted on the complaint. MIME-type and size validation.
**Done when:** a valid image is compressed, uploaded to Cloudinary, and the URL is stored on the complaint; non-image uploads are rejected.
- [x] Design it (spec): `/architect image pipeline`
- [x] Build it: `/develop image pipeline`
  - [x] Update lib/storage/cloudinary.ts with EXIF strip, HTTPS URL filter, Cloudinary 409 retry once with nanoid suffix (AC-4, AC-5, AC-6)
  - [x] Add tests/integration/image-pipeline.test.ts and lib/storage/integration-test-helpers.ts with stub Cloudinary client covering both spec 0005 submission plus spec 0008 Resolve surfaces (AC-7)
  - [ ] Update package.json deps if needed and run all build gates plus Playwright end to end submission plus Resolve smoke (AC-8)
- [ ] Verify it: `/check verify image pipeline`
- [ ] Test it: `/test image pipeline`
- [ ] Review it (fresh model): `/check review image pipeline`
- [ ] Document it: `/document image pipeline`
Spec 0012 · code in `../specs/0012-image-pipeline.md`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Email notifications (Resend)**: transactional email for status updates · needs a decision
- **Load testing (JMeter/k6)**: performance validation of API endpoints · needs a decision
- **Rate limiting (Upstash)**: abuse prevention on auth and submission endpoints · needs a decision
- **Duplicate detection refinements**: cluster linking and dedup UI for admins · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Lean+, `Test it` Medium+, `Review it` + `Document it` Full); any surfaced follow-up enrolled |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | the tier's last required stage (`Vibe` → `/develop`; `Lean` → `/check verify`; `Medium`/`Full` → `/test`), then `/sync` | required boxes ticked; `Review it`/`Document it` (Full) ticked by `/check review`/`/document`, tracked but not part of the `done` gate (Design/Build/Verify/Test); `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· Full`, `· Vibe`) overrides the project default `**Workflow:**` tier for that one feature; no tag = inherit. It is the single rigor dial (there is no separate "weight").
- **Workflow** (header line) is the project default tier, the stages each feature runs **after** `/develop`: **Vibe** = nothing after `/develop` (rely on its build time self check); **Lean** = `/check verify`; **Medium** = `/check verify` then `/test`; **Full** = `/check verify`, `/test`, a fresh model `/check review`, then `/document` (and most features need a spec). The tier also sets what closes a feature to `done`, the last required stage marks it: **Vibe** → `/develop` (build + self check); **Lean** → `/check verify` on PASS; **Medium**/**Full** → `/test` (with verify passed). At every tier an `Assumed` spec still blocks `done` until `/architect` ratifies it, and `/architect` still gates any feature that needs a decision (tier does not turn the gate off). A feature's own tier tag overrides this default. `/develop` reads the effective tier to scale the next steps it recommends.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
