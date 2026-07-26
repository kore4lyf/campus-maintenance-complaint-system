# Code Standards

Project Name: Campus Maintenance Complaint Management System (LASU)

This file is part of the Idea-to-Product six-file context convention. Read together
with the other five context files in this directory.

## General

- **One user-facing capability per PR.** Don't bundle auth + triage + reporting
  into one PR unless such a unit is called out in `progress-tracker.md → Next Up`.
- **PR ≤ 400 lines** of substantive change (excluding generated code and
  fixtures).
- **Tests run locally before pushing**: `npm test` for Jest, `npm run lint`
  for ESLint, `npx tsc --noEmit` (or `npm run typecheck`) for TypeScript.
- **Commit messages**: short subject (≤ 72 chars), imperative mood, no trailing
  punctuation; references the issue or unit ID (e.g. `Unit-04: SLA sweep`).
- **PR descriptions cite the source**: unit ID + academic doc section
  (e.g. `S3.2.5 complaint schema`) OR developer-brief section
  (e.g. `§4 AI Triage Implementation`) OR a `context/` rule section.
- **No `any` types.**
- **No `console.log` in committed code.** Use a logger or remove before
  committing.
- **Comments explain *why*, not *what*.** The *what* is the code itself.
- **Decisions go in docs first.** If implementation uncovers a decision no
  context file records, stop and update the relevant file before writing code
  (per `ai-workflow-rules.md` §Handling Missing Requirements).
- **Cross-reference** the academic doc
  (`Campus Maintenance Complaint Management System.md`) and Developer Brief
  (`Developer Brief - AI Triage + Vercel AI SDK Migration.md`) when
  implementing.

## TypeScript

- TypeScript 5.x in **strict mode**. The `tsconfig.json` has:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": true
    }
  }
  ```
- **No `any`.** Prefer `unknown` and narrow with `z.infer<typeof schema>`.
- **Shared types** live in `/lib/types/`. Per-route types live in the route
  file. Per-model types are derived from Mongoose with `InferSchemaType`.
- **Zod is the source of truth for runtime validation.** Every API route
  handler validates input with a Zod **before** mutating state. Schema,
  then types via `z.infer`, then logic.
- **Null vs Undefined matters.**
  - `null` — absent value, expected to be checked (`reporterId: null` for
    anonymous complaints).
  - `undefined` — field not set; reserved for optional fields the model
    schema allows.

## Framework (Next.js)

- **Next.js 16 App Router only.** No Pages Router code in this project.
- **Routes** live under `/app/` with role-grouped segments:
  - `/app/page.tsx` — landing page.
  - `/app/(reporter)/...` — reporter-only views.
  - `/app/(admin)/...` — DICT admin-only views.
  - `/app/(technician)/...` — DICT technician-only views.
  - `/app/api/...` — route handlers (server-only; never Pages API).
- **React Server Components by default.** Add `'use client'` only when state,
  browser APIs or event handlers require it. Each `use client` boundary is
  its own component file.
- **Data fetching:**
  - Server-side reads with `await` at the page level; pass to children as
    props.
  - Server Actions for mutations; never mutate via Client Components.
- **Server Actions are preferred over REST for internal mutations.** The
  `/app/api/` REST surface is reserved for external integrations or
  synchronous read endpoints.
- **Metadata API** for SEO / social cards; no manual `<head>` writes.
- **`next/image` with the Cloudinary loader** — never raw `<img>`.
- **Font system** via `next/font` — no `<link>` to Google Fonts.
- **Route handlers** return typed responses (`NextResponse<Json<T>>`); errors
  throw typed `ApiError` caught by React `error.tsx`.
- **`generateStaticParams`** for any dynamic route that can be prerendered;
  `dynamic = 'force-dynamic'` only when needed.

## Styling

- **Tailwind CSS 4 only.** No CSS-in-JS, no SCSS, no CSS modules.
- **Tailwind utility classes in JSX.** No `@apply` rules in committed code
  (keeps "what" inline with "which element"; readers don't chase).
- **Design tokens** come from `tailwind.config.ts` (`colors`, `fontFamily`,
  `borderRadius`, `boxShadow`, `animation`).
- **Theming**: `next-themes` toggling `class="dark"` on `<html>`;
  Tailwind `dark:` variant applies. Default theme per OS preference.
- **Astryx components** from `@astryxdesign/core` provide the base UI primitives.
  Install with `npm install @astryxdesign/core @astryxdesign/theme-neutral`.
  Pre built CSS works alongside Tailwind. Theme via CSS custom property overrides.
- **Class names**: prefer long, descriptive strings (`bg-brand-500`) over
  short, opaque ones; modern Tailwind handles this in build size.
- **Icons via `lucide-react`** rendered through Astryx's icon support or
  directly.
- **Loading state**: skeleton loaders from Astryx (`<Skeleton>`); never
  spinners without an explanatory message.
- **Empty state**: explicit message + CTA; never a blank page.

## API Routes

- **File naming**: `route.ts` per resource (e.g. `/app/api/complaints/route.ts`,
  `/app/api/complaints/[id]/route.ts`).
- **HTTP method exports**: `export async function GET`, `POST`, `PATCH`,
  `DELETE`; no `OPTIONS`.
- **Every handler follows a strict order**:
  1. **Auth**: extract BetterAuth session, check role.
  2. **Rate limit**: `@upstash/ratelimit` per role.
  3. **Validate body**: parse with Zod.
  4. **Compute side effects**: AI call, queue writes, lookups.
  5. **Persist**: Mongoose `await model.create(...)` or `findOneAndUpdate(...)`.
  6. **Return**: `NextResponse.json(data, { status })`.
- **Errors**: throw `ApiError(code, message, status)`; the global
  `error.tsx` handles user-facing rendering and PII redaction.
- **PII discipline**: never log request bodies or AI prompts containing
  PII. Use a structured logger with explicit redact list for `email`,
  `name`, `password`, `passwordHash`, `anonymousId`.
- **Response shape**:
  - Success: `{ data: T, meta?: { pagination?, links? } }`.
  - Error: `{ error: { code, message, details? } }`.
- **Status codes**: standard (200, 201, 204, 400, 401, 403, 404, 409, 422, 500).
- **Idempotency**: write endpoints accept an `Idempotency-Key` header; rolling
  24-hour cache (Upstash Redis).
- **No raw error.stack in response body** — return a stable error code + safe
  message; full stack only in server logs.

## Data and Storage

- **All database access** through Mongoose models in `/lib/db/models/`. Hand-
  rolled `db.collection('x').find()` is **forbidden** — it bypasses schema
  validation.
- **Mongoose models export `InferSchemaType`** for end-to-end type safety.
- **Index creation in `/lib/db/indexes.ts`**; the connect hook calls it once
  on first connection.
- **Photo URLs are Cloudinary URLs** (HTTPS); raw file bytes never touch
  MongoDB.
- **Large audit data** (`statusHistory.photoUrl`, `notifications.message`) is
  bounded string/text; no comments field is unbounded.
- **`createdAt` / `updatedAt`** timestamps on every document via Mongoose
  `timestamps: true`.
- **Sensitive fields** (`passwordHash`, `anonymousId` for completed
  complaints) are scrubbed from API responses in a centralised
  `toPublicJSON(instance)` mapper — never inline in handlers.
- **No cross-collection transactions** unless explicitly necessary (e.g.
  for the assignment atomic write). Prefer single-document writes when
  possible — MongoDB performance degrades on multi-doc transactions.

## File Organization

```
/app/                                 # Next.js App Router
  page.tsx                            # Landing page
  (reporter)/page.tsx                  # Reporter dashboard
  (reporter)/complaints/new/page.tsx   # Submission form
  (reporter)/complaints/[id]/page.tsx # Reporter detail + timeline
  (admin)/queue/page.tsx               # DICT admin queue
  (admin)/reports/page.tsx             # DICT admin reports
  (admin)/escalations/page.tsx        # SLA breach view
  (technician)/queue/page.tsx          # Technician queue
  /api/cron/sla-sweep/route.ts         # Cron endpoint
  /api/auth/[...all]/route.ts         # BetterAuth route handlers
  /api/complaints/route.ts            # POST (submit) + GET (list)
  /api/complaints/[id]/route.ts       # GET + PATCH (status updates)
  /api/complaints/[id]/transition/route.ts  # POST (status transition)
  /api/ai/triage/route.ts              # POST (manual triage re-run by admin)
  layout.tsx                          # Root layout
  globals.css                         # Tailwind directives only

/lib/
  auth/                               # BetterAuth config + middleware
    config.ts
    middleware.ts
  db/
    connection.ts                     # Mongoose connection
    indexes.ts                        # MongoDB index setup
    models/
      user.ts
      category.ts
      location.ts
      complaint.ts
      assignment.ts
      status-history.ts
      notification.ts
      report.ts
  ai/
    triage.ts                         # Vercel AI SDK + Zod + generateObject
    prompts.ts                        # System + user prompt builders; PII strip
    schemas.ts                        # Zod schemas for AI output
    fallback.ts                       # Rules-based fallback when AI errors
    cost.ts                           # Token-to-USD calculation
  sla/
    table.ts                          # Severity -> SLA hour mapping
    sweep.ts                          # Vercel cron implementation
  queue/
    connection.ts                     # BullMQ + Upstash Redis setup
  realtime/
    ably.ts                           # Ably client + helpers
  storage/
    cloudinary.ts                     # sharp + Cloudinary upload
  utils/
    errors.ts                         # ApiError class
    response.ts                       # NextResponse helpers
    pii.ts                            # PII stripping helpers for AI prompts
    idempotency.ts                    # Idempotency-Key cache helper
    logger.ts                         # Structured logger with redact list

/components/
  ui/                                 # Astryx base components
  reporter/                           # Reporter-specific composites
  admin/                              # Admin-specific composites
  technician/                         # Technician-specific composites
  shared/                             # Layout, Footer, ThemeToggle, ErrorBoundary

/tests/
  unit/                               # Jest + RTL
  integration/                        # API integration tests
  load/                               # JMeter .jmx plans + k6 scripts
  fixtures/                           # Seed data, mocks

/scripts/                             # Ops scripts
  seed.ts                             # Database seeding (categories, locations, admin user)
  roles.ts                            # Print current user roles
  ai-cost-check.ts                    # Monthly AI spend check

/types/                              # Shared types only (rarely used; prefer co-located)

/public/                              # Static assets
/context/                             # Idea-to-Product context files (AI assistant reads)
/AGENT.md                             # Entry file for AI sessions
```

- **Co-locate types with their feature** where possible
  (`/app/(admin)/queue/types.ts`) over a global `types/` directory.
- **Reusable utilities** in `/lib/` (singletons: connection, auth, AI client).
- **Per-route components** in route-adjacent folders when small; promoted to
  `/components/<role>/` when reused.
