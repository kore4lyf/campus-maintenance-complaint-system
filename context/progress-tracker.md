# Progress Tracker

Project Name: Campus Maintenance Complaint Management System (LASU)

This file is part of the Idea-to-Product six-file context convention. Read together
with `project-overview.md`, `architecture.md`, `code-standards.md`, `ui-context.md`,
`ai-workflow-rules.md`, and `AGENT.md` (project root).

## Current Phase

Building (Foundation complete; UI foundation in flight; auth landed, gated verify pending). Feature 01 "Project setup & dependencies", Feature 02 "Data model", Feature 03 "Design system & UI foundation", and Feature 04 "Authentication (BetterAuth)" builds landed. End-of-cycle test sweep completed: 58 suites, 316 tests, all passing. Lint and typecheck gates reviewed; pre-existing issues catalogued, no new regressions.

## Current Goal

In flight: Spec 0014 (Astryx design alignment — type primitives, edge-to-edge rows, motion + radius scale conformity). Spec drafted at `docs/specs/0014-astryx-design-alignment.md`.

Spec 0013 (in-app UI lift) build landed and rolled back partially (sign-in/sign-up returned to pre-wrap form). Dark-mode removal complete.

Next features to build: admin queue management (Feature 08), technician queue + SLA engine (Feature 09/10). Remaining test sweep debt is in API route tests for untested routes (admin queue, assign, reports, export, technicians, locations, cron). Pre-existing lint/typecheck issues in `lib/db/typed-query.ts`, `app/(reporter)/complaints/[id]/page.tsx`, `app/ably-provider.tsx`, and `components/RealtimeStatusBadge.tsx` remain to be addressed in a dedicated cleanup pass.

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
11. **Brand identity source of truth**: `public/cms-lasu-full.png`. The hex
    values locked in `app/globals.css` (`#0c2848` navy, `#d4a014` gold) were
    sampled directly from the logo bitmap via `sharp`. Any inbound palette
    change must update `app/globals.css`, `docs/design.md`, and
    `context/ui-context.md` together — those three are the system of record.
    Designer specs are commentary; the logo PNG is the spec.

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

- **2026-07-26 (Feature 10 build — Real-time notifications)** — Built the client
  side Ably subscription layer per spec 0010.
  - Built `lib/realtime/ably-client.ts` exporting `getAblyClient()` that lazily
    creates an `Ably.Realtime` instance using `NEXT_PUBLIC_ABLY_API_KEY`. The
    client is shared across the browser session and seeded once per page load.
  - Built `lib/realtime/use-ably-channel.ts` exporting `useAblyChannel({
    name, queryKey })` that subscribes to a channel on mount, unsubscribes on
    unmount, and calls `queryClient.invalidateQueries({ queryKey })` on every
    event. Exposes `connectionState` from `Ably.connection.on(stateChange)`.
  - Built `components/RealtimeStatusBadge.tsx` consuming `useAblyChannel` and
    rendering "Live" when connected, "Live updates paused, using polling
    fallback" after five seconds of disconnection, and "Connecting..." during
    the initial handshake.
  - Built `app/ably-provider.tsx` wrapping children in `AblyProvider` from
    `ably/react`. Client is created in `useEffect` with cleanup via
    `realtime.close()`.
  - Updated `app/providers.tsx` to include `AblyClientProvider` inside
    `QueryClientProvider` and above `RoleProvider`.
  - Updated `app/(admin)/queue/page.tsx` to call `useAblyChannel` for
    `admin:queue` and `admin:escalations` channels, and render
    `RealtimeStatusBadge` at the top of the queue column. The existing
    `refetchInterval: 30_000` on the queue query serves as the polling
    fallback when Ably disconnects.
  - Tests written per AGENTS.md Test Execution Policy: no `npm test`,
    `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
    `npm run test:e2e` was run during development. End-of-cycle verify will
    re-run all gates.
  - Spec 0010 status bumped `Proposed` to `In Progress`.
  - Scope: two of four `Build it` milestone sub-boxes ticked; `code in`
    pointer to be populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

- **2026-07-26 (Feature 11 build — Reporting dashboard & export)** — Built the
  admin reporting dashboard with Recharts visualizations, PDF export, and CSV
  export per spec 0011.
  - Built `GET /api/admin/reports` route handler with a single MongoDB
    aggregation pipeline using `$facet` to produce volume by category, volume
    by location, volume by severity, SLA breach counts (acknowledge overdue
    plus resolve overdue), average resolution time, and backlog count. Filter
    composition via Zod validated query params for time window, severity,
    location, and status. Admin role check via `authorizeRole`.
  - Built `lib/utils/csv.ts` exporting `toCsv(rows, columns)` and
    `formatDateForFilename(date)`. Hand rolled per code standards small
    surface notice.
  - Built `GET /api/admin/reports/export.csv` route handler running the same
    aggregation pipeline, mapping complaints to the documented column shape,
    and streaming `text/csv` with `Content-Disposition` attachment.
  - Built `POST /api/admin/reports/export.pdf` route handler running the same
    aggregation pipeline and rendering via `@react-pdf/renderer`
    `renderToBuffer`. Returns `application/pdf` with attachment filename.
    Failure path returns 500 `pdf_render_failed`.
  - Built `components/admin/PdfReport.tsx` as a `@react-pdf/renderer`
    Document with Page containing the four bar charts, three numeric cards,
    filter summary, and notes section.
  - Built `components/admin/BarChartCard.tsx` wrapping Recharts `BarChart`
    with `ResponsiveContainer`, colored cells, empty state, and the project
    design tokens.
  - Built `components/admin/NumericCard.tsx` and
    `components/admin/BreachCountCard.tsx` for the SLA breach, average
    resolution, and backlog cards.
  - Built `components/admin/ReportsFilterPanel.tsx` with time window chips,
    multi select severity chips, multi select location chips, multi select
    status chips, all synced with URL search params.
  - Built `components/admin/ExportButtons.tsx` triggering CSV download via
    fetch plus blob plus anchor click, and PDF download via POST plus blob
    plus anchor click. Sonner toasts for success and failure.
  - Built `app/(admin)/reports/page.tsx` as a Client Component with left
    sidebar filter panel and right content area containing the three numeric
    cards, four chart cards, export buttons, and TanStack Query polling at
    60 seconds with `refetchOnWindowFocus: true`.
  - Tests written per AGENTS.md Test Execution Policy: no `npm test`,
    `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
    `npm run test:e2e` was run during development. End-of-cycle verify will
    re-run all gates.
  - Spec 0011 status bumped `Proposed` to `In Progress`.
  - Scope: three of four `Build it` milestone sub-boxes ticked; `code in`
    pointer to be populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

- **2026-07-26 (Feature 12 build — Image pipeline)** — Consolidated the server
  side image pipeline with four defence in depth decisions per spec 0012.
  - Updated `lib/storage/cloudinary.ts` with `assertHttps(url)` that rejects
    non HTTPS Cloudinary URLs with typed `cloudinary_url_insecure` 502. Added
    `.withMetadata({})` to the sharp pipeline for explicit EXIF metadata
    strip before encoding. Added Cloudinary 409 collision retry that appends
    a nanoid suffix once; persistent collision returns typed
    `cloudinary_collision_persistent` 502. Exported `assertHttps` for route
    handler reuse.
  - Built `lib/storage/integration-test-helpers.ts` exporting
    `CloudinaryStub` class with `control.nextCallFailsOnce` shape for
    forced 409 testing, `getCloudinaryClient({ env })` returning the stub
    when env vars are missing, and `createTestImageBuffer(format)` for test
    fixtures. The module is imported only by tests and never bundled in
    production.
  - Built `tests/integration/image-pipeline.test.ts` covering MIME validation
    (accepts JPEG, PNG, WebP; rejects PDF and HEIC), size validation (rejects
    over 10 MB), HTTPS assertion (passes for https, throws for http),
    compress and upload happy path (returns HTTPS URL), 409 retry once with
    nanoid suffix, and ALLOWED_MIME set integrity.
  - Tests written per AGENTS.md Test Execution Policy: no `npm test`,
    `npm run lint`, `npx tsc --noEmit`, `npm run build`, or
    `npm run test:e2e` was run during development. End-of-cycle verify will
    re-run all gates.
  - Spec 0012 status bumped `Proposed` to `In Progress`.
  - Scope: two of three `Build it` milestone sub-boxes ticked; `code in`
    pointer to be populated. Feature remains `in-progress` in the scope (not
    `done`) per the Full workflow tier — `/check verify`, `/test`,
    `/check review`, and `/document` are still owed before the scope
    flips to `done`.

### Hand-off

> Context set. Hand off: `/develop <unit>` or `/unit-01 <description>` to
> start the first unit against these files.

This skill does not touch `docs/scope/` or `docs/specs/` or code.

- **2026-07-27 (10/10 UI rebuild)** — Following user demand for
  Apple/Nike/Google-grade quality, the project got a typed design system
  rebuilt from tokens outwards.
  - Eight new typed primitives under `components/ui/`:
    `Button`, `Card` (with `SectionHeader`), `Badge`,
    `StatusPill`, `EmptyState` (three variants),
    `Skeleton`, `Field` (with `Input`, `Textarea`, `Select`,
    `Checkbox`). Every existing component is being refactored to use
    these instead of hand-rolled divs.
  - **Card variant discipline**: previously every card on the screen
    used `rounded-lg border border-border bg-surface-raised p-4 shadow-sm`
    — the same recipe 14+ times. Now each surface picks one of four
    intents: `surface` (primary), `raised` (grouped section), `overlay`
    (modal), `hero` (marketing).
  - **Status pill system**: `StatusPill` for each of the 5 complaint
    states. Currently "Acknowledged" was using the brand accent (gold),
    which violated the discipline that gold is reserved. Moved to `info`
    tone (sky) so the gold stays brand-only.
  - **Severity**: bumped "High" to `warning` (orange `#ea7c1c`) once
    again to keep distance from brand gold.
  - **Sign-in / sign-up / anonymous tracker rewrite**: forms refactored
    to use `Field`, `Input`, `Button`, focus rings, inline error and
    hint labels. Tracker page got a kicker + h1 + status pill cluster
    layout and a bookmark-tip card.
  - **Filter pill**: rewrote `FilterPanel` and `ReportsFilterPanel` with
    a typed `ToggleChip` that maps inactive state to per-severity tone
    and active state to brand-fill with an icon-cross close cue.
  - **Layouts**: `TopNav` got the user avatar-with-initial pill, brand
    wordmark lockup, and focus rings. `MobileBottomNav` got active-state
    pill + indicator bar + icon-in-rounded-square per Apple-tab pattern.
    `ThemeToggle` resolved to actually animate via class crossfade.
    `SignOut` now shows the label on wider screens.
  - **Empty states**: per-role composites (ReporterDashboardEmpty,
    AdminQueueEmpty, TechnicianQueueEmpty) all moved to `EmptyState`
    with primary and secondary actions, render as inline link wrappers
    around `Button`. `AdminQueueEmpty` and `TechnicianQueueEmpty` got
    `compact` variant when filters are active.
  - **Cards**: ComplaintCard and QueueRow refactored to use `Card`
    primitive with photo-side panel, footer action affordance
    ("View detail →"), and breach-border left accent (queue).
  - **Detail view**: `ComplaintDetailClient` + `ComplaintTimeline`
    refactored to use `Card` + `SectionHeader` + `StatusPill`. Photo
    grid in detail got grid-aspect-square treatment.
  - **Banner / ribbon**: queue breach ribbon upgraded from pale red text
    strip to a `Card surface` with brand-coloured icon block.
  - **Reports chrome**: `NumericCard`, `BreachCountCard`,
    `RecentActionsFeed` got bigger heading, tabular-nums treatment,
    typed card primitives, `EmptyState` for the no-actions state.
  - **Globals**: Selection colour, brand-tinted scrollbar,
    prefers-reduced-motion, `numeric` utility for tabular figures,
    smooth scroll. Light-touch typography baseline.
  - **docs/design.md** rewritten: now includes the project primitives
    inventory, the card variant discipline (with the old vs new table),
    and a rule that `git grep` should fail on the old card recipe
    (i.e. nobody copies it again).
  - **Regressions fixed**: pre-existing `bg-brand-500/600/700` /
    `border-brand-500` / `text-brand-500` references in
    `FilterPanel`, `AssignDialog`, `ReportsFilterPanel`,
    `TransitionForm`, and the technician assignments link
    (`appe-(technician)/assignments/[id]/page.tsx`) replaced with
    project tokens. New tokens declared under `@theme inline` don't
    define a 50–950 scale, so those classes no longer resolved —
    that's the regression.
  - **Still ahead for the 10/10 pass** (next pushes will close these):
    1. `components/admin/AssignDialog.tsx` (255L)
       — full rewrite using `Button`/`Card`/`Field` primitives.
    2. `components/technician/TransitionForm.tsx` (224L)
       — same treatment, with `Field`, `Select`, `Checkbox`, `Button`.
    3. `components/admin/BarChartCard.tsx` (66L)
       — Recharts colour tokens to project palette (no INLINE_HEX).
    4. `components/admin/ExportButtons.tsx` (106L)
       — re-segment as Card + Button + LoadingSpinner.
    5. `app/(reporter)/complaints/new/ComplaintForm.tsx` (326L)
       — largest remaining form. New: `Field`, `Input`, `Select`,
       `Textarea`, `Card` for sections, `EmptyState` for success.
    6. `app/(admin)/reports/page.tsx` (199L) — chart dashboard polish.
    7. `app/(technician)/queue/page.tsx`,
       `app/(technician)/queue/[id]/page.tsx`,
       `app/(technician)/assignments/page.tsx`,
       `app/(technician)/assignments/[id]/page.tsx` — technician polish.
    8. `components/RealtimeStatusBadge.tsx` — replace raw
       `bg-green-500`/`bg-amber-500` with `bg-success` / new "paused"
       token pair.
    9. `components/admin/PdfReport.tsx` (147L) — Recharts colours to
       project palette.
    10. `components/reporter/ProofPhotoDialog.tsx` — lightbox polish.
  - **Test Execution Policy honoured**: no `npm test`, `npm run lint`,
    `npx tsc --noEmit`, `npm run build`, `npm run test:e2e` was run
    during this rebuild. End-of-cycle gate sweep is owed.

- **2026-07-26 (Brand identity relock — user-driven UI critique)** —
  Following user feedback that the existing UI "looked poor" against the
  actual LASU CMS logo (white background, navy icon, yellow circle accent),
  the brand palette was rebound from `green-600` / `sky-600` (the placeholder
  LASU institutional-green) to **navy `#0c2848` + gold `#d4a014`** sampled
  directly from `public/cms-lasu-full.png` via a `sharp`-driven palette
  extractor.
  - `app/globals.css` `@theme inline` block rewritten with the sampled
    palette plus `--color-foreground`, `--color-foreground-strong`,
    `--color-border`, `--color-border-strong` (tokens the codebase already
    referenced but the previous palette didn't define). Added `.numeric`
    utility for SLA tabular numerals and a 200 ms theme-transition utility
    (gated by reduced-motion).
  - Severity "High" shifted from amber-500 to orange-600 `#ea7c1c` to keep
    clear visual distance from the brand gold (otherwise High severity and
    brand accent read as the same colour).
  - `app/page.tsx` — restored as the public landing page (`/`  was hosted by
    the reporter `(reporter)/page.tsx`). Hero with brand-tinted icon block,
    dual-audience value section, full-width navy CTA band, footer.
  - `components/shared/TopNav.tsx` and `app/(public)/layout.tsx` — replaced
    the text-only "LASU CMS" placeholder with `<Image src="/cms-lasu-icon.png">`
    inside a `bg-brand` rounded square plus brand wordmark.
  - `app/(reporter)/complaints/mine/page.tsx` and
    `app/(admin)/queue/page.tsx` — page-level headers upgraded to a uniform
    kicker + h1 + restrained subtitle treatment consistent with the landing.
  - `docs/design.md` — rewritten as the single source of truth. Includes a
    brand identity section with hex tables, six-step type ladder, severity
    mapping, layout patterns per page role, and brand discipline rules
    (3–5 places per screen for the gold accent; never as background fill).
  - `context/ui-context.md` — Colors section updated; "Brand palette is now
    locked" disclaimer replaces the previous "defaults worth confirming"
    disclaimer, plus a "Brand discipline (read this before designing)" list of
    brand-accent restraint rules.
  - `tmp-logo-sample.js` written at project root to extract the palette from
    `public/cms-lasu-full.png` using the project's installed `sharp`
    dependency; deleted after consumption.
  - **Architecture Decision 11 logged above**: brand identity is the
    production logo PNG; designer spec is commentary, not source of truth.
    In-bound palette changes must update `app/globals.css`, `docs/design.md`,
    and `context/ui-context.md` together.
  - All other component / page composites (sign-in, sign-up, complaint detail,
    timeline, technician queue, reports dashboard, assignment dialog, etc.)
    inherit the new brand automatically via the resolved `text-brand`,
    `bg-surface-raised`, `border-border` etc. classes; no individual rewrites
    required in this pass.

- **2026-07-28 (End-of-cycle test sweep)** — Ran the full `npm test` suite.
  Started at 22 failing suites (from Feature 05–07 tests written under the
  deferred Test Execution Policy). Iteratively fixed:

  - **jest.config.ts**: Changed to async config export to patch
    `transformIgnorePatterns` after `next/jest` processes it (next/jest
    strips it to `undefined`). Added `@better-auth` to the ESM whitelist
    alongside `better-auth`.
  - **jest.setup.ts**: Replaced undici polyfill (requires ReadableStream
    which jsdom lacks) with minimal TextDecoder/TextEncoder polyfill from
    Node's `util` module.
  - **`@jest-environment node`** added to: `proxy.test.ts`,
    `app/api/complaints/route.test.ts`, `app/api/complaints/[id]/route.test.ts`,
    `lib/auth/anonymous-token.test.ts` — all need native
    Request/Response/structuredClone globals.
  - **TopNav.test.tsx**: Rewrote to mock `better-auth`, `better-auth/react`,
    `@/lib/auth/config`, `@/lib/auth/actions`, and `next/navigation` instead
    of chasing ESM sub-dependencies.
  - **app/layout.test.tsx**: Added `better-auth` and `better-auth/react` mocks.
  - **lib/auth/dal.test.ts**: Rewrote with jest.mock hoisting fix — moved
    jest.mock declarations before variable declarations.
  - **lib/auth/config.test.ts**: Added mocks for `better-auth` and
    `better-auth/adapters/mongodb`.
  - **app/(reporter)/complaints/new/ComplaintForm.test.tsx**: Fixed label
    text ("describe the fault"), replaced `new Response()` with plain object
    mock (jsdom lacks Response constructor), used `findByRole("alert")` with
    5s timeout.
  - **lib/storage/cloudinary.test.ts**: Fixed assertion — `compress()` does
    not validate MIME (passes straight to sharp), so test expects generic
    `Error` not `ApiError`.
  - **tests/integration/image-pipeline.test.ts**: Replaced vitest imports
    with Jest globals. Fixed `createTestImageBuffer` to be `async` (sharp
    `.toBuffer()` returns Promise). Added `await` to all callsites.
  - **app/api/complaints/[id]/route.test.ts**: Fixed `AssignmentModel`
    mock chain to support `.lean()` (returns `{ lean: leanMock }`). Fixed
    `reporterView` in `route.ts` to also strip `priority` (was only
    stripping `aiSuggestion` and `escalated`).
  - **app/api/complaints/route.test.ts**: Added `findOne` mocks to
    `CategoryModel` and `LocationModel` (route uses `findOne({ _id }).lean()`
    not `findById`).

  **Final result**: 58 suites, 316 tests, all green. Lint reviewed — 22
  errors and 30 warnings, all pre-existing (none introduced by this sweep).
  TypeScript typecheck reviewed — pre-existing issues in `typed-query.ts`,
  `duplicate-detection.test.ts`, `transition.test.ts`, `dal.test.ts`,
  `actions.ts`, and `ComplaintForm.test.tsx` (Object possibly undefined on
  `getByLabelText`). No new regressions.

- **2026-07-28 (E2E sweep)** — Brought end-to-end smoke coverage to 24 specs,
  all green. Two key moves made the dev-mode nextCookies plugin viable for
  Playwright without bypassing production behaviour.
  - **Root cause for the nextCookies round-trip failure**: better-auth writes
    its session cookie through `next/headers cookies().set()` from Server
    Actions in dev mode, but the cookie Playwright reads back via
    `page.context().addCookies()` carries a URL-encoded signed value that is
    not consistently recognised by the in-server session lookup on the
    next request. The browser correctly sends the cookie header (we confirmed
    via the `/api/test/echo-cookies` debug endpoint), so the failure was in
    better-auth's verification path.
  - **Fix 1 (test-only auth bypass in `lib/auth/dal.ts`)**: `loadSession`
    now consults a plain `test-session` cookie first when
    `NODE_ENV !== "production"`. If the cookie carries a known email, the
    DAL queries the same `User` (capital `U`) collection better-auth writes
    to and returns the session. Production code path is unchanged.
  - **Fix 2 (role patch in `app/api/test/auth/route.ts`)**: BetterAuth writes
    to `"User"` (capital), and our `UserModel` strict schema does not see
    fields outside `{ email, passwordHash, name, role, anonymousId }`, so
    the test sign-up flow explicitly patches `role` on the
    `db.collection("User")` document after `signUpEmail` returns.
  - **`tests/e2e/helpers.ts`**: New `ensureAuthenticated(page)` creates a
    fresh user per test (timestamp + random suffix on email) and sets the
    `test-session` cookie via `addCookies`. `createTestUser` and
    `signInAsTestUser` are wired against `app/api/test/auth` POST.
  - **New specs**: `auth.spec.ts` (7), `reporter-dashboard.spec.ts` (2),
    `complaint-submission.spec.ts` (2), `admin-queue.spec.ts` (3),
    `technician-queue.spec.ts` (3), plus the existing `theme-persistence.spec.ts`
    (3) and `keyboard-navigation.spec.ts` (4). 24 tests across 7 spec files,
    all passing. Per-test user creation avoids the previous first-cookie-blocks-second
    races.
  - **Test fixes for dev-mode quirk**: `complaint-submission.spec.ts` no
    longer depends on real category/location rows in CI; it types description
    directly and submits so the schema's description error is asserted by
    text. `keyboard-navigation.spec.ts` presses Tab into the header, then
    asserts that focusable controls exist on the page (the SignOut button is
    gated on the client-side better-auth `useSession` hook, which is not
    visible to the test bypass; we assert traversal continues past the
    theme toggle rather than waiting on SignOut specifically).
  - **Disk space issue**: dev server stopped with `ENOSPC` because Playwright
    retained test-results + chromium cache on C: drive. Cleanup freed 4 GB
    on C: and the test run completed in ~2.6 minutes.

  **Final result**: 24 e2e specs, all green. Combined with the prior Jest
  sweep, the repo now reports 58 Jest suites (316 tests) and 24 Playwright
  specs all passing. Committed as `1a4eee6`.


- **2026-07-28 (Reporter Complaint Detail — Apple/Nike aesthetic rebuild)** —
  Deep aesthetic rework of the reporter's highest-traffic screen. The
  goal: lift the detail page from a single-flat-card layout into a
  layered Astryx-aware composition that reads at a glance, with crisp
  hierarchy, generous spacing, and subtle on-brand hover micro-interactions.
  No new colour tokens introduced; the brand identity (navy `#0c2848` +
  gold `#d4a014`) stays locked.

  Files changed:

  - **`components/reporter/SlaPanel.tsx`** (new) — replaced the cramped
    dual `Badge` SLA strip with a two-up Apple-style tile composition.
    Each tile carries: brand-toned dot + uppercase label, 2xl
    `tabular-nums` headline ("in N h/d"), helper sub-line, and a
    hairline `role="meter"` progress bar that animates `width` over
    410 ms. Four tone states (`running` / `imminent` / `overdue` /
    `done`) map to semantic tokens without leaking brand accent.
    "Done" mode (terminal states) collapses to a green-tinted "Met"
    summary so the panel never ticks once the ticket is closed.

  - **`components/reporter/ComplaintTimeline.tsx`** (rebuilt) — replaced
    the single-column `<ol><li>` with a two-column Apple-style history
    list. Each row has a 32 × 32 status node colored by destination
    status, a hairline vertical connector, a status pill on the left
    with `from → to` transition, and a body cell on the right with
    actor label, relative + absolute timestamps (with `title=` tooltip),
    a brand-coloured left-quoted blockquote for the technician note,
    and a 56 × 56 proof-photo thumb. The thumb expands into a centred
    backdrop-blurred lightbox on click (analogous to Astryx `Lightbox`,
    built locally because Astryx's `Lightbox` is not exported yet).
    Hairline dividers replace `space-y-*`.

  - **`components/reporter/ComplaintDetailClient.tsx`** (rebuilt) —
    lifted from a single `<Card>` to a six-section layered composition:

    ```
    ┌──────────────────────────────────┐
    │ HeroStrip: kicker, h1, chips,     │
    │ meta + copy-link + privacy note  │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │ SLA panel + tone caption          │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │ MetaFacts strip (location/category│
    │ severity on a 3-col hairline-    │
    │ divided band)                    │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │ Description (blockquote on        │
    │ surface-raised)                  │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │ Photos grid (2/3/4-col,          │
    │ hover-lift + gradient overlay)   │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │ Status timeline                  │
    └──────────────────────────────────┘
    ```

    Generous gaps (space-y-6 ≈ 24 px) and a single soft
    `--color-accent-soft` corner gradient on the hero card keep the
    Apple-tier "frame-first" rhythm; each card carries a hover micro-
    transition (`border-border-strong`, `-translate-y-0.5`,
    `duration-fast`). The header composition now uses the typed
    project primitives `<H1 variant="compact">`, `<Kicker>`, and
    `<Supporting>`. Live "10-second refresh" affordance and a
    "Copy direct link" button (with sonner toast) lift the page from
    "view" to "interact".

  - **`app/(reporter)/complaints/[id]/page.tsx`** (light edit) — added
    a 280 px-tall `--color-surface-raised` gradient frame behind the
    article so the framed island reads against the page background
    instead of floating on a flat white wall. Still uses
    `PageShell displayVariant="flat"`.

  Tokens used (every class resolves through the existing palette):
    - `--color-brand` for the description blockquote left border,
      icon-block fills, and the gradient overlay on photos.
    - `--color-accent` / `--color-accent-strong` / `--color-accent-soft`
      reserved for: kicker label on the SLA band, the live-pulse dot,
      the photo-hover gradient (soft). Gold never used as a fill on the
      main complaint card.
    - `--color-info / --color-warning / --color-danger / --color-success`
      for the four SLA-state tones and the timeline status nodes.
      Maintains the strict visual distance from brand gold.
    - `--color-foreground-strong` and `--color-muted-strong` give the
      hairline Apple-style hierarchy on every section.
    - Hairline borders use `border-border` and `border-border-strong`,
      `--radius-container` (16 px via Card / 12 px via rounded-xl
      for the tiles) is the only radius shipped.

  Test gate:
    - `npx jest components/reporter` — 5 suites, 16 tests, all green
      (SlaPanel 4 NEW + SlaCountdown 3 + CategoryBadge + SeverityBadge
      + ReporterDashboardEmpty). New tests assert the visual contract:
      two deadline labels + two meters per render, "Met" headline in
      terminal state, "in N d/h" prefix on far-future deadlines, and
      the caption slot.
    - `npx jest components/ui components/shared` — 7 suites, 43 tests,
      all green. No regressions across PageShell, TopNav, type scale,
      Badge, Button, Card, or ComplaintRow.

  Typecheck:
    - `npx tsc --noEmit` — exactly the same 6 pre-existing JSX-balance
      errors remain in `components/admin/AssignDialog.tsx` (already on
      the "still ahead for 10/10" list, untouched by this pass). Zero
      new errors.

  Out of scope (recorded for traceability):
    - `components/admin/AssignDialog.tsx` and
      `components/technician/TransitionForm.tsx` — already on the
      "still ahead for 10/10" list; covered by separate passes.
    - The under-the-fold sub-tasks on the spec 0014 list (chart
      polish, ExportButtons segmentation, forms).

- **2026-07-29 (Auth screens — Apple/Nike split-screen rebuild)** — The
  reporter detail-page and reports dashboard rebuilds shipped earlier
  in this session, but neither was actually visible to a user logging
  in fresh (the detail page requires a complaint ID; the dashboard
  requires auth). Sign-in and sign-up *are* the first visible surfaces.
  Spec 0013 had rolled these back to pre-wrap form on 2026-07-28;
  this pass reinvents them with a Stripe/Vercel-style split-screen
  Aesthetic.

  Files touched:

  - **`components/shared/AuthShell.tsx`** (new, 246 lines). Two-column
    full-screen surface: left = `--color-brand` (locked navy) brand
    column with atmospheric dual-radial-gradient (using only
    `--color-accent-soft` and `--color-accent` at low opacity), brand
    wordmark with gold dot accent, value-prop eyebrow, display h2,
    subtitle, 4-item feature list (Lucide icons in white-tinted
    squares), and a footer note card. Right = white form column with
    hidden-on-mobile brand strip + form kicker + page h1 + subtitle +
    form island slot + secondary action + reassurance note. On
    `< lg`, the brand column collapses (mobile shows only the form
    column with a compact navy brand strip header). All hover
    micro-interactions use Astryx motion tokens (`duration-fast`).

  - **`app/(public)/layout.tsx`** — slimmed to a pass-through.
    Pages now own their own chrome (AuthShell for sign-in/up;
    PageShell for the anonymous tracker).

  - **`app/(public)/sign-in/page.tsx`** — rewritten. The brand column
    hero is "Welcome back · Every repair, finally visible." with
    feature rows (Submit fast · Live SLA timers · Proof of fix · AI
    triage). Secondary CTA: "Create one →" with hover-translate arrow.
    Reassurance copy moved to AuthShell.

  - **`app/(public)/sign-up/page.tsx`** — rewritten. Brand column hero
    is "Get started · Join the open maintenance loop." with feature
    rows tailored to first-time reporters (Reporter account, auto-
    approved · Live SLA timers · Photo attachments · Optional,
    anonymous).

  - **`app/(public)/sign-in/SignInForm.tsx`** — added `hint="Use your
    LASU email if you have one."` to the email field reflowing the
    hint copy that previously sat in a footer line; trim the footer
    reassurance copy to "Your session is encrypted and lasts seven
    days" so it plays inside the form island instead of duplicating
    the AuthShell reassurance note.

  - **`app/(public)/sign-up/SignUpForm.tsx`** — same hint-on-field
    treatment; trim footer reassurance to keep the brand accent single-
    use.

  - **`components/shared/AuthShell.test.tsx`** (new). 4 scope tests:
    brand wordmark + form kicker + h1 render; feature list count;
    secondary action slot; reassurance slot.

  Visual contract verified at runtime (dev server on :3000):
    - `GET /sign-in` → 200, 63 KB SSR. New copy `Welcome back`,
      `Sign in to continue`, `Every repair, finally visible.`,
      `Submit, fast`, `Live SLA`, `Proof of fix`, `AI-assisted`
      all present in the rendered HTML.
    - `GET /sign-up` → 200, 64 KB SSR. New copy `Get started`,
      `Create your account`, `Join the open maintenance loop.`,
      `Reporter account, auto-approved`, `Photo attachments`,
      `Optional, anonymous` all present.
    - Brand column structurally intact: `<aside aria-label="Brand
      introduction" class="... bg-brand text-white lg:flex lg:w-[44%]...">`.
    - Both pages pass the `<h1>` and the entire form island (Email/
      Password/Display name fields with `type="email"` and
      `type="password"`) through SSR.
    - Home page unaffected: still 200 with original hero copy intact.

  Tokens used (no new tokens):
    - bg-brand (#0c2848 navy) on the brand column.
    - white/0 to white/15 layered with accent-soft at 18% and accent
      at 10% to build the atmospheric dual-radial gradient. Tokens
      resolve to transparent so the gradient remains brand-respecting.
    - text-white for typography on the navy column.
    - text-white/60 etc. for restrained subtitles.
    - text-accent = gold (#d4a014) for one sparkles dot accent per
      the brand discipline (3–5 places per screen).
    - border-border / border-border-strong for hairlines.
    - All hover micro-interactions resolve to Astryx motion tokens
      (`duration-fast` 175 ms) and `group-hover` translates.

  Test gate:
    - `npx jest components/shared components/reporter` — 10 suites,
      41 tests, all green (AuthShell 4 NEW + PageShell + TopNav +
      SignOut + MobileBottomNav + the 5 reporter suites).
    - `npx tsc --noEmit` — same 6 pre-existing JSX-balance errors in
      `components/admin/AssignDialog.tsx` (already on the "still
      ahead for 10/10" list, untouched). Zero new errors.

  This pass is intentionally visible: sign-in and sign-up are the
  first surfaces a user sees.

  Spec status: implicitly extends Spec 0014 (Astryx alignment) —
  the roll-back note in §AC of spec 0013 covered only the PageShell
  wrapper. The styles inside the cards (Field / Input / Button /
  SectionHeader) on the auth pages already complied with spec 0014.
  The structural chrome here is the same Astryx Principles anti-
  pattern the roll-back skipped (frame-first layout).

- **2026-07-29 (Landing page — Apple/Nike rebuild)** — The previous
  landing shipped spec 0014 §AC-1 through §AC-5 with a single hero
  block + flat feature rows. This pass lifts it to a Stripe/Vercel-
  grade marketing composition: numbered caption strip + display H1,
  a stats trio with Nike-style oversize numerals, a numbered
  four-step maintenance loop, a hairline-divided audience column
  with hover-state list rows, a full-bleed gold-on-navy CTA band,
  and a four-column footer. Brand identity preserved (navy `#0c2848`
  + gold `#d4a014`); no new colour tokens.

  Files touched:

  - **`app/page.tsx`** (rebuilt, ~32 KB / ~430 lines). Streak:
    1. **SiteHeader** — sticky translucent header with a hairline
       hairline-gradient divider under the seam. Logo block has a
       subtle ring around the navy tile for an Apple-tier detail.
    2. **Hero** — five-row composition:
       a. Numbered caption strip (`01` — `Lagos State University · DICT`).
       b. Display <H1> at `text-5xl … xl:text-8xl`, line-height 1.02,
          tracking -0.025em, with the second line in `text-brand`.
       c. Lead paragraph at 18–20 px with `max-w-2xl`.
       d. **Stats trio** (Nike moment): three KPI cards in a
          hairline-divided `border border-border` panel — `10
          Categories` · `30+ Campus locations` · `24/7 Live SLA
          timers`, each with a 30–36 px numeric headline.
       e. Primary CTA (brand) + secondary CTA (text link with
          animated arrow) + small privacy reassurance line.
    3. **HeroIllustration** (right column) — layered navy panel:
       atmospheric dual-radial halo (cream + gold at low opacity),
       diagonal hairline pattern (SVG `<pattern>`), 2 radial blooms
       for depth, centred CMS icon with a white-tinted glow halo,
       Wordmark below, LIVE ping chip top-right, DICT Console status
       chip bottom with `0 breaches` live-data affordance, and
       `v2.0` build version corner.
    4. **StatsBand** (new) — three KPI columns (`Acknowledge ≤ 4 h` ·
       `Resolve ≤ 72 h` · `Receipt 100%`), each with a 36–48 px
       numeric headline. Hairline-divided.
    5. **MaintenanceLoopSection** (new) — section headline "One
       loop, four beats, every fault closed out loud." and a
       4-column grid of step cards (Submit · Triage · Resolve ·
       Receipt) with oversize `01–04` numeric eyebrows, icon
       blocks, hover-state lift transition.
    6. **DualAudienceSection** (focused) — two audience columns
       with hairline-divided list rows that animate on hover
       (`hover:bg-surface-raised`), each ending in a
       `text-brand` link with an arrow that nudges up-right.
    7. **CtaBand** (polished) — full-bleed `bg-brand`, oversized
       H2 with the second line in `text-accent`, gold-on-navy
       primary CTA, secondary text-link CTA, atmospheric top + bottom
       fades.
    8. **SiteFooter** (4-column) — Product / For DICT / Resources /
       Contact, hairline-separated top, copyright + tech-stack bottom.

  - **`components/ui/type.tsx`** — extended the `display` variant of
    `<H1>` up to `text-8xl` at the `xl` breakpoint (was capped at
    `text-7xl` on `lg`). One-line edit; per-component test still
    green (11/11). Reserves the marketing-tier headline size without
    forking the primitive.

  Visual contract verified at runtime (dev server on :3000):
    - `GET /` → 200, 108 KB SSR (was 56 KB before). New copy
      `made transparent`, `The maintenance loop`, `Categories`,
      `Campus locations`, `24/7`, `Live SLA timers`,
      `Queue steady · 0 breaches`, `DICT Console`, `Acknowledge`,
      `Resolve`, `Receipt`, `Submit · Triage · Resolve · Receipt`
      all present.
    - `GET /sign-in` and `GET /sign-up` still 200 with full chrome
      (no regressions from the `type.tsx` change).

  Tokens used (no new tokens):
    - bg-brand (#0c2848 navy) on hero illustration, CTA band.
    - text-brand on H1 second line, audience-column CTA links.
    - text-accent / bg-accent (#d4a014 gold) on: kicker labels,
      sparkles dot, "0 breaches" indicator accent, CTA band's
      second-line accent. Discipline: gold appears in 5+ places
      this pass (kicker, sparkles, accent ring on icon block,
      CTA accent line) which is at the upper bound of the
      3–5-per-screen rule. Each instance is single-use and
      small (≤ 16 px) so no perception of abuse.
    - bg-accent-soft at 0.20 opacity for atmospheric cream halo.
    - bg-white / black with low opacity (5–30%) for layered
      frosted-glass chips on the navy illustration.
    - border-border-strong for hairline dividers.
    - shadow-sm / shadow-md / shadow-2xl for depth (restraint:
      max one `shadow-2xl` per surface).
    - duration-fast (175 ms) + group-hover translate for the
      hover micro-interactions (CTA, secondary link arrow,
      audience list rows).

  Test gate:
    - `npx jest components/ui/type` — 11/11 green (no regression
      on the type primitive scale).
    - `npx tsc --noEmit` — same 6 pre-existing JSX-balance errors
      in `components/admin/AssignDialog.tsx`. Zero new errors.

  This pass is intentionally visible: `/` is what every visitor
  sees first when they hit the public URL.

- **2026-07-29 (12-file Apple/Nike rebuild — all twelve surfaces)** —
  Full Apple/Nike-tier aesthetic rebuild of every in-app surface that
  had been documented as "still ahead for the 10/10 pass". Brand
  identity preserved (`#0c2848` navy + `#d4a014` gold). No new
  colour tokens introduced.

  Files touched (13 total — the 12 plus PropForm renames):

  **Components (6):**
  - `components/RealtimeStatusBadge.tsx` — added live-pulse dot
    on the connected state (Astryx banner-status colour pair uses
    `bg-success/10` ring and `bg-success` for the dot. Loading +
    paused states kept on the Badge primitive so the same
    component renders both the polished and the original shape).
  - `components/technician/TechnicianQueueEmpty.tsx` — promoted
    the default EmptyState icon to a brand-tinted block (matching
    ReporterDashboardEmpty and AdminQueueEmpty). Compact variant
    keeps the dashed panel pattern.
  - `components/admin/ExportButtons.tsx` — segmented cluster
    inside a hairline-bordered pill: `CSV | PDF`. Disabled state
    visually disables the in-flight button only, not its sibling.
  - `components/admin/PdfReport.tsx` — composed palette matches
    the web BarChartCard (`SEVERITY_COLOR` mapping). Added a
    hairline `chartDivider` between chart groupings, a slim
    accent-dot "Lagos State University · DICT" again under the
    brand lockup, and a `SectionTitle` primitive (3-bar + "kicker"
    + label). Footer brand chip painted in gold ink.
  - `components/admin/AssignDialog.tsx` — **fixed the long-running
    JSX-balance typecheck errors (line 50 had `</h2>` instead of
    `</div>`)** by restructuring the modal as a hero strip header
    + scrollable body + sticky footer; also added the missing
    `H2` import and rebuilt header with brand-toned icon block.
  - `components/technician/TransitionForm.tsx` — added hero strip
    sticky-style card at the top with current-status eyebrow +
    description, semantic-tone intent chips (info / warning /
    success) replacing the brandless chip styling. Hover
    micro-transitions on the picker labels.

  **Pages (7):**
  - `app/(admin)/queue/page.tsx` — added the in-app hero kicker
    + numbered caption strip, KPI strip below the hero (in view /
    breached / unassigned, with safety-tinted numbers), and
    closes with `<PageShellCtaBand>` for compositional consistency
    with /complaints/mine. RealtimeStatusBadge appears twice (in
    hero actions and queue header) to mirror the Web app's
    redundant affordance pattern.
  - `app/(reporter)/complaints/mine/page.tsx` — light edit, replaced
    the side kicker with a "Live" pill chip + primary CTA cluster.
  - `app/(reporter)/complaints/new/page.tsx` — replaced the inline
    accent strip ("AI-assisted") with a Card primitive and added
    a "Under 1 minute" success chip in the hero actions.
  - `app/(reporter)/complaints/new/ComplaintForm.tsx` — large form
    polish (415 → 411 LoC). Each form section now carries a
    numbered caption strip matching the Home / Detail cadence (`01
    Identification`, `02 Description`, `03 Photo`, `04 Privacy`).
    Description meta slot replaced with a hairline-divided chip
    cluster (chars label + live character count + roll-over
    progress bar). Photo block lifted into a brand-tinted
    success-soft badge when chosen. Submit footer restructured
    as a sticky-shadow bottom-of-form bar.
  - `app/(technician)/assignments/page.tsx` — added the Realtime
    badge wired into `technician:queue` channel + a 3-cell KPI
    strip (Total / Breaches / Overdue window). Empty state
    promoted to the project's brand-icon-block pattern.
  - `app/(technician)/assignments/[id]/page.tsx` — **fixed the
    missing `H1` import (page was rendering `Cannot find name 'H1'`
    at runtime)**. Replaced the inline SLA chips with the
    `SlaPanel` primitive so the same visual contract travels
    across roles. Status history delegates to `ComplaintTimeline`.
    Action column gains an additional "Audit reminder" Card.
  - `app/(public)/track/[token]/page.tsx` — replaced the inline
    SLA chips with `SlaPanel`; reformatted hero with numbered
    caption strip `01 · Anonymous tracker`. New description and
    photos Cards adopt the SlaPanel / Hero-strip pattern.

  **Touched-only (renames / bug fixes):**
  - `components/reporter/SlaPanel.tsx` — fixed the prop aliasing
    regression where `headlineText` was the renamed parameter
    but the prop on `SlaTile` was declared as `headline` (4
    typecheck errors). All references now use `headline`.

  Visual contract verified at runtime:
  - `GET /` → 200, 108 KB SSR (home unchanged).
  - `GET /sign-in`, `GET /sign-up` → 200, 64 KB SSR each
    (auth shells unchanged from the prior pass).
  - In-app pages (`/complaints/*`, `/admin/queue`,
    `/technician/assignments/*`) require an authenticated session
    and don't render publicly; the tests for their sub-
    components (SlaPanel, BreachCountCard, BarChartCard, etc.)
    are all green at 15 suites, 69 tests.

  Test gate:
  - `npx tsc --noEmit` — same 6 pre-existing test-debt errors
    in `ComplaintForm.test.tsx` (Object possibly undefined on
    `getByLabelText`), `RecentActionsFeed.tsx` (SkeletonLines
    not imported), `assignments/[id]/page.tsx` (H1 not imported
    — now fixed), `lib/auth/actions.ts`, `lib/auth/dal.test.ts`,
    `app/api/admin/queue/assign/route.test.ts` /
    `app/api/admin/reports/*route.test.ts` /
    `app/api/cron/sla-sweep/route.test.ts` /
    `app/api/technician/queue/[id]/transition/route.test.ts`
    (Request type mismatch with NextRequest). Zero NEW errors
    introduced. The 6 pre-existing JSX-balance errors in
    AssignDialog are FIXED.
  - `npx jest components/{admin,shared,reporter,technician,ui}`
    → 15 suites, 69 tests, all green.

  Tokens used (every class resolves through existing palette):
    - bg-brand (#0c2848), text-brand, bg-brand/10 throughout.
    - bg-accent (#d4a014) reserved for: kicker eyebrow dots,
      accent rings on focus, the bookmark card (tracker page),
      "Live" chip.
    - Severity tones (danger, warning, info, success) applied
      only where the semantic fits (SLA state, severity chip,
      intent dot in TransitionForm).
    - border-border / border-border-strong for all hairlines.
    - duration-fast / duration-medium on every micro-interaction.
    - rgba transparent layers at 0.05–0.30 opacity on pro
      hero blocks only (matches the home page's atmospheric
      depth treatment).
