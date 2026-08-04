# Architecture Context

Project Name: Campus Maintenance Complaint Management System (LASU)

This file is part of the Idea-to-Product six-file context convention. Read with
`project-overview.md`, `code-standards.md`, `ui-context.md`, `ai-workflow-rules.md`,
`progress-tracker.md`, and `AGENT.md` (project root).

## Stack

### Runtime + framework
- Node.js (LTS, ≥ 20.x).
- Next.js 16 (App Router) — Page Router not used; Server Components and route handlers under `/app/api/`.
- React 19.
- TypeScript 5.x in **strict mode** (see `code-standards.md` §TypeScript).

### Frontend
- Tailwind CSS 4 (utility-first; design tokens from `tailwind.config.ts`).
- Astryx (`@astryxdesign/core`) components with pre built CSS alongside Tailwind.
- `@tanstack/react-query` for client-side data cache and revalidation.
- `sonner` for toast notifications.
- `react-hook-form` + `@hookform/resolvers` + Zod resolver for form state.
- `date-fns` for date formatting and SLA countdown timers.
- `lucide-react` for icons.

- `isomorphic-dompurify` for description-rendering HTML sanitisation.

### Backend
- Next.js route handlers (`/app/api/<resource>/route.ts`) and Server Actions as the **only** paths that touch Mongoose models.
- `BetterAuth` with the `nextCookies` plugin for HTTP-only cookie sessions.
- `Mongoose` 9.x for the data layer.

### Database
- MongoDB Atlas (free tier for first deployment; production scales).
- Connection string: `MONGODB_URI` env var.

### AI
- OpenAI API via **Vercel AI SDK's `generateObject`** helper with a Zod schema.
- Default model: `gpt-4o-mini`. Configurable by `OPENAI_MODEL`.

### Real-time
- `Ably` for push (assignment notifications, escalation warnings).
- Auth via `ABLY_API_KEY`.

### Rate limiting
- `@upstash/ratelimit` with `Upstash Redis` backing.
- Tokens: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

### Image pipeline
- `multipart/form-data` → `sharp` compression (server-side) → `Cloudinary` upload →
  URL persisted in `complaints.photoUrls[]`.

### Charts / export
- `Recharts` for in-app dashboards.
- `@react-pdf/renderer` for PDF export.
- CSV: hand-rolled (small surface) or `papaparse`.

### Email
- Phase 2 only: `Resend` for transactional email. Launch uses in-app + Ably only.

### Security / abuse
- `@upstash/ratelimit` with `@upstash/redis` for rate limiting on auth endpoints and complaint submission.
- `@upstash/ratelimit` for fine-grained per-user quotas.

### Testing
- `Jest` + `React Testing Library` for unit + component tests.
- `Apache JMeter` or `k6` for load testing.
- Node's built-in test runner or `Vitest` for API integration tests.

### Deployment + VCS
- `Vercel` for hosting and cron (Vercel cron endpoint at `/api/cron/...`).
- `Git` for version control.
- DNS: e.g. `cms.lasu.edu.ng` (placeholder until LASU IT provisions).

## System Boundaries

Three-tier architecture (Presentation / Application / Data), consistent with the
patterns established by Adelowo et al. (2026) — UniMaintain — and Winasis et al.
(2026) — public complaint platform.

### Presentation tier — `/app/`
- React Server Components for first-paint SSR on reporter, admin and technician views.
- Client Components only where interactivity is required (forms, queue actions,
  real-time push).
- Sample data is never accessed here; that lives in the data tier.

### Application tier — `/app/api/` + Server Actions
- Route handlers (`.ts`, e.g. `/app/api/complaints/route.ts`) and Server Actions
  are the **only** paths that touch Mongoose models in `/lib/db/models/`.
- The proxy at `proxy.ts` runs on every protected UI path and only inspects
  the BetterAuth session cookie; the authoritative session plus role
  check happens in `lib/auth/dal.ts`, called from each Route Handler,
  Server Component, and Server Action. The proxy never issues a database
  call, in line with the Next.js 16 Authentication guide's "Optimistic
  checks with Proxy" recommendation.
- Side effects from this tier only: AI calls, queue writes, Ably pushes,
  Cloudinary uploads, rate limit checks.
- All input schemas validated by **Zod** before reaching Mongoose.

### Data tier — `/lib/db/models/` and the MongoDB cluster
- Eight Mongoose collections (see §Storage Model below).
- Models are the **only** writers to the database; nothing else (UI, cron,
  scripts) writes directly.
- Connection pooling, replica set awareness, and retry logic handled by
  Mongoose.

### Cross-cutting concerns
- **Cron / scheduled work** runs as Vercel cron functions under `/api/cron/`;
  these route through the application tier so they share its auth and
  validation.
- **Real-time push** is initiated by the application tier; the data tier
  never pushes.
- **AI calls** are made from the application tier; the OpenAI key never
  reaches the client side.
- **Rate limiting** runs in the application tier before any expensive
  operation.

## Storage Model

Eight Mongoose collections in a single `cms_lasu` database. All schemas are
defined in `/lib/db/models/` and exported with `InferSchemaType` for type safety
in handlers.

### `users`
- `_id` (ObjectId, auto).
- `email` (String, **unique, indexed**).
- `passwordHash` (String, optional — written by BetterAuth; cost factor is owned by BetterAuth, not by this project).
- `name` (String).
- `role` (`'reporter' | 'dicht_admin' | 'dicht_technician'`).
- `anonymousId` (String, optional — populated only for anonymous complaints).
- `createdAt`, `updatedAt` (Date, via Mongoose timestamps).

(Additional BetterAuth internal tables exist; if not folded into `users`, keep separate.) Also writes BetterAuth-managed `session`, `account`, `verification` tables outside the locked eight; see spec 0004.

### `categories`
- `_id` (ObjectId).
- `systemType` (`Electrical | Plumbing | Carpentry | HVAC | ICT | Cleaning | Security | Other`). Unique — one row per type.
- `defaultSeverity` (`Critical | High | Medium | Low`).
- `slaAcknowledgeHrs` (Number).
- `slaResolveHrs` (Number).

### `locations`
- `_id` (ObjectId).
- `name` (String — e.g. "Female Hostel A", "Engineering Block", "Library").
- `area` (`hostel | academic | admin | lab | other`).

### `complaints`
- `_id`, `reporterId?`, `isAnonymous` (Bool), `categoryId`, `locationId`,
  `description` (10–2000 chars), `photoUrls[]`, `priority` (enum),
  `slaAcknowledgeBy`, `slaResolveBy`, `status`, `escalated`, `createdAt`,
  `resolvedAt?`.
- `aiSuggestion` sub-document: `enabled`, `model`, `categoryId`, `severity`,
  `rationale`, `latencyMs`, `promptTokens`, `completionTokens`, `costUsd`,
  `ranAt`, `fallback`, `error?`.
- `parentComplaintId` (ObjectId, optional) for duplicate-cluster linking.

### `assignments`
- `_id`, `complaintId`, `assignedToTechId`, `assignedById`, `assignedAt`.

### `statusHistory`
- `_id`, `complaintId`, `fromStatus`, `toStatus`, `changedById`, `note?`,
  `photoUrl?`, `changedAt`.

### `notifications`
- `_id`, `complaintId`, `recipientId`, `type` (`assignment | escalation | status`),
  `message`, `read` (Bool), `createdAt`.

### `reports` (optional aggregate cache)
- `_id`, `period`, `byCategory`, `byLocation`, `avgResolutionHrs`, `slaBreachCount`.

### Indexes (created once on first connect via `/lib/db/indexes.ts`)
- `complaints.slaResolveBy` (SLA sweep).
- `complaints.status` (queue view).
- `complaints.categoryId`.
- `complaints.locationId`.
- `complaints.createdAt` (30-minute duplicate-detection window).
- `assignments.complaintId`.
- `users.email` (unique).
- `users.role`.
- `notifications.recipientId`.

## Auth and Access Model

`BetterAuth` with three named role classes:

- `reporter` — students/staff; submit and track own complaints.
- `dicht_admin` — DICT administrator; queue, assignment, reports.
- `dicht_technician` — DICT technician; assigned queue, status transitions,
  proof-of-fix uploads.

### Sign-in / session
- Email/password registration.
- BetterAuth owns password hashing and writes the resulting hash to `users.passwordHash`; no separate `bcrypt` dependency is added (per spec 0002 §Decision).
- Sessions are HTTP-only cookies (7-day default expiry via BetterAuth).
- BetterAuth's `nextCookies` plugin wires the cookie to Next.js Server Actions.

### RBAC enforcement
- `proxy.ts` at project root handles the optimistic redirect: when a
  request hits `/admin/*` or `/technician/*` without a BetterAuth
  session cookie, the proxy sends a 307 redirect to `/sign-in`.
  The proxy does not read the database and does not enforce roles.
- Authoritative session verification and role gating live in
  `lib/auth/dal.ts`. Every Server Component, Server Action, and Route
  Handler calls `getServerSession` (React `cache()` wrapped, returns
  the normalized user shape), `requireSession` (Server Component
  redirect to `/sign-in`), or `requireRole(...allowed)` (Server
  Component redirect to `/`). Route Handlers use `getServerSession`
  and return a typed 401 plus 403 JSON via the existing
  `lib/utils/errors.ts` `ApiError` class.

### Route groups
- `/app/api/admin/*` and `/app/(admin)/*` — admins only.
- `/app/api/technician/*` and `/app/(technician)/*` — technicians only.
- `/app/api/complaints` and `/app/(reporter)/complaints/*` — reported via
  BetterAuth session OR via the anonymous flow. The proxy does not blanket
  block any of these. Each Server Component, Server Action, and Route
  Handler enforces its own role allowlist through `lib/auth/dal.ts`
  (`getServerSession`, `requireSession`, `requireRole`). Anonymous
  submissions arrive with no session and a synthesized `users` row carries
  the `anonymousId` JWT so the page re-entry is read only.
- `proxy.ts` at project root runs on every protected UI path (`/admin/*`
  and `/technician/*`) and only inspects the BetterAuth session cookie;
  it redirects to `/sign-in` when the cookie is missing. The proxy
  never issues a database call on the request path; DB sessions are
  read once per render pass by the DAL, which is wrapped in React
  `cache()`.
- An **anonymous reporter** flow uses a special signed token (not BetterAuth);
  the resulting complaint has `isAnonymous = true`, `reporterId` set to the
  hidden user's `_id` (so `users.email` is unique by JWT jti), and
  `anonymousId` populated on the hidden user row.

### PII discipline
- `users` PII is stripped from the AI prompt at submission time per
  NFR-3.5 / NFR-6.
- Reporter emails and names are never sent to OpenAI.
- AI rationale is stored on the complaint doc but visible only to admins —
  never on the reporter's public dashboard.

## Invariants

The system preserves these. Violating any one should fail loudly (test, lint,
or schema validation) — never silently.

### Domain invariants
- A `complaint.status` transition can only occur **forward** along the state
  machine: `Submitted → Acknowledged → In Progress → Resolved → Closed`. Reverse
  transitions are forbidden except for admin-only override on
  `In Progress → Acknowledged`, audited in `statusHistory`.
- Every `complaints.status === 'Resolved'` MUST have a `proofPhotoUrl` in its
  most recent `statusHistory` entry.
- Every `notifications.type === 'escalation'` MUST have a non-null
  `complaintId` and a non-null `recipientId`.
- `slaAcknowledgeBy < slaResolveBy` is enforced at write time by Mongoose
  validators.
- Anonymous complaints MUST have `isAnonymous = true`, `reporterId` null and
  `anonymousId` populated.
- The AI's `severity` output (`Critical | High | Medium | Low`) is canonical
  for SLA deadline computation; `categories[].defaultSeverity` is only used
  when AI failed and `aiSuggestion.fallback = true`.

### Data invariants
- A duplicate complaint MUST have a non-null `parentComplaintId` referring to
  the older complaint in the 30-minute window.
- `users.email` is unique; duplicates raise Mongoose `E11000` and become
  409 Conflict at the API boundary.
- `aiSuggestion.costUsd` is treated as a denormalised counter; if it
  diverges from `(promptTokens + completionTokens) × model_rate` at audit,
  an alert fires.

### Process invariants
- Reporter role cannot transition a complaint's status (FR-6.3).
- Technician role cannot reassign a complaint.
- Only admin role can override SLA timers manually; event is audited.
- Vercel cron `sla-sweep` is **idempotent**: running it twice in the same
  5-minute window is a no-op.
- Ably pushes are best-effort; if they fail, the `notifications` row still
  records the escalation so the admin UI surfaces it on next poll.

### Cost invariants
- Monthly AI triage cost > $5 MUST flip `AI_TRIAGE_FALLBACK_TO_RULES = true`
  and notify operations. Enforced by a daily cron comparing running totals.
- Monthly AI triage cost > $50 MUST switch the default `OPENAI_MODEL` down
  (e.g. smaller fine-tuned classifier) or stop AI triage entirely pending
  operator review.
