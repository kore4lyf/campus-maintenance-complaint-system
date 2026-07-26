# Design Tokens Reference

Project: Campus Maintenance Complaint Management System (LASU)

This file is the single source of truth for design tokens. Token values live in CSS custom properties defined in `app/globals.css`. This file documents what they mean and how to use them.

## Typography

Single font family: Inter (system fallback stack). Code blocks use JetBrains Mono.

| Token | Tailwind class | Size | Use |
|---|---|---|---|
| `text-sm` | `text-sm` | 14 px | Body text, dense UI, captions |
| `text-base` | `text-base` | 16 px | Primary reading text |
| `text-lg` | `text-lg` | 18 px | Subheadings, secondary headings |
| `text-xl` | `text-xl` | 20 px | Section headings |
| `text-2xl` | `text-2xl` | 24 px | Page titles |
| `text-3xl` | `text-3xl` | 30 px | Hero headings, dashboard titles |

Line height follows Tailwind defaults (`leading-normal`). No handwritten or display fonts. Numeric displays (SLA countdowns, timers) use `font-variant-numeric: tabular-nums` to prevent digit jiggling.

## Colours

### Semantic tokens

Defined in `app/globals.css` as CSS custom properties. Values change between light and dark mode via the `.dark` class.

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `brand` | green-600 | green-400 | Primary brand identity, primary buttons, active links |
| `brand-strong` | green-700 | green-500 | Hover state on brand elements |
| `accent` | sky-600 | sky-400 | Secondary actions, SLA countdown highlights |
| `accent-strong` | sky-700 | sky-500 | Hover state on accent elements |
| `surface` | white | slate-900 | Page background, card background |
| `surface-raised` | slate-50 | slate-800 | Elevated cards, dropdown menus |
| `surface-overlay` | white | slate-800 | Modal backdrops, tooltips |
| `muted` | slate-500 | slate-400 | Secondary text, placeholder text |
| `muted-strong` | slate-600 | slate-300 | Disabled text, labels |
| `danger` | red-500 | red-400 | Critical severity, SLA breach, errors |
| `danger-strong` | red-600 | red-300 | Hover state on danger elements |
| `warning` | amber-500 | amber-400 | High severity badges |
| `warning-strong` | amber-600 | amber-300 | Hover state on warning elements |
| `success` | emerald-500 | emerald-400 | Low severity, resolved confirmations |
| `success-strong` | emerald-600 | emerald-300 | Hover state on success elements |

### Severity to colour mapping

| Severity | Colour token | Tailwind class | Use |
|---|---|---|---|
| Critical | `danger` | `text-danger bg-danger/10` | Worst case severity in queue and reporter views |
| High | `warning` | `text-warning bg-warning/10` | Significant disruption |
| Medium | `accent` | `text-accent bg-accent/10` | Comfort and amenity issues |
| Low | `muted` | `text-muted bg-muted/10` | Non urgent cosmetics |

Severity colours are always paired with text labels ("Critical", "High", etc.) and icons. Never rely on colour alone for signalling.

### Accessibility

All severity colours pass WCAG AA contrast against `surface` background. Icons accompany severity badges. SLA breach indicators use both red colour and an alert icon.

## Spacing

Standard density. Primary UI elements use 4 to 8 px gaps (Tailwind `gap-1` to `gap-2`). Sections use `gap-4` or larger. Minimum touch target for interactive elements is 44 by 44 px, achieved via padding without affecting visual size.

| Element | Gap | Tailwind class |
|---|---|---|
| Between primary UI elements | 4 to 8 px | `gap-1` to `gap-2` |
| Between sections | 16 to 24 px | `gap-4` to `gap-6` |
| Page padding (mobile) | 16 px | `p-4` |
| Page padding (desktop) | 24 to 32 px | `p-6` to `p-8` |

## Border radius

| Element | Class | Value |
|---|---|---|
| Cards | `rounded-lg` | 0.5 rem |
| Buttons, Inputs | `rounded-md` | 0.375 rem |
| Modals, Dialogs | `rounded-xl` | 0.75 rem |
| Severity badges | `rounded-full` | pill |
| Photo thumbnails | `rounded-md` | 0.375 rem |
| Avatars | `rounded-full` | circle |

## Shadows

| Token | Tailwind class | Use |
|---|---|---|
| Low | `shadow-sm` | Cards at rest, subtle elevation |
| Medium | `shadow-md` | Dropdown menus, tooltips |
| High | `shadow-lg` | Modals, dialogs, floating panels |

## Component inventory

Astryx primitives mapped to project composites:

| Astryx primitive | Project composite | Location |
|---|---|---|
| `Button` | Role action buttons | `components/shared/` |
| `Card` | Complaint cards, queue rows | `components/<role>/` |
| `Dialog` | Confirmation modals, AI rationale | `components/shared/` |
| `Input`, `Textarea`, `Label` | Form fields | `components/ui/` |
| `Select` | Category, location dropdowns | `components/ui/` |
| `Tabs` | Reporter detail tabs | `components/reporter/` |
| `Tooltip` | AI rationale on hover | `components/admin/` |
| `Badge` | Severity, category indicators | `components/shared/` |
| `Skeleton` | Loading states | `components/ui/` |
| `Switch` | Anonymous toggle | `components/ui/` |
| `Table` | Admin queue | `components/admin/` |
| `Avatar` | Reporter, DICT staff identities | `components/shared/` |
| `Progress` | SLA countdown bar | `components/shared/` |

## Layout patterns

### Persistent top nav

Brand mark ("LASU CMS") on the left. Role aware menu items in the centre. Theme toggle and sign out on the right.

### Mobile bottom nav (mobile only)

Reporter: Submit, List, Mine. Admin: Queue, Reports, Escalations. Technician: Queue.

### Empty states

Centred icon, descriptive paragraph, primary CTA. Each role has its own empty state composite.

### Modals

Centred, max width `max-w-md` for forms, `max-w-2xl` for detail views.

## Dark mode

Managed by `next-themes` with `attribute="class"`. Toggle cycles light to dark. Choice persists in a `theme` cookie. Default follows OS preference. The `.dark` class on `<html>` activates dark mode overrides. `suppressHydrationWarning` on `<html>` prevents first paint flash. `disableTransitionOnChange` on `ThemeProvider` prevents colour flash on toggle.
