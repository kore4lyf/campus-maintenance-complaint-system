# UI Context

Project Name: Campus Maintenance Complaint Management System (LASU)

This file is part of the Idea-to-Product six-file context convention. Read with
`architecture.md`, `code-standards.md`, `ai-workflow-rules.md`,
`progress-tracker.md` and `AGENT.md`.

> **Defaults worth confirming before Unit 01.** The Colors and Typography defaults here are reasonable general choices. If LASU IT supplies an official brand palette or specific font, override before implementation starts. See `progress-tracker.md → Open Questions`.

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

Default Tailwind palette as base. Astryx theme overrides applied in
`tailwind.config.ts`.

### Semantic tokens

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `brand` | `green-600/700` (LASU institutional green) | `green-400/500` | primary brand identity, primary buttons, active links |
| `accent` | `sky-600/700` | `sky-400/500` | secondary actions, SLA countdown highlights |
| `surface` | `white` | `slate-900` | page background, card background |
| `muted` | `slate-500/600` | `slate-400/500` | secondary text, disabled states |
| `danger` | `red-500/600` | `red-400/500` | Critical-severity badges, SLA-breach indicators, errors |
| `warning` | `amber-500/600` | `amber-400/500` | High-severity badges |
| `success` | `emerald-500/600` | `emerald-400/500` | Low-severity badges, "resolved" confirmations |

### Severity → color mapping

| Severity | Color | Use |
|---|---|---|
| Critical | `danger` (red) | worst-case; in queue and reporter views |
| High | `warning` (amber) | significant disruption |
| Medium | `accent` (sky) | comfort/amenity issues |
| Low | `muted` (slate) | non-urgent cosmetics |

### Accessibility

- **All severity colours paired with text labels** ("Critical", "High", etc.).
- **Never color-only signaling**. Icons accompany severity badges; SLA-breach
  icons accompany red colour.
- Colour contrast at least AA against `surface` background (Tailwind defaults
  meet this; verify with a contrast checker if any custom palette is added).

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
