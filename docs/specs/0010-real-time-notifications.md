# 0010. Real time notifications (Ably)

**Date**: 2026-07-25
**Status**: In Progress

## Summary

This spec consolidates Ably push into a single realtime layer. The application tier already publishes on assignment (spec 0007), transition (spec 0008), and escalation (spec 0009). This feature ships the client side subscriber plus the polling fallback so the admin queue at `/admin/queue` receives live updates without page reload, the technician plus admin push paths stay end to end reliable, and a small visual ribbon signals the Ably connection state. Channel naming uses `role:subject`; event payloads share one schema across all channels; TanStack Query invalidation on Ably event arrival is the standard update mechanism; TanStack Query polling at 30 seconds resumes as fallback automatically when Ably disconnects.

## Context

Spec 0002 ships the `notifications` collection plus the TTL index plus the schema invariants this spec does not touch. Spec 0003 ships the foundation plus the TanStack Query wiring plus the `lib/realtime/ably.ts` slot per code-standards file organization plus Sonner toast primitives plus the design tokens. Spec 0007 ships `POST /api/admin/queue/assign` plus Ably publish on assignment plus receiver scope query (`role: 'dicht_technician'`). Spec 0008 ships the `POST /api/technician/queue/[id]/transition` route handler plus Ably publish on every transition plus receiver scope (admin plus reporter when not anonymous). Spec 0009 ships `POST /api/cron/sla-sweep` plus Ably publish on escalation plus receiver scope (`role: 'dicht_admin'`).

The application tier is already publishing on assignment, transition, and escalation. The remaining work is the client side subscriber plus channel consolidation plus the polling fallback that turns those publish points into live updates on the admin queue plus verifies the technician push plus the admin escalation push end to end. The reporter dashboard plus the technician queue stay on TanStack Query polling at 30 plus 10 seconds respectively; the user's preferred scope per Q1-A is focused on the admin queue plus verification of the existing paths.

## Requirements

**User stories**:

- As a DICT admin I want the queue at `/admin/queue` to update in real time when an assignment or escalation happens so I do not have to reload the page to see the latest state.
- As a DICT technician I want to receive a push notification when the admin assigns a claim so I can pick it up on my next visit.
- As a DICT admin I want to receive an escalation push when the cron flags an SLA breach so the badge plus queue update land without manual refresh.
- As a developer I want the realtime layer to fall back to TanStack Query polling when Ably disconnects so the queue stays correct through network blips.
- As a developer I want the channel names plus event payload schema to be one source of truth so the build plus the integration tests assert the same contract.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A DICT admin viewing `/admin/queue` receives a live update within two seconds of an assignment action being posted (per spec 0007) without a manual refresh. The query for the visible rows is invalidated; TanStack Query refetches; the affected row reflects the new assignee plus status plus breach state when an escalation is part of the same event. Verifies the "queue updates in real time" half of the scope Done when line.
- **AC-2**: A DICT technician receives a push notification on assignment (per spec 0007's assignment action). The push is best effort per spec 0002 process invariant; the `notifications` row is the canonical record. The technician visit to `/technician/queue` after the push lands reflects the new assignment within the existing TanStack Query polling cadence plus the new push. Verifies the "technician receives a push notification on assignment" half of the scope Done when line.
- **AC-3**: A DICT admin receives an escalation push when the cron (spec 0009) flags an SLA breach. The push carries the breach kind (`acknowledge_overdue` or `resolve_overdue`) plus the complaint id. The admin queue's status update consumes the same push plus updates the breach overlay counter. Verifies the "admin receives escalation warnings" half of the scope Done when line.
- **AC-4**: When Ably disconnects (network blip, service degradation, or the test environment with no Ably key), the client resurfaces TanStack Query polling automatically because the spec 0003 foundation has `refetchInterval` set. A small visual ribbon at the top of the admin queue reads "Live updates paused, using polling fallback" so the admin knows the cadence is coarse but correct.
- **AC-5**: Channel naming uses the colon separated role to subject convention: `admin:queue`, `admin:escalations`, `tech:assignments`, `tech:status`, `reporter:status`. Each payload carries the standard schema `{ kind: string, complaintId: ObjectId, at: ISO8601, recipientId?: ObjectId, payload?: Record<string, unknown> }`. A single integration test asserts every publish plus subscribe side agrees on the names plus the schema.
- **AC-6**: The client side subscriber is a single React hook `useAblyChannel({ name, queryKey })` that returns `connectionState` (`'connecting' | 'connected' | 'disconnected' | 'suspended'`) plus calls `queryClient.invalidateQueries({ queryKey })` on every event. The hook is invoked from the admin queue page plus the admin queue ribbon component plus the technician queue detail page.
- **AC-7**: Defence in depth: the Ably publish side from specs 0007 plus 0008 plus 0009 stays best effort (per spec 0002 process invariant); the client side falls back to TanStack Query polling on disconnect; the operator on call surface an alert through Sonner when Ably has been disconnected for more than two minutes (sent server side from a small heartbeat monitor in a future slice).
- **AC-8**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. End to end Playwright smoke covers a simulated assignment event triggering admin queue invalidation, a simulated escalation event incrementing the ribbon counter, a forced disconnect surfacing the polling fallback ribbon within two polling intervals, and the integration test asserting every channel name plus schema.

## Options considered

### Option 1: Admin queue live; other surfaces stay on polling; one shared hook (chosen)

The admin queue at `/admin/queue` switches from TanStack Query polling at 30 seconds to Ably push with polling fallback when Ably disconnects. The technician assignment push plus technician transition push plus admin escalation push are all verified end to end as part of this feature (they already exist in the application tier via specs 0007 plus 0008 plus 0009). A single shared React hook `useAblyChannel({ name, queryKey })` is the client side entry point; TanStack Query `invalidateQueries` is the standard update mechanism.

**Pros**:

- Matches the scope row's three explicit surfaces plus the Done when line.
- Focused rollout keeps the client side surface manageable.
- Single shared hook means one integration test; the publish plus subscribe sides agree on the names plus schema.
- TanStack Query stays the single source of truth for server state; Ably pushes are invalidation signals, not mutations.

**Cons**:

- Reporter dashboard plus technician queue stay on polling. If LASU pilots show demand for push on those surfaces, defer the work to a Slice 5 maintenance feature.
- Switching the admin queue to push creates a small risk of cascade failure on Ably; mitigate with the polling fallback plus the integration test.

### Option 2: All four surfaces get push, replace polling everywhere

Admin queue plus technician queue plus reporter dashboard plus detail pages all get Ably push, replacing polling everywhere.

**Pros**:

- Every surface goes live.
- One client hook serves every surface.

**Cons**:

- Larger client side surface to maintain; the reporter plus technician UI changes are larger for marginal benefit (their existing polling cadence is fine for now).
- More integration tests; more channels to verify.

### Option 3: Direct client side state mutation on Ably event

Skip TanStack Query invalidation; maintain a separate Zustand-like store for the queue plus detail pages. Ably events append or update rows directly.

**Pros**:

- Lower latency on updates.

**Cons**:

- Two sources of truth for server state.
- Loses the spec 0003 foundation's TanStack Query consolidation.
- Harder to test; harder to invalidate on route change.

## Decision

**Chosen option**: Option 1: admin queue live; other surfaces stay on polling; one shared hook.

The admin queue consumes Ably push and falls back to TanStack Query polling when Ably disconnects. The technician assignment push plus the technician transition push plus the admin escalation push are verified end to end as part of this feature. Channel naming is `admin:queue` plus `admin:escalations` plus `tech:assignments` plus `tech:status` plus `reporter:status`. Event payload is one schema. The client hook `useAblyChannel({ name, queryKey })` is the single entry point.

**Implementation skills**: `using-ably` (`earendil-works/community-skills`, `C:/Users/Korede/.agents/skills/using-ably/`) — Ably client subscription patterns, channel naming, React integration, plus the connection state listener. `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — Server Component plus Client Component boundaries plus TanStack Query client wiring.

## Rationale

Two specific forces drive the choice. First, the application tier is already publishing on assignment plus transition plus escalation; the remaining work is the client side subscriber plus the polling fallback that turns the publish points into live updates. Spreading the work across every surface would grow the client side surface for marginal benefit. Second, TanStack Query is the foundation's source of truth for server state; using Ably pushes as invalidation signals preserves that consolidation rather than introducing a parallel state store.

The polling fallback is the operational safety net for Ably outages; without it, a single Ably outage would freeze the admin queue until manual refresh. The integration test that asserts every channel name plus schema is the single defense against the publish plus subscribe sides drifting. The visual ribbon surfacing the Ably connection state gives the admin immediate feedback when the queue cadence changes.

The reporter dashboard plus the technician queue stay on TanStack Query polling for now because the polling cadence matches the SLA countdown human eye cadence plus the pilot scale reveals if push is needed there later.

## Feature design

**Data model sketch**:

This feature is additive. Zero schema changes to the locked eight Mongoose collections.

- `notifications` (locked at spec 0002): the application tier continues to write rows; the client side does not.
- The realtime layer is client side only: a hook plus an invalidation call. No new server side collection.

**State transitions** (if applicable):

None. The application tier publishes events; the client side consumes via TanStack Query invalidation.

**API surface**:

This feature ships no new server endpoints. The realtime layer is purely client side:

| Export | Kind | Signature | Read by |
|---|---|---|---|
| `useAblyChannel` | React hook | `({ name: string, queryKey: QueryKey }) → { connectionState: 'connecting' \| 'connected' \| 'disconnected' \| 'suspended' }` | Admin queue page, admin queue ribbon, technician queue detail page, reporter detail page (deferred), shared `RealtimeStatusBadge` |
| `RealtimeStatusBadge` | Client Component | `<RealtimeStatusBadge />` | Admin queue top ribbon; small label that flips between "Live" plus the Ably state plus "Live updates paused, using polling fallback" when disconnected |
| `lib/realtime/ably-client.ts` | module | lazy created Ably client plus per channel subscription wiring | `useAblyChannel` plus the integration test |
| `lib/realtime/ably-server.ts` (already from spec 0007 plus 0008 plus 0009) | module | server side publisher | specs 0007 plus 0008 plus 0009 |

Plus one integration test file at `tests/integration/realtime-channel-contract.test.ts` that asserts every publish plus subscribe side agrees on the names plus the event payload schema.

**Value sourcing** (every value the action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| `useAblyChannel` `connectionState` | current Ably connection state | `ably.connection.on(stateChange)` from the Ably client |
| Admin queue invalidation on assignment | queryKey invalidation | `queryClient.invalidateQueries({ queryKey: ['complaints', userId, cursor, includeClosed] })` from TanStack Query |
| Admin queue invalidation on escalation | queryKey invalidation plus ribbon counter increment | the same TanStack Query call plus a local React state bump in `RealtimeStatusBadge` |
| Channel name | string | one of `admin:queue`, `admin:escalations`, `tech:assignments`, `tech:status`, `reporter:status` |
| Event payload | `{ kind, complaintId, at, recipientId?, payload? }` | `lib/realtime/ably-server.ts` from specs 0007 plus 0008 plus 0009 plus the shared schema |
| Polling fallback | refetchInterval timing | the spec 0003 foundation's `refetchInterval: 30_000` on the admin queue plus detail queries; resumes automatically when Ably is disconnected |
| Visual ribbon state | connection state plus fallback note | the local React state in `RealtimeStatusBadge` plus Ably state events |

**Key invariants** (rules that must always hold):

- One shared event payload schema across every channel: `{ kind: string, complaintId: ObjectId, at: ISO8601, recipientId?: ObjectId, payload?: Record<string, unknown> }`.
- The Ably publish side from specs 0007 plus 0008 plus 0009 must publish to channels whose names match the integration test's expectations exactly.
- The client hook calls `queryClient.invalidateQueries({ queryKey })` on every event; the rest is the standard TanStack Query fetch flow.
- Polling fallback is automatic via TanStack Query's `refetchInterval` plus the spec 0003 foundation wiring; no explicit code path needs to enable it.
- The visual ribbon does not block interaction with the queue; it is informational only.

**Security model**:

- Authentication: Ably's public client token derived from the API key via `ably.auth.requestToken` per the Ably integration pattern. The client never receives the API key directly; the token restricts channel access by capability name plus expiry.
- Authorization: client can subscribe to any channel the publish side touches because every channel is role scoped server side; the client is not allowed to publish (capability `subscribe` only).
- PII discipline: Ably event payloads do not include reporter PII. The `notifications` row in the database is the canonical record; Ably pushes carry only the complaint id plus the breach kind plus a short message.

**Configuration required**:

- `NEXT_PUBLIC_ABLY_API_KEY`: the public side Ably key; add a comment in `.env.example` explaining that the client uses a public token derived from this key.
- `ABLY_API_KEY`: already in `.env.example` from Feature 01 for the server side publisher.
- No new server side configuration.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: a DICT admin is on `/admin/queue`; a simulated assignment action publishes a `tech:assignments` event with `kind: 'assignment'` and the same `complaintId`; the client `useAblyChannel('admin:queue', ['complaints', userId, ...])` invalidates the query; TanStack Query refetches the queue rows; the affected row's assignee column updates within two seconds of the simulated event. Verifies **AC-1**, **AC-5**, **AC-6**.
- **Happy path**: the same simulation publishes a `admin:escalations` event with `kind: 'escalation'` and `payload: { overflowMs: 7200000 }`; the admin queue's ribbon counter increments; TanStack Query refetches; the breach overlay border colour reflects the new count. Verifies **AC-3**, **AC-5**.
- **Happy path**: a DICT technician on `/technician/queue` receives a `tech:assignments` event when assignment happens. The client hook's connection state is `connected`; the page reflects the change within two seconds; a Sonner toast fires (best effort) when the user is not currently on the page. Verifies **AC-2**, **AC-6**.
- **Failure case**: the Ably test environment serves a `disconnected` state; the hook falls back to TanStack Query polling at 30 seconds; the visual ribbon reads "Live updates paused, using polling fallback"; manual refresh works. Verifies **AC-4**.
- **Auth/permission**: the Ably token request returns a token with `subscribe` capability only; a published message from a client that tries to publish is rejected by Ably. Verifies the security model invariant plus **AC-5**.
- **Integration test**: a single test file asserts every channel name plus every event payload schema; the test runs against a real Ably account in CI plus a stub Ably in unit tests. Verifies **AC-5**, **AC-8**.

## Build plan

Tracer Bullet ordering: stand up the client hook end to end (channel subscription plus connection state listener plus TanStack Query invalidation) before thickening with the admin queue wiring plus the visual ribbon plus the integration test plus the smoke flows.

1. **Build `lib/realtime/ably-client.ts`** exporting `getAblyClient()` that lazily creates the client using `NEXT_PUBLIC_ABLY_API_KEY` plus the public token request pattern per the Ably React integration. Use the Ably SDK function `Realtime.Promise(options)` plus `client.connection.on(stateChange)` plus `client.channels.get(name).subscribe(event)`. The module seeds the client once per browser session; the hook calls `getAblyClient()` on every render but the underlying client is shared. Satisfies **AC-6**.

2. **Build `useAblyChannel({ name, queryKey })` React hook** in `lib/realtime/use-ably-channel.ts`. Subscribes on mount, unsubscribes on unmount, and calls `queryClient.invalidateQueries({ queryKey })` on every event. Exposes the connection state via a small state hook. Satisfies **AC-5**, **AC-6**.

3. **Build `components/RealtimeStatusBadge.tsx`** as a Client Component consuming the `useAblyChannel` plus the connection state. The badge renders "Live" plus the connection state plus a small "Live updates paused, using polling fallback" suffix when disconnected for more than five seconds. The admin queue renders the badge at the top of the queue column. Satisfies **AC-4**, **AC-6**.

4. **Wire the admin queue at `/admin/queue`** to subscribe to `admin:queue` plus `admin:escalations`. The page is already from spec 0007; simply wrap the queue in the hook plus the badge. The recent actions feed (from spec 0007) and the queue list both consume the same invalidation. Satisfies **AC-1**, **AC-3**.

5. **Verify the existing publish sides from specs 0007 plus 0008 plus 0009** by integration test. The test runs against a stubbed Ably client in unit tests plus a real Ably account in CI; it asserts every publish path uses the channel name from this spec's table plus the event payload schema. Satisfies **AC-5**, **AC-8**.

6. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Playwright covers simulated assignment event triggering admin queue invalidation, simulated escalation event incrementing the ribbon counter, forced disconnect surfacing the polling fallback ribbon within two polling intervals, the integration test asserting every channel name plus schema. Verifies **AC-8**.

## Consequences

**Positive**:

- The admin queue updates live without page reload, the technician assignment push is verified end to end, and the admin escalation push is verified end to end. The three surfaces named in the scope row plus Done when line all converge on one shared Ably layer.
- One shared `useAblyChannel` hook plus one shared event payload schema means the publish plus subscribe sides cannot drift.
- Polling fallback is automatic via TanStack Query, so a single Ably outage does not freeze the admin queue.
- The visual ribbon surfaces the Ably connection state so the admin knows when fallback is active.

**Negative / tradeoffs**:

- Reporter dashboard plus technician queue stay on polling; if LASU pilots show demand the work is additive through the same hook.
- The integration test against real Ably in CI adds a small dependency on Ably's uptime for the test run; a stub Ably fallback covers unit tests.
- The Ably publish side from specs 0007 plus 0008 plus 0009 works best effort per spec 0002 process invariant; a complete Ably outage leaves the queue correct via polling but does not surface escalation warnings until the cron next runs plus is consumed manually.

**Neutral**:

- No new env var; `ABLY_API_KEY` plus `NEXT_PUBLIC_ABLY_API_KEY` are already set per Feature 01 plus spec 0007.
- New files: `lib/realtime/ably-client.ts`, `lib/realtime/use-ably-channel.ts`, `components/RealtimeStatusBadge.tsx`, plus `tests/integration/realtime-channel-contract.test.ts`. Consistent with the locked file organization from code-standards plus spec 0003 foundation.
- The realtime layer does not introduce a parallel state store; TanStack Query stays the single source of truth for server state.

## Follow-up

- [ ] When reporter plus technician surfaces get push (in a Slice 5 maintenance task), the same `useAblyChannel` hook plus the shared event payload schema apply, so the work is additive rather than a rewrite.
- [ ] When LASU IT provisions Ably plus the token issuance endpoint in production, the `NEXT_PUBLIC_ABLY_API_KEY` plus the token endpoint path are operationalised; local development uses the simulator default plus the stub Ably in tests.
- [ ] A small server side heartbeat monitor that surfaces a Sonner alert when Ably has been disconnected for more than two minutes from a Slice 5 observability feature; current feature guarantees TanStack Query fallback so admin queue stays correct.
- [ ] When the SLA reporting dashboard ships in Slice 4 (Feature 11), the realtime layer's escalation events feed the breach count by severity chart in real time without polling.
- [ ] Consider installing the `using-ably` community skill into `AGENTS.md` `## Agent skills` so future Ably work lands on the canonical patterns; recommended but not blocking.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 10 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (Ably push locked at §Stack Real-time; the route group allowlist at §Auth and Access Model; the cross cutting concerns noting cron plus realtime initiation from the application tier)
- `context/code-standards.md` (the Server Component plus Client Component boundaries; the TanStack Query default config; the file organization for `/lib/realtime/`, `/components/`, `/tests/integration/`)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist before moving to the next unit)
- `docs/specs/0002-data-model.md` (the `notifications` collection plus the TTL index plus the PII redaction list from AC-13)
- `docs/specs/0003-design-system-ui-foundation.md` (the TanStack Query wiring in the foundation; the realtime hook slot at `lib/realtime/ably.ts`; the Sonner toast primitives)
- `docs/specs/0004-authentication.md` (the BetterAuth session probe via the foundation providers chain)
- `docs/specs/0006-reporter-dashboard.md` (the TanStack Query polling cadence on the list plus the detail page; the `toPublicJSON` mapper reuse)
- `docs/specs/0007-admin-queue-and-assignment.md` (the Ably publish on assignment plus the channel plus the receiver scope query; the admin queue page at `app/(admin)/queue/page.tsx` consumed by this spec hook)
- `docs/specs/0008-technician-queue-and-status-updates.md` (the Ably publish on every transition plus the channel plus the receiver scope query)
- `docs/specs/0009-sla-engine-and-escalation.md` (the Ably publish on escalation plus the channel plus the receiver scope query; the cron best effort pattern)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line)
- Channel naming convention `role:subject` (Ably canonical pattern)
- TanStack Query invalidation on Ably event arrival (preserves the spec 0003 foundation)
- Shared event payload schema (Avro plus JSON schema style conventions)
- Polling fallback automatic via TanStack Query `refetchInterval` (spec 0003 foundation)
- Best effort Ably publish per spec 0002 process invariant (no change from specs 0007 plus 0008 plus 0009)
- Defence in depth: Ably token with `subscribe` capability only
