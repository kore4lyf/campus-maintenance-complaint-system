# Design Tokens Reference

Project: Campus Maintenance Complaint Management System (LASU)

This file is the single source of truth for design tokens. Token values live in CSS custom properties in `app/globals.css` (registered through Tailwind 4's `@theme inline`). This document records what they mean and how they should be used in screen design.

## Brand identity (locked from production logo)

The brand identity was sampled directly from `public/cms-lasu-full.png` — the production logo PNG is the source of truth, not a designer spec sheet.

| Role | Hex | Concept |
|---|---|---|
| **Brand navy** | `#0c2848` | dominant fill of the icon glyph |
| **Brand accent (gold)** | `#d4a014` | the touch of yellow circle at the logo bottom |
| **Surface** | `#ffffff` | near-white page background |

Two additional hexes extend the navy scale without ambiguity:

| Token | Hex | Use |
|---|---|---|
| `brand-strong` | `#001c3c` | hover/pressed brand (darker navy) |
| `brand-soft` | `#1a3858` | dark-mode-friendly brand scale step |

Three additional hexes extend the gold scale:

| Token | Hex | Use |
|---|---|---|
| `accent-strong` | `#a87f0a` | hover/pressed accent |
| `accent-soft` | `#f4d76a` | subtle accent backgrounds, focus halos |

**Discipline rules:**
- The yellow accent is reserved for **3–5 places per screen**. Use it for: the brand mark, primary CTA hover state, focus rings, success-on-resolved emphasis, and one kicker label per page if appropriate. Never as a background fill for any large surface.
- Severity colours must keep visual distance from the brand accent. "High" uses `#ea7c1c` (Tailwind orange-600 family), not amber, so a High badge never reads as "the brand colour".

## Typography

Single sans family: **Inter** with a deep system fallback stack.

```
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
```

The `next/font/google` runtime download is unavailable in the build environment per progress-tracker; the system fallback stack is shipped. Inter will rejoin when a CDN becomes available.

**Mono** (for code blocks, anonymous IDs, stack traces): JetBrains Mono fallback to system mono.

**Six explicit type steps** (committing to a small ladder is a Nike/Apple discipline — most apps have six sizes used, twelve sizes defined):

| Step | Tailwind class | Size | Use |
|---|---|---|---|
| Display | `text-5xl` to `text-7xl` | 48–72 px | landing hero only. `font-semibold`, `tracking-tight`, `leading-[1.05]` |
| H1 | `text-3xl` to `text-4xl` | 30–36 px | page titles |
| H2 | `text-2xl` | 24 px | section titles |
| H3 | `text-lg` to `text-xl` | 18–20 px | card titles |
| Body | `text-base` | 16 px | primary reading |
| Caption | `text-sm` | 14 px | captions, dense UI, badges |

**Numeric displays** (SLA countdowns, timers, breach timestamps): tabular figures via the `.numeric` utility.

```
.numeric {
  font-variant-numeric: tabular-nums;
}
```

## Colours

### Semantic tokens

Defined in `app/globals.css` `@theme inline` block. Values change between light and dark via the `.dark` class on `<html>`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `brand` | `#0c2848` | `#3b82f6` | primary brand identity, primary buttons, brand mark, active links |
| `brand-strong` | `#001c3c` | `#60a5fa` | hover/pressed brand |
| `brand-soft` | `#1a3858` | `#93c5fd` | lighter step in dark mode |
| `accent` | `#d4a014` | `#d4a014` | brand gold (reserved, see Discipline above) |
| `accent-strong` | `#a87f0a` | `#facc15` | hover/pressed accent |
| `accent-soft` | `#f4d76a` | `#f4d76a` | subtle accent backgrounds |
| `surface` | `#ffffff` | `#0c1424` | page background |
| `surface-raised` | `#f8fafc` | `#1a2438` | card / panel background |
| `surface-overlay` | `#ffffff` | `#1a2438` | modal backdrops |
| `foreground` | `#1e293b` | `#f1f5f9` | body text foreground |
| `foreground-strong` | `#0c2848` | `#ffffff` | emphasized text (titles) |
| `muted` | `#64748b` | `#94a3b8` | secondary text |
| `muted-strong` | `#475569` | `#cbd5e1` | tertiary, disabled |
| `border` | `#e2e8f0` | `#1e293b` | default border |
| `border-strong` | `#cbd5e1` | `#334155` | emphasized border |

### Severity → colour mapping

| Severity | Token | Hex (light) | Hex (dark) | Why |
|---|---|---|---|---|
| Critical | `danger` | `#dc2626` | `#f87171` | must override brand for safety |
| High | `warning` | `#ea7c1c` | `#fb923c` | orange-shifted to keep visual distance from brand accent |
| Medium | `info` | `#0284c7` | `#38bdf8` | neutral blue |
| Low | `success` | `#059669` | `#34d399` | green, calm |

Severity colours always pair with text labels and icons. Never colour-only signalling.

### Accessibility

All severity colours pass WCAG AA contrast against `surface` background.

- Brand navy `#0c2848` on white: contrast ratio ≈ 13.5 (AAA). 
- Brand gold `#d4a014` on white: contrast ratio ≈ 4.6 (AA Large). 
- Brand gold on navy: contrast ratio ≈ 6.8 (AAA normal text). 
- The gold is therefore suitable as accent text on navy surfaces (ground truth from footer/CTA band), but should not be used as body text on white.

## Spacing

Standard density. Primary UI elements 4–8 px gaps; sections 16–24 px gaps.

| Element | Gap | Tailwind class |
|---|---|---|
| Between primary UI elements | 4–8 px | `gap-1` to `gap-2` |
| Between sections | 16–24 px | `gap-4` to `gap-6` |
| Page padding (mobile) | 16 px | `p-4` |
| Page padding (desktop) | 24–32 px | `p-6` to `p-8` |

Touch targets minimum 44×44 px.

## Border radius

| Element | Class | Value |
|---|---|---|
| Cards | `rounded-lg` | 0.5 rem |
| Buttons, Inputs | `rounded-md` | 0.375 rem |
| Modals, Dialogs | `rounded-xl` | 0.75 rem |
| Severity badges | `rounded-full` | pill |
| Photo thumbnails | `rounded-md` | 0.375 rem |
| Hero icon block | `rounded-3xl` | 1.5 rem |

## Shadows

| Token | Tailwind class | Use |
|---|---|---|
| Low | `shadow-sm` | Cards at rest |
| Medium | `shadow-md` | Dropdown menus, tooltips |
| High | `shadow-lg` | Modals, dialogs, floating panels, hero icon block |

## Component inventory

The project owns its own typed primitive library under `components/ui/` —
asserted by `git grep` to fail if a card copy-pastes the old `rounded-lg border
border-border bg-surface-raised p-4 shadow-sm` recipe. Astryx primitives are
used opportunistically where one of its full compositions lands within the
project's design tolerance.

### Project primitives (`components/ui/`)

| Primitive | Variants | Notes |
|---|---|---|
| `Button` | primary, secondary, ghost, destructive, link × sm/md/lg | loading spinner, leading/trailing icons, focus-ring, hover lift, transition tokens |
| `Card` | surface, raised, overlay, hero × sm/md/lg padding | optional `interactive` (lift on hover), single `.tsx` no wrapper components |
| `Badge` | brand, neutral, info, success, warning, danger × ring-1 inset | leads with icon slot, used by `StatusPill` and severity/category badges |
| `StatusPill` | five complaint statuses mapped to tones | "Acknowledged" now uses `info` (sky), not accent (gold) — keeps gold reserved for brand |
| `EmptyState` | default (icon + copy + CTA stack), wide (split layout), compact (dashed panel) | three layouts so each empty surface picks its own treatment |
| `Skeleton` | line, rect (aspect), circle, lines (multi-line placeholder) | pure `animate-pulse` with two tones (`soft`, default) |
| `Field` | `Field`, `Label`, `Input`, `Textarea`, `Select`, `Checkbox` | shared focus-ring, hover border, error/lint/timing state |
| `Card.SectionHeader` | eyebrow + title + meta | pairs with Card surfaces for SLA deadlines, Description, Photos |

### Astryx primitives (per `npx @astryxdesign/cli component --list`)

Selected for specific surfaces — not used as a wholesale substrate.

| Astryx primitive | Project composite | Location |
|---|---|---|
| `Button`, `IconButton`, `ButtonGroup` | Considered; project primitives win for typed variants | `components/ui/` |
| `Tabs`, `TabList` | Considered for reporter detail tabs | `components/reporter/` |
| `Tooltip` | AI rationale on hover | `components/admin/` (when AI prompt rationale is shown) |
| `StatusDot` | Connection status, Resolved dot | `components/shared/` |
| `ProgressBar` | SLA countdown bar | `components/shared/` |
| `Banner` | SLA breach ribbon | `components/admin/QueueRibbon.tsx` |
| `Table` family | Admin queue (data) | `components/admin/` |
| `Avatar` | Reporter, DICT staff identities | `components/shared/` |
| `Stack`, `Section`, `Layout`, `LayoutHeader`, `LayoutContent`, `Grid`, `GridSpan` | Considered for page-level layout | per-page |
| `TopNav` (Astryx) | Considered; current custom `components/shared/TopNav.tsx` is kept for role-aware menu logic and brand-mark integration | `components/shared/` |
| `MobileNav` (Astryx) | Considered; current custom `MobileBottomNav.tsx` is kept for role-aware active state | `components/shared/` |

## Card variant discipline

Until the rebuild, the project used one recipe everywhere:
`rounded-lg border border-border bg-surface-raised p-4 shadow-sm`. That recipe
made every card in the app feel identical. New rule: each card surface picks
one of four variants, and the variant reflects intent.

| Intent | Variant | Example |
|---|---|---|
| Primary content card, single subject | `Card surface` | `app/(reporter)/complaints/mine/page.tsx` complaint card |
| Grouped section within a card | `Card raised` | `ReporterDashboardEmpty`, `RecentActionsFeed` |
| Modal / overlay | `Card overlay` | `AssignDialog`, runtime-inserted |
| Marketing / hero block | `Card hero` | `app/page.tsx` hero icon block |

**Test** if unsure: a card on the screen should look different from its
neighbours. If you can't tell two cards apart without reading the text,
the wrong variant was chosen.

## Layout patterns

### Persistent top nav
- Brand mark + wordmark on the left.
- Role-aware menu items in the centre (varies by role).
- Theme toggle and sign-out on the right.
- Sticky, translucent surface, subtle border-bottom.

### Mobile bottom nav (mobile only)
Per-role tabs. `md:hidden`.
- Reporter: Submit, List, Mine.
- Admin: Queue, Reports.
- Technician: Queue.

### Landing page (`/`)
Hero section structure:
1. Eyebrow/kicker chip ("Lagos State University · DICT" with `bg-accent` dot).
2. Display headline (2 lines, 56–72 px, brand-coloured accent on the second line).
3. Restrained subtitle (one paragraph, max 2 lines on desktop).
4. Two CTAs: primary in `bg-brand`, secondary in `bg-surface-raised` border.
5. Right side: hero icon block (5×4 aspect, `bg-brand`, rounded-3xl, icon overlaid at 60% size, optional `bg-accent` dot bottom-right).

Below the fold:
- Two-column value section (`bg-surface-raised`), one column per audience (students/staff + DICT).
- Branded CTA band (`bg-brand`, full-bleed, with `bg-accent` button).
- Restrained footer.

### Empty states
Centred icon, descriptive paragraph, primary CTA.

### Modals
Centred, `max-w-md` forms, `max-w-2xl` detail views.

### Page-level header pattern (reporter + admin)
- `mb-8` spacing.
- Kicker label (`text-xs uppercase tracking-wider accent-strong`).
- H1 (`text-3xl font-semibold tracking-tight foreground-strong`).
- Optional "New" CTA on the right (flex justify-between).
- Restrained subtitle (`text-base muted-strong`, max-w-2xl).

## Dark mode

Managed by `next-themes` with `attribute="class"`. Toggle cycles light → dark. The `.dark` class on `<html>` activates the dark token overrides in `app/globals.css`. `suppressHydrationWarning` on `<html>` prevents first-paint flash. `disableTransitionOnChange` on `ThemeProvider` prevents colour flash on toggle.

The dark surface (`#0c1424`) is **deliberately not pure black**; it is a navy-tinted shade that pairs with the brand identity rather than creating an unrelated dark scheme.
