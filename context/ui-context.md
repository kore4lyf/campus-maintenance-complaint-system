# UI Context

Project Name: Campus Maintenance Complaint Management System (LASU)

This file is part of the Idea-to-Product six-file context convention. Read with
`architecture.md`, `code-standards.md`, `ai-workflow-rules.md`,
`progress-tracker.md` and `AGENT.md`.

> **Brand palette is now locked.** The brand colours below are sampled directly from `public/cms-lasu-full.png` (the production logo). The hexes are committed and inbound changes must update both `app/globals.css` and this file. See `docs/design.md` for the full token reference and `progress-tracker.md` for the session note that locked them.

## Theme

- **Base**: Tailwind CSS 4 standard palette (the safest starting point; tokens extended in `tailwind.config.ts`).
- **Brand identity**: institutional and neutral — this is a real-world tool for
  resolving campus grievances, not a consumer app. **Avoid playful colors and
  decorative gradients.**
- **Theme override layer**: Astryx (Meta) is the design system. It ships 160+
  accessible, themeable React components with built in spacing, dark mode and
  flexible styling. Pre built CSS works alongside Tailwind, so both coexist
  without conflict. Brand level customisation via CSS custom property overrides.
  Astryx provides the component primitives while Tailwind handles custom utility
  styling. Specific values can change when LASU IT confirms the brand kit.
- **Dark mode**: supported via `next-themes`. Toggle in the user menu switches
  `class="dark"` on `<html>`; Tailwind `dark:` variants apply. Default theme
  follows OS preference.
- **Density**: standard. Aim for 4–8 px (Tailwind `gap-1` to `gap-2`) between
  primary UI elements; `gap-4` or larger for sections.

## Colors

**The brand palette is locked** from `public/cms-lasu-full.png` — sampled values, not designer speculation.

- **Brand navy** `#0c2848` (subtle: deep-darker variants `#001c3c` and `#1a3858`).
- **Brand accent gold** `#d4a014` (subtle: deeper `#a87f0a`, lighter `#f4d76a`).
  Reserved for the brand mark, primary CTA hover state, focus rings, success-emphasis,
  and one kicker label per page. Never as a large background fill.
- **Severity colours** are deliberately distinct from the accent so a "High" badge
  never reads as the brand colour. High uses `#ea7c1c` (orange-shifted), not amber.

Token values live in CSS custom properties in `app/globals.css` registered through
Tailwind 4's `@theme inline`. Astryx theme overrides are layered on top.

### Semantic tokens

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `brand` | `#0c2848` (navy) | `#3b82f6` | primary brand identity, primary buttons, brand mark, active links |
| `brand-strong` | `#001c3c` | `#60a5fa` | hover/pressed brand |
| `accent` | `#d4a014` (gold) | `#d4a014` | reserved accent (brand mark, focus rings, success emphasis) |
| `accent-strong` | `#a87f0a` | `#facc15` | hover/pressed accent |
| `foreground` | `#1e293b` | `#f1f5f9` | body text |
| `foreground-strong` | `#0c2848` | `#ffffff` | emphasised text (titles) |
| `surface` | `#ffffff` | `#0c1424` (navy-tinted dark) | page background |
| `surface-raised` | `#f8fafc` | `#1a2438` | card / panel background |
| `muted` | `#64748b` | `#94a3b8` | secondary text |
| `muted-strong` | `#475569` | `#cbd5e1` | disabled / tertiary |
| `border` | `#e2e8f0` | `#1e293b` | default border |
| `border-strong` | `#cbd5e1` | `#334155` | emphasised border |

### Severity → color mapping

| Severity | Color | Hex (light) | Use |
|---|---|---|---|
| Critical | `danger` (red) | `#dc2626` | worst-case; in queue and reporter views |
| High | `warning` (orange-shifted) | `#ea7c1c` | significant disruption — kept orange to avoid brand-colour confusion |
| Medium | `info` (sky) | `#0284c7` | comfort/amenity issues |
| Low | `success` (emerald) | `#059669` | non-urgent cosmetics, resolved |

### Accessibility

- **All severity colours paired with text labels** ("Critical", "High", etc.).
- **Never color-only signaling**. Icons accompany severity badges; SLA-breach
  icons accompany red colour.
- Colour contrast at least AA against `surface` background — the navy-on-white
  brand text exceeds AAA (≈13.5); the gold accent is suitable as text on navy
  surfaces (≈6.8) but not as body text on white.

### Brand discipline (read this before designing)

1. **Reserve the gold.** 3–5 places per screen at most. Apply to: brand mark, primary
   CTA hover, focus ring, success-on-resolved dot, one kicker label.
2. **The yellow does not flood.** Avoid backgrounds, panels, large surfaces.
3. **Severity stays separate.** Brand gold and severity amber have hue overlap;
   amber-as-orange `#ea7c1c` clears the air for "High".
4. **White's a default, not a colour.** Pure white is the surface; off-white tones
   (`--color-surface-raised` etc.) live in the same scale.

## Typography

- **Body / UI**: **Inter** via `next/font/google`. Default sizes:
  - `text-sm` (14 px) for body and dense UI.
  - `text-base` (16 px) for primary reading.
- **Headings**: also **Inter** (single font family for visual consistency).
  Size scale via Tailwind: `text-xl`, `text-2xl`, `text-3xl`.
- **Numeric / timers / SLA countdowns**: Inter with **tabular figures**
  enabled (`font-variant-numeric: tabular-nums`) so digits don't jiggle as
  they count down.
- **Code**: **JetBrains Mono** via `next/font/google`. Used in `<code>` blocks
  for stack traces, version strings, IDs. Rare in primary UI.
- **Line height**: Tailwind defaults (`leading-normal`).
- **No handwritten or display fonts.** This is a tool, not marketing.

## Border Radius

| Element | Class | Value |
|---|---|---|
| Cards | `rounded-lg` | 0.5 rem |
| Buttons, Inputs | `rounded-md` | 0.375 rem |
| Modals, Dialogs | `rounded-xl` | 0.75 rem |
| Severity badges | `rounded-full` | pill |
| Reporter photo thumbs | `rounded-md` | 0.375 rem |
| Avatars | `rounded-full` | circle |

## Component Library

- **Astryx (Meta)** as the base. Install via `npm install @astryxdesign/core
  @astryxdesign/theme-neutral`. Pre built CSS imports, no build plugin needed.
  Works alongside Tailwind for custom utility styling. Theme via CSS custom
  property overrides.
- **Initial set** (use these from Astryx's 160+ component library):

  | Component | Used in |
  |---|---|
  | `Button` | every role's actions |
  | `Card` | reporter status, admin queue rows, detail panels |
  | `Dialog` | confirmation modals, AI rationale expand |
  | `Form` | submission form (with RHF + Zod) |
  | `Input`, `Textarea`, `Label` | form fields |
  | `Select` | category/location dropdowns |
  | `Tabs` | reporter detail tabs (status, photos, timeline) |
  | `Tooltip` | AI rationale on hover |
  | `Toast` (`sonner`) | action confirmations |
  | `Badge` | severity + category indicator |
  | `Skeleton` | loading states |
  | `Switch` | anonymous toggle |
  | `Dropdown` | role aware menu; sign out |
  | `Table` | admin queue (with sortable columns) |
  | `Pagination` | queue + reporter list when scales |
  | `Avatar` | reporter DICT staff identities |
  | `Progress` | SLA countdown bar |

- **Project-specific compositions** in `/components/<role>/`:

  - `<ComplaintForm />` — reporter submission form (reporter).
  - `<ComplaintDetail />` — reporter + admin detail view.
  - `<StatusTimeline />` — chronological `statusHistory` with photos
    (shared between reporter and admin).
  - `<SlaCountdown />` — coloured SLA time remaining (Badge + Progress
    combo).
  - `<QueueTable />` — admin/technician queue with filters.
  - `<CategoryBadge />`, `<SeverityBadge />` — coloured chip with icon.
  - `<AiRationaleTooltip />` — admin-only tooltip showing AI's reasoning.
  - `<ThemeToggle />` — light/dark switcher (shared).
  - `<ReporterDashboardEmpty />`, `<AdminQueueEmpty />`,
    `<TechnicianQueueEmpty />` — explicit empty states.

## Layout Patterns

| Role | Mobile | Desktop |
|---|---|---|
| Reporter | single-column Stack of cards | two-column: status filter sidebar + main list |
| Admin | single-column stacked | three-column: filters (left), queue (centre), detail panel (right when row selected) |
| Technician | two-column: assigned-queue top, current-complaint bottom | single-column with sticky current-task card at top |

### Persistent top nav
- Brand mark (LASU text + "CMS") on the left.
- Role-aware menu items in the centre (varies by role).
- Theme toggle and sign-out on the right.

### Mobile bottom nav (mobile only)
- Role-aware tabs:
  - Reporter: Submit / List / Mine.
  - Admin: Queue / Reports / Escalations.
  - Technician: Queue.

### Modals / dialogs
- Modals centred, max-width `max-w-md` for forms, `max-w-2xl` for detail views.

### Empty states
- Centred icon + descriptive paragraph + primary CTA.
- Examples:
  - ReporterDashboardEmpty: "You haven't submitted any complaints yet."
    + "Submit a complaint" button.
  - AdminQueueEmpty: "Nothing in the queue right now." + small icon.

## Icons

- **Lucide icons** via `lucide-react` (rendered through Astryx's icon support
  or directly).
- **Sizing**: `h-4 w-4` inline with text; `h-5 w-5` for buttons; `h-6 w-6` for
  empty-state illustrations.

### Iconography map (initial — extend as needed)

| Icon | Use |
|---|---|
| `Wrench` | Category badge fallback when no category icon |
| `AlertTriangle` | **Critical** severity |
| `AlertCircle` | **High** severity |
| `Info` | **Medium** severity |
| `CheckCircle2` | **Low** severity / Resolved status |
| `Camera` | Photo attachment action |
| `Send` | Submit (form action) |
| `Bell` | Notifications (in-app + Ably push) |
| `UserCircle` | Account menu / sign-out |
| `FileText` | Report / export action |
| `ShieldCheck` | Anonymous toggle indicator |
| `XCircle` | Photo removal / cancel |
| `Clock` | SLA countdown |
| `ListFilter` | Queue filters toggle (mobile) |
| `Tag` | Status tag in lists |
| `Eye` | "view as admin" toggle (Phase 2) |
| `TriangleAlert` | "duplicate detected" badge |
