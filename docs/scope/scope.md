# Scope: Campus Maintenance Complaint Management System (LASU)

A web app for LASU students and staff to submit maintenance complaints with photos and AI-assisted triage, and for DICT admins and technicians to assign, track, and resolve them with SLA enforcement and real-time notifications.

**Build approach:** Tracer Bullet (prove the whole pipe works before building any part of it fully).
**Workflow:** Full (after /develop: /check verify, /test, /check review, /document). The project default rigor tier; architect still gates any feature that needs a decision at every tier; a feature's own tier tag overrides it.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Project setup & dependencies | Foundation | planned |
| 2 | Data model | Foundation | planned |
| 3 | Design system & UI foundation | Foundation | planned |
| 4 | Authentication (BetterAuth) | Slice 1 | planned |
| 5 | Complaint submission with AI triage | Slice 1 | planned |
| 6 | Reporter dashboard | Slice 1 | planned |
| 7 | Admin queue & assignment | Slice 2 | planned |
| 8 | Technician queue & status updates | Slice 2 | planned |
| 9 | SLA engine & escalation | Slice 3 | planned |
| 10 | Real-time notifications (Ably) | Slice 3 | planned |
| 11 | Reporting dashboard & export | Slice 4 | planned |
| 12 | Image pipeline (sharp + Cloudinary) | Slice 4 | planned |

## Foundations

### 1. Project setup & dependencies

Install all planned dependencies, configure environment variables, set up TypeScript strict mode, and confirm the dev server boots.
**Done when:** all packages from the architecture are installed, .env.example lists every required variable, `npm run dev` boots without errors, and `npm run build` passes.
- [ ] Design it (spec): `/architect project setup & dependencies`

### 2. Data model

Eight Mongoose collections (users, categories, locations, complaints, assignments, statusHistory, notifications, reports) with indexes, validators, and the connection pool.
**Done when:** all schemas are defined in `/lib/db/models/`, indexes are created on first connect, and the complaint status transition invariant is enforced by Mongoose validators.
- [ ] Design it (spec): `/architect data model`

### 3. Design system & UI foundation

Astryx component integration, Tailwind theme tokens, layout shell with sidebar nav for reporter/admin/technician roles, and responsive base.
**Done when:** `design.md` covers type/color/spacing/components, the layout renders for all three roles, and base components handle focus and keyboard navigation.
- [ ] Design it (spec): `/architect design system & UI foundation`

## Slice 1: Core complaint loop

### 4. Authentication (BetterAuth)

Email/password registration and sign-in for three roles (reporter, dicht_admin, dicht_technician) with HTTP-only cookie sessions and route-level RBAC checks.
**Done when:** a user can register, sign in, and sign out; protected routes reject unauthenticated requests; role-based routes enforce the RBAC matrix.
- [ ] Design it (spec): `/architect authentication`

### 5. Complaint submission with AI triage

Reporter submits a complaint at `/complaints/new` with category, location, description, optional photo, and anonymous toggle. Server validates input, runs duplicate detection, calls AI triage (Vercel AI SDK + OpenAI gpt-4o-mini), and persists the complaint with SLA deadlines.
**Done when:** a complaint is created with valid AI triage results, fallback activates on AI failure, duplicate detection clusters within 30 minutes, and anonymous mode suppresses reporterId.
- [ ] Design it (spec): `/architect complaint submission`

### 6. Reporter dashboard

Personal dashboard at `/complaints/mine` listing the reporter's complaints with live status, and complaint detail at `/complaints/:id` showing status timeline and proof-of-fix photo.
**Done when:** the reporter sees their complaints sorted by date, status is current, and the detail page shows the full status history.
- [ ] Design it (spec): `/architect reporter dashboard`

## Slice 2: Admin and technician views

### 7. Admin queue & assignment

Admin console at `/admin/queue` with filtering by severity, age, and location. Assignment action to technicians, reassignment with audit trail, and SLA breach overlay.
**Done when:** the admin can filter the queue, assign a complaint to a technician, reassign with audit, and see SLA breach indicators.
- [ ] Design it (spec): `/architect admin queue`

### 8. Technician queue & status updates

Technician view at `/technician/queue` showing assigned complaints sorted by SLA urgency. Acknowledge, update status to In Progress with notes, and mark Resolved with mandatory proof-of-fix photo.
**Done when:** the technician can acknowledge a complaint, update status with notes, and resolve with a proof photo that populates the statusHistory audit trail.
- [ ] Design it (spec): `/architect technician queue`

## Slice 3: SLA and real-time

### 9. SLA engine & escalation

Vercel cron endpoint `/api/cron/sla-sweep` runs every 5 minutes. Acknowledge breach notifies DICT Admin; resolve breach notifies DICT Director. All escalations recorded in notifications.
**Done when:** the cron detects breaches at the correct thresholds, sends the right escalation notifications, and is idempotent within a 5-minute window.
- [ ] Design it (spec): `/architect SLA engine`

### 10. Real-time notifications (Ably)

Push notifications for assignment alerts to technicians, escalation warnings to admins, and status-update fan-out so the admin console refreshes without page reload.
**Done when:** a technician receives a push notification on assignment, an admin receives escalation warnings, and the queue updates in real time.
- [ ] Design it (spec): `/architect real-time notifications`

## Slice 4: Reporting and images

### 11. Reporting dashboard & export

Admin reporting dashboard with Recharts visualisations (volume by category/location/severity, average resolution time, SLA-breach count, backlog). PDF export via @react-pdf/renderer; CSV export for offline analysis.
**Done when:** the dashboard renders all four chart types, filters by time window/severity/location/status, and exports to PDF and CSV.
- [ ] Design it (spec): `/architect reporting dashboard`

### 12. Image pipeline (sharp + Cloudinary)

Server-side image pipeline: multipart/form-data upload, sharp compression, Cloudinary upload, URL persisted in complaints.photoUrls[]. MIME-type and size validation.
**Done when:** a valid image is compressed, uploaded to Cloudinary, and the URL is stored on the complaint; non-image uploads are rejected.
- [ ] Design it (spec): `/architect image pipeline`

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
