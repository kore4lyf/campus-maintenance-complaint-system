# 0004. Authentication — Decision History (rationale)

This file is the decision record for spec 0004. The build contract is in
[`index.md`](./index.md); durable verify steps live in [`verify.md`](./verify.md).

## Context

Spec 0003 (Design system and UI foundation) shipped layouts and a role aware shell that read from a placeholder `RoleProvider` so the foundation could be exercised end to end without real auth. The placeholder is now a debt: every layout call site reads through `useCurrentRole()` which intentionally returns `null` in production builds, blocking access to the role aware pages that Slice 1 features will build inside. Real auth is the gating dependency for auth, submission, and reporter dashboard (Features 4, 5, and 6). The architecture context locks BetterAuth as the auth library, the data model spec locks the `users` schema, and the architecture section "Auth and Access Model" already specifies the proxy file convention (originally described as middleware plus a redefined split into proxy plus DAL after Next.js 16 renamed the file convention), the cookie regime, the three role classes, and the route group allowlist. The remaining decisions for this spec are: sign up role policy (who self registers versus who is seeded), the BetterAuth client surface (email and password only versus magic link versus OAuth), the `useCurrentUser` contract that supersedes spec 0003's `useCurrentRole`, and the RBAC enforcement layering at the proxy plus at the Data Access Layer plus at the page plus at the route handler. Password reset, email verification, and the anonymous reporter flow are explicitly deferred so the spec does not depend on Resend transactional email or on Feature 5's submission data model.

## Options considered

### Option 1: BetterAuth email plus password now (chosen)

Email and password only, via BetterAuth, with the Mongoose adapter. Sign up at `/sign-up` self service for reporters; admin and technician accounts exist only via the seed script per AC-9. `proxy.ts` at project root plus `lib/auth/dal.ts` enforce RBAC per AC-4 (proxy does the optimistic redirect, DAL does the authoritative role gate next to the data). Anonymous reporter flow, password reset, email verification, magic link, and OAuth are explicitly deferred.

**Pros**:

- Matches the architecture's BetterAuth decision and the locked `users` schema.
- Tracer Bullet discipline: the auth path is the smallest end to end slice that unblocks Slice 1.
- Reuses the locked `users` Mongoose model without a schema migration.
- Native defense in depth via project root proxy for the optimistic redirect plus `lib/auth/dal.ts` for the authoritative session check plus per page requireRole for the role gate.
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

Roll our own `bcrypt` plus custom session cookie plus custom proxy plus custom DAL.

**Pros**:

- No library dependency, full control.

**Cons**:

- Reinventing auth is the explicit anti pattern called out by the architect skill persona; building authentication correctly is extremely hard and a single mistake is a breach.
- Contradicts the architecture's locked BetterAuth decision.
- Larger build, more attack surface, more code to test.

## Rationale

Two specific forces from Context drive the choice. First, the architecture context already locks BetterAuth as the auth library, with a defined proxy plus DAL path and a defined cookie regime. Building a custom auth layer would contradict the lock and ship rework. Second, spec 0003 ships a working foundation shell that Block Reader's call sites (`TopNav`, `MobileBottomNav`, the role aware layouts) all depend on `useCurrentRole()`; extending the hook into `useCurrentUser()` without ripping it up preserves those call sites working unchanged. A blank slate approach that ships a fresh context layer would force a wide spread edit to spec 0003 call sites at the same time as auth lands, multiplying the change surface across two specs.

The sign up role policy is locked at reporters self registering and admins plus technicians seeded only because privilege escalation through a public sign up form is a serious and easy mistake; gating admin and technician creation behind a controlled env var (the seed script's trio) keeps the audit trail simple and matches the data model's `role` enum. Email verification, password reset, magic link, OAuth, and the anonymous reporter flow are deferred because each one pulls in an infrastructure dependency (Resend transactional email, an IdP integration, the submission data model) that is not owned by Feature 4 and is on the scope Deferred list. The deferred decisions are listed in `## Follow-up` rather than buried, so they surface for the next pass.

The `MockRoleSwitcher` removal is non negotiable now that real auth exists; keeping the dev affordance alongside BetterAuth would invite role spoofing in production builds, and the spec 0003 follow up item already committed the swap.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 4 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (BetterAuth locked at §Stack; §Auth and Access Model with the proxy and DAL split, the cookie regime, the route group allowlist, the anonymous reporter note, and the PII discipline)
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
- Defense in depth: proxy (optimistic redirect) plus DAL (authoritative session check) plus per page requireRole (redirect on mismatch); never rely entirely on one layer
- "Configuration required lists every env var explicitly" (architect skill convention; the spec lifts BETTER_AUTH_SECRET, BETTER_AUTH_URL, the SEED_ADMIN plus SEED_TECH trios, and removes NEXT_PUBLIC_ALLOW_MOCK_ROLE)
- "One Mongoose model per MongoDB collection" consistency with spec 0002 lock
- Public sign up role is always reporter and is server enforced (no client side privilege escalation)
- Tracer Bullet end to end discipline: stand up auth surface in one slice before thickening the pages and the seed
