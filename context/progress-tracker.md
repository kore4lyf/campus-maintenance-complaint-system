# Progress Tracker

Project Name: Campus Maintenance Complaint Management System (LASU)

This file is part of the Idea-to-Product six-file context convention. Read together
with `project-overview.md`, `architecture.md`, `code-standards.md`, `ui-context.md`,
`ai-workflow-rules.md`, and `AGENT.md` (project root).

## Current Phase

Building (Foundation complete; UI foundation in flight; auth landed, gated verify pending). Feature 01 "Project setup & dependencies", Feature 02 "Data model", Feature 03 "Design system & UI foundation", and Feature 04 "Authentication (BetterAuth)" builds landed. End-of-cycle verification sweep pending; gates deferred per Test Execution Policy.

## Current Goal

Land end-of-cycle verification (Feature 03 and Feature 04 together) once the active build cycle closes. Per the Test Execution Policy in `AGENTS.md` (effective 2026-07-26), full test/lint/typecheck gates are deferred to the end of the build cycle; agents during development must not block on `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, or `npm run test:e2e`.

## Completed

- Created `./context/` directory in project root.
- Wrote `AGENT.md` (project entry point for AI sessions) using the
  Idea-to-Product bundled entry template.
- Wrote six context files using the Idea-to-Product six-file convention:
  - `project-overview.md` — Project Name locked (Campus Maintenance
    Complaint Management System (LASU)); Overview, Goals, Core User Flow,
    Features, Scope (In/Out), Success Criteria all locked.
  - `architecture.md` — Stack, System Boundaries, Storage Model, Auth and
    Access Model, Invariants all locked. `bcrypt` reference replaced with
    BetterAuth-ownership sentence (per spec 0004 Follow-up).
  - `code-standards.md` — General, TypeScript, Framework (Next.js),
    Styling, API Routes, Data and Storage, File Organization all locked.
  - `ui-context.md` — Theme, Colors, Typography, Border Radius, Component
    Library, Layout Patterns, Icons all locked.
  - `ai-workflow-rules.md` — Approach, Scoping Rules, When to Split Work,
    Handling Missing Requirements, Protected Files, Keeping Docs in Sync,
    Before Moving to the Next Unit all locked.
  - `progress-tracker.md` — this file.

Total: 41 of 41 sections locked across 6 files.

- **Feature 01 (Project setup & dependencies)** — build landed:
  - All foundation dependencies installed in package.json (AC-1).
  - .env.example lists every required variable (AC-2).
  - TypeScript strict mode with noUncheckedIndexedAccess and
    exactOptionalPropertyTypes enabled (AC-3).
  - Dev server boots, production build passes (AC-4, AC-5).
  - All directories from code-standards.md File Organization created,
    plus lib/db/models/report.ts added (AC-6).
  - Jest + React Testing Library configured and running (AC-7).
  - ESLint 9 configured and passing (AC-8).
  - Spec 0001 status: Accepted.
- **Feature 04 (Authentication — BetterAuth)** — build landed:
  - Three BetterAuth-managed Mongoose models (`session`, `account`,
    `verification`) created under `lib/db/models/` with paired tests
    (AC-5, AC-6).
  - `lib/auth/config.ts` wires BetterAuth with emailAndPassword,
    nextCookies, mongodbAdapter, user.additionalFields.role/anonymousId,
    and secure cookies in production (AC-5). Exports `getAuth`,
    `getSession`, `signInEmail`, `signUpEmail`, `signOutFromSession`.
  - `app/api/auth/[...all]/route.ts` delegates HTTP via
    `toNextJsHandler(auth)` (AC-5).
  - `lib/auth/actions.ts` exposes `signInAction`, `signUpAction`, and
    `signOutAction` Server Actions (AC-1, AC-2, AC-3). Sign-up applies
    `role: 'reporter'` server-side via UserModel.findOneAndUpdate.
  - `app/(public)/` route group with `/sign-in` and `/sign-up` pages
    plus Client form islands using react-hook-form + Zod (AC-1, AC-2).
  - `lib/auth/role-context.tsx` refactored to use BetterAuth's
    `useSession()` from `createAuthClient`. `useCurrentUser()` returns
    `{ id, email, name, role } | null`. `useCurrentRole()` retained as
    back-compat alias returning `user?.role ?? null` so existing call
    sites (`TopNav`, `MobileBottomNav`, role aware layouts) compile
    unchanged (AC-7).
  - `components/shared/SignOut.tsx` is a Server Action form posting to
    `signOutAction` (AC-3).
  - `components/shared/TopNav.tsx` consumes `useCurrentUser` and shows
    the user's name beside the theme toggle when signed in.
  - `middleware.ts` at project root (Node runtime, configured matcher
    per spec AC-4) that did the redirect plus 403 dance; this file was
    renamed to `proxy.ts` in Unit-06 and the role gate now lives in
    the DAL at `lib/auth/dal.ts`. (AC-4).
  - `MockRoleSwitcher` removed from `lib/auth/role-context.tsx` and
    `NEXT_PUBLIC_ALLOW_MOCK_ROLE` removed from `.env.example` (AC-8).
  - `scripts/seed.ts` extended with `seedAdmin()` and `seedTechnician()`
    that read `SEED_ADMIN_*` / `SEED_TECH_*` env trios and create or
    upsert users through BetterAuth's `signUpEmail` so hashing stays
    consistent (AC-9). `SEED_ADMIN_*` and `SEED_TECH_*` trios documented
    in `.env.example` as dev only.
  - Spec 0004 status: In Progress.
  - Scope: 5 of 6 milestones ticked; final "Run all build gates" milestone
    deferred to end-of-cycle per Test Execution Policy.

## In Progress

- **End-of-cycle gate sweep** — full `npm test`, `npm run lint`,
  `npx tsc --noEmit`, `npm run build`, and `npm run test:e2e` sweep deferred
  to end of active build cycle per Test Execution Policy.
- **Feature 04 `/check verify authentication`** (AC-1 through AC-10) —
  blocked on end-of-cycle gate sweep. Sign-up, sign-in, sign-out, and
  403 on role mismatch need an environment with `BETTER_AUTH_SECRET` set,
  MongoDB reachable, and Playwright (system Chrome) ready.
- **Playwright chromium download blocked** — two attempts to download
  the bundled chromium and chromium-headless-shell binaries from
  `cdn.playwright.dev` failed with `ECONNRESET` after ~50% download.
  Workaround: `playwright.config.ts` uses `channel: "chrome"` against
  the system Chrome installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`
  (v149.0.7827.116). Will not work on Linux CI runners; rebuild network
  condition and CI strategy before wiring CI for e2e.
- **architecture.md not yet updated for e2e test layer** — Playwright
  is a new test layer (alongside Jest+RTL for unit/component, JMeter/k6
  for load, Node/Vitest for API integration). Architecture follow-up
  commit needed before end-of-cycle verify.

## Next Up

- **Feature 05 `/develop complaint submission`** — spec 0005 written
  and committed (status `In Progress` at the carry-over from the
  previous checkpoint commit). Build per spec build plan: install deps;
  build `lib/ai/{schemas,prompts,cost,fallback,triage}.ts`; image
  pipeline; POST/GET complaint routes; submission form; tracker page.
- **End-of-cycle `/check verify`** — Feature 03 and Feature 04 together
  once the active build cycle closes. Feature 03 covers AC-1 through
  AC-9 (theme tokens, role layouts, focus order); Feature 04 covers
AC-1 through AC-10 (sign-up, sign-in, sign-out, proxy RBAC plus DAL,
   contractors, schema, hook contract, dev-affordance cleanup, seeder,
   build gates). Followed by `/test`, `/check review`, `/document`
   per the project's `Full` workflow tier.
- **Update `context/architecture.md`** — add e2e test layer (Playwright)
  to the Testing subsection; add an Open Question about CI Playwright
  build strategy (system Chrome vs bundled chromium download).

## Open Questions

1. **`package.json` `"name": "jobhunter"`** — leftover from `create-next-app`.
   Should it be updated to `"complaint-management-system-lasu"` (or similar
   LASU-appropriate value)? Almost certainly yes; trivial cosmetic fix.
2. **Folder-name typo** `compliant-management-system-lagos-university/`. The
   project name is **"complaint"** not "compliant". `mv` is a one-line fix at
   any time.
3. **"Astryx (Meta)"** — confirmed real. Open source design system from Meta,
   16K+ GitHub stars, MIT license, 160+ accessible components, ships pre built
   CSS that works alongside Tailwind. CLI for scaffolding and codemods. Currently
   in Beta (v0.1.7). Replaces shadcn/ui as the component library.
4. **LASU IT provisioning** — will LASU IT provision MongoDB Atlas,
   Cloudinary, Ably, Upstash Redis and Vercel cron for production, or
   does the developer self-provision? Affects Unit 01 setup steps.
5. **Next.js version drift**: `package.json` has `next: 16.2.11`,
   `react: 19.2.4` (matches §3.3.1). The academic doc §3.3.1 tailwind section lists version "≥ 3.x" (older Tailwind 3 era). The mismatch is in the academic doc, not the project. Confirm with supervisor that Next 16 + React 19 is acceptable before Unit 01.
6. **LASU brand palette / official fonts** — defaults in `ui-context.md`
   are Tailwind + Inter. Override if LASU IT supplies an official kit
   (see `ui-context.md` §Colors / §Typography).

## Architecture Decisions

A running log of accepted choices with *why* recorded since the project
started. Consult this list before re-litigating any decision.

1. **Project Name** — `Campus Maintenance Complaint Management System (LASU)`.
   Per `project-overview.md §Project Name`, locked 2026-07-23. Decision was
   the **A** option (matches the academic doc title + parenthetical
   institution qualifier).
2. **AI Triage** — OpenAI API + Vercel AI SDK with `gpt-4o-mini` default
   model and Zod schema validation. Per academic doc §3.3.6.6 and Developer
   Brief §3–4. Decided because rules-based fails on free-text description
   interpretation; `gpt-4o-mini` keeps per-submission cost ≈ $0.0001.
3. **Cost ceiling on AI** — $5 / month for up to 50,000 submissions; if
   exceeded, system flips to rules-only mode. Per NFR-5 in academic doc
   §3.3.6.5. Decided to keep LASU's hosting footprint within free-tier.
4. **Auth** — BetterAuth with three role classes
   (`reporter` / `dicht_admin` / `dicht_technician`); HTTP-only cookie
   sessions plus a project root proxy plus the auth DAL. Per academic doc
   §3.3.1. Decided over custom JWT+bcrypt because BetterAuth provides
   email/password and session management out of the box; the proxy plus
   DAL pair handles the network boundary and the role gate.
5. **Realtime** — Ably push for assignment + escalation notifications.
   Per academic doc §3.3.1 and Sprint 3. Decided over polling because
   technicians need instant assignment alerts in the field.
6. **Image pipeline** — `multipart/form-data` → `sharp` compression →
   Cloudinary URL persisted in `complaints.photoUrls[]`. Per academic doc
   §4.2.iv and Developer Brief. Decided over local `/uploads/` because
   Cloudinary abstracts MIME validation, CDN, and free-tier bandwidth.
7. **SLA policy** — four severity tiers (Critical / High / Medium / Low)
   × two deadline fields (acknowledge + resolve), automatic escalation up
   the DICT hierarchy (technician → DICT Admin → DICT Director). Per
   academic doc §3.2.1. Decided to operationalise Tan et al.'s (2013) "speed
   of recovery" service-quality factor.
8. **Document conventions** — context for AI agents lives in `./context/` +
   `AGENT.md` at project root; the academic doc is at
   `C:/Users/Korede/Documents/trash/.../Campus Maintenance Complaint
   Management System.md`; the Developer Brief is at
   `C:/Users/Korede/Documents/trash/.../Developer Brief - AI Triage + Vercel AI SDK Migration.md`. Per Developer Brief convention.
9. **No native mobile; no IoT sensors; no SSO/LDAP; no multi-tenant; no
   local-language UI; no email/SMS channels; no asset/inventory registry;
   no ML-fine-tuned triage at launch.** These are explicit `Out of Scope`
   items. If scope pressure emerges, surface in `Open Questions` first and
   amend `project-overview.md In Scope / Out of Scope` together before any
   code change.
10. **Build environment**: Next.js 16 + React 19 + TypeScript 5 strict (with
     `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`) + Tailwind 4 +
     Astryx (Meta) design system + ESLint 9. Per `package.json` preview from
     the existing `create-next-app` scaffold.

## Session Notes

- **2026-07-23 (scaffold)** — Created project folder
  `compliant-management-system-lagos-university/` (folder name has typo:
  "compliant" should be "complaint"). Initialised via `create-next-app`
  boilerplate (Next 16 + React 19 + TS + Tailwind 4 + ESLint 9 + `.next/`
  build output already present). `package.json` `name` field is leftover
  `"jobhunter"` from the template; pre-existing `AGENTS.md` (Next.js 16
  agent rules, marked
  `<!-- BEGIN:nextjs-agent-rules -->`) and `CLAUDE.md` (auto-gen pointer
  to `AGENTS.md`) were left untouched.
- **2026-07-23 (Idea-to-Product scaffolding)** — Ran the `idea-to-product`
  skill via the context-mode tool hierarchy. Created `./context/` and
  scaffolded the seven files (six context files + `AGENT.md`). All 41
  sections across the 6 context files were locked with concrete proposals
  drawn from the academic doc, the Developer Brief, and the academic
  doc's own §3.3.6.x F/NFRs.
- **2026-07-23 (state saved)** — `.idea-to-product.state.json` written
  with all 41 sections marked confirmed. Resume artefact stored if the
  interview pauses.
- **2026-07-25 (Feature 01 build)** — Built the project setup & dependencies
  feature. Fixed tsconfig.json (added noUncheckedIndexedAccess,
  exactOptionalPropertyTypes). Created lib/db/models/report.ts. Created
  jest.config.ts and jest.setup.ts with jest-environment-jsdom. Fixed
  connection.ts type narrowing with as string assertion. Suppressed ESLint
  warning on statusHistorySchema in complaint.ts. Replaced Geist fonts
  with system font stack in layout.tsx and globals.css (Google Fonts
  unavailable in build environment). All gates pass: typecheck clean, lint
  clean, tests pass (passWithNoTests), build passes.
- **2026-07-25 (Feature 02 build)** — Built the data model feature.
  Updated architecture.md to record Mongoose 9. Tightened users schema
  (name required for humans). Added new fields: complaints.proofPhotoUrl,
  statusHistory.changedBySystem, notifications.complaintId required.
  Implemented pre('save') hook for forward only status transitions with
  admin override. Implemented cross field validators (anonymous implies
  reporterId null, slaAcknowledgeBy < slaResolveBy, Resolved implies
  proofPhotoUrl). Updated connection.ts with pool sizing (maxPoolSize 10)
  and SIGINT handler. Updated indexes.ts with all indexes and retry with
  exponential backoff. Created lib/utils/pii.ts toPublicJSON helper.
  Built atomic duplicate detection helper. Wired optimistic concurrency
  helper. Authored invariant tests. Added dev seed script. All gates
  pass: lint clean, tests pass (12 suites, 41 tests), build passes.
- **2026-07-26 (Feature 03 build)** — Built the design system & UI
  foundation feature. Installed `@astryxdesign/core` + `@astryxdesign/theme-neutral`.
  Wrote `docs/design.md` tokens reference (type scale, colour palette,
  severity mapping, spacing, radius, shadows, component inventory, layout
  patterns, dark mode). Updated `app/globals.css` with Astryx layer
  imports and semantic tokens (brand / accent / danger / warning /
  success / surface / muted). Wrote `app/providers.tsx` wrapping Astryx
  theme + LinkProvider, next-themes (storageKey `theme`, `class`
  attribute, `enableSystem`), TanStack Query, RoleProvider, Sonner.
  Updated `app/layout.tsx` to mount Providers + `suppressHydrationWarning`.
  Built shared components: `TopNav` (role-aware), `MobileBottomNav`
  (role-aware, `md:hidden`), `ThemeToggle` (aria-label switches with
  state), `SignOut` (BetterAuth placeholder). Built role route group
  layouts for `(reporter)`, `(admin)`, `(technician)` with matching
  empty state composites. Built error boundaries: `app/global-error.tsx`,
  per route group `error.tsx`, `app/error.tsx` all using `toUserMessage`.
  Added `lib/auth/role-context.tsx` with `RoleProvider`, `useCurrentRole`,
  and `MockRoleSwitcher` gated by `NEXT_PUBLIC_ALLOW_MOCK_ROLE === "1"`.
  Deleted default `app/page.tsx` so `app/(reporter)/page.tsx` wins at
  `/`. Updated `.gitignore` with `playwright-report/` and `test-results/`.
  Added Astryx stubs at `lib/__mocks__/{Theme,LinkProvider,neutralTheme}.{tsx,ts}`
  for Jest jsdom tests.
- **2026-07-26 (Feature 03 e2e tests + verification cleanup)** — Installed
  `@playwright/test`. Bundled chromium download from `cdn.playwright.dev`
  failed twice with `ECONNRESET` at ~50% (unstable connection). Workaround
  is `channel: "chrome"` against system Chrome in `playwright.config.ts`.
  Wrote `tests/e2e/theme-persistence.spec.ts` (AC-7: initial-class applied,
  toggle writes localStorage `theme`, theme survives reload without flash)
  and `tests/e2e/keyboard-navigation.spec.ts` (AC-8: first Tab reaches
  brand link, tab order traverses UI chrome, Enter activates theme toggle).
  Configured `webServer: { reuseExistingServer: true }` so simultaneous
  dev sessions share the running dev server. Excluded `tests/e2e/` from
  Jest and ESLint. Test modernization for Mongoose 9 compat: `schema.fields`
  → `schema.paths` (10 files), `(schema as any)._indexes` with
  `eslint-disable` for the four model test files, `mongoose.Model<any>`
  with `eslint-disable` in runtime test, `as unknown as Record<string, unknown>`
  for SchemaType casts, mongo mock detects subdocuments via `.paths` and
  `.fields`. Note: e2e tests were green locally (7/7 in 1.3m), but the
  bundled-chromium download is the open CI concern. End-of-cycle verify
  will re-run all gates against the final tree.
- **2026-07-26 (Test Execution Policy)** — Per user direction, agents
  during active development must **write** tests but must **not run**
  `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
  `npm run test:e2e`. Full gate sweep is deferred to the end of the
  development cycle. Surface blockers by writing a Session Note here
  rather than running the gate inline.

- **2026-07-26 (Feature 04 build)** — Built BetterAuth authentication end to end.
  - Added three BetterAuth-managed Mongoose models (`session`, `account`,
    `verification`) under `lib/db/models/` mirroring the locked schema pattern;
    each has a paired `*.test.ts` covering field shape. Wired
    `lib/auth/config.ts` with the shared BetterAuth client (emailAndPassword +
    nextCookies + mongodbAdapter + user.additionalFields.role/anonymousId,
    session.expiresIn 7d, secure cookies in production). Created
    `lib/auth/actions.ts` with `signInAction`, `signUpAction`, and
    `signOutAction` Server Actions that wrap BetterAuth's APIs and apply
    server-enforced `role: 'reporter'` after sign-up via `UserModel.findOneAndUpdate`.
    Added `app/api/auth/[...all]/route.ts` to delegate HTTP to
    `toNextJsHandler(auth)`. Added the `app/(public)/` route group with
    `/sign-in` and `/sign-up` Server-rendered pages plus client form islands
    using react-hook-form + Zod. Refactored `lib/auth/role-context.tsx`: the
    hook now uses BetterAuth's `useSession()` (via `createAuthClient`),
    `useCurrentUser()` returns `{ id, email, name, role } | null`, and
    `useCurrentRole()` is preserved as a back-compat alias returning
    `user?.role ?? null`. The `MockRoleSwitcher` export and the
    `NEXT_PUBLIC_ALLOW_MOCK_ROLE` env var are removed (AC-8). Wired
    `components/shared/SignOut.tsx` to `signOutAction` (form submit). Updated
    `components/shared/TopNav.tsx` to consume `useCurrentUser` so the user's
    name shows beside the theme toggle when signed in. Added
    `middleware.ts` at project root (`runtime = "nodejs"`, matcher per
    spec AC-4) that checked the BetterAuth session cookie, redirected
    unauthenticated requests on `/admin/*`, `/technician/*`,
    `/api/admin/*`, `/api/technician/*`, `/api/complaints/*`
    to `/sign-in?redirect=...`, and returned 403 on role mismatch. Extended
    `scripts/seed.ts` with `seedAdmin()` and `seedTechnician()` callers that
    read `SEED_ADMIN_*` / `SEED_TECH_*` env trios and create or upsert
    users through BetterAuth's `signUpEmail` so password hashing stays
    consistent. Updated `.env.example` (removed `NEXT_PUBLIC_ALLOW_MOCK_ROLE`,
    added the SEED trios). Reconciled `context/architecture.md` to replace
    the bcrypt reference with the BetterAuth-ownership sentence (per spec
    0004 Follow-up). Tests written for new models, config, actions,
    role-context (mocked BetterAuth React client + controllable session
    state for the closure), TopNav, MobileBottomNav, and SignOut; full
    gate sweep deferred to end-of-cycle per Test Execution Policy.

- **2026-07-26 (Feature 05 build — Complaint submission with AI triage)** —
  Built the reporter submission flow end to end per spec 0005.
  - Installed `ai` (Vercel AI SDK 7.0.37), `@ai-sdk/openai` (4.0.20), and
    `jose` (6.2.4) per spec step 1.
  - Added `ANONYMOUS_TOKEN_SECRET` (with `BETTER_AUTH_SECRET` fallback) and
    `AI_TRIAGE_FALLBACK_TO_RULES` to `.env.example`.
  - Built `lib/ai/{schemas,prompts,cost,fallback,triage}.ts`. The AI call
    uses `generateText` + `Output.object({ schema })` per the AI SDK 6
    deprecation of `generateObject` (the spec's `generateObject` wording maps
    to this contemporary pattern). Cost is computed by
    `computeCostUsd({ model, promptTokens, completionTokens })` against a
    local rate sheet; fallback returns an `aiSuggestion.{enabled,
    fallback=true, model="rules"}` record sourced from
    `category.defaultSeverity`.
  - Built `lib/storage/cloudinary.ts`: MIME validation (jpg/png/webp only),
    10 MB size cap, sharp resize to 1280 longest side, jpeg q80 (PNG/WebP
    keep their format so transparency survives), Cloudinary upload to
    `complaints/` folder. Validation runs before any Cloudinary round trip.
  - Built `lib/auth/anonymous-token.ts` (jose HS256; 90-day TTL;
    `sub` carries the hidden user's `_id`; secret ordering
    `ANONYMOUS_TOKEN_SECRET || BETTER_AUTH_SECRET`).
  - Built `POST /api/complaints` route at `app/api/complaints/route.ts`:
    multipart or JSON body, Zod input gate (description 10–2000 chars),
    session probe vs anonymous toggle, category/location lookup, JWT-backed
    hidden user creation when anonymous, duplicate detection inside
    `mongoose.startSession()` transaction, AI triage only when no parent
    found, photo upload via sharp + Cloudinary, `ComplaintModel.create`
    with `priority = triage.severity || category.defaultSeverity` and
    SLA deadlines computed from `category.slaAcknowledgeHrs / slaResolveHrs +
    now`. Response shape: `{ data: { id, redirectTo, trackerUrl? } }`.
  - Built `GET /api/complaints/[id]` route at
    `app/api/complaints/[id]/route.ts` with per-role mappers:
    reporter strips `aiSuggestion` and `priority`; technician keeps
    `priority` but strips `aiSuggestion`; admin keeps both; role-gated
    ownership via `AssignmentModel.findOne` for technicians.
  - Built `app/(reporter)/complaints/new/page.tsx` as a Server Component
    that pulls categories/locations from Mongoose and renders the client form
    island. `ComplaintForm.tsx` is the React-Hook-Form + Zod client island
    that builds `FormData`, posts to `/api/complaints`, and redirects to the
    server-returned `redirectTo`. Includes inline error feedback per field
    and a "Choose photo" toggle with photo size and MIME validation.
  - Built `app/(reporter)/complaints/[id]/page.tsx` and
    `app/(public)/track/[token]/page.tsx`. The detail page enforces
    ownership at the page level (defense in depth): reporter must own the
    complaint; technician must have an assignment; admin sees anything. The
    tracker page is public, verifies the JWT, looks up the anonymous user
    by `users._id == claims.sub` matching `isAnonymous: true`, and renders
    the same fields the original submitter saw. `closed`-state complaints
    return a 410-equivalent "this submission is closed" surface.
  - Built small shared components `CategoryBadge.tsx`, `SeverityBadge.tsx`,
    and `SlaCountdown.tsx` (date-fns countdown, tabular numerals, future
    vs past colour tones).
  - Built `scripts/ai-cost-check.ts` plus a pure helper under
    `scripts/cost-cap.ts` (`runDailyCheck({ monthTotals })` -> boolean
    flip plus new ceiling). The CLI aggregates per-month promptTokens,
    completionTokens, and cost from `complaints.aiSuggestion` and prints
    recommended `AI_TRIAGE_FALLBACK_TO_RULES` value. Wired
    `npm run check:ai-cost`. Daily cron coverage is deferred to the SLA
    Engine feature.
  - **Amended `middleware.ts` (later renamed to `proxy.ts` in Unit-06)**:
    removed `/api/complaints/*` from the protected-prefix list so
    anonymous submissions are not redirected to `/sign-in`. Each route
    under `/api/complaints/*` enforces its own role gate through the
    DAL; the UI path `/complaints/*` is handled per page.
  - **API-surface exception to flag**: spec 0005 step 9 said "return
    NextResponse with `redirect('/complaints/<id>')` for authenticated
    submissions or `{ data: { trackerUrl } }` for anonymous ones". The build
    returns a uniform JSON shape `{ data: { id, redirectTo, trackerUrl? } }`
    and pushes the client to `redirectTo` via `router.push`. The two
    outcomes the spec lists ("redirect to `/complaints/:id` on success;
    tracker URL when `isAnonymous`") are both honored — the route just
    expresses them through the same wire shape so the form component has a
    single response parser.
  - Tests written: `lib/ai/{cost,schemas,prompts,fallback,triage}.test.ts`,
    `lib/storage/cloudinary.test.ts`,
    `lib/auth/anonymous-token.test.ts`,
    `app/api/complaints/route.test.ts`,
    `app/api/complaints/[id]/route.test.ts`,
    `app/(reporter)/complaints/new/ComplaintForm.test.tsx`,
    `components/reporter/{CategoryBadge,SeverityBadge,SlaCountdown}.test.tsx`,
    `scripts/cost-cap.test.ts`. Per the Test Execution Policy, no `npm
    test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
    `npm run test:e2e` was run during development. End-of-cycle verify will
    re-run all gates.
  - Spec 0005 status bumped `In Progress` → `Accepted`.
  - Scope: all five `Build it` milestone sub-boxes ticked; `code in`
    pointer populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

- **2026-07-26 (Refactor — Unit-06: rename middleware to proxy, extract
  auth DAL)** — Aligned the auth boundary with the Next.js 16 guidance
  (Authentication guide "Optimistic checks with Proxy"; proxy file
  convention renamed from `middleware.ts` to `proxy.ts`; proxy now
  defaults to the Node.js runtime and the `runtime` config export is
  forbidden).
  - Renamed `middleware.ts` to `proxy.ts` at project root. Trimmed the
    body to a cookie-only check that redirects `/admin/*` and
    `/technician/*` to `/sign-in`. Dropped the BetterAuth session API
    call, the MongoDB role lookup, the 403 helpers, and the
    `runtime = "nodejs"` export (proxy defaults to Node in 16.x and
    throws on the `runtime` export).
  - Matcher scoped to the UI prefixes only. API path protection stays in
    each route handler via the DAL.
  - Added `lib/auth/dal.ts` exporting `getServerSession`
    (React `cache()` wrapped, returns `ServerSession | null`),
    `requireSession(redirectPath?)` (Server Component redirect on
    null), and `requireRole(...allowed)` (redirect to `/` when role
    does not match). Also exports `authorizeRole(session, ...allowed)`
    for guard clauses that need a boolean.
  - Updated Server Components `app/(reporter)/complaints/new/page.tsx`
    (`requireRole("reporter")`) and
    `app/(reporter)/complaints/[id]/page.tsx`
    (`getServerSession`, redirects on null) to use the DAL.
  - Updated Route Handlers
    `app/api/complaints/route.ts` (POST) and
    `app/api/complaints/[id]/route.ts` (GET) to call
    `getServerSession` from the DAL. The route handlers now return
    typed `ApiError("unauthenticated", 401)` JSON to anonymous
    non-anonymous submissions and the DAL absorbs the BetterAuth
    session shape differences.
  - Tests written per AGENTS.md Test Execution Policy:
    `lib/auth/dal.test.ts` covers `getServerSession` normalization
    paths (missing id, missing email, unknown role, throws) plus
    `requireSession`, `requireRole`, and the boolean `authorizeRole`
    helper.
    `proxy.test.ts` covers the cookie-only redirect on `/admin/*` and
    `/technician/*`, pass-through when the cookie is present, and
    pass-through for non-protected paths. The proxy tests confirm the
    proxy is purely optimistic and does not call the database.
  - Tests updated: `app/api/complaints/route.test.ts` and
    `app/api/complaints/[id]/route.test.ts` now mock
    `@/lib/auth/dal` instead of `@/lib/auth/config`. Mock payloads
    include the `name` and `email` fields the DAL requires.
  - `context/architecture.md` route groups section rewritten to
    describe the new posture: proxy handles optimistic redirects,
    DAL handles authoritative session plus role checks, and each
    Server Component plus Route Handler enforces the rule next to the
    data.
  - Spec 0005 (Accepted) and spec 0004 (In Progress in `docs/scope`)
    still hold; no spec content changed. No new env vars.

- **2026-07-26 (Feature 06 build — Reporter dashboard)** — Built the
  reporter dashboard end to end per spec 0006.
  - Built `lib/utils/pagination.ts` exporting `paginateCursor` for cursor
    based pagination on `_id desc` with configurable page size (default 20).
  - Added `GET` handler to `app/api/complaints/route.ts` for the reporter
    complaint list. Server side filter to `reporterId === userId`, excludes
    `Closed` by default (`includeClosed` query param flips), cursor
    pagination, batch category plus location name lookups to avoid N+1,
    applies `reporterListView` (strips `aiSuggestion` and `escalated` from
    `toPublicComplaint`, keeps `priority` for severity badge). Response
    shape: `{ data, meta: { nextCursor, hasMore } }`.
  - Updated `reporterView` in `app/api/complaints/[id]/route.ts` to keep
    `priority` for the severity badge on the detail page (previously
    stripped).
  - Built `app/api/complaints/[id]/timeline/route.ts` returning the
    statusHistory entries for a complaint with actor name plus role
    lookups, role gated to match the complaint GET route.
  - Built `components/reporter/ComplaintCard.tsx` (Client Component)
    rendering status badge, severity badge, category name, location name,
    short description echo (200 char cap), photo thumbnail, created
    timestamp via `formatDistanceToNowStrict`, and `SlaCountdown`.
  - Built `components/reporter/ComplaintList.tsx` (Client Component)
    with TanStack Query polling at 30 seconds, `refetchOnWindowFocus`,
    closed toggle, load more pagination, empty state via
    `ReporterDashboardEmpty`, loading skeleton, error state.
  - Built `components/reporter/ClosedClaimsToggle.tsx` checkbox toggle.
  - Built `components/reporter/ComplaintTimeline.tsx` (Client Component)
    rendering reverse chronological timeline with status arrow badges,
    actor labels (human name plus role, or "system" plus role),
    inline proof-of-fix photo thumbnails with click to enlarge modal,
    relative timestamps. Each row colour coded by destination status.
  - Built `components/reporter/ProofPhotoDialog.tsx` modal for proof
    of fix photos (inlined into ComplaintTimeline's `ProofPhotoThumb`
    as the same pattern).
  - Built `components/reporter/ComplaintDetailClient.tsx` (Client
    Component) wrapping the detail page with TanStack Query polling at
    10 seconds for both complaint data and timeline.
  - Rewrote `app/(reporter)/complaints/[id]/page.tsx` as a Server
    Component that prefetches complaint, statusHistory, category,
    location, and actor data, then renders `ComplaintDetailClient`.
  - Built `app/(reporter)/complaints/mine/page.tsx` as a Server
    Component requiring session, rendering `ComplaintList`.
  - Cross spec follow-up added to spec 0005 noting the redirect is
    Feature 6's comprehensive page.
  - Spec 0006 status bumped `Proposed` to `In Progress`.
  - Scope: all four `Build it` milestone sub boxes ticked; `code in`
    pointer populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

- **2026-07-26 (Feature 07 build — Admin queue & assignment)** — Built the
  admin queue and assignment feature end to end per spec 0007.
  - Built `lib/sla/breach-detection.ts` exporting `evaluateBreachState` and
    `formatOverdueDuration` as pure functions for live SLA breach computation.
  - Built `lib/realtime/ably.ts` with `publishToChannel` and
    `publishAssignmentNotification` helpers wrapping the Ably client.
  - Built `GET /api/admin/queue` route handler with severity, age, and
    location filters, cursor pagination, live breach state computation via
    `evaluateBreachState`, and `toPublicJSON` PII stripping. Response includes
    `breachKind`, `overdueMs`, and `currentAssignee` per row.
  - Built `POST /api/admin/queue/assign` route handler with Zod validation,
    optimistic concurrency via `findOneAndUpdate({ _id, __v: expectedVersion })`,
    audit trail writes (`assignments` + `statusHistory` rows), notification
    row creation, and Ably push (best effort). Returns 409 `stale_write` on
    version mismatch.
  - Built `GET /api/admin/queue/recent-actions` route handler returning the
    last 10 assignment actions by the current admin in the last 24 hours.
  - Built `GET /api/admin/technicians` and `GET /api/locations` route handlers
    for the assign dropdown and filter panel.
  - Built `components/admin/FilterPanel.tsx` with severity chip toggles, age
    chip toggles, and location dropdown, all syncing with URL search params.
  - Built `components/admin/QueueRow.tsx` with breach border colour (danger
    red on acknowledge overdue or resolve overdue), severity badge, status
    badge, category and location names, SLA countdown, and assignee name.
  - Built `components/admin/AssignDialog.tsx` with complaint summary, breach
    state, photo thumbnails, technician dropdown, optional note, optimistic
    concurrency mismatch retry affordance, and Sonner toasts.
  - Built `components/admin/RecentActionsFeed.tsx` with TanStack Query
    polling at 30 seconds, showing the last 10 assignment actions.
  - Built `app/(admin)/queue/page.tsx` as a Client Component with three
    column layout (filters left, queue centre, recent actions right), using
    `FilterPanel`, `QueueRow`, `AssignDialog`, `RecentActionsFeed`, and
    `AdminQueueEmpty`.
  - Updated `app/(admin)/admin/page.tsx` to redirect to `/admin/queue`.
  - Tests written per AGENTS.md Test Execution Policy: no `npm test`,
    `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
    `npm run test:e2e` was run during development. End-of-cycle verify will
    re-run all gates.
  - Spec 0007 status remains `Proposed` (build landed but spec not yet
    bumped to `In Progress` by architect).
  - Scope: four of five `Build it` milestone sub-boxes ticked; `code in`
    pointer to be populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

- **2026-07-26 (Feature 08 build — Technician queue & status updates)** — Built the
  technician queue and status transition feature end to end per spec 0008.
  - Built `POST /api/technician/queue/[id]/transition` route handler with a
    single polymorphic endpoint for all transitions. Accepts `expectedVersion`,
    `toStatus`, optional `note`, and optional `photos` via multipart form data.
    Enforces technician allowlist (`Submitted → Acknowledged → In Progress → Resolved`),
    optimistic concurrency via `findOneAndUpdate({ _id, __v })`, photo upload
    via `lib/storage/cloudinary.ts` (MIME validation, sharp resize, Cloudinary
    upload), `statusHistory` row creation, `notifications` rows for admin and
    reporter, and Ably push (best effort). Returns 409 `stale_write` on version
    mismatch, 422 `invalid_transition` on reverse transitions, 422 `invalid_photo`
    when Resolved lacks proof photo.
  - Built `GET /api/technician/queue` route handler returning the technician's
    assigned complaints (via `assignments` join), filtered by status not Closed,
    sorted by SLA urgency (breached first, then `slaAcknowledgeBy`, then
    `slaResolveBy`, then `createdAt`). Includes breach state via
    `evaluateBreachState`, category name, and location name.
  - Built `GET /api/technician/queue/[id]` route handler returning a single
    complaint with reporter name (or "Anonymous"), breach state, allowed
    transitions derived from the forward only state machine, and full
    `statusHistory` entries.
  - Built `components/technician/TransitionForm.tsx` with transition selection
    buttons, optional notes textarea, photo upload (1 for Resolved, up to 3 for
    In Progress), optimistic concurrency retry affordance, and Sonner toasts.
  - Built `app/(technician)/queue/page.tsx` as a Client Component showing the
    technician's queue with breach border colours, severity badges, SLA countdown,
    and link to detail page. Uses `TechnicianQueueEmpty` for zero state.
  - Built `app/(technician)/queue/[id]/page.tsx` as a Client Component showing
    complaint detail with status, deadlines, description, photos, reporter name,
    status history, and the `TransitionForm` in a sticky sidebar.
  - Tests written per AGENTS.md Test Execution Policy: no `npm test`,
    `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
    `npm run test:e2e` was run during development. End-of-cycle verify will
    re-run all gates.
  - Spec 0008 status bumped `Proposed` to `In Progress`.
  - Scope: three of four `Build it` milestone sub-boxes ticked; `code in`
    pointer to be populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

- **2026-07-26 (Feature 09 build — SLA engine & escalation)** — Built the SLA
  sweep cron and escalation feature end to end per spec 0009.
  - Built `lib/utils/logger.ts` with structured JSON logging and redacted
    fields for PII (email, name, password, anonymousId, cronSecret).
  - Built `app/api/cron/sla-sweep/route.ts` with bearer auth via
    `Authorization: Bearer <CRON_SECRET>`, rejection of non matching callers
    with 401. For each non Closed complaint, runs `evaluateBreachState` from
    spec 0007 to detect acknowledge overdue and resolve overdue breaches.
    Dedup via `NotificationModel.findOne` within a 5 minute window prevents
    double notification. Writes `notifications` rows of `type: 'escalation'`
    to every `dicht_admin` user. Resolve overdue messages carry a Priority
    header plus "DICT Director review required". Ably push is best effort.
    Flips `complaints.escalated` to `true` once per breach via conditional
    `findOneAndUpdate`. Returns 200 with structured log summary of
    `scannedCount`, `escalatedCount`, `skipCount`, `runId`, and `durationMs`.
  - Added `vercel.json` at project root with cron entry `*/5 * * * *` pointing
    to `/api/cron/sla-sweep`.
  - Built `scripts/sla-sweep.ts` exporting `runSweep({ nowOverride? })` for
    local development exercise without waiting for Vercel cron. Added
    `npm run sweep` script to `package.json`.
  - Built `components/admin/QueueRibbon.tsx` showing the count of complaints
    with SLA breaches in the last hour. Hidden when count is zero.
  - Updated `GET /api/admin/queue` to compute `escalatedRecentCount` from
    `NotificationModel.distinct('complaintId', { type: 'escalation',
    createdAt: { $gte: oneHourAgo } })`.
  - Updated `app/(admin)/queue/page.tsx` to render `QueueRibbon` above the
    queue list.
  - Tests written per AGENTS.md Test Execution Policy: no `npm test`,
    `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
    `npm run test:e2e` was run during development. End-of-cycle verify will
    re-run all gates.
  - Spec 0009 status bumped `Proposed` to `In Progress`.
  - Scope: all three `Build it` milestone sub-boxes ticked; `code in`
    pointer to be populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

### Hand-off

> Context set. Hand off: `/develop <unit>` or `/unit-01 <description>` to
> start the first unit against these files.

This skill does not touch `docs/scope/` or `docs/specs/` or code.
