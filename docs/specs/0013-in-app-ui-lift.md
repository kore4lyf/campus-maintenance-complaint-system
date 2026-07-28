# 0013. In-app UI lift

**Date**: 2026-07-28
**Status**: Proposed

## Summary

Brings the in-app screens (reporter, admin, technician, public/auth) up to the
same visual standard as the Home page at `app/page.tsx`, which already has the
richest treatment in the codebase: full-bleed navy CTA band, raised off-white
section bands, sticky `bg-surface/85 backdrop-blur` header, gold-accent kicker
labels at deliberate rhythm, and a hero block with `pt-16 pb-24 sm:pt-24 sm:pb-32
lg:pt-32 lg:pb-40` breathing room. The in-app screens currently paint a flat
white wall from top to bottom with no section rhythm and no navy accent band,
which is the user-visible contrast gap.

This feature adds **one shared component** (`<PageShell>`), a **hero band
content slot** for the page-level kicker/title/subtitle, **two utility
classes** (`section-raised`, `cta-band-brand`) registered through Tailwind 4's
`@theme inline` and `@layer utilities` in `app/globals.css` (with a documented
reason), and applies the shell to every in-app screen that currently lacks
rhythm. No in-app data logic, route handlers, schemas, or auth code is
touched.

## Context

The Home page at `app/page.tsx` enjoyed bespoke treatment because it is the
landing/marketing surface (per `context/ui-context.md` §Theme: "institutional
and neutral ... not a consumer app. Avoid playful colors and decorative
gradients"). The in-app screens share the same design system but never adopted
the section-rhythm pattern. As a result, every post-auth page reads as a flat
list, which the user (project owner) has now flagged as a contrast depth gap
that the Home page does not have.

`progress-tracker.md` lists Features 08 (admin queue) and 09/10 (technician
queue + SLA) as next-up features. Feature 03 "Design system & UI foundation"
is marked Completed but did not include a section-rhythm or full-bleed CTA
contract. This feature closes that follow-up gap and is sequenced before
Features 08–10 ship.

## What the perceived problem actually is

Verified by reading every in-app page and primitive on 2026-07-28:

| Aspect | Home (`app/page.tsx`) | In-app screens |
|---|---|---|
| Page background bands | `bg-surface-raised` raised section + `bg-brand` full-bleed navy band | single flat `bg-surface` from top to bottom |
| Page-level padding | `pt-16 pb-24 sm:pt-24 sm:pb-32 lg:pt-32 lg:pb-40` hero padding | `pt-8 sm:pt-10` max |
| Type scale on h1 | `text-5xl → text-7xl tracking-tight [line-height:1.05]` | `text-3xl → text-4xl` |
| Kicker/eyebrow | 4 gold `accent-strong` kickers planned on `/` (hero pill dot, left col, right col, CTA band button) | 1–2 gold kickers, scattered |
| Card depth | `hero` variant uses `shadow-xl` on navy; `overlay` variant uses `shadow-lg` | default `surface` = hairline border only, no shadow |
| CTA band | full-bleed navy `bg-brand text-white` closing band | no closing band |
| Sticky header | `bg-surface/85 backdrop-blur` (already done in `TopNav.tsx`) | already done |

## Approach

### A. Add `<PageShell>` (one shared component)

A new `components/shared/PageShell.tsx` that wraps the entire page render.
Three composition slots:

1. **Hero band** (top) — `bg-surface-raised` with `border-b border-border`,
   generous vertical padding, slot for kicker / title / subtitle / actions.
   Replaces the small "mb-10 header" pattern on each page with a real visual
   band so every page opens with structure.
2. **Body slot** — children render in default `bg-surface` white below the
   hero band.
3. **CTA band** (optional, bottom) — full-bleed navy using `bg-brand text-white`
   with `py-16 md:py-20 layout`, matches the Home's closing band exactly.

`PageShell` exports a `<PageShellCtaBand>` sub-component for the navy band so
callers can drop it explicitly. Three `displayVariant`s: `hero` (raised band
hero, default), `flat` (no hero band, used by action-only screens like
`/complaints/new` and detail pages that already have their own header), and
`none` (no shell at all, escape hatch).

### B. Two new Tailwind utilities in `app/globals.css` (with documented reason)

Justification: the existing token scale covers colours and shadows but does not
expose named rhythm utilities. Adding two utilities means the in-app screens
stop inventing one-off `bg-surface-raised/80 border-t border-border` strings
and start sharing a single definition. The reason is documented inline at the
top of the new utility block.

- `.section-raised` — `bg-surface-raised border-y border-border` panel band.
- `.cta-band-brand` — `bg-brand text-white` full-bleed navy band.

Both are added in the existing `@layer utilities { ... }` block in
`app/globals.css` — a single block, no new layer, no new CSS file, no
`tailwind.config.ts` edits (the project uses Tailwind 4's `@theme inline`
pattern, so tokens go in CSS, not config). The `@theme inline` block is not
edited; the existing semantic token set already supports these utilities.

### C. Apply `PageShell` to each in-app screen

Per-page application list (surgical, one component swap or one wrapper per page,
no logic change):

- `app/(reporter)/complaints/mine/page.tsx` — wrap exports in `PageShell`,
  render kicker "Your queue", title "My complaints", subtitle unchanged from
  current, optional CTA band pointing at `/complaints/new`.
- `app/(reporter)/complaints/[id]/page.tsx` — wrap in `PageShell variant="flat"`
  since the status header already lives on the page.
- `app/(reporter)/complaints/new/page.tsx` — wrap in `PageShell variant="flat"`.
- `app/(admin)/queue/page.tsx` — wrap in `PageShell`, kicker "DICT Console",
  title "Queue", root `<header>` moves into the hero band.
- `app/(admin)/reports/page.tsx` — wrap in `PageShell`, kicker "DICT Console",
  title "Reports".
- `app/(technician)/assignments/page.tsx` — wrap in `PageShell`, kicker
  "Technician", title "My assignments".
- `app/(technician)/assignments/[id]/page.tsx` — wrap in `PageShell variant="flat"`.
- `app/(public)/sign-in/page.tsx` — wrap in `PageShell variant="flat"` *but
  leave the local public header/footer in place* (public layout has its own
  chrome).
- `app/(public)/sign-up/page.tsx` — same as sign-in.
- `app/(reporter)/complaints/[token]/page.tsx` (track) — wrap in
  `PageShell variant="flat"`; keep the local "Bookmark this page" Card.

The role-group redirects at `app/(reporter)/page.tsx`,
`app/(admin)/admin/page.tsx`, `app/(technician)/technician/page.tsx` are NOT
touched — they are 7-line redirect shells.

### D. Re-stamp the in-app message hierarchy

The in-app screens' h1 currently tops out at `text-4xl`. Update to
`text-4xl sm:text-5xl tracking-tight [line-height:1.1]` *only inside
`PageShell`'s hero band slot*, not on detached headers (so detail pages keep
their current scale).

This is a *single change to one component* (`PageShell.tsx`), not a sweep.

## Requirements

**User stories**:

- As a reporter / admin / technician opening any post-auth page, I want the
  page to have visible section rhythm (raised-band header, body, optional
  navy CTA band) so the page does not feel flat against my list rows.
- As a DICT admin viewing `/admin/queue`, I want the queue to open with the
  same brand hierarchy as the landing page so the system reads as one product.
- As a developer, I want a single `<PageShell>` component so the hero-band
  pattern is not repeated 11 times, and so future pages add rhythm by
  default.

**Acceptance criteria**:

- **AC-1** `<PageShell>` exists in `components/shared/PageShell.tsx`, accepts
  `displayVariant?: "hero" | "flat" | "none"` and exposes a composer pattern
  for the hero band (kicker + title + subtitle + actions) and a
  `<PageShellCtaBand>` subcomponent for the full-bleed navy band. Smoke-test:
  renders without errors for all three variants.
- **AC-2** `app/globals.css` exposes two utility classes `.section-raised` and
  `.cta-band-brand`, both in the existing `@layer utilities` block. The block
  is documented inline with a one-line reason referencing spec 0013. No new
  files, no `tailwind.config.ts` edit, no `@theme inline` edit.
- **AC-3** Every in-app server-component page listed in §C above renders inside
  `PageShell`. Each page's existing logic (queries, redirects, data fetching)
  is preserved byte-for-byte; only the render-tree wrapper changes. Smoke-test
  on each: page module imports `PageShell`, page exports render through
  `PageShell` (verified by source grep, not by full snapshot).
- **AC-4** `app/(reporter)/complaints/mine/page.tsx` produces a navy
  `<PageShellCtaBand>` at the bottom pointing users at `/complaints/new` so the
  reporter's flow ends with the same brand action band as the Home page. Other
  pages do not get the band by default; the band is opt-in per the component
  contract.
- **AC-5** Header h1 inside the `<PageShell>` hero band slot renders at
  `text-4xl sm:text-5xl` with `tracking-tight` and `leading-[1.1]`. This change
  lives once in `PageShell.tsx`, not in eleven page files.

## Follow-up: dark-mode removed (2026-07-28)

The `AC-6` listed in earlier drafts of this spec required safe dark-mode
fallbacks for `.section-raised` and `.cta-band-brand`. After build review the
project owner requested that all dark-mode rendering be removed from the
app — the `next-themes` `<html class="dark">` mechanism produced inconsistent
rendering across responsive views. Effective this date:

- `.dark { ... }` block deleted from `app/globals.css`.
- `<ThemeProvider>` removed from `app/providers.tsx`; `next-themes` package
  removed from `package.json`.
- `components/shared/ThemeToggle.tsx` and its test file deleted.
- `<ThemeToggle />` import and JSX removed from `components/shared/TopNav.tsx`
  and its test file's `jest.mock("next-themes")` removed.
- `app/layout.tsx` no longer carries `suppressHydrationWarning` (that warning
  was needed for the `next-themes` script's first-paint injection; no
  longer applicable).
- `tests/e2e/theme-persistence.spec.ts` deleted (3 tests) and the two
  theme-toggle tests in `tests/e2e/keyboard-navigation.spec.ts` replaced
  with header-traversal tests that do not assume a toggle exists.

Light mode is now the single source of truth. The utilities `.section-raised`
and `.cta-band-brand` resolve to the light-mode tokens (`--color-surface-raised`
= `#f8fafc`, `--color-brand` = `#0c2848`) without a dark overlay.

## Out of scope

- No changes to `lib/**`, `app/api/**`, the Mongoose schemas, BetterAuth config,
  or any flow logic.
- No changes to `context/ui-context.md` or `tailwind.config.ts`. The
  `Card`/`Button`/`Badge` primitives stay unchanged.
- No new feature work (Features 08, 09, 10 ship separately per their own
  specs).
- No i18n, no RTL, no animation tokens.
- No changes to `app/page.tsx` (Home) — it already meets the bar.
- No changes to the email notification service, the Ably real-time layer, the
  OpenAI integration, or the storage pipeline.

## Test sizing (per AGENTS.md Test Execution Policy)

This feature adds tests only for **its own acceptance criteria**:

- `components/shared/PageShell.test.tsx` — smoke-renders hero, flat, none
  variants; confirms a kicker + title + subtitle compose into the hero band;
  confirms `<PageShellCtaBand>` renders navy background.
- `app/globals.css.test.ts` (optional, only if project already runs CSS-class
  presence tests) — confirms `.section-raised` and `.cta-band-brand` are
  emitted under Tailwind 4.
- Per-page smoke tests are NOT added. AGENTS.md forbids retesting adjacent
  features' invariants. The existing 316-test sweep remains the gate.
- No e2e tests added. The e2e suite targets real-browser flows; this feature is
  a presentational pass.

## File organization

- New: `components/shared/PageShell.tsx` + thin `.test.tsx`.
- Modifies: one file per in-app screen listed in §C, surgical wrapper swap.
- Modifies: `app/globals.css` — one `@layer utilities { ... }` block edit to
  add two utility ruleset definitions, with documented reason inline.
- Modifies: `context/progress-tracker.md` — note UI-LIFT-0013 in Session
  Notes; add a small follow-up line under "Completed (2)" noting the section
  rhythm contract.

## Architecture decisions

- **One shared shell, not bespoke per page.** Without `<PageShell>`, each page
  re-invents the hero band and produces 11 different versions of the same
  thing. The shell enforces the contract centrally.
- **No new tokens.** `--color-surface-raised` and `--color-brand` already
  resolve correctly in light + dark. New utilities compose existing tokens
  rather than introduce hex values.
- **No `tailwind.config.ts` change.** Tailwind 4 reads design tokens from the
  `@theme inline` block in `globals.css`. Adding a class to `@layer utilities`
  is the right surface; the config file would do less, not more.
- **CTA band is opt-in, not default.** Most in-app screens do not need a
  closing navy band; only `/complaints/mine` benefits from a "Submit another"
  band. Defaulting it would over-paint institutional screens.
- **Detail pages keep their local headers.** Wrapping
  `/complaints/[id]/page.tsx` in `PageShell variant="flat"` keeps the
  page-specific status header and proof-of-fix timeline intact; only the
  surrounding chrome changes.
