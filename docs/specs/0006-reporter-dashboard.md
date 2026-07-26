# 0006. Reporter dashboard

**Date**: 2026-07-25
**Status**: Proposed

## Summary

This spec ships the reporter dashboard at `/complaints/mine` (a cards list of the reporter's own complaints sorted by `createdAt` desc, paginated 20 per page, with Closed hidden by default plus a toggle) and the comprehensive detail page at `/complaints/[id]` (status, deadlines, description, photos, plus the full status timeline plus a proof-of-fix photo lightbox). TanStack Query polls `/api/complaints` every thirty seconds on `/complaints/mine` and every ten seconds on `/complaints/[id]`; polling pauses on hidden tabs and resumes on visibility regain. Feature 6 owns `/complaints/[id]` entirely per the original scope and the Q1-A decision; spec 0005's post submit redirect lands directly on Feature 6's page (the spec 0005 build reduces from a detail page render to a redirect, captured as a cross spec follow up).

## Context

Spec 0003 shipped the foundation shells plus `ReporterDashboardEmpty` plus the design tokens plus the `SlaCountdown` composite used on cards and detail rows. Spec 0004 shipped `useCurrentUser` plus project root middleware that gates the reporter route group. Spec 0005 shipped the complaint submission flow plus a basic detail page stub that showed status plus deadlines plus photo only. The remaining work is the comprehensive list at `/complaints/mine` (the scope's name for the reporter's own view), the comprehensive detail page at `/complaints/[id]` (the scope's original assignment, with timeline plus proof-of-fix per the Done when line), plus the cross spec amendment that moves the detail page entirely to Feature 6.

The cross spec decision is real and material: spec 0005's build plan currently writes a basic detail page at `app/(reporter)/complaints/[id]/page.tsx` (per spec 0005 build plan step 12 and AC-9), but the scope row for Feature 6 already says "complaint detail at `/complaints/:id` showing status timeline and proof-of-fix photo" which means Feature 6 is the canonical owner of the page. Resolving in favour of Feature 6 ownership keeps one route responsible for one job and lets spec 0005's submit redirect land at Feature 6's richer page from day one.

## Requirements

**User stories**:

- As a reporter I want a list of every complaint I filed at `/complaints/mine` sorted by most recent first with quick status readouts so I do not have to click in to see whether something is in progress.
- As a reporter I want the list to refresh on its own (every thirty seconds) so the next time I look at it the status is current without me reloading.
- As a reporter I do not want Closed complaints to dominate the list because they are mostly noise; a "show closed complaints" toggle reveals them when I need them.
- As a reporter I want the detail page at `/complaints/[id]` to show me a full audit trail of the lifecycle (when it was submitted, when it was assigned, when work started, when work resolved with a photo, when it was closed) plus the proof-of-fix photo so I have confidence the issue is genuinely fixed.
- As a developer I want the list filtered to the reporter's own complaints plus the closed hiding plus pagination in place so the route handler stays bounded at pilot scale.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A signed in reporter visiting `/complaints/mine` sees a list of their own complaints as cards sorted by `createdAt` desc. The list excludes complaints in the `Closed` status by default. A "show closed complaints" toggle at the bottom of the list reveals them when enabled. The list is paginated 20 items per page via a cursor on `_id desc` with a "load more" affordance linked from the `nextCursor` in the response meta. The empty state is the existing `ReporterDashboardEmpty` composite from spec 0003 AC-5; its primary CTA routes to `/complaints/new`.
- **AC-2**: Each card on the list shows status badge (colored per the ui-context severity mapping), category name, location name, severity badge, a short description echo of about two hundred characters, a photo thumbnail when a photo is present, a created timestamp via `date-fns` `formatDistanceToNowStrict`, and an SLA countdown via the spec 0003 `SlaCountdown` composite.
- **AC-3**: TanStack Query polls `GET /api/complaints` every thirty seconds while `/complaints/mine` is the focused tab; polling pauses when the tab is hidden and resumes on `visibilitychange`; the page does a soft refresh of cards without flicker (no full layout shift).
- **AC-4**: A signed in reporter visiting `/complaints/[id]` sees the comprehensive detail page (Feature 6 owns the page per Q1-A) showing status badge, `slaAcknowledgeBy`, `slaResolveBy`, description echo (full text), photo(s) when present, severity badge, location name, category name. AI `rationale`, `severity`, `costUsd`, `promptTokens`, `completionTokens` are NOT shown (per spec 0002 AC-13).
- **AC-5**: The detail page renders a status timeline (chronological list of `statusHistory` entries in reverse chronological order) where each row shows `fromStatus → toStatus`, the actor label (a `users.name` plus role for human actors, or the literal "system" plus the actor role when `changedBySystem: true` per spec 0002's `statusHistory` field), the `note` when present, a photo thumbnail inline when `photoUrl` is set (the proof-of-fix photo on the Resolved transition per spec 0002 AC-6 plus the status forward only state machine), and a relative timestamp via `date-fns` `formatDistanceToNowStrict`. Each row is colour coded by the destination status per the ui-context severity mapping.
- **AC-6**: The proof-of-fix photo thumbnail on a timeline row, when clicked, opens the large Cloudinary URL in an Astryx `Dialog` modal with a caption showing the transition text plus the absolute timestamp. The dialog closes on Esc, on click outside the dialog body, and on the X affordance.
- **AC-7**: `GET /api/complaints` filters server side to the reporter's own complaints: `find({ reporterId: user._id })` UNION the reporter's anonymous hidden user row when one exists (the spec 0002 cross field invariant plus the existing `users._id` reuse means anonymous complaints are still attributable to the same reporter for this list). The response shape is `{ data: complaints[], meta: { nextCursor: ObjectId | null, hasMore: boolean } }` per the code-standards §API Routes response contract. `toPublicJSON` is applied per spec 0002 AC-13 before the response leaves the handler.
- **AC-8**: TanStack Query polls `GET /api/complaints/[id]` every ten seconds while the detail page tab is focused; the SLA countdown text and the timeline order visibly update on each refresh; polling pauses on hidden tab and resumes on visibility regain.
- **AC-9**: Defense in depth: the `GET /api/complaints/[id]` route handler calls `getSession()` and rejects 403 when the requester is not the reporter of record; middleware enforces RBAC per spec 0004 as the first layer. The page-level `getSession()` call in the Server Component (per spec 0004 page-level defense) covers the case where middleware is misconfigured.
- **AC-10**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; smoke happy path covers reporter sees own complaints, status card updates on next poll, detail page timeline renders full audit trail, proof-of-fix photo opens in modal, pagination load more works, closed toggle changes the filter server side.

## Options considered

### Option 1: Cards list with TanStack Query polling (chosen)

A list of complaint cards sorted by `createdAt` desc with TanStack Query polling every thirty seconds on `/complaints/mine` and every ten seconds on `/complaints/[id]`. Detail page includes the timeline plus proof-of-fix photo lightbox via Astryx `Dialog`.

**Pros**:
- Matches the spec 0003 mobile first single column plus desktop two column layout pattern.
- Standard data fetching pattern via TanStack Query (already wired from the foundation).
- Closed by default toggle reduces page noise without losing the data.
- Defence in depth via middleware plus per page `getSession()` keeps route handlers honest.

**Cons**:
- Polling creates some background load (small; TanStack Query dedupes active queries).
- Closed toggle adds one UI element on the page.
- The split between Feature 5's redirect and Feature 6's full page adds a small cross spec amendment.

### Option 2: Table list with sortable columns

A compact table view with sortable columns (date, category, status, severity).

**Pros**:
- More dense; power user friendly.

**Cons**:
- Tables on phone sized viewports are awkward and conflict with the mobile first single column pattern from spec 0003.
- Sort by category or severity is mostly noise on the reporter side (the admin reporting dashboard in Slice 4 is the right home for those views).
- The reporter's mental model is "most recent first," not "sortable by arbitrary column."

### Option 3: Real time Ably push to reporter dashboard

Use Ably for status updates pushed to the reporter dashboard like the admin queue in Slice 3.

**Pros**:
- Genuinely live updates without polling.

**Cons**:
- Ably is reserved for the admin technician path per the architecture; adding it to the reporter side doubles the integration surface in MVP.
- Reporter does not need second by second updates; thirty second polling matches the SLA countdown refresh cadence.
- Per architecture "we do not need real time on the reporter side in MVP" (NFR implicit from the polling friendly cadence in spec 0003 foundation).

## Decision

**Chosen option**: Option 1: cards list with TanStack Query polling.

The reporter submission flow from spec 0005 redirects to either `/complaints/mine` or directly to `/complaints/[id]` (Feature 6's page) per Q1-A. The list at `/complaints/mine` is paginated twenty per page via cursor, excludes Closed by default with a toggle, polls every thirty seconds, and uses the spec 0003 design tokens. The detail page at `/complaints/[id]` is Feature 6's canonical owner: status plus deadlines plus description plus photos plus the comprehensive timeline plus the proof of fix photo lightbox. The existing `GET /api/complaints/[id]` route handler from spec 0005 is reused with the same RBAC plus reporter ownership filter.

**Implementation skills**: `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — Server Component plus Client Component boundaries for the polling pattern (`useQuery` with `refetchInterval` and `refetchOnWindowFocus`), plus TanStack Query default config wiring. `astryx` (`facebook/astryx`, `C:/Users/Korede/.agents/skills/astryx/`) — `Dialog` modal pattern for the proof-of-fix lightbox plus `Skeleton` for the list plus detail loading states.

## Rationale

The decision locks to Option 1 because of three specific forces from Context. First, the architecture pattern from spec 0003 (mobile first single column plus desktop two column plus the `ReporterDashboardEmpty` composite) plus the polling pattern from the same foundation already settles the list surface; deviating would contradict the foundation that Slice 1 ships on. Second, the scope Done when line says "the reporter sees their complaints sorted by date, status is current, and the detail page shows the full status history." This is exactly the cards list with polling plus the timeline with photo lightbox that Option 1 delivers. Third, the spec 0005 build plan already wrote a basic detail page stub at `app/(reporter)/complaints/[id]/page.tsx`; the cross spec amendment that moves the page to Feature 6 is one rewrite rather than two parallel detail implementations.

The polling cadence is justified by the SLA countdown text: when a card shows "Acknowledge by 3h 12m" that text needs to be reasonably live so the reporter sees the deadline tick down without manual refresh. Thirty seconds on the list plus ten seconds on the detail matches the cadence a human eye notices; Ably push would be measurable overkill at this scale and on the reporter side.

The closed toggle is recommended because Closed complaints have low changing information for the reporter (the result is done, the proof photo was already shown) but they have high historical value when the reporter wants to refer back; a small UI affordance plus a server side filter covers both cases without server side pagination pollution.

The proof-of-fix photo lightbox via Astryx `Dialog` is recommended because the thumbnail plus click to enlarge is the simplest pattern that preserves page context; an Astryx `Dialog` is the foundation's established modal primitive per the astryx skill.

## Feature design

**Data model sketch**:

This feature is additive. Zero schema changes to the locked eight Mongoose collections.

- `complaints` (locked at spec 0002): no field changes. The list reads `reporterId`, `categoryId`, `locationId`, `description`, `photoUrls`, `status`, `priority`, `slaAcknowledgeBy`, `slaResolveBy`, `createdAt`, `isAnonymous`, `parentComplaintId`.
- `statusHistory` (locked at spec 0002): no field changes. The timeline reads `complaintId`, `fromStatus`, `toStatus`, `changedById`, `changedBySystem`, `note`, `photoUrl`, `changedAt` per spec 0002.
- `categories` plus `locations` (locked): read for the card's display name plus icon.
- `users` (locked): read for the actor label on each `statusHistory` row (`users.name` when present, or "system" when `changedBySystem: true`).

**State transitions** (if applicable):

None. This feature is a read path; status transitions are owned by Feature 7 (admin assignment) and Feature 8 (technician transitions); Feature 6 reads them.

**API surface**:

| Endpoint | Method | Auth | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| `/api/complaints` | `GET` | reporter session | `?cursor=<ObjectId>` optional, `?includeClosed=true` optional | `{ data: complaintPublicJSON[], meta: { nextCursor, hasMore } }` | 401 unauthenticated |
| `/api/complaints/[id]` | `GET` | reporter (own), admin (any), technician (assigned) per spec 0005 | none | `{ data: complaintPublicJSON }` | 401, 403, 404 per spec 0005; spec 0005's timeline component is re exported as Feature 6's data composes client side via a richer GET result |
| `/complaints/mine` (page) | `GET` | reporter session | none | rendered page HTML with cards | 401 |
| `/complaints/[id]` (page) | `GET` | reporter (own), admin (any), technician (assigned) | path param | rendered detail HTML with timeline plus photo lightbox | 401, 403, 404 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| `/api/complaints` server side filter | list of complaints | `ComplaintModel.find({ reporterId: user._id })` UNION `find({ reporterId: anonUser._id })` when the reporter's anonymous hidden user row exists |
| `/api/complaints` closed default | `find` predicate does not include `status: 'Closed'` | `includeClosed=true` query param flips the filter; default unset means closed excluded |
| Cursor pagination | `nextCursor` | last item's `_id` of the current page; the next request filters `find({ _id: { $lt: cursor } })` with the same sort |
| Card display: status badge | status | `complaints.status` |
| Card display: severity badge | severity | `complaints.priority` mapped via ui-context severity colors |
| Card display: category name | string | `categories.findById(complaint.categoryId).systemType` (or `.name` per categories schema) populated client side via a small lookup helper to avoid N+1 |
| Card display: location name | string | `locations.findById(complaint.locationId).name` populated client side once in the page cache |
| Card display: short description | string | `complaints.description.slice(0, 200)` plus ellipsis when over 200 |
| Card display: photo thumbnail | image URL or null | `complaints.photoUrls[0]` when present |
| Card display: created timestamp | string | `date-fns formatDistanceToNowStrict(complaints.createdAt)` |
| Card display: SLA countdown | string | spec 0003 `SlaCountdown` composite computing `now to slaAcknowledgeBy` or `now to slaResolveBy` whichever is sooner |
| Detail timeline: actor label | string | when `statusHistory.changedBySystem` is true, the literal `system (${actorRole})`; otherwise `users.findById(changedById).name` plus the user role |
| Detail timeline: status arrow colour | badge | ui-context severity to colour mapping plus per status colour override (Submitted muted, Acknowledged accent, In Progress warning, Resolved success, Closed muted) |
| Detail timeline: photo thumbnail on a row | image URL or null | `statusHistory.photoUrl` (Cloudinary HTTPS) when set, typically the proof-of-fix photo on Resolved |
| Photo lightbox: large image | URL | the same `statusHistory.photoUrl` rendered full size inside an Astryx Dialog |
| Photo lightbox: caption text | string | `fromStatus → toStatus` plus the absolute transition timestamp |

**Key invariants** (rules that must always hold):

- The reporter at `/complaints/mine` sees only their own complaints and their anonymous hidden ones; never another reporter's submission, never an admin only view (admins use `/admin/queue` in Feature 7).
- The Closed status is hidden from the list by default; the toggle flips a server side filter so a refresh after enabling returns Closed claims.
- `AI_TRIAGE_FALLBACK_TO_RULES`, `OPENAI_*`, and the cost and rationale fields are NEVER in the wire response (per spec 0002 AC-13 `toPublicJSON`).
- The detail page's `/componets/[id]` request is also filtered reporter ID; even if middleware is misconfigured, the route handler rejects a non owner with 403.
- Pagination uses cursor on `_id desc`; the cursor advances monotonically; a stale cursor (page size changed) returns an empty next page rather than throwing.
- Polling pauses on hidden tab and resumes on `visibilitychange`; no background fetch when the user cannot see the result.
- The photo lightbox's Cloudinary URL is HTTPS only; a non HTTPS URL is filtered before render.

**Security model**:

- Authentication: BetterAuth session probed via `getSession()` plus middleware enforcement per spec 0004.
- Authorization: server side filter ensures `reporterId` matches the signed in user's `_id`; the same filter covers the reporter's anonymous hidden user row. The detail page also calls `getSession()` server side.
- No new env var.
- PII discipline: page payload carries only the fields needed for the card plus timeline; AI rationale plus cost fields are stripped by `toPublicJSON` per spec 0002 AC-13.
- The `actor` label on a timeline row carries the actor's `users.name` only when the actor is a human; `system` is the literal anonymous label when `changedBySystem: true`. Admin doesn't get a "you can see who took the action" privilege at the reporter side; the reporter sees the same labels an admin does (minus the cost fields).
- Photo lightbox: large URL is the same Cloudinary HTTPS URL; no auth flow needed beyond the existing session.

**Configuration required**:

None. This feature does not introduce any new env vars. Every env var consumed (`MONGODB_URI`, `BETTER_AUTH_SECRET`, `CLOUDINARY_*`) is already set per spec 0001 plus spec 0004.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: a signed in reporter with three complaints (one Submitted, one In Progress with one Resolved transition, one Closed) visits `/complaints/mine` and sees two cards by default (Closed hidden), the cards show status, category, location, severity, short description, photo thumbnail, created timestamp, SLA countdown; the Closed toggle reveals the third card after a server refetch. Verifies **AC-1**, **AC-2**.
- **Failure case**: a second reporter visits `/complaints/mine` and sees only their own complaints (zero overlap with the first reporter). The route handler's `reporterId` filter is enforced. Verifies **AC-7**.
- **Polling**: the page is open for sixty seconds; two background fetches happen at the thirty and sixty second marks; the cards' SLA countdown text updates each tick. Verifies **AC-3**.
- **Hidden tab**: the page is hidden for ninety seconds then made visible again; no background fetch happens during the hidden period; the first fetch after visibility regain happens within five seconds. Verifies **AC-3** polling pause plus resume.
- **Happy path**: a signed in reporter visits `/complaints/[id]` for a complaint that has gone Submitted → Acknowledged → In Progress → Resolved; the timeline lists four rows in reverse chronological order; the Resolved row's actor is the technician's name plus role, plus an inline `photoUrl` thumbnail; the proof photo thumbnail, when clicked, opens the Astryx `Dialog` modal with a caption. Verifies **AC-4**, **AC-5**, **AC-6**.
- **Defense in depth**: a signed in reporter from another account requests the same `/api/complaints/[id]`; the route handler returns 403; with the middleware momentarily disabled, the route handler still returns 403 because it calls `getSession()` server side. Verifies **AC-9**.
- **Pagination**: a reporter with twenty five complaints loads the page; the first twenty render with a "load more" affordance; clicking "load more" brings in the remaining five plus a `hasMore: false` payload. Verifies **AC-1** pagination.
- **AI fields hidden**: a reporter visiting `/complaints/[id]` whose complaint had `aiSuggestion.rationale` plus `priority` set by a successful AI call still sees no rationale plus no severity badge (severity is mapped from `priority` per the spec 0002 invariant, not from `aiSuggestion.severity`); the wire response is asserted in a test to contain neither `rationale` nor `costUsd`. Verifies **AC-4**.
- **Build gates plus smoke**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all green; hand exercise or Playwright covers the list, the polling update, the detail timeline, the photo lightbox, the pagination, the closed toggle. Verifies **AC-10**.

## Build plan

Tracer Bullet ordering: stand up the list first (proves the data path end to end), then the detail page (proves the timeline plus photo path), then the cross spec amendment that redirects spec 0005's submit to Feature 6. Each task tagged with the AC or ACs it satisfies.

1. **Build `lib/utils/pagination.ts`** exporting `paginateCursor({ model, query, sort, pageSize, cursor })` returning `{ data, nextCursor, hasMore }`. Page size 20 by default. Re export from a stable location so the route handlers plus the future admin reporting feature reuse one implementation. Satisfies **AC-1**, **AC-7**.

2. **Build `GET /api/complaints`** route handler at `app/api/complaints/route.ts`. Order: session probe, server side filter (`reporterId === user._id` UNION the reporter's anonymous hidden user row when one exists), includeClosed default false, cursor pagination via `lib/utils/pagination.ts`, response shape `{ data, meta: { nextCursor, hasMore } }`, `toPublicJSON` applied per spec 0002 AC-13. Satisfies **AC-7**.

3. **Build `components/reporter/ComplaintCard.tsx`** as a Client Component receiving the public JSON shape plus the populated category plus location lookup cache. Renders status, severity, category name, location name, short description echo, photo thumbnail when present, `date-fns formatDistanceToNowStrict` for the created timestamp, and the `<SlaCountdown />` composite from spec 0003 for the SLA countdown text. Satisfies **AC-2**.

4. **Build `/app/(reporter)/complaints/mine/page.tsx`** as a Server Component that calls `useCurrentUser` to get the signed in user, then `useQuery` (from TanStack Query already wired in spec 0003) with `queryKey: ['complaints', userId, cursor, includeClosed]`, `queryFn` calling `/api/complaints`, `refetchInterval: 30_000` and `refetchOnWindowFocus: true`. The page renders `<ComplaintCard />` per claim, the empty state composite (`<ReporterDashboardEmpty />`) when zero claims, a `<ClosedClaimsToggle />` (a small Client Component switching the `includeClosed` filter), and a `<LoadMore />` button bound to the `nextCursor` from the response. The closed toggle triggers a new query at cursor null with the flag flipped. Satisfies **AC-1**, **AC-2**, **AC-3**.

5. **Build `components/reporter/ComplaintTimeline.tsx`** as a Client Component receiving the populated `statusHistory` rows (pre fetched by the detail page Server Component plus joined with actor name plus role lookup). Renders the reverse chronological timeline with `fromStatus → toStatus` arrow, the actor label per the invariant, the note when present, the photo thumbnail inline (with `onClick` opening the Astryx `Dialog`), and `date-fns formatDistanceToNowStrict` for the relative timestamp. Each row's destination status gets the ui-context colour mapping. Satisfies **AC-5**.

6. **Build `components/reporter/ProofPhotoDialog.tsx`** as a thin Client Component wrapping the Astryx `Dialog` that takes `url`, `caption`, and `open` plus `onClose` props. The caption shows the transition text plus the absolute timestamp. Closes on Esc, click outside, or X. Satisfies **AC-6**.

7. **Build `/app/(reporter)/complaints/[id]/page.tsx`** (Feature 6 owns the page per Q1-A). Server Component: session probe (defense in depth), reads the complaint via the existing `GET /api/complaints/[id]` route handler (the request is server to server with the reporter's session), pre fetches the `statusHistory` rows for the timeline, pre fetches category plus location lookups, then renders the detail page with status, SLA deadlines, description, photos, severity, location, category, plus the `<ComplaintTimeline />` plus the `<ProofPhotoDialog />` mounted at the page level. `useQuery` with `refetchInterval: 10_000` and `refetchOnWindowFocus: true` for the soft refresh; polling pause on hidden tab via TanStack Query's built in `refetchIntervalInBackground: false`. Satisfies **AC-4**, **AC-5**, **AC-6**, **AC-8**, **AC-9**.

8. **Cross spec amendment**: in spec 0005's `## Build plan` step that previously routed the post submit redirect to `/complaints/[id]`, add a one line amendment that the post submit redirect lands at `/complaints/<id>` where the page is Feature 6's comprehensive detail. Capture this amendment in the spec's Follow up and ask `/sync` to fold it. Effect on Feature 6: zero (the page already exists at the same path and consumes the same `useCurrentUser` plus `GET /api/complaints/[id]` schema). Effect on spec 0005's resolution: the build reduces from "create a basic detail page" to "redirect before passing the path through." Satisfies **AC-1**, **AC-4** cross spec cleanliness.

9. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. `npm run dev` boots. Hand exercise or Playwright covers the list, the polling update with hidden tab pause, the detail timeline forward flow (Submitted → Acknowledged → In Progress → Resolved), the proof-of-fix photo lightbox, the load more pagination, the closed toggle. Verifies **AC-10**.

## Consequences

**Positive**:

- Reporters can see every complaint they ever filed plus its current state without manual refresh; SLA countdowns tick visibly.
- The detail page's full audit trail plus proof-of-fix photo give the reporter a tangible artifact that the issue was resolved.
- TanStack Query polling cadence (30 seconds list, 10 seconds detail) matches the SLA countdown human eye cadence; polling pauses on hidden tabs save battery plus bandwidth on the reporter side.
- The closed toggle keeps noise off by default but preserves historical claims for reporters who want to see them.
- Cross spec amendment (Feature 6 owns the detail page) keeps one route responsible for one job and avoids two parallel detail implementations drifting.

**Negative / tradeoffs**:

- Polling creates some background load (small; TanStack Query dedupes active queries; one fetch per reporter per page per interval).
- The pagination is by cursor on `_id desc` and assumes monotonic ID assignment (true under Mongoose ObjectId, no risk).
- The user has to click the toggle to see Closed claims; this is a deliberate friction to keep the open list scannable.
- The proof-of-fix photo is a single Cloudinary URL; if Cloudinary ever returns a 404, a friendly alt text "Proof-of-fix photo unavailable" renders in the dialog body.

**Neutral**:

- No new env var.
- New files at `/components/reporter/ComplaintCard.tsx`, `ComplaintTimeline.tsx`, `ProofPhotoDialog.tsx`, `/lib/utils/pagination.ts`, plus the page updates and the API route handler.
- The detail page is Feature 6's canonical owner per the scope plus the Q1-A decision; spec 0005's redirect after submit is the published entry point.

## Follow-up

- [ ] Cross spec amendment: spec 0005's `## Build plan` step 12 (the basic detail page build) should be reframed so the post submit redirect lands at `/complaints/<id>` (Feature 6's comprehensive page) and remove the basic detail page render. Capture in `/sync` to keep spec 0005 aligned with Feature 6's reality. Effect: Feature 5's build reduces from "create a basic page" to "redirect to Feature 6's page."
- [ ] When the admin reporting dashboard ships (Slice 4), consider promoting `lib/utils/pagination.ts` to a shared utility used by both the reporter list and the admin reporting views; out of scope in MVP.
- [ ] Astryx v0.1.7 is beta; track the v1 release and revalidate the `Dialog` plus `Skeleton` integration in a follow up maintenance task.
- [ ] Consider installing the `react-pdf` and `frontend-design` community skills into `AGENTS.md` `## Agent skills` so future dashboard look and feel reviews reference the recommended patterns; recommended but not blocking.
- [ ] If LASU pilots show the reporter wants a "filter by status" affordance beyond the closed toggle, surface in the reporting dashboard sub feature of Slice 4 instead of bolting this on the reporter dashboard; out of scope in MVP.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 6 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (TanStack Query in the frontend stack list; date-fns in the frontend stack list; the route group allowlist per RBAC; the per page Server Component pattern plus the application tier boundary)
- `context/code-standards.md` (Server Component plus Client Component boundaries; the API route handler ordering with auth, rate limit, validate, side effects, persist, return; the centralised `toPublicJSON` mapper; the file organization rule for `/components/<role>/`)
- `context/ai-workflow-rules.md` (one capability per PR rule; the cross spec amendment rule; the unit gating checklist before moving to the next unit)
- `docs/specs/0002-data-model.md` (locked `complaints` schema with the fields the list plus detail read; locked `statusHistory` fields `fromStatus`, `toStatus`, `changedById`, `changedBySystem`, `note`, `photoUrl`, `changedAt` consumed by the timeline; locked users schema with `anonymousId` for the cross spec anonymous path; AC-13 `toPublicJSON` PII redaction)
- `docs/specs/0003-design-system-ui-foundation.md` (`ReporterDashboardEmpty` composite re used as the empty state; the `SlaCountdown` composite reused per card plus detail; the mobile first single column plus desktop two column layout pattern; the severity to colour mapping consumed by the status badge plus timeline rows; the TanStack Query foundation wiring consumed by the polling)
- `docs/specs/0004-authentication.md` (`useCurrentUser` hook consumed by `/api/complaints` plus `/componets/[id]`; project root middleware that enforces RBAC on `app/(reporter)/*` plus `/api/complaints`; the defense in depth `getSession()` call pattern)
- `docs/specs/0005-complaint-submission.md` (cross spec amendment: the post submit redirect lands at Feature 6's `/componets/[id]`; the `GET /api/complaints/[id]` route handler consumed by Feature 6; the photo URL shape from `complaints.photoUrls`)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line in `scope.md`: prove the whole pipe works before building any part of it fully)
- TanStack Query `refetchInterval` plus `refetchOnWindowFocus` plus `refetchIntervalInBackground: false` canonical pattern (matches spec 0003 foundation)
- Cursor pagination on `_id desc` for monotonically growing collections (matches MongoDB ObjectId invariant)
- `date-fns` `formatDistanceToNowStrict` canonical pattern for "x minutes ago" style relative timestamps
- Astryx `Dialog` modal close on Esc plus click outside plus X (canonical modal convention)
- Defence in depth: middleware plus per page `getSession()` plus per route handler ownership filter
- Closed by default with a toggle (TanStack Query `enabled` flag plus a server side filter parameter)
- Cross spec amendment folded into a Follow up rather than re editing spec 0005 in place (per `context/ai-workflow-rules.md` cross spec amendment rule)
- `toPublicJSON` applied uniformly to list plus detail responses (matches spec 0002 AC-13)
