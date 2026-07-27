# 0011. Reporting dashboard and export

**Date**: 2026-07-25
**Status**: In Progress

## Summary

This spec ships the admin reporting dashboard at `/admin/reports` with four Recharts visualisations (volume by category, volume by location, volume by severity, plus SLA breach count plus average resolution time plus backlog) all driven by a single MongoDB aggregation pipeline over `complaints`. Filter composition (time window, severity, location, status) drives both charts and the optional data table beneath them; filter values sync with the URL for shareable links. PDF export uses `@react-pdf/renderer` to produce a printable version of the four charts plus a notes section plus the active filter values; CSV export streams the raw complaint rows filtered by the same chip set. TanStack Query polling at 60 seconds refreshes the dashboard; polling pauses on hidden tabs via the spec 0003 foundation wiring.

## Context

Spec 0002 ships the locked `complaints`, `assignments`, `statusHistory`, `notifications` plus the optional `reports` aggregate cache slot that this feature can reuse or skip per Q2-A. Spec 0003 ships the foundation plus TanStack Query plus Sonner plus the design tokens plus the Astryx form primitives plus the URL state sync pattern. Spec 0007 ships the admin queue plus the filter UX pattern (chips per dimension, URL state sync). Spec 0009 ships the `complaints.escalated` flag plus `lib/sla/breach-detection.ts`. Spec 0010 (real time) ships the `useAblyChannel` hook that future maintenance features can subscribe to for live dashboard updates; deferred to follow up.

The architecture locks Recharts for in app dashboards plus `@react-pdf/renderer` for PDF export plus hand rolled CSV per the code-standards small surface notice. The locked eight Mongoose collections stay byte for byte unchanged; this spec is additive. Charts run against live aggregation pipelines at pilot scale because MongoDB's compound indices on the locked storage model (`complaints.createdAt`, `complaints.status`, `complaints.categoryId`, `complaints.locationId`, `complaints.slaResolveBy`) cover the queries without an aggregate cache.

## Requirements

**User stories**:

- As a DICT admin I want a dashboard at `/admin/reports` that shows volume by category plus volume by location plus volume by severity plus SLA breach count plus average resolution time plus backlog so I can see the campus maintenance picture at a glance.
- As a DICT admin I want to filter by time window plus severity plus location plus status so I can compare the last week versus the last month, focus on one building, or see only High severity claims.
- As a DICT admin I want to export the dashboard as a PDF so I can share it with the DICT Director in a printable report.
- As a DICT admin I want to export the rows behind the dashboard as CSV so I can do offline analysis in a spreadsheet.
- As a developer I want the chart data driven by one aggregation pipeline so the four charts plus the data table plus the exports share one source of truth.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: An admin visiting `/admin/reports` sees four Recharts visualisations: volume by category (bar), volume by location (bar), volume by severity (bar or donut), SLA breach count (numeric card plus a small bar split by `acknowledge_overdue` plus `resolve_overdue` from `lib/sla/breach-detection.ts`), plus a separate numeric card with average resolution time plus a separate numeric card with backlog count. Verifies the scope's "renders all four chart types" half of the Done when line (interpreted broadly to include the SLA breach count, average resolution time, and backlog as separate visualisations plus the volume trio).
- **AC-2**: The filter row exposes time window (today, last 7 days, last 30 days, last 90 days, custom range), severity (multi select chips), location (multi select), and status (multi select). All filters compose and drive every chart plus the optional data table beneath. The filter values sync with the URL `?time=...&from=...&to=...&severity=...&locationId=...&status=...` so a link can be shared. Verifies the scope's "filters by time window/severity/location/status" half of the Done when line.
- **AC-3**: The dashboard polls via TanStack Query at 60 seconds while the tab is focused; polling pauses on hidden tab and resumes on visibility regain. Verification: hand exercise plus Playwright simulates a tab visibility change and asserts the next refetch happens within 5 seconds of return.
- **AC-4**: PDF export via `@react-pdf/renderer` renders the four charts plus a notes section plus the active filter values; the route handler returns the PDF blob with `Content-Type: application/pdf` plus `Content-Disposition: attachment; filename="cms-lasu-report-<timestamp>.pdf"`. Failure path returns a typed `pdf_render_failed` API error.
- **AC-5**: CSV export streams the raw complaint rows filtered by the same chip set; the response sets `Content-Type: text/csv` plus `Content-Disposition: attachment; filename="cms-lasu-report-<timestamp>.csv"`. Each row carries the public JSON shape from `toPublicJSON` per spec 0002 AC-13 (no AI cost fields); column order is `complaintId, createdAt, status, priority, category, location, slaAcknowledgeBy, slaResolveBy, resolvedAt, breachKind`.
- **AC-6**: Defence in depth: the auth DAL plus the project root proxy combine to enforce admin RBAC per spec 0004. Per page `requireRole("dicht_admin")` plus the route handler `authorizeRole(session, "dicht_admin")` cover all access. The route handler rejects 403 for non admins; the export endpoints do not require any specific UI affordance to be present and cannot be reached by a reporter.
- **AC-7**: Per chart Skeleton from Astryx plus a zero result empty state per chart when zero rows match the filter. Loading state is cheap because the aggregation runs in two to three hundred milliseconds at pilot scale. Verifies the dashboard renders correctly with zero claimed complaints for the selected period.
- **AC-8**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. End to end Playwright smoke covers four charts rendering with seeded data, filter composition reducing the data, PDF export downloads the file with the correct headers, CSV export downloads the file with the correct headers, zero result state appears for an empty period.

## Options considered

### Option 1: Live aggregations on every request (chosen)

A single MongoDB aggregation pipeline per request drives every chart plus the data table plus the exports. The pipeline runs against the locked index set (`complaints.createdAt`, `complaints.status`, `complaints.categoryId`, `complaints.locationId`, `complaints.slaResolveBy`) plus a derived average resolution time plus a backlog count. No pre computed `reports` collection is built.

**Pros**:

- Fresh data on every load; the admin sees today's picture not yesterday's snapshot.
- One aggregation pipeline; the four charts plus the data table plus the exports share one source of truth.
- The locked `reports` collection slot from spec 0002 stays empty until aggregations become hot; no migration today.
- Pilot scale at LASU is small enough (well under 5,000 active complaints per the architecture); aggregations are fast.

**Cons**:

- A traffic spike (an admin sharing a filter URL that everyone clicks) causes N aggregation runs; mitigate with the URL state sharing plus the polling pause on hidden tab.
- The dashboard does not show yesterday's snapshot, which can be a feature or a bug depending on perspective.

### Option 2: Pre compute the `reports` collection as an aggregate cache

A new cron job writes aggregate snapshots into the `reports` collection; the dashboard reads from the cache.

**Pros**:

- Stable read latency regardless of complaint volume.

**Cons**:

- One more collection to maintain; one more cron to operate; one more "stale cache" surface to debug.
- The lock at spec 0002 on the eight collections plus the architecture's MVP intent do not require a snapshot collection.
- Pilot scale does not merit a snapshot.

### Option 3: Mixed approach

Live aggregations for live counts plus a daily cached snapshot for historical comparisons.

**Pros**:

- Best of both worlds.

**Cons**:

- Two data paths; harder to test; harder to maintain.
- The user can compare via the time window filter today; a dedicated snapshot collection is overkill.

## Decision

**Chosen option**: Option 1: live aggregations on every request.

One aggregation pipeline drives the four charts plus the data table plus the exports. The dashboard polls at 60 seconds with hidden tab pause. No pre computing. No `reports` collection population.

**Implementation skills**: `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — Server Component plus Client Component boundaries for the dashboard page plus the chart components. Recharts from the architecture stack list (`context/architecture.md §Charts / export`).

## Rationale

Two specific forces drive the choice. First, pilot scale at LASU is well under 5,000 active complaints per the architecture; single aggregation runs at two to three hundred milliseconds on the locked indices. A cache layer is overkill today and adds operational surface for no measurable read latency win. Second, the locked `reports` collection slot from spec 0002 is optional and not yet populated; the architecture intent is MVP and a snapshot today is premature.

The PDF plus CSV exports consume the same aggregation pipeline as the charts. Sharing one source of truth means the export reflects exactly what the admin sees; an offline analyst can cross reference the dashboard URL and the export row set.

TanStack Query polling at 60 seconds matches the dashboard human eye cadence; real life does not need second by second updates. Real time Ably push from spec 0010 is reserved for the queue per the slice 3 scope; if LASU pilots show demand for live dashboard updates the work is additive through the same `useAblyChannel` hook.

The filter row mirrors the admin queue's FilterPanel from spec 0007 plus the reporter dashboard's ClosedClaimsToggle from spec 0006. The chips per dimension plus the URL state sync are the same pattern, and the dashboard inherits the project root proxy's RBAC plus per page `requireRole` plus the per route handler `authorizeRole` defense in depth.

## Feature design

**Data model sketch**:

This feature is additive. Zero schema changes to the locked eight Mongoose collections.

- `complaints` (locked at spec 0002): the only collection read for charts. The aggregation pipeline groups by `categoryId`, `locationId`, `priority` (severity), plus computes `count()` plus `avg(resolvedAt - createdAt)` for resolved status.
- `categories` (locked): joined by `_id` to return the category name for the chart label plus tooltip.
- `locations` (locked): joined by `_id` to return the location name for the chart label plus tooltip.
- The locked `reports` aggregate cache slot from spec 0002 stays empty; this spec does not populate it.

**State transitions** (if applicable):

None. This feature is a read path that produces derived analytics; no document transitions.

**API surface**:

| Endpoint | Method | Auth | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| `/api/admin/reports` | `GET` | admin session | `?time`, `?from`, `?to`, `?severity[]`, `?locationId[]`, `?status[]` | `{ data: { byCategory: ChartPoint[], byLocation: ChartPoint[], bySeverity: ChartPoint[], breachCount: { acknowledgeOverdue: number, resolveOverdue: number }, avgResolutionMs: number \| null, backlog: number }, meta: { generatedAt, totalCount } }` | 401, 403, 422 (invalid time window) |
| `/api/admin/reports/export.csv` | `GET` | admin session | same filter query params | `text/csv` streaming response with `Content-Disposition` for filename | 401, 403, 422 |
| `/api/admin/reports/export.pdf` | `POST` | admin session | same filter query params as JSON body | `application/pdf` streaming response with `Content-Disposition` for filename | 401, 403, 422, 500 (`pdf_render_failed`) |
| `/admin/reports` (page) | `GET` | admin session | none | rendered page HTML | 401, 403 |

**Value sourcing** (every value the action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Volume by category chart | `{ categoryName, count }` | pipeline `$group: { _id: '$categoryId', count: { $sum: 1 } }` joined to `categories.systemType` |
| Volume by location chart | `{ locationName, count }` | pipeline `$group: { _id: '$locationId', count: { $sum: 1 } }` joined to `locations.name` |
| Volume by severity chart | `{ priority, count }` | pipeline `$group: { _id: '$priority', count: { $sum: 1 } }` |
| SLA breach count | `{ acknowledgeOverdue, resolveOverdue }` | pipeline `$match: { status: 'Submitted', slaAcknowledgeBy: { $lt: now } }` plus `$match: { status: { $in: ['Acknowledged', 'In Progress'] }, slaResolveBy: { $lt: now } }` counts |
| Average resolution time | milliseconds or null | pipeline `$match: { status: { $in: ['Resolved', 'Closed'] }, resolvedAt: { $ne: null } }` plus `$group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } }`; null when zero rows |
| Backlog count | integer | pipeline `$match: { status: { $nin: ['Resolved', 'Closed'] }, createdAt: { $lt: new Date(now - 7 * 24 * 3600 * 1000) } }` plus `$count` |
| `totalCount` in meta | integer | the same filter pipeline plus `{$count: 'total'}` before the `$group` step |
| Filter row | list of chip components | URL search params parsed by `URLSearchParams` |
| Empty state per chart | copy plus a small icon | `getCategoryName + count === 0` plus an Astryx `Skeleton` loader |
| PDF blob | bytes | `@react-pdf/renderer` Document plus Page plus the four SVG or PNG charts rendered server side via `recharts/tsx` or `react-to-pdf` per code-standards |
| CSV row | one per filtered claim | the same filtered pipeline projected to `complaintId, createdAt, status, priority, categoryName, locationName, slaAcknowledgeBy, slaResolveBy, resolvedAt, breachKind` where `breachKind` is `evaluateBreachState({ complaint, now }).kind` |
| Filter URL state | string | `URLSearchParams` plus `useRouter` plus the spec 0007 FilterPanel pattern reused |

**Key invariants** (rules that must always hold):

- Every chart and export reflects the same filter set at the moment of the request; the dashboard renders the response from `/api/admin/reports` as the single source of truth.
- The aggregation pipeline runs once per request; the server does not cache results; the client side TanStack Query cache holds the latest aggregation for the current filter set for 60 seconds before refetch.
- The CSV export and the PDF export consume the same aggregation output plus the same filter set; an admin who exports the same URL twice sees the same content.
- The SLA breach count card from this spec uses the same `evaluateBreachState` function as the admin queue's red border overlay (from spec 0007) so the two surfaces never disagree.
- The backlog definition is open plus older than 7 days; the card title reads `Backlog older than 7 days` and the value is the integer count.
- The reporter never reaches these endpoints; the route handler returns 403 for any non admin request.

**Security model**:

- Authentication: BetterAuth session probed via `getServerSession` from `lib/auth/dal.ts` plus per page `requireRole` per spec 0004.
- Authorization: server side check that `req.session.user.role === 'dicht_admin'`. Non admins reject 403. The route handler does not require a session for unauthenticated calls because the bearer is not the right credential.
- PII discipline: the response applies `toPublicJSON` per spec 0002 AC-13 stripping AI rationale plus cost fields plus reporter PII when reading the dashboard data; the export endpoints honor the same discipline.
- Filter values from the URL plus the request body are validated by Zod before reaching the aggregation pipeline; an invalid time window yields 422.

**Configuration required**:

- No new env var.
- `@react-pdf/renderer` plus Recharts already planned in the architecture (Recharts in `package.json` from Feature 01; `@react-pdf/renderer` is a new install flagged in Follow up if not present at build time).
- `lib/utils/csv.ts` exporting `toCsv(rows, columns)` for the CSV export; hand rolled per code-standards small surface notice.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: an admin visits `/admin/reports`; seeded complaints produce four rendered charts plus the three numeric cards; the time window filter `last 7 days` reduces the data set compared to `last 90 days`; the severity chip `Critical` reduces the volume by severity chart; the location selector narrows the volume by location chart to the chosen building. Verifies **AC-1**, **AC-2**.
- **Polling**: the dashboard tab is focused for ninety seconds; two polling fetches happen at the sixty and one hundred twenty second marks (Playwright controls the test clock); the charts visibly re render with each refetch. Verifies **AC-3**.
- **Hidden tab**: the dashboard tab is hidden for ninety seconds then made visible again; no background fetch happens during the hidden period; the first fetch after visibility regain happens within five seconds. Verifies **AC-3** polling pause plus resume.
- **PDF export**: an admin clicks Export PDF; the response streams `application/pdf`; the file content opens with a recognisable PDF header; the four charts plus the notes section plus the active filter values are present; the file downloads with a content disposition filename `cms-lasu-report-<timestamp>.pdf`. Verifies **AC-4**.
- **CSV export**: an admin clicks Export CSV; the response streams `text/csv`; the file content has the header row plus one row per filtered claim in the documented column order; the file downloads with a content disposition filename `cms-lasu-report-<timestamp>.csv`. Verifies **AC-5**.
- **Auth/permission**: a reporter requests `/api/admin/reports`; the route handler returns 403; the page level `getSession()` blocks the page. Verifies **AC-6**.
- **Empty state**: a date range with zero results yields Skeleton plus empty state per chart; the URL is shareable; the filter URL state persists across pages. Verifies **AC-7**.
- **Build gates plus smoke**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; Playwright covers all chart types, filter composition, polling, hidden tab pause, PDF download, CSV download, zero state. Verifies **AC-8**.

## Build plan

Tracer Bullet ordering: stand up the aggregation pipeline plus the page layout end to end (one chart plus zero state plus filter row) before thickening with the second, third, fourth chart plus the exports plus the polling plus the integration test.

1. **Build `GET /api/admin/reports`** route handler at `app/api/admin/reports/route.ts`. Order: session probe plus admin role check plus Zod validate the filter inputs plus build the aggregation pipeline plus execute plus shape the response. The pipeline runs `$match` for filters plus `$facet` splitting into the four aggregations plus `$group` per chart plus the SLA breach count plus the average resolution time plus the backlog count plus the total count. The response shape is the documented `{ data, meta }`. Satisfies **AC-1**, **AC-2**, **AC-6**.

2. **Build `lib/utils/csv.ts`** exporting `toCsv(rows, columns)` plus a `Content-Disposition` helper for the filename. Hand rolled; no `papaparse` dependency. Satisfies **AC-5** server side.

3. **Build `GET /api/admin/reports/export.csv`** route handler at `app/api/admin/reports/export.csv/route.ts`. Order: same auth plus validation as step 1 plus run the filtered pipeline plus map to the documented column shape plus stream the CSV. Satisfies **AC-5**.

4. **Build `POST /api/admin/reports/export.pdf`** route handler at `app/api/admin/reports/export.pdf/route.ts`. Order: same auth plus validation as step 1 plus render the `@react-pdf/renderer` Document with Page plus the four charts plus a notes section plus the active filter values plus stream with `application/pdf`. Failure path returns 500 `pdf_render_failed`. Satisfies **AC-4**.

5. **Build `app/(admin)/reports/page.tsx`** as a Server Component fetching the initial aggregation via `GET /api/admin/reports` with the URL filter state. Renders a header with the title plus the filter row plus the charts row plus the polling plus the export buttons. Page level `getSession()` defense in depth per spec 0004. Satisfies **AC-1**, **AC-2**, **AC-3**.

6. **Build `components/admin/{VolumeByCategoryChart,VolumeByLocationChart,VolumeBySeverityChart,BreachCountCard,AvgResolutionCard,BacklogCard}.tsx`** plus `FilterPanel` plus `ExportButtons` plus `SkeletonChartPlaceholder`. The chart components wrap Recharts Bar plus the numeric card components use the spec 0003 design tokens plus Sonner toasts for export failures. The polling is wired via TanStack Query `useQuery` with `refetchInterval: 60_000` plus `refetchOnWindowFocus: true` per the spec 0003 foundation. The URL state sync reuses the FilterPanel pattern from spec 0007 plus the `useSearchParams` plus `useRouter` pattern. Satisfies **AC-1** through **AC-5**.

7. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Playwright covers four chart rendering, filter composition reducing the data, PDF download with correct headers, CSV download with correct headers, zero state, polling plus hidden tab pause. Verifies **AC-8**.

## Consequences

**Positive**:

- The admin has a single dashboard for the campus maintenance picture; SLA breach count plus average resolution time plus backlog are the canonical operational metrics, and the volume trio shows where the load is concentrated.
- The four charts plus the data table plus the exports share one aggregation pipeline; no drift between what the admin sees and what is exported.
- PDF plus CSV export give the admin printable plus offline analysis surfaces without depending on a third party reporting tool.
- Filter composition plus URL state sync make a shareable address for any specific dashboard view plus matches the admin queue's URL pattern.

**Negative / tradeoffs**:

- A traffic spike (many admins clicking the same filter URL) yields many aggregation runs; mitigate with fast aggregations at pilot scale plus the URL state shareability.
- Average resolution time is `null` when zero claims match the filter; the card renders an empty state copy rather than a misleading zero.
- PDF rendering is server side CPU bound; long render times are possible when the chart count grows; mitigate by rendering only the four named charts plus the notes section.

**Neutral**:

- No new env var.
- New files: `app/api/admin/reports/route.ts`, `app/api/admin/reports/export.csv/route.ts`, `app/api/admin/reports/export.pdf/route.ts`, `app/(admin)/reports/page.tsx`, plus the components in `components/admin/`, plus `lib/utils/csv.ts`. Consistent with the locked file organization.
- The optional `reports` collection slot from spec 0002 stays empty; if LASU pilot shows aggregation slowdowns, the slot is the documented migration path.

## Follow-up

- [ ] When LASU pilot shows dashboard traffic spikes or volume growth makes aggregations slow, populate the optional `reports` collection slot from spec 0002 with a daily snapshot cron (mirror the spec 0009 cron pattern) and read from the cache. Capture in `/sync` if the spec drifts.
- [ ] When the SLA reporting dashboard ships in Slice 4 (Feature 11 part 2 if scope grows), the realtime layer's escalation events from spec 0010 feed the breach count by severity chart in real time without polling.
- [ ] Install `@react-pdf/renderer` plus Recharts into `package.json` if not present; capture in the build step.
- [ ] The filter row inputs are `URLSearchParams` arrays currently; if LASU pilot shows complex filter combinations, consider deriving a compact hash from the filter set for stable plus memory friendly URL state; defer to a maintenance task.
- [ ] Consider installing the `frontend-design` community skill into `AGENTS.md` `## Agent skills` so future chart heavy features land on the canonical patterns; recommended but not blocking.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 11 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (Recharts at §Charts / export; `@react-pdf/renderer` for PDF; the locked route group allowlist at §Auth and Access Model; the application tier SSR for PDF render)
- `context/code-standards.md` (the API route handler ordering with auth, rate limit, validate, side effects, persist, return; the CSV small surface notice per `papaparse`; the file organization for `app/api/admin/`, `components/admin/`, `lib/utils/`)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist before moving to the next unit)
- `docs/specs/0002-data-model.md` (the locked `complaints` schema with `createdAt`, `status`, `priority`, `categoryId`, `locationId`, `slaAcknowledgeBy`, `slaResolveBy`, `resolvedAt`; the optional `reports` collection slot; the indexes used by the pipeline at `§Storage Model`; the `toPublicJSON` mapper at AC-13)
- `docs/specs/0003-design-system-ui-foundation.md` (the admin role aware layout; the Astryx plus Sonner plus design tokens plus TanStack Query baseline; the Skeleton patterns)
- `docs/specs/0004-authentication.md` (the BetterAuth admin RBAC; the `useCurrentUser` plus `getSession()` defense in depth)
- `docs/specs/0007-admin-queue-and-assignment.md` (the `lib/sla/breach-detection.ts` reused for the breach count card; the FilterPanel pattern reused for the filter row; the admin queue page top nav that links to `/admin/reports`)
- `docs/specs/0009-sla-engine-and-escalation.md` (the `complaints.escalated` flag) plus the cron best effort pattern the dashboard inherits
- `docs/specs/0010-real-time-notifications.md` (the `useAblyChannel` hook available for follow up maintenance features that want live dashboard updates)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line)
- Live aggregation per request with the locked indices (pre computing deferred)
- Single aggregation pipeline drives charts plus table plus exports (avoiding drift)
- Hand rolled CSV per code-standards small surface notice
- PDF via `@react-pdf/renderer` Document plus Page server side
- Filter URL state sync pattern from spec 0007 reused (chips plus URL params)
- Defence in depth: proxy plus per page `requireRole` plus per route handler `getServerSession` plus per route handler `authorizeRole` plus per route handler role check
- `toPublicJSON` applied uniformly per spec 0002 AC-13
- TanStack Query polling at 60 seconds with `refetchOnWindowFocus: true` per spec 0003 foundation
- Per chart Skeleton plus zero result empty state copy
