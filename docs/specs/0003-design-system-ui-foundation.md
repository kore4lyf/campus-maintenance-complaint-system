# 0003. Design system and UI foundation

**Date**: 2026-07-25
**Status**: Accepted

## Summary

This spec lays the foundation every UI surface the system needs: design tokens, providers (Astryx theme, next-themes, TanStack React Query, Sonner Toaster), role aware layout shells for reporter, admin, and technician, role aware empty states, error boundaries, and a design tokens reference at `docs/design.md`. It commits the project to the Astryx design system on top of Tailwind 4, with theme persistence in a `next-themes` cookie and a single placeholder role context the auth feature will swap. The build makes the foundation visible end to end across all three route groups before Slice 1 builds into it.

## Context

The Slice 1 features (auth, submission, reporter dashboard) all consume UI primitives, route group layouts, theme persistence, and a role context. Without a foundation, the first feature either invents one offs in code or duplicates wiring. The architecture context locked Astryx (`@astryxdesign/core`, `@astryxdesign/theme-neutral`) as the component library, Tailwind 4 as the styling layer, and `next-themes` for theme persistence. The `ui-context.md` file locked the colour palette (brand green, accent sky, severity family), typography (Inter with system fallback per Feature 01), spacing philosophy, and severity to colour semantics. The data model is already `Accepted` (spec 0002); this feature adds zero schema fields. The build approach on the scope header line is Tracer Bullet, so the foundation must render end to end through every layer (server, client, providers, route group layout, components, empty state, error boundary) before Slice 1 thickens any of them.

The trade off waiting to be made is between letting Slice 1 each invent its own shell (fast at first, drift later) and lifting this foundation now (slower now, one done well). `ui-context.md` already locks the palette, sizing, and component library. The Astryx community skill is installed and spells out the exact globals.css import order, the `Providers` shape, and the Tailwind to Astryx token bridge, so the foundation has authoritative guidance to lift from rather than reinvent.

## Requirements

**User stories**:

- As a developer building Slice 1 features (auth, submission, reporter dashboard), I want stable UI primitives, providers, layout shells, and a design tokens reference so that I never reinvent typography, theming, or empty state patterns per feature.
- As a DICT administrator, technician, or reporter, I want the app to render with the correct role aware navigation, severity badges, theme toggle, and empty states so that any screen I land on tells me what to do next.
- As a developer, I want a single role context (`useCurrentRole`) with a dev only mock role switcher so that layouts and components can be built and demoed without waiting for BetterAuth.
- As a developer, I want a typed error boundary with a retry affordance so that request failures never crash the rest of the app.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `docs/design.md` exists and covers: type scales (`text-sm` through `text-3xl`), colour tokens (brand, accent, surface, muted, danger, warning, success per `ui-context.md §Colors`), severity to colour mapping, spacing philosophy, border radius family, shadow family, the component inventory mapping (Astryx primitive to project composite), and the layout pattern catalog (top nav, mobile bottom nav, empty states).
- **AC-2**: `app/globals.css` imports Tailwind theme, base, utilities plus the Astryx layers (`@astryxdesign/core/reset.css`, `@astryxdesign/core/astryx.css`, `@astryxdesign/theme-neutral/theme.css`, `@astryxdesign/core/tailwind-theme.css`) in the order specified by the astryx skill; the dev server boots with zero console errors and renders each of the three route group landing pages.
- **AC-3**: `app/providers.tsx` (a `'use client'` module) wires five providers in this order: Astryx `Theme` (using `neutralTheme`), Astryx `LinkProvider` (using Next `Link`), `next-themes` `ThemeProvider` (with `attribute="class"`, `defaultTheme="system"`, `enableSystem` true, `storageKey="theme"`, `disableTransitionOnChange` true), `QueryClientProvider` (TanStack React Query with `staleTime` 60s, `refetchOnWindowFocus` true, `retry` 1), and Sonner `<Toaster/>` (position top right, `richColors` true, `expand` false, `closeButton` true, `duration` 5000 ms). `app/layout.tsx` uses the `Providers` component and sets `suppressHydrationWarning` on the `<html>` element.
- **AC-4**: Three role aware layouts exist: `app/(reporter)/layout.tsx`, `app/(admin)/layout.tsx`, `app/(technician)/layout.tsx`. Each renders top nav (LASU CMS brand mark + role menu + theme toggle + sign out placeholder), a role aware mobile bottom nav, and reads the current role from `useCurrentRole()`. When the role is null (no mock, no auth), the layouts render a generic sign in CTA instead of crashing.
- **AC-5**: Three empty state composites exist: `components/reporter/ReporterDashboardEmpty.tsx`, `components/admin/AdminQueueEmpty.tsx`, `components/technician/TechnicianQueueEmpty.tsx`. Each uses Astryx primitives with a centred icon (lucide-react), descriptive copy, and a primary CTA per `ui-context.md §Layout Patterns`.
- **AC-6**: Global error boundary renders a typed error screen. `app/error.tsx` (typed recoverable), `app/global-error.tsx` (unrecoverable, inline `<html lang="en">` with body), and per route group `error.tsx` files cover every layer. Each renders the Astryx Dialog visual vocabulary with a retry affordance and a user safe message produced by `toUserMessage` (from `lib/utils/errors.ts`, locked in spec 0002).
- **AC-7**: Theme toggle works: clicking cycles light to dark, the `next-themes` cookie persists the choice, and reload renders the correct theme without first paint flash. `suppressHydrationWarning` on `<html>` allows the class divergence.
- **AC-8**: Keyboard navigation: every Astryx primitive used (Button, Dialog, Input, Select, Switch, Tabs, Toast triggers) round trips Tab focus correctly. Enter and Space activate buttons and links. Focus visible (Astryx default). No focus traps. ARIA labels present where the icon only affordance would otherwise be ambiguous.
- **AC-9**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; `npm run dev` boots cleanly. MockRoleSwitcher is absent from the production build output.

## Options considered

### Option 1: Foundation now (full scope from Q1-A)

Tokens plus providers plus role aware layout shells plus empty states plus error boundaries plus the design tokens reference.

**Pros**:
- One done well; Slice 1 features build into a stable, opinionated shell.
- Design system consistency from day one; severity, spacing, type already decided.
- Tracer Bullet discipline satisfied: thin end to end layer visible across every route group before any feature thickens it.

**Cons**:
- Bigger first cut; nine ACs to coordinate.
- AC count is higher than the smallest possible scope; takes longer than three or four AC cut.

### Option 2: Tokens and providers only; defer shells

Just the design tokens reference and the global providers, no role aware shells, no empty states, no error boundaries.

**Pros**:
- Smallest acceptance surface; fewer conventions to debate now.

**Cons**:
- Slice 1 ends up inventing its own shells.
- Design.md never lands, so the scope's "Done when" line for this feature is partially unmet.
- Drift between features on navigation, empty states, and error treatment.

### Option 3: Defer the foundation as a separate feature entirely

Skip this spec; build shells and tokens per feature as each Slice 1 feature needs them.

**Pros**:
- No up front work; lowest first day cost.

**Cons**:
- No single source of truth for tokens or shells.
- Every feature reinvents.
- AC for design system never satisfied.
- Tracer Bullet discipline broken: the end to end layer is missing on day one of Slice 1.

## Decision

**Chosen option**: Option 1: foundation now (full scope from Q1-A).

The build lifts the design tokens, providers, role aware layout shells, role aware empty states, error boundaries, and the docs/design.md tokens reference in this feature. No Mongoose schema fields are added or changed. No new server actions or HTTP endpoints are added. The role context is a placeholder the auth feature replaces.

**Implementation skills**: `astryx` (`facebook/astryx`, `C:/Users/Korede/.agents/skills/astryx/`) — globals.css layer order, Providers shape, LinkProvider integration with Next router, Tailwind to Astryx token bridge. `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — strict mode Server vs Client component conventions for `app/layout.tsx` and the per route group layouts.

## Rationale

Two specific forces from Context drive the choice. First, the build approach on the scope header is Tracer Bullet, so a thin end to end layer visible across every route group must exist before any feature thickens. Without the foundation, the first feature in Slice 1 would have to lay the foundation implicitly, breaking the discipline. Second, `ui-context.md` and `context/architecture.md` already lock Astryx as the component library, the colour palette, and the severity to colour mapping; re deriving them per feature would contradict the locks and create drift across pages. The cost of doing this once is bounded by AC count; the cost of doing it twice across three Slice 1 features and again across Slice 2 and Slice 3 is unbounded.

The role context is left as a placeholder because BetterAuth (Feature 4) is the canonical source of the signed in user. Building a full role context today would either be throwaway (replaced when BetterAuth lands) or duplicated (kept in parallel to BetterAuth). The hook contract (`useCurrentRole`) is small enough that BetterAuth can replace the implementation with one provider swap. The MockRoleSwitcher exists so that role aware layouts can be exercised end to end without auth, but it is gated by a build time env so production builds cannot ship it.

Theme persistence lives in a `next-themes` cookie rather than a `users` column because `ui-context.md` defaults to system preference (no persisted user choice for the unauthenticated reader), and the next-themes library already handles initial class injection without first paint flash when configured correctly (`suppressHydrationWarning` plus `attribute="class"`). A `users.themeChoice` column would require a migration, a settings UI, and persistent queries for a question that has OS preference as a low friction default.

## Feature design

**Data model sketch**:

This feature adds zero Mongoose models and zero Mongoose fields. The `users` collection is unchanged from spec 0002 (`Accepted`). Theme persistence lives in a `next-themes` managed cookie keyed `theme` with values `light`, `dark`, or absent (system default). The cookie is owned by `next-themes`; no other code reads or writes it.

**API surface**:

This feature ships zero HTTP endpoints and zero Server Actions. The React exports:

| Export | Kind | Signature | Read by |
|---|---|---|---|
| `Providers` | component | `<Providers>{children}</Providers>` | `app/layout.tsx` |
| `RoleProvider` | component | `<RoleProvider initial={...}>{children}</RoleProvider>` | `Providers` |
| `useCurrentRole` | hook | `(): 'reporter' | 'dicht_admin' | 'dicht_technician' | null` | role aware layouts and components |
| `MockRoleSwitcher` | component | mounts only when `NEXT_PUBLIC_ALLOW_MOCK_ROLE === "1"` | dev only; production builds strip it |
| `TopNav` | component | `<TopNav />` | each route group layout |
| `MobileBottomNav` | component | `<MobileBottomNav />` | each route group layout |
| `ThemeToggle` | component | `<ThemeToggle />` | `TopNav` |
| `SignOut` | component | `<SignOut />` (placeholder that calls no auth action yet) | `TopNav` |
| `ReporterDashboardEmpty`, `AdminQueueEmpty`, `TechnicianQueueEmpty` | component | centred icon + copy + primary CTA | respective role landing pages |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| `app/layout.tsx` renders top level shell | current theme class on `<html>` | `next-themes` `ThemeProvider` (cookie + OS preference) |
| Route group layout renders top nav brand | fixed string "LASU CMS" | hand written constant in `TopNav` |
| Route group layout renders user role | role string | `useCurrentRole()` reading `RoleProvider` context |
| Route group layout renders mobile bottom nav tabs | role specific destination paths | hand written constants per role in `MobileBottomNav` |
| ThemeToggle click | next theme ("light" or "dark") | `next-themes` `useTheme` hook; persisted by library to cookie `theme` |
| MockRoleSwitcher renders | mock role | `NEXT_PUBLIC_ALLOW_MOCK_ROLE` build time env (must equal "1") |
| Empty state primary CTA href | destination route | hand written constants per role (`/complaints/new`, `/admin/queue`, `/technician/queue`) |
| Error boundary message | user safe copy | `toUserMessage(error)` helper from `lib/utils/errors.ts` |

**Key invariants** (rules that must always hold):

- One `Providers` instantiation per app. Mounted only in `app/layout.tsx`; never in route group layouts or page files.
- One Sonner `<Toaster/>` instance globally.
- One `theme` cookie keyed exactly `next-themes` `storageKey`; no other code reads or writes it.
- `MockRoleSwitcher` renders if and only if `NEXT_PUBLIC_ALLOW_MOCK_ROLE === "1"`; never renders in production builds.
- `suppressHydrationWarning` is set on `<html>` in `app/layout.tsx` (the documented next-themes pattern for `attribute="class"`); no other element gets the attribute.
- Route group layouts read role from `useCurrentRole()` only; no module level hardcoded role constant is imported by layouts or components.
- `disableTransitionOnChange` is true on `ThemeProvider` so colour transitions do not flash on toggle.

**Security model**:

- This feature ships no role based access enforcement; that lands in BetterAuth (Feature 4). The role context here is a placeholder for dev affordance.
- `MockRoleSwitcher` is gated by the build time env `NEXT_PUBLIC_ALLOW_MOCK_ROLE === "1"`. Because it is a `NEXT_PUBLIC_*` env var, Next.js inlines the value at build time; if the value is not "1" in the production build env, the component is dead code that React tree shakes out. AC-9 asserts this absence in the built output.
- No PII is held on the client. The theme preference is a single boolean stored in a cookie.
- No secrets, API keys, or credentials are bundled into the client.
- Error boundaries render user safe messages via `toUserMessage` from `lib/utils/errors.ts`; raw `error.stack` never reaches the response body (consistent with `context/code-standards.md §API Routes` and the toPublicJSON decision in spec 0002).
- Server Components by default; `'use client'` only in `app/providers.tsx`, `lib/auth/role-context.tsx`, and the components that genuinely need interactivity (`ThemeToggle`, `MockRoleSwitcher`, the empty state CTA buttons that route to other pages). No telemetry, analytics, or third party scripts run in Server Components.

**Configuration required**:

- `NEXT_PUBLIC_ALLOW_MOCK_ROLE` (Next.js public env, build time inlined): when set exactly to `"1"`, `MockRoleSwitcher` mounts. Any other value (including unset) keeps it off. Add to `.env.example` with a comment noting "dev only" and "leave unset in production builds". This is the only new configuration.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: `docs/design.md` exists, contains every required heading. Verifies **AC-1**.
- **Happy path**: `npm run dev` boots with zero console errors and renders the landing page of each of the three route groups. Verifies **AC-2**.
- **Happy path**: clicking the theme toggle cycles light then dark, reload preserves the choice, no first paint flash on reload. Verifies **AC-3**, **AC-7**.
- **Failure case**: when `useCurrentRole` returns null, route group layouts still render with a generic sign in CTA rather than crashing. Verifies **AC-4**.
- **Auth/permission**: with `NEXT_PUBLIC_ALLOW_MOCK_ROLE` unset, `MockRoleSwitcher` is absent from the DOM tree at every route in production. Verifies **AC-9**.
- **Failure case**: a route handler throwing inside `app/(reporter)/complaints/new/mocked` causes only that page to render the error boundary, not the parent layout or any sibling route. Verifies **AC-6**.
- **Happy path**: every Astryx primitive used in the foundation (Button, Dialog, Input, Select, Switch, Tabs) round trips Tab focus correctly and activates on Enter or Space. Verifies **AC-8**.
- **Happy path**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all green. Verifies **AC-9**.

## Build plan

Tracer Bullet ordering. Each task is a thin slice that produces a working visible artefact before the next adds depth. Tasks are grouped by layer, mirroring the build approach lens: stand up end to end first (providers shell renders), then thicken (role aware shells), then harden (error boundaries, build gates).

1. **Add dependencies and env example**. Install `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `next-themes`, `@tanstack/react-query`, `sonner`, plus the `lucide-react` icons confirmed in `ui-context.md`. Add `NEXT_PUBLIC_ALLOW_MOCK_ROLE` to `.env.example` with a dev only comment. Satisfies **AC-2** prerequisites, **AC-3** prerequisites.

2. **Author `docs/design.md`**. Cover the type scale, the colour palette (brand, accent, surface, muted, danger, warning, success) per `ui-context.md §Colors`, the severity to colour mapping table, spacing philosophy, border radius family, shadow family, the component inventory mapping (Astryx primitive to role composite), and the layout pattern catalog (top nav, mobile bottom nav, empty states). Reference `ui-context.md` as the source so the two files stay aligned. Satisfies **AC-1**.

3. **Update `app/globals.css`**. Import Tailwind theme, base, utilities plus the Astryx layers (`@astryxdesign/core/reset.css`, `@astryxdesign/core/astryx.css`, `@astryxdesign/theme-neutral/theme.css`, `@astryxdesign/core/tailwind-theme.css`) in the order documented by the astryx skill. Satisfies **AC-2**.

4. **Create `lib/auth/role-context.tsx`**. Export `RoleProvider`, `useCurrentRole` (returns `'reporter' | 'dicht_admin' | 'dicht_technician' | null`), and `MockRoleSwitcher`. `RoleProvider` defaults to `null`. `MockRoleSwitcher` mounts only when `process.env.NEXT_PUBLIC_ALLOW_MOCK_ROLE === "1"`. Satisfies **AC-3** wiring prerequisites, **AC-4** role context.

5. **Create `app/providers.tsx` as a `'use client'` module**. Wire Astryx `Theme` (using `neutralTheme`), Astryx `LinkProvider` (using Next `Link`), `next-themes` `ThemeProvider` (with `attribute="class"`, `defaultTheme="system"`, `enableSystem` true, `storageKey="theme"`, `disableTransitionOnChange` true), `QueryClientProvider` (TanStack React Query with `staleTime` 60s, `refetchOnWindowFocus` true, `retry` 1), and Sonner `<Toaster/>` (position top right, `richColors` true, `expand` false, `closeButton` true, `duration` 5000 ms). Include `RoleProvider` (from step 4) inside the tree. Satisfies **AC-3**.

6. **Update `app/layout.tsx`**. Wrap children with `<Providers>`. Add `suppressHydrationWarning` to `<html>`. Replace the bare default shell with the foundation shell (top nav moves into the per route group layout below; root layout stays minimal so route group layouts own the visible chrome). Satisfies **AC-3** layout wiring, **AC-7** first paint setup.

7. **Create `components/shared/TopNav.tsx`, `MobileBottomNav.tsx`, `ThemeToggle.tsx`, `SignOut.tsx`**. `TopNav` renders brand mark "LASU CMS", role menu (from `useCurrentRole`), `ThemeToggle`, and `SignOut` placeholder. `MobileBottomNav` reads role and renders role appropriate tabs (reporter: Submit, List, Mine; admin: Queue, Reports, Escalations; technician: Queue). `ThemeToggle` uses `next-themes` `useTheme`. `SignOut` renders a placeholder button (no auth action yet; BetterAuth wires it in Feature 4). Satisfies **AC-4** shared chrome.

8. **Create the three role aware layouts**: `app/(reporter)/layout.tsx`, `app/(admin)/layout.tsx`, `app/(technician)/layout.tsx`. Each imports `TopNav` and `MobileBottomNav`, wraps `children`, and handles the null role path (renders a sign in CTA). Satisfies **AC-4**.

9. **Create the three empty state composites**: `components/reporter/ReporterDashboardEmpty.tsx`, `components/admin/AdminQueueEmpty.tsx`, `components/technician/TechnicianQueueEmpty.tsx`. Each uses Astryx primitives with a centred lucide-react icon, descriptive copy, and a primary CTA per `ui-context.md §Layout Patterns`. Primary CTAs route to `/complaints/new`, `/admin/queue`, `/technician/queue` respectively. Satisfies **AC-5**.

10. **Create the error boundaries**: `app/error.tsx` (typed recoverable), `app/global-error.tsx` (unrecoverable, with inline `<html lang="en">` containing the body), `app/(reporter)/error.tsx`, `app/(admin)/error.tsx`, `app/(technician)/error.tsx`. Each uses Astryx Dialog visual vocabulary and renders the user safe copy from `toUserMessage(error)` (from `lib/utils/errors.ts` per spec 0002). Satisfies **AC-6**.

11. **Run all build gates plus dev server smoke test**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Then `npm run build` output is grepped for the inlined string `NEXT_PUBLIC_ALLOW_MOCK_ROLE` to assert the prod env was unset during build. Then `npm run dev` boots and each of the three route group landing pages renders with no console errors. Theme toggle round trip is verified by hand in a browser. Tab focus round trip is verified by hand or with a Playwright keyboard test. Satisfies **AC-2**, **AC-7**, **AC-8**, **AC-9**.

## Consequences

**Positive**:

- Every Slice 1 feature builds into a stable, opinionated shell with zero duplication of providers, layout, or empty state patterns.
- `docs/design.md` makes new pages cheap: severity, spacing, type, and component choice are all pre decided.
- Theme persistence and role shell wiring are solved once, not per feature.
- Tracer Bullet early visibility satisfied: the foundation is the working app after this feature, before any business logic lands.
- Role aware layouts are exercised end to end now via MockRoleSwitcher; the same layouts swap to BetterAuth in Feature 4 with a single provider replacement.

**Negative / tradeoffs**:

- AC count is high (nine), so this feature takes longer than the smallest possible cut.
- MockRoleSwitcher adds a context provider whose only purpose is dev affordance. If someone forgets the env gate, role spoofing leaks into production builds. Mitigated by the build time env gate plus AC-9's grep assertion on the built output.
- Astryx is in beta (v0.1.7 per `context/architecture.md`); future API churn may require a maintainer pass. Mitigated by a single import surface inside `components/shared/`, `components/ui/`, and the per role folders, plus the astryx skill as authoritative reference.
- The system font stack (chosen in Feature 01 because Google Fonts were unavailable in the build env) is less typographically distinctive than `next/font` Inter. Revisit if LASU IT supplies specific typography and the build env improves.
- `next-themes` adds one line of runtime CSS transition suppression. A reader of the codebase must understand the `suppressHydrationWarning` trade off; fold a one sentence note into `docs/design.md`.

**Neutral**:

- One new env var (`NEXT_PUBLIC_ALLOW_MOCK_ROLE`) introduced; documents a dev affordance and defaults off in production.
- New dependencies are bounded to the named Astryx packages, `next-themes`, `@tanstack/react-query`, `sonner`, `lucide-react`. All named in `ui-context.md §Stack`.
- `docs/design.md` becomes a long lived reference; future updates land via the `sync` skill alongside `context/ui-context.md` changes.

## Follow-up

- [ ] `MockRoleSwitcher` should be replaced by the BetterAuth session harness in Feature 4. The auth spec (Feature 4, planned) must note the swap and add a `useCurrentRole` provider replacement to its build plan.
- [ ] If LASU IT supplies specific typography or LASU brand palette, override `docs/design.md` and `context/ui-context.md §Typography` and `§Colors`; then remove any `@apply` style assumptions in `tailwind.config.ts`.
- [ ] Astryx v0.1.7 is beta; track the v1 release and revalidate the integration in a follow up maintenance feature.
- [ ] Consider installing the `nextjs-react-typescript` and `tailwind-design-system` community skills into `AGENTS.md` so the implementation context for slice work is one click away. Recommended but not blocking.
- [ ] If `app/(admin)/page.tsx` and `app/(technician)/page.tsx` are still the default Next starter page, replace them as part of a future feature (out of scope here); for now they render through the foundation shell and prove the wiring works.

## References

**Project sources** (verifiable, in this repo):

- docs/scope/scope.md (Feature 3 row: the Done when line, the Tracer Bullet build approach, the Full workflow tier)
- context/ui-context.md (the colour palette, severity to colour mapping, typography, component inventory, layout patterns)
- context/architecture.md (Astryx locked in the Stack section, next-themes, system boundaries, file organization)
- context/code-standards.md (styling rules, file organization, Server vs Client component conventions, the API route handler ordering)
- context/ai-workflow-rules.md (one capability per PR rule; the unit gating checklist before moving to the next unit)
- docs/specs/0002-data-model.md (the lib/utils/errors.ts toUserMessage contract that AC-6 depends on)
- astryx community skill at C:/Users/Korede/.agents/skills/astryx/ (globals.css import order, Providers shape, Tailwind to Astryx token bridge)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line in scope.md: prove the whole pipe works before building any part of it fully)
- next-themes attribute=class together with suppressHydrationWarning on html (the canonical pattern that avoids first paint flash)
- Astryx globals.css import order (per the astryx community skill: Tailwind layers first, Astryx layers after, utilities at the end)
- One Providers instantiation per app (no shared context trees; layout level mounts are wrong)
- Configuration required lists every env var explicitly (architect skill convention; the spec lifts NEXT_PUBLIC_ALLOW_MOCK_ROLE)
