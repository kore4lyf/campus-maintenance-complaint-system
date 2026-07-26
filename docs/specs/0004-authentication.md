# 0004. Authentication (BetterAuth)

**Date**: 2026-07-25
**Status**: Proposed

## Summary

This spec ships real authentication on top of BetterAuth, replacing the placeholder role context from spec 0003 with email and password sign up and sign in backed by the locked `users` collection. It adds three BetterAuth managed Mongoose models (session, account, verification) without altering the locked eight collections, hardens role based access control at the request boundary through a project root `middleware.ts`, and lets BetterAuth own password hashing so no `bcrypt` dependency is added per the spec 0002 decision. Cross spec fallout: `useCurrentRole` is replaced by `useCurrentUser` (call sites in `TopNav`, `MobileBottomNav`, and the role aware layouts continue to work without a per call site rewrite), the `SignOut` button becomes a real Server Action, and the dev only `MockRoleSwitcher` is removed now that real auth exists.

## Context

Spec 0003 (Design system and UI foundation) shipped layouts and a role aware shell that read from a placeholder `RoleProvider` so the foundation could be exercised end to end without real auth. The placeholder is now a debt: every layout call site reads through `useCurrentRole()` which intentionally returns `null` in production builds, blocking access to the role aware pages that Slice 1 features will build inside. Real auth is the gating dependency for auth, submission, and reporter dashboard (Features 4, 5, and 6). The architecture context locks BetterAuth as the auth library, the data model spec locks the `users` schema, and the architecture section "Auth and Access Model" already specifies the middleware path, the cookie regime, the three role classes, and the route group allowlist. The remaining decisions for this spec are: sign up role policy (who self registers versus who is seeded), the BetterAuth client surface (email and password only versus magic link versus OAuth), the `useCurrentUser` contract that supersedes spec 0003's `useCurrentRole`, and the RBAC enforcement layering. Password reset, email verification, and the anonymous reporter flow are explicitly deferred so the spec does not depend on Resend transactional email or on Feature 5's submission data model.

## Requirements

**User stories**:

- As a reporter (LASU student or staff), I want to register with email and password at `/sign-up` so that I can submit maintenance complaints and track them.
- As a registered user, I want to sign in at `/sign-in` so that I can submit or work on complaints per my role.
- As a signed in user, I want to sign out from the top nav so that my session ends cleanly.
- As an unauthenticated visitor who clicks a protected link, I want to land on `/sign-in?redirect=...` so that I can complete sign in and return to where I was headed.
- As a developer, I want `useCurrentUser()` to expose the signed in identity so that existing layouts and components continue to work without a per call site rewrite.
- As a developer, I want `middleware.ts` at project root to gate protected paths so that no protected page is reachable without a valid session and role.
- As an admin or technician, I want a seedable account I can sign in with so that the dev environment exercises role gated paths from first connect.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A new reporter can register at `/sign-up` by entering email, password (at least 8 characters), display name, and submitting the form. The user is created in the `users` collection with `role: 'reporter'` and `passwordHash` set by BetterAuth; a session cookie is set; the user is redirected to `/complaints/mine`. Verifies the "can register" half of the scope Done when line.
- **AC-2**: A registered user can sign in at `/sign-in` with email and password; the session cookie is set; the user is redirected to `/complaints/mine` for reporters, `/admin/queue` for admins, `/technician/queue` for technicians, or to `?redirect=...` if that query parameter is present. Verifies the "can sign in" half of the scope Done when line.
- **AC-3**: The `SignOut` button in the top nav calls a Server Action that invokes BetterAuth's `signOut`, clears the session cookie, and redirects the user to `/`. Verifies the "can sign out" half of the scope Done when line.
- **AC-4**: `middleware.ts` at project root matches every request except static assets (`_next/*` and `favicon.ico`), the BetterAuth catch-all (`/api/auth/*`), and the public sign in and sign up pages. For paths under `/admin`, `/technician`, `/api/admin`, `/api/technician`, and `/api/complaints`, an unauthenticated request is redirected to `/sign-in?redirect=<encodedPath>`. An authenticated request with the wrong role receives a 403 response (JSON on `/api/*` paths, a rendered 403 page on UI paths). Verifies "protected routes reject unauthenticated requests; role based routes enforce the RBAC matrix" from the scope Done when line.
- **AC-5**: `lib/auth/config.ts` instantiates BetterAuth with the `emailAndPassword` provider and the `nextCookies` plugin, and a Mongoose adapter pointed at the project's existing `User` model plus the three additive BetterAuth models. The shared client exports typed wrappers for `signInEmail`, `signUpEmail`, `signOut`, and `getSession`. The `/api/auth/[...all]/route.ts` handler delegates HTTP requests to BetterAuth's `toNextJsHandler(auth)`.
- **AC-6**: Three BetterAuth managed Mongoose models exist at `lib/db/models/session.ts`, `lib/db/models/account.ts`, and `lib/db/models/verification.ts`. Each defines the schema per BetterAuth's `mongooseAdapter` contract and exports an `InferSchemaType` named export. The locked eight collections from spec 0002 remain unchanged.
- **AC-7**: `useCurrentUser()` in `lib/auth/role-context.tsx` returns `{ id, email, name, role: 'reporter' | 'dicht_admin' | 'dicht_technician' } | null`. The existing call sites that consumed the old `useCurrentRole()` continue to compile and run correctly because the new hook returns the same role plus added identity fields; a back compatible `useCurrentRole()` alias exported from the same file returns `user?.role ?? null` so the call sites in `TopNav`, `MobileBottomNav`, and the three role aware layouts require no edit.
- **AC-8**: `MockRoleSwitcher` is removed. The export is gone from `lib/auth/role-context.tsx` and `NEXT_PUBLIC_ALLOW_MOCK_ROLE` is removed from `.env.example`. Acceptance criterion AC-9 of spec 0003 (asserting `MockRoleSwitcher` is absent from the production build output) becomes trivially satisfied and is retired alongside this cleanup.
- **AC-9**: `scripts/seed.ts` adds env controlled creators for an admin (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`) and a technician (`SEED_TECH_EMAIL`, `SEED_TECH_PASSWORD`, `SEED_TECH_NAME`). When an env trio is present the seed upserts that user via BetterAuth's `signUpEmail` so `passwordHash` is written by BetterAuth (not by hand). When an env trio is missing, the seed runs the existing category seed only and skips that user.
- **AC-10**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; `npm run dev` boots cleanly. End to end sign up, sign in, sign out, and a 403 on role mismatch are verified by hand or with a Playwright flow test that covers the registered reporter path and the seeded admin and technician paths.

## Options considered

### Option 1: BetterAuth email plus password now (chosen)

Email and password only, via BetterAuth, with the Mongoose adapter. Sign up at `/sign-up` self service for reporters; admin and technician accounts exist only via the seed script per AC-9. `middleware.ts` at project root enforces RBAC per AC-4. Anonymous reporter flow, password reset, email verification, magic link, and OAuth are explicitly deferred.

**Pros**:
- Matches the architecture's BetterAuth decision and the locked `users` schema.
- Tracer Bullet discipline: the auth path is the smallest end to end slice that unblocks Slice 1.
- Reuses the locked `users` Mongoose model without a schema migration.
- Native defense in depth via project root middleware plus per page `getSession` checks.
- Spec 0002 already locked out a `bcrypt` dependency; BetterAuth owns password hashing.

**Cons**:
- Magic link and OAuth are deferred; if LASU IT later requires SSO before go live, this is a controlled rework rather than a foundation rewrite.
- Rate limiting on sign in is deferred (the rate limiting feature is on the scope Deferred list), so brute force is unmitigated until that feature lands.
- Account enumeration is partially mitigated via BetterAuth's typed errors mapped to 409, but is not bulletproof until rate limiting is on.

### Option 2: BetterAuth email plus password plus magic link

Email and password plus passwordless magic link.

**Pros**:
- Better out of band support for users who forget passwords.
- Lower password fatigue.

**Cons**:
- Requires Resend transactional email, which is on the scope Deferred list and not owned by Feature 4.
- Bigger first cut; spec does not own mail infrastructure.
- Magic link still needs the same RBAC enforcement, so it does not reduce the implementation scope meaningfully.

### Option 3: Build a custom email plus password auth (no BetterAuth)

Roll our own `bcrypt` plus custom session cookie plus custom middleware.

**Pros**:
- No library dependency, full control.

**Cons**:
- Reinventing auth is the explicit anti pattern called out by the architect skill persona; building authentication correctly is extremely hard and a single mistake is a breach.
- Contradicts the architecture's locked BetterAuth decision.
- Larger build, more attack surface, more code to test.

## Decision

**Chosen option**: Option 1: BetterAuth email plus password now.

All three role classes in `users.role` are honored. Reporters self register at `/sign-up`; admin and technician accounts exist only via the seed script. BetterAuth owns password hashing, session cookie issuance, and CSRF tokens. The locked eight Mongoose collections stay byte for byte unchanged. Three BetterAuth managed Mongoose models are added (session, account, verification) at `lib/db/models/`.

**Implementation skills**: `better-auth-best-practices` (`earendil-works/community-skills` per skill conventions at `C:/Users/Korede/.pi/agent/skills/better-auth-best-practices/`) — the project's installed BetterAuth conventions: client setup, Mongoose adapter usage, Server Actions pattern, cookie regime. `mongodb` (`earendil-works/community-skills` at `C:/Users/Korede/.agents/skills/mongodb/`) — Mongoose model patterns, embedding vs reference, connection lifecycle, idempotent index creation used by spec 0002.

## Rationale

Two specific forces from Context drive the choice. First, the architecture context already locks BetterAuth as the auth library, with a defined middleware path and a defined cookie regime. Building a custom auth layer would contradict the lock and ship rework. Second, spec 0003 ships a working foundation shell that Block Reader's call sites (`TopNav`, `MobileBottomNav`, the role aware layouts) all depend on `useCurrentRole()`; extending the hook into `useCurrentUser()` without ripping it up preserves those call sites working unchanged. A blank slate approach that ships a fresh context layer would force a wide spread edit to spec 0003 call sites at the same time as auth lands, multiplying the change surface across two specs.

The sign up role policy is locked at reporters self registering and admins plus technicians seeded only because privilege escalation through a public sign up form is a serious and easy mistake; gating admin and technician creation behind a controlled env var (the seed script's trio) keeps the audit trail simple and matches the data model's `role` enum. Email verification, password reset, magic link, OAuth, and the anonymous reporter flow are deferred because each one pulls in an infrastructure dependency (Resend transactional email, an IdP integration, the submission data model) that is not owned by Feature 4 and is on the scope Deferred list. The deferred decisions are listed in `## Follow-up` rather than buried, so they surface for the next pass.

The `MockRoleSwitcher` removal is non negotiable now that real auth exists; keeping the dev affordance alongside BetterAuth would invite role spoofing in production builds, and the spec 0003 follow up item already committed the swap.

## Feature design

**Data model sketch**:

This feature is additive. The locked `users` collection from spec 0002 stays byte for byte unchanged: `_id` (auto), `email` (String, unique, indexed), `passwordHash` (String, optional, BetterAuth managed), `name` (String, required for humans, system null per spec 0002), `role` (enum, required, indexed), `anonymousId` (String, optional).

New Mongoose models at `lib/db/models/`:

- `session.ts` — BetterAuth managed. Stores `userId`, `token`, `expiresAt`, plus device plus IP plus timestamps. Used by BetterAuth's `getSession` API on every protected request.
- `account.ts` — BetterAuth managed. Stores `userId`, `providerId` (for now always `credential`), `accountId` (the email), `password` (BetterAuth's hashed credential), plus timestamps. Used by BetterAuth on sign in to validate the credential.
- `verification.ts` — BetterAuth managed. Stores `identifier`, `value`, `expiresAt`, plus timestamps. Even though email verification is off in MVP, the table is required by BetterAuth's adapter contract and is created at first connect.

Each new model file mirrors the existing pattern in `lib/db/models/`: `mongoose.Schema(...)` declaration with `timestamps: true`, an `InferSchemaType` named export, a `mongoose.models.X || mongoose.model("X", schema)` guard, and a corresponding `*.test.ts` fixture file.

**State transitions** (if applicable):

The `users` document does not introduce a status state machine here; sign in and sign out are session events, not document transitions. BetterAuth's own session lifecycle (created on sign up or sign in, deleted on sign out, expired on max age) lives in the `session` table and is BetterAuth's concern.

**API surface**:

| Endpoint | Method | Auth | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| `/api/auth/[...all]` | `GET` and `POST` | none (BetterAuth owns the trust) | BetterAuth internal | BetterAuth internal | BetterAuth typed errors mapped to 409, 422, 401 |
| `/sign-in` (Server rendered page) | `GET` | public | none | email plus password form, optional `?redirect=...` query | none |
| `/sign-up` (Server rendered page) | `GET` | public | none | email, password, name form | none (form errors rendered inline) |
| `signOutAction` (Server Action) | `POST` | session | none | redirect to `/` after cookie clear | 401 if no session |
| `middleware.ts` (request guard) | runs on every matched request | session probe | request URL plus cookies | redirect to `/sign-in?redirect=...` or 403 response | 401 at the protected API |
| `useCurrentUser` hook | reads session | n/a | none | `{ id, email, name, role } | null` | n/a |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| `/sign-up` Server Action creating a user | `users` document with `role: 'reporter'` | server enforced; client cannot influence role |
| `/sign-up` Sets `passwordHash` | BetterAuth password hash | `auth.api.signUpEmail` in `lib/auth/config.ts` |
| `/sign-in` Sets session cookie | BetterAuth issued cookie | `auth.api.signInEmail` |
| `/sign-in` redirects to role landing page | role string | `user.role` from the returned session payload |
| `middleware.ts` decides redirect | next URL | encoded request pathname, then `?redirect=...` appended to `/sign-in` |
| `middleware.ts` allows through when no role mismatch | role string | `user.role` from `getSession` compared to allowlist |
| `TopNav` displays user name | display name | `useCurrentUser().name` |
| `SignOut` button click clears cookie | deleted session row | `auth.api.signOut` |
| Seed script creates admin | `users` document with `role: 'dicht_admin'` | `scripts/seed.ts` reads env, calls `auth.api.signUpEmail` |

**Key invariants** (rules that must always hold):

- The locked eight Mongoose collections stay byte for byte unchanged. Any edit to `users.passwordHash` semantics, `users.role` enum, or any existing index is a sign the contract is slipping and triggers a spec amendment.
- Sign up at the public `/sign-up` route always writes `role: 'reporter'` server side regardless of any client supplied value; if the payload includes any other role, the server rewrites or rejects.
- `useCurrentUser()` returns `null` at any route that does not have a valid BetterAuth session. There is no fallback to `MockRoleSwitcher` or any other dev affordance after AC-8.
- `SignOut` is a Server Action through a `'use server'` boundary; client cannot spoof sign out without a real Server Action call.
- `middleware.ts` matcher excludes `_next/*`, `favicon.ico`, `/api/auth/*`, `/sign-in`, and `/sign-up`. The matcher is the safety net, not path based checks inside the function body alone.
- `passwordHash` is written by BetterAuth only. The seed script must use `auth.api.signUpEmail`, not raw Mongoose writes, to keep hashing consistent.
- `name` for non anonymous human users is required by the locked schema; `/sign-up` form collects it before submitting; the seed script supplies it from env.
- `anonymousId` is left untouched by this feature. Anonymous paths land in Feature 5.

**Security model**:

- Authentication provider: BetterAuth. Email and password is the only sign in mechanism in this feature.
- Password storage: BetterAuth default hashing. No `bcrypt` dependency (locked at spec 0002). The architecture text in `context/architecture.md §Auth and Access Model` mentions bcrypt hashing with cost factor >= 12; AC reconciliation is captured as a Follow up so the locked spec 0002 decision remains authoritative.
- Session cookie attributes: `HttpOnly`, `SameSite=Lax`, `Secure` only in production builds, `maxAge` 604800 seconds (7 days per architecture).
- CSRF: BetterAuth default tokens on the catch all.
- Rate limiting on sign in and sign up: out of scope; on the scope Deferred list. The rate limiting feature in a later slice will land `@upstash/ratelimit` at the same `/api/auth/*` boundary.
- Account enumeration: `users.email` unique index plus BetterAuth's typed error mapped to a 409 Conflict at the route boundary (consistent with spec 0002 AC-2). The middleware `redirect=/sign-in?redirect=` on failed sign in does not leak whether the email exists.
- RBAC enforcement: `middleware.ts` at project root enforces the allowlist per AC-4. Per page Server Components underneath those groups also call `getSession()` defensively and early return 403 if role mismatched (defense in depth).
- PII discipline: client side `useCurrentUser()` payload is `{ id, email, name, role }` only. `passwordHash`, BetterAuth internal columns, and `anonymousId` (when the related complaint is Resolved or Closed; per spec 0002 AC-13) are scrubbed by `lib/utils/pii.ts` `toPublicJSON`.

**Configuration required**:

- `BETTER_AUTH_SECRET` (already in `.env.example` per Feature 01): BetterAuth signing secret. If missing, the build emits a clear error at boot time rather than crash on first request.
- `BETTER_AUTH_URL` (already in `.env.example`): BetterAuth's idea of the site URL.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, `SEED_TECH_EMAIL`, `SEED_TECH_PASSWORD`, `SEED_TECH_NAME`: env vars read only by `scripts/seed.ts`. When a trio is missing, that user is silently skipped. Document in `.env.example` as dev only.
- `NEXT_PUBLIC_ALLOW_MOCK_ROLE`: removed. The line is deleted from `.env.example` per AC-8.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: a new reporter registers at `/sign-up`, lands on `/complaints/mine` with a session cookie set. Verifies **AC-1**.
- **Happy path**: a registered reporter signs in at `/sign-in?redirect=/complaints/mine` and is redirected correctly after a successful credential check. Verifies **AC-2**.
- **Happy path**: a signed in user clicks SignOut in the top nav, the cookie is cleared, the user lands on `/`, and `/complaints/mine` now redirects to `/sign-in?redirect=/complaints/mine`. Verifies **AC-3**.
- **Auth/permission**: an unauthenticated request to `/admin/queue` is redirected to `/sign-in?redirect=%2Fadmin%2Fqueue`. Verifies **AC-4**.
- **Auth/permission**: a signed in reporter requesting `/admin/queue` receives a 403; a JSON 403 on `/api/admin/*`. Verifies **AC-4** and **AC-5**.
- **Failure case**: sign up with an email that already exists returns a typed 409 Conflict at the route boundary (BetterAuth's `email_exists` mapped). Verifies **AC-1** failure path.
- **Defense in depth**: with `middleware.ts` momentarily disabled (or its matcher broad to simulate a misconfig), a Server Component under `/app/(admin)/page.tsx` still returns 403 because it calls `getSession()` defensively. Verifies **AC-4** defense in depth.
- **Happy path**: `useCurrentUser` is consumed by `TopNav` to render the user's name and a SignOut button; the role code remains in `TopNav` because `user.role` shapes the menu. Verifies **AC-7**.
- **Dev affordance cleanup**: production build output no longer contains the inlined `NEXT_PUBLIC_ALLOW_MOCK_ROLE` string after AC-8. Verifies **AC-8**.
- **Seeder runs**: with `SEED_ADMIN_*` and `SEED_TECH_*` set, the seeded admin and technician are present in `users` and can sign in. Verifies **AC-9**.
- **Build gates**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all green. **AC-10**.

## Build plan

Tracer Bullet ordering: stand up the auth surface end to end (BetterAuth client plus BetterAuth models plus middleware) before thickening with the public pages and the seed script. Each task tagged with the AC or ACs it satisfies.

1. **Install BetterAuth and the Mongoose adapter. Confirm BetterAuth env vars in `.env.example`** (already present per Feature 01: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`). Add a one line note about generating `BETTER_AUTH_SECRET` via `openssl rand -base64 32`. Satisfies **AC-5** prereqs.

2. **Add three BetterAuth managed Mongoose models** at `lib/db/models/session.ts`, `account.ts`, `verification.ts`. Each defines the schema per BetterAuth's mongooseAdapter contract, exports an `InferSchemaType`, includes a `mongoose.models.X || mongoose.model("X", schema)` guard so the model is safe to register multiple times in dev hot reload. Each file has a paired `*.test.ts` for the model load. Satisfies **AC-5** and **AC-6**.

3. **Wire `lib/auth/config.ts`** with a single shared BetterAuth client. Use the `emailAndPassword` provider, the `nextCookies` plugin, and the Mongoose adapter pointed at the existing `User` model plus the three new session, account, verification models. Export typed wrappers `signInEmail`, `signUpEmail`, `signOut`, and `getSession` re exporting BetterAuth's API surface so call sites only depend on our wrappers. Satisfies **AC-5**.

4. **Create `lib/auth/actions.ts`** with a `signOutAction` Server Action (`'use server'`). The action invokes `auth.api.signOut`, lets BetterAuth clear the cookie, and calls `redirect("/")`. Adds a typed return shape so the `Form` component in `TopNav` can render error states. Satisfies **AC-3**.

5. **Add the `(public)` route group** holding `/sign-in` and `/sign-up` pages. Each page is a Server Component (rare Server Component render with a small `'use client'` Form island) implementing `react-hook-form` + Zod + Astryx form primitives per spec 0003 design tokens. Page titles set via Metadata API. The `/sign-up` form collects email, password (min 8 chars), display name, and submits via a Server Action that calls `auth.api.signUpEmail` with `role: 'reporter'` server enforced. The `/sign-in` form collects email and password, calls `auth.api.signInEmail`, and redirects to the role landing page or to `?redirect=...` if present. Satisfies **AC-1** and **AC-2**.

6. **Add `app/api/auth/[...all]/route.ts`** exporting `GET` and `POST` handlers that delegate to BetterAuth's `toNextJsHandler(auth)`. The route is the only HTTP handler BetterAuth owns in this architecture. Satisfies **AC-5**.

7. **Add `middleware.ts` at project root** with a `config.matcher` array `["/((?!api/auth|_next/static|_next/image|favicon.ico|sign-in|sign-up).*)"]`. The middleware reads the session via `getSession`. For paths matching the protected allowlist (`/admin/*`, `/technician/*`, `/api/admin/*`, `/api/technician/*`, `/api/complaints`), redirect to `/sign-in?redirect=<encodedPath>` when no session; return 403 (JSON on `/api/*`, a simple rendered page on UI paths) when role mismatched. Page level Server Components underneath the protected groups still defensively call `getSession()` so misconfigured middleware cannot open protected pages silently. Satisfies **AC-4**.

8. **Replace `lib/auth/role-context.tsx`**. Export `RoleProvider`, `useCurrentUser` (returns `{ id, email, name, role } | null`), and a back compatible `useCurrentRole()` alias returning `user?.role ?? null`. Remove the `MockRoleSwitcher` export. The hook still reads from `RoleProvider` so consumers in `TopNav`, `MobileBottomNav`, and the role aware layouts compile unchanged. Satisfies **AC-7**.

9. **Update `TopNav` and `MobileBottomNav`** to consume `useCurrentUser` (so they can show the user's name in the account menu) and keep their existing role aware rendering. Replace the placeholder `SignOut` button with one that posts to `signOutAction`. Remove any reference to `NEXT_PUBLIC_ALLOW_MOCK_ROLE`. Sweep the codebase for stale `MockRoleSwitcher` imports. Satisfies **AC-3**, **AC-7**, **AC-8**.

10. **Extend `scripts/seed.ts`** with admin and technician seeders. Both seeders read the SEED_ADMIN plus SEED_TECH env trios, call `auth.api.signUpEmail` to upsert the user (using BetterAuth hashing, never raw Mongoose writes), and update the role field after creation if the seed is being reapplied. Skip silently on trio missing. The seeder does not depend on a running dev server; it is invoked via `npm run seed`. Document SEED_ADMIN plus SEED_TECH vars in `.env.example` as dev only. Satisfies **AC-9**.

11. **Reconcile architecture text**: replace the bcrypt reference in `context/architecture.md §Auth and Access Model` with "BetterAuth owns password hashing and writes the resulting hash to `users.passwordHash`; no separate bcrypt dependency is added (per spec 0002 §Decision)". Capture the reconciliation in `## Follow-up` so `/sync` picks it up. The architecture file is a protected file (per `context/ai-workflow-rules.md §Protected Files`), so the edit is folded into this PR rather than deferred. Satisfies cross spec consistency.

12. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. `npm run dev` boots. Hand exercise or Playwright: register a reporter, sign in as the seeded admin, hit `/admin/queue` and verify 403 when accessed as reporter, hit `/api/admin/...` as reporter and verify 403 JSON, sign out and hit a protected path to verify redirect. Verify the production build output no longer contains the inlined `NEXT_PUBLIC_ALLOW_MOCK_ROLE` string. Satisfies **AC-8** and **AC-10**.

## Consequences

**Positive**:

- Slice 1 features (submission, reporter dashboard) get a real session to build on; spec 0003's placeholder is retired outright.
- Defense in depth: page level checks catch misconfigurations of `middleware.ts`.
- Three BetterAuth managed Mongoose models stay in the same MongoDB cluster via the project's shared connection; no new infrastructure.
- The locked `users` collection stays byte for byte unchanged; spec 0002's contract is preserved.
- Reporter sign up is one form submission; admin and technician onboarding is a single env var driven seed.
- The `MockRoleSwitcher` removal closes the dev affordance so role spoofing is impossible in production builds.

**Negative / tradeoffs**:

- Rate limiting on sign in and sign up is deferred; brute force is unmitigated until the rate limiting feature lands (already on the scope Deferred list).
- Self service password reset is deferred; admin must re seed via BetterAuth admin tooling for forgotten passwords in MVP.
- Magic link and OAuth are deferred; LASU IT might require SSO before go live, in which case this is a feature delta, not a foundation rewrite.
- Account enumeration is partially mitigated via typed errors mapped to 409, but is not fully mitigated until rate limiting is on.
- The middleware matcher must be carefully maintained; a future page added under, for example, `/api/admin/foo` must reuse the matcher or call `getSession` defensively.

**Neutral**:

- New dependencies: `better-auth` plus its Mongoose adapter peer dep. Version pinned at the time of the build, updated later through `/sync`.
- Three new Mongoose model files at `lib/db/models/`, consistent with the pattern locked at spec 0002.
- A new route group `(public)` added to `app/` holding `/sign-in` and `/sign-up`.
- Server Actions are used for sign up, sign in, and sign out instead of REST endpoints; better suited to form post backs and revalidation than REST.
- `lib/auth/role-context.tsx` evolves in place rather than as a v2 file; the old `useCurrentRole` export stays as a one line alias.
- BetterAuth's three internal tables are tracked outside the locked eight in spec 0002; no retroactive change to that spec.
- `context/architecture.md §Auth and Access Model` receives a one line edit (a Follow up item explicitly pairs this work with the edit).

## Follow-up

- [ ] Email verification and password reset (depends on Resend transactional email; deferred per scope Deferred list).
- [ ] Rate limiting on sign in and sign up via `@upstash/ratelimit` (deferred per scope Deferred list).
- [ ] OAuth providers (Google, Microsoft) once LASU IT specifies the identity provider.
- [ ] Magic link sign in (depends on Resend).
- [ ] Anonymous reporter flow as a special signed token not BetterAuth (lands in Feature 5 with the submission flow).
- [ ] Admin only create user flow behind an admin RBAC gate, so admins and technicians can be created from the app without a database write.
- [ ] Admin only password rotation tooling (BetterAuth admin commands wrapped behind admin RBAC).
- [ ] `context/architecture.md §Auth and Access Model` reconciliation: replace the bcrypt reference with the BetterAuth ownership sentence to keep the architecture aligned with the spec 0002 decision. Captured here for `/sync`.
- [ ] Consider installing the `better-auth-best-practices` skill into `AGENTS.md` `## Agent skills` so future sessions land on it automatically; already referenced in this spec but not yet listed at the project entry point.
- [ ] When LASU IT provisions SSO or a corporate email, choose between magic link and OAuth based on the identity provider they supply; the BetterAuth surface already accommodates either as an additive provider.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 4 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (BetterAuth locked at §Stack; §Auth and Access Model with the middleware path, the cookie regime, the route group allowlist, the anonymous reporter note, and the PII discipline)
- `context/code-standards.md` (route handler ordering; Server vs Client component conventions; the file organization rule "all MongoDB access through Mongoose models"; the "Server Actions preferred over REST for internal mutations" guidance)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist before moving to the next unit; the protected files list including `context/architecture.md` and `lib/auth/config.ts`)
- `docs/specs/0002-data-model.md` (the locked `users` schema: `email` unique and indexed, `passwordHash` optional and BetterAuth managed, `role` enum required, `anonymousId` optional; the toPublicJSON contract that strips `passwordHash` before API responses)
- `docs/specs/0003-design-system-ui-foundation.md` (the `RoleProvider` contract and `useCurrentRole` hook that this feature supersedes; the `SignOut` placeholder button now wired to a real Server Action; the `NEXT_PUBLIC_ALLOW_MOCK_ROLE` removal mandate from the Follow up item; the foundation design tokens reused on `/sign-in` and `/sign-up`)
- `better-auth-best-practices` skill at `C:/Users/Korede/.pi/agent/skills/better-auth-best-practices/` (BetterAuth client conventions; Mongoose adapter configuration; Server Action wiring; cookie regime)
- `mongodb` skill at `C:/Users/Korede/.agents/skills/mongodb/` (Mongoose schema patterns; embedding vs reference; connection lifecycle; idempotent index creation)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line in `scope.md`: prove the whole pipe works before building any part of it fully)
- BetterAuth official pattern for the `nextCookies` plugin plus the Mongoose adapter in Next.js App Router
- "Reinventing auth is the wrong call" pattern (architect skill persona: building authentication correctly is extremely hard; use a proven library)
- Defense in depth: middleware plus per page session check; never rely entirely on one layer
- "Configuration required lists every env var explicitly" (architect skill convention; the spec lifts BETTER_AUTH_SECRET, BETTER_AUTH_URL, the SEED_ADMIN plus SEED_TECH trios, and removes NEXT_PUBLIC_ALLOW_MOCK_ROLE)
- "One Mongoose model per MongoDB collection" consistency with spec 0002 lock
- Public sign up role is always reporter and is server enforced (no client side privilege escalation)
- Tracer Bullet end to end discipline: stand up auth surface in one slice before thickening the pages and the seed
