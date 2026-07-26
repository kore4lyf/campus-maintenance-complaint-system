# Verify: Authentication · spec 0004 · updated 2026-07-26

_Steps derived from spec 0004 authentication acceptance criteria. `/check verify authentication` runs these; `/test authentication` locks the durable ones._

## UI / manual

- [ ] Visit `/sign-up` (clean cookies) → sign up a new reporter with email `r@example.com`, password `longpass1`, name `Reporter One` → expect redirect to `/complaints/mine` and a `better-auth.session_token` cookie in the response. → **AC-1**
- [ ] Sign out, then sign in as the registered reporter at `/sign-in?redirect=/complaints/mine` with valid credentials → expect a session cookie and redirect to `/complaints/mine`. → **AC-2**
- [ ] At `/sign-in`, sign in as an admin (seeded) → expect redirect to `/admin/queue`. → **AC-2**
- [ ] At `/sign-in`, sign in as a technician (seeded) → expect redirect to `/technician/queue`. → **AC-2**
- [ ] Sign in, click SignOut in the top nav → expect cookie clear, redirect to `/`, and a subsequent visit to `/complaints/mine` redirects to `/sign-in?redirect=/complaints/mine`. → **AC-3**
- [ ] With no session cookie, hit `/admin/queue` → expect redirect to `/sign-in?redirect=%2Fadmin%2Fqueue`. → **AC-4**
- [ ] As a signed in reporter, hit `/admin/queue` → expect a 403 response with a rendered HTML error card. → **AC-4**
- [ ] As a signed in reporter, hit `/api/admin/anything` → expect a 403 response with JSON body `{ "error": { "code": "forbidden", "message": "Forbidden" } }`. → **AC-4**
- [ ] As a signed in reporter, hit `/api/complaints` → expect the request to be permitted (allowed for any authenticated role). → **AC-4**
- [ ] Browser inspector on `/sign-in` → confirm no region labelled "Mock role switcher" / "Dev only: mock role". → **AC-8**
- [ ] Build the production bundle (`npm run build`) → grep the production output for `NEXT_PUBLIC_ALLOW_MOCK_ROLE`; expect zero matches. → **AC-8**

## Commands

- [ ] `npx tsc --noEmit` (`npm run typecheck`) → expect clean exit. → **AC-10**
- [ ] `npm run lint` → expect clean exit. → **AC-10**
- [ ] `npm test` → expect all suites green; include the new `lib/db/models/session.test.ts`, `account.test.ts`, `verification.test.ts`, `lib/auth/config.test.ts`, `lib/auth/actions.test.ts`, `lib/auth/role-context.test.tsx`, `components/shared/SignOut.test.tsx`, `components/shared/TopNav.test.tsx`, `components/shared/MobileBottomNav.test.tsx`. → **AC-10**
- [ ] `npm run build` → expect clean exit. → **AC-10**
- [ ] `npm run dev` boots clean on port 3000. → **AC-10**
- [ ] `npm run seed` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` set, then `SEED_TECH_*` set → expect the seed to upsert both users (sign in as either afterwards works); running the seed again idempotently reports "updated" for each. → **AC-9**
- [ ] `npm run seed` without `SEED_*` env trios → expect the seeder to skip the admin and technician steps silently and only run the category plus location steps. → **AC-9**
- [ ] `node -e "require('better-auth').betterAuth({...})"` — confirms the auth client is instantiated with `emailAndPassword`, `nextCookies`, and `mongodbAdapter`. Inspect `lib/auth/config.ts`. → **AC-5**
- [ ] `ls lib/db/models/{session,account,verification}.{ts,test.ts}` → expect six files present. → **AC-6**
- [ ] `grep -r "MockRoleSwitcher" --include="*.ts" --include="*.tsx"` → expect only the AC-8 negative assertion in `lib/auth/role-context.test.tsx`; everything else zero. → **AC-8**
- [ ] `grep "NEXT_PUBLIC_ALLOW_MOCK_ROLE" .env.example` → expect zero matches (line deleted). → **AC-8**

## Playwright smoke (system Chrome via `channel: "chrome"`)

- [ ] Reporter happy path: register a new reporter at `/sign-up` → land on `/complaints/mine` with a session cookie. → **AC-1**
- [ ] Seeder admin: sign in as the seeded admin at `/sign-in` → land on `/admin/queue`. → **AC-2**
- [ ] Sign out: click SignOut button in TopNav → land on `/` and `/complaints/mine` redirects to sign in. → **AC-3**
- [ ] Role mismatch: as reporter hit `/admin/queue` → 403 page renders. → **AC-4**
- [ ] Role mismatch API: as reporter fetch `/api/admin/anything` → 403 JSON. → **AC-4**

## Acceptance-criteria coverage

- **AC-1** sign-up reporter end to end → UI step "Visit /sign-up" + Playwright "Reporter happy path"
- **AC-2** sign in role-based landing plus redirect → UI step "Sign in as reporter / admin / technician" + Playwright "Seeder admin"
- **AC-3** sign out via Server Action → UI step "Sign out, then revisit" + Playwright "Sign out"
- **AC-4** middleware redirects + 403 enforcement → UI steps "Unauthenticated → /admin/queue redirect", "Reporter → /admin/queue 403", "Reporter → /api/admin/... 403 JSON", "Reporter → /api/complaints allowed" + Playwright "Role mismatch" cases
- **AC-5** lib/auth/config.ts shape + catch-all route → Commands "Inspect lib/auth/config.ts", "ls app/api/auth/[...all]/route.ts"
- **AC-6** three BetterAuth-managed Mongoose models → Commands "ls lib/db/models/{session,account,verification}.{ts,test.ts}" + Jest coverage
- **AC-7** useCurrentUser contract plus back-compat alias → Jest suite `lib/auth/role-context.test.tsx`, assert `useCurrentUser` shape, assert `useCurrentRole` alias works, assert TopNav and MobileBottomNav render unchanged
- **AC-8** MockRoleSwitcher removed → Commands "grep MockRoleSwitcher", "grep NEXT_PUBLIC_ALLOW_MOCK_ROLE in .env.example", UI step "no Mock role switcher in DOM" + Production bundle grep
- **AC-9** scripts/seed.ts extended with SEED_ADMIN + SEED_TECH → Commands "npm run seed with trios", "npm run seed without trios"
- **AC-10** build gates green + smoke passes → Commands "typecheck / lint / test / build / dev" + Playwright smoke above

## Value sourcing coverage (behavioral layer)

Each row of the spec's **Value sourcing** table must be exercised. The gate is design time only; this layer catches a mis sourced value (e.g. role derived from the wrong field) at runtime.

- Sign-up always writes `role: 'reporter'`: register a reporter and verify (via direct DB query or admin UI in a later feature) that `users.role === 'reporter'`.
- Sign-up password hashing: register a reporter and confirm the persisted record's password field respects BetterAuth's hash, not a hand-written bcrypt.
- Sign-in session cookie is BetterAuth issued: log response cookies after sign-in.
- Sign-in role-based landing: vary signing in as reporter, admin, technician and verify the redirect target matches the table.
- Sign-in redirect param honored: pass `?redirect=/complaints/mine` and verify the post sign-in redirect picks it up; pass external URL and verify it falls back to the role landing.
- Middleware redirect target: encoded request pathname appears in `?redirect=`.
- Middleware allowlist: vary reporter token against all four protected prefixes and verify the right outcome (allowed for `/api/complaints`, 403 for `/admin`, `/api/admin`, `/technician`, `/api/technician`).
- TopNav displays user name: sign in as a user with a non empty `name` and assert it appears in the header.
- SignOut clears cookie: assert `better-auth.session_token` is removed after SignOut.
