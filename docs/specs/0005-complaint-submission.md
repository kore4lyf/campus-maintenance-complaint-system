# 0005. Complaint submission with AI triage

**Date**: 2026-07-25
**Status**: Accepted

## Summary

This spec ships the reporter submission flow at `/complaints/new` end to end on top of Vercel AI SDK plus `gpt-4o-mini`, a single optional photo through the `sharp` plus Cloudinary pipeline, anonymous submissions returning a server signed tracker URL, and duplicate detection clustering repeat reports inside a thirty minute window per spec 0002 AC-11. The locked eight Mongoose collections stay byte for byte unchanged, and the route handler reads better auth session through the auth Data Access Layer at `lib/auth/dal.ts` from spec 0004 so reporter RBAC is enforced through the proxy plus the DAL plus the page plus the route handler. Submission is never blocked by an AI outage because the route falls back to the chosen category's `defaultSeverity` and persists `aiSuggestion.fallback=true` when the call times out, returns a non 2xx, or fails Zod parsing.

## Context

The architecture locks the AI surface (Vercel AI SDK `generateObject` plus Zod schema plus default model `gpt-4o-mini`), the image pipeline (multipart form data to sharp to Cloudinary URL persisted at `complaints.photoUrls[]`), and the duplicate detection rule (thirty minute window on `categoryId + locationId`, runs before AI to save cost during peak fault periods). Spec 0002 already locked the data model and the invariants that make this design implementable: the cross field validator on anonymous submission and `reporterId`, the ordering rule on `slaAcknowledgeBy < slaResolveBy`, the forward only status machine enforced at write time, and the atomic duplicate detection transaction inside `mongoose.startSession()` plus `session.startTransaction()`. Spec 0004 ships a real session so the reporter submission path can require authentication through the DAL plus the proxy plus per page requireRole plus per route handler authorizeRole, and the anonymous flow needs no BetterAuth session at all but signs its tracker JWT with the same `BETTER_AUTH_SECRET` family so the new dependency surface is one env var.

The four seeds from the scope Done when line give the spine of this spec: a complaint is created with valid AI triage results, fallback activates on AI failure, duplicate detection clusters within thirty minutes, and anonymous mode suppresses reporterId plus returns a tracker affordance for the anonymous reporter to come back. The remaining decisions are: the form page layout (single page versus wizard), the AI configuration defaults (model, temperature, timeout, prompt shape, cost calculation), photo policy (single optional versus multiple), category reconciliation (trust user's dropdown versus AI override), after submit redirect target, and the anonymous tracking affordance.

## Requirements

**User stories**:

- As a reporter (LASU student or staff), I want to submit a maintenance complaint from any browser at `/complaints/new` with category, location, description, an optional photo, and an anonymous toggle so that DICT can pick it up and start work.
- As a reporter, I want AI assisted triage to read my description and return a severity plus a brief rationale on the admin side so that DICT understands the urgency even when I just typed two sentences.
- As a reporter, I want a rules based fallback when the AI assistant is down so that my submission is never blocked by an outage.
- As a reporter, I want to know my complaint landed: an immediate redirect to `/complaints/:id` showing status `Submitted` plus the SLA deadlines and my photo so that I have a confirmation.
- As an anonymous reporter, I want to submit without signing in plus receive a tracker URL I can bookmark so that I can check status without an account, matching the architecture's anonymous reporter note.
- As a developer, I want duplicate detection to short circuit AI cost when the same `categoryId + locationId` arrives twice in thirty minutes so that peak fault periods do not run the bill up.
- As a developer, I want the AI prompt builder to scrub PII before calling OpenAI so that reporter email plus name plus password hash plus anonymous identifier never leave the application tier.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A signed in reporter can submit a complaint at `/complaints/new` by selecting a category from the categories dropdown, selecting a location from the locations dropdown, entering a description between ten and two thousand characters, optionally uploading a single photo, optionally toggling anonymous, and pressing Submit. The server validates input via Zod, runs duplicate detection, runs AI triage (Vercel AI SDK with `gpt-4o-mini`, eight thousand ms timeout), persists the complaint with `priority` set from AI severity when AI worked plus `slaAcknowledgeBy` and `slaResolveBy` computed from the chosen category, and redirects the reporter to `/complaints/:id`. Verifies the "creates a complaint" half of the scope Done when line.
- **AC-2**: AI triage returns `{ categoryName, severity, rationale }` from `generateObject` with a Zod schema. The response is parsed and persisted on `complaints.aiSuggestion` with `enabled=true`, `model`, `categoryId`, `severity`, `rationale`, `latencyMs`, `promptTokens`, `completionTokens`, `costUsd` (computed), `ranAt`, `fallback=false`. Verifies the "valid AI triage results" half of the scope Done when line.
- **AC-3**: When the AI call times out, returns a non 2xx, or fails Zod parsing, the route handler falls back to `categories[].defaultSeverity` for `priority` and sets `aiSuggestion.enabled=true, fallback=true, error=` the failure message. The submission still persists; submission is never blocked by an AI outage per NFR-2.2. Verifies the "fallback activates on AI failure" half of the scope Done when line.
- **AC-4**: When a second reporter submits to the same `categoryId + locationId` within thirty minutes of a prior submission, no AI call is made (the duplicate short circuit); the new complaint is persisted inside the same Mongoose transaction with `parentComplaintId` pointing at the prior complaint's `_id`. The AI cost tracker therefore only counts deduplicated new complaints. Verifies the "duplicate detection clusters within thirty minutes" half of the scope Done when line (and exercises spec 0002 AC-11 atomicity).
- **AC-5**: When a reporter toggles anonymous and submits, the server creates a hidden `users` row with `email` set to a synthetic form derived from a server signed JWT, `name` equal to the literal string "Anonymous Reporter" or null per the locked user schema constraint, `role: 'reporter'`, `passwordHash: null`, `anonymousId` set to the same signed JWT; the complaint is persisted with `isAnonymous: true`, `reporterId` equal to the hidden user's `_id` per the cross field invariant in spec 0002 AC-4; the route returns a tracker URL `/track/<token>` that the reporter can bookmark. Subsequent reads through `/track/[token]` show the complaint's status plus SLA deadlines plus the photo when one was uploaded, and never reveal PII beyond what the original submitter saw. Verifies the "anonymous mode suppresses reporterId" half of the scope Done when line.
- **AC-6**: Single photo upload is enforced: maximum 10 MB raw size, MIME `image/jpeg`, `image/png`, or `image/webp` only. Files outside these constraints are rejected with a typed `ApiError(code: 'invalid_photo', status: 422)` server side before any Cloudinary round trip; the client form also enforces the same limits via the Zod resolver for UX feedback.
- **AC-7**: `sharp` compression runs server side: source image is resized to a maximum of 1280 px on the longest side, then encoded as JPEG at quality 80 (or untouched when the source is PNG or WebP and keeps a transparent background), then uploaded to Cloudinary; the returned HTTPS URL is persisted onto `complaints.photoUrls`. The compressed payload bytes never enter MongoDB.
- **AC-8**: AI prompt PII discipline: the user prompt sent to OpenAI contains only `description`, `location.name`, `category.name`, `category.systemType`, plus an `urgency_hint` derived from the user's chosen category's `defaultSeverity`. The fields `email`, `name`, `passwordHash`, `anonymousId`, plus any other user identifier are scrubbed from the prompt payload before the call (per spec 0002 AC-13). A unit test asserts no PII marker strings appear in the actual prompt message sent to OpenAI.
- **AC-9**: `/complaints/:id` after submission shows the signed in reporter: status (default `Submitted`), `slaAcknowledgeBy`, `slaResolveBy`, description echo, photo (when one was uploaded). The AI `rationale` plus `severity` fields are NOT shown to the reporter (per architecture: "AI rationale is visible only to admin"). Admin views the same path with rationale plus severity visible, gated by RBAC in the existing DAL plus a defensive `requireRole("dicht_admin")` in the route handler.
- **AC-10**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; end to end smoke covers happy path, AI fallback, duplicate detection, anonymous submission, photo upload happy path, photo rejection, description length rejection.

## Options considered

### Option 1: End to end submission flow with all locked policies (chosen)

A single page submission at `/complaints/new` plus anonymous tracker URLs, runs AI triage with rules based fallback on timeout or failure, runs duplicate detection before the AI call, persists claims inside a Mongoose transaction, uploads at most one photo through sharp plus Cloudinary. The reporter's category dropdown choice is trusted (AI's category suggestion is advisory metadata only).

**Pros**:
- Matches every locked decision across architecture and spec 0002.
- Tracer Bullet discipline: a single end to end slice proves the AI path works and persists a complaint before thickening with detail and tracker views.
- Submission is never blocked by an AI outage, matching NFR-2.2.
- The eight Mongoose collections stay locked, so no schema migration cost.

**Cons**:
- Anonymous tracking relies on a server signed JWT; a tracker URL leak means anyone with the token can see status. Mitigated by 90 day TTL plus the tracker is read only and never reveals PII beyond what the original submitter saw.
- Single photo only; multi photo is a future enhancement if LASU pilots show demand.
- The AI call still costs real money at peak; the rule based fallback protects the $5 monthly cap but not the $50 cap; until the daily cron lands, the operator has to monitor.

### Option 2: Submission path without AI triage

Submit a complaint with no AI assist; priority is supplied by the reporter's category dropdown choice only.

**Pros**:
- No AI dependency at all; faster, cheaper, simpler.

**Cons**:
- Loses the architecture's locked decision; contradicts the Developer Brief section 3.
- Reporter benefits from automated severity hints; the academic doc's failure analyses link severity miss to delayed acknowledgement.
- Spec would create drift between code and architecture.

### Option 3: Multi photo upload with progressive disclosure

Allow up to five photos per complaint with a per file UX.

**Pros**:
- Captures more fault evidence; useful for compound issues.

**Cons**:
- Multi file upload UI is heavier; Cloudinary round trips multiply; storage cost climbs.
- Architecture phrased the image constraint as "≤ 10 MB JPG, PNG, WebP" (one file); the singular phrasing suggests one photo.
- MVP scope is one photo; defer multi photo as a follow up.

## Decision

**Chosen option**: Option 1: end to end submission flow with all locked policies.

Reporter submits at `/complaints/new` (single page form with inline error feedback per field). Server validates with Zod, runs duplicate detection inside a Mongoose transaction, runs AI triage via Vercel AI SDK's `Output.object({ schema })` plus `generateText` wrapper (the AI SDK 7 deprecation of `generateObject`, behaviour identical) with a Zod schema (`categoryName`, `severity`, `rationale`), persists on `complaints.aiSuggestion` (`enabled`, `model`, `categoryId`, `severity`, `rationale`, `latencyMs`, `promptTokens`, `completionTokens`, `costUsd`, `ranAt`, `fallback`, `error`). On AI failure the route falls back to the chosen category's `defaultSeverity` and sets `aiSuggestion.fallback=true, error=` the failure message. The reporter is redirected to `/complaints/:id`. The route scope reads BetterAuth session through `getServerSession` from the DAL and `authorizeRole` enforces the role on the response shape.

**Implementation skills**: `ai-sdk` (`vercel/ai`, `C:/Users/Korede/.pi/agent/skills/ai-sdk/`) — `generateObject` plus Zod schema usage, `Output.object()` plus `system` prompt patterns, error envelope handling. `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — Server Component plus Client Component boundaries for the form page, Server Action versus API route decisions per the code-standards Server Actions preferred rule. `zod-validation-expert` (`vnkoder`, `C:/Users/Korede/.agents/skills/zod-validation-expert/`) — Zod schema patterns and error formatting for the description length bound.

## Rationale

Two specific forces drive the choice. First, the architecture explicitly locks the AI surface, the image pipeline, and the duplicate detection rule so deviating would contradict locked decisions and create drift between code and the architecture. Second, spec 0002 has already shipped the data layer plus the cross field validators plus the duplicate transaction plus the `toPublicJSON` helper, so this application tier spec can trust the schemas and focus on route handlers plus the AI integration; the alternative of slipping schema work back into a FEATURE spec would circumvent spec 0002's lock.

The rules based fallback is non negotiable: NFR-2.2 requires the submission path to survive an AI outage, and the rule `categories[].defaultSeverity` is already materialized at first connect via the seed script, so the payment for the fallback is zero extra infrastructure. The 8000 ms timeout matches `OPENAI_TIMEOUT_MS` already documented in `.env.example`. The anonymous tracker URL is signed with a JWT so the implementation footprint is small (one shared secret) and the threat model is bounded by a 90 day TTL plus the tracker view is read only without revealing PII beyond what the submitter saw.

The single page form matches the small surface (five inputs plus optional file plus toggle); a multi step wizard would introduce route state across submission plus review that adds nil value for this surface. The trust user category decision keeps the AI's role focused on severity plus rationale, not taxonomy replacement, which avoids the "why did the system change my category" UX wrinkle and matches the academic doc's framing of AI as an assistant rather than an oracle.

## Feature design

**Data model sketch**:

This feature is additive: zero schema changes to the locked eight Mongoose collections.

- `complaints` (locked at spec 0002): no field changes. `priority` is written from `aiSuggestion.severity` when `aiSuggestion.enabled && !aiSuggestion.fallback`, else from `categories[].defaultSeverity` (per the rule recorded in `## Value sourcing`).
- `categories` (locked): unchanged; `defaultSeverity`, `slaAcknowledgeHrs`, `slaResolveHrs` are the inputs to the rules based fallback plus the SLA deadline computation.
- `locations` (locked): unchanged; `name` plus `area` are the inputs to the duplicate detection window plus the AI prompt.
- `users` (locked): unchanged. The anonymous submission path writes a hidden user row whose fields are already valid against the locked user schema (synthetic email, `name: "Anonymous Reporter"` or null per the schema's conditional required message, `role: 'reporter'`, `passwordHash: null`, `anonymousId: <JWT>`).
- The `users.email` unique index naturally prevents two anonymous submissions from colliding on the synthetic email; the JWT is the unique identifier.
- `statusHistory` (locked): unchanged; no write on submission (the row's `status` defaults to `Submitted`).
- `notifications` (locked): no write on submission; the first notification row arrives when the technician acknowledges.

**State transitions** (if applicable):

The submission path writes the initial `status: 'Submitted'` row. The forward only state machine from spec 0002 takes over on subsequent transitions (`Submitted → Acknowledged → In Progress → Resolved → Closed`) and is the responsibility of later slices (Feature 8 for technician transitions; this spec does not transition state).

**API surface**:

| Endpoint | Method | Auth | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| `/api/complaints` | `POST` (multipart/form-data) | reporter session | `categoryId`, `locationId`, `description`, optional `photo`, `isAnonymous` | redirect to `/complaints/:id` on success; tracker URL when `isAnonymous` | 401 unauthenticated, 422 invalid_description, 422 invalid_photo, 409 parent_already_exists (with `parentComplaintId` when coexist), 502 ai_unavailable (only when fallback also fails) |
| `/api/complaints/[id]` | `GET` | reporter (own), admin (any), technician (assigned) | none | `{ data: complaintPublicJSON }` | 401, 403, 404 |
| `/track/[token]` (page) | `GET` | anonymous token in URL | path param `token` (JWT) | rendered page with status plus SLA plus photo | 401 invalid_token, 410 closed_or_expired |
| `/api/complaints/anonymous-token` | `POST` | none (anonymous flow) | none | `{ data: { token } }` | 503 sign_unavailable |
| `/complaints/new` (page) | `GET` | reporter session | none | rendered form HTML | 401 |
| `/complaints/[id]` (page) | `GET` | reporter (own), admin (any), technician (assigned) | path param | rendered detail HTML | 401, 403, 404 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| `submitComplaint` | `slaAcknowledgeBy`, `slaResolveBy` | computed at server time as `now + category.slaAcknowledgeHrs` and `now + category.slaResolveHrs`; storage is Date only |
| `submitComplaint` | `priority` | `aiSuggestion.severity` when `aiSuggestion.enabled && !aiSuggestion.fallback`, else `category.defaultSeverity` |
| `submitComplaint` | `parentComplaintId` | an existing `complaints` row with same `categoryId + locationId` whose `createdAt` is within the last 30 minutes; null if none (per spec 0002 AC-11 atomic detection) |
| `submitComplaint` | `aiSuggestion.enabled` | Always true when the route runs AI triage; route never runs AI triage when a duplicate is detected inside the same category plus location plus 30 minute window |
| `submitComplaint` | `aiSuggestion.model` | `process.env.OPENAI_MODEL` defaulting to `gpt-4o-mini` |
| `submitComplaint` | `aiSuggestion.severity` | from the AI call's Zod parsed output; or falls back to category default severity |
| `submitComplaint` | `aiSuggestion.rationale` | from the AI call's Zod parsed output; when fallback activates, rationale is the string literal "Rules based fallback (no AI rationale)" plus the category's `systemType` plus `defaultSeverity` |
| `submitComplaint` | `aiSuggestion.costUsd` | computed by `lib/ai/cost.ts` as `(promptTokens * prompt_rate_per_1k / 1000) + (completionTokens * completion_rate_per_1k / 1000)` |
| `submitComplaint` | `isAnonymous`, `reporterId`, anonymous user's `anonymousId` | per spec 0002 AC-4 cross field rule; `reporterId` is the hidden user's `_id` when `isAnonymous: true`; the hidden `users` row carries `anonymousId` set to the signed JWT |
| `submitComplaint` | `photoUrls` | array of HTTPS Cloudinary URLs after sharp compression; empty array when no photo uploaded |
| AI prompt builder | final prompt payload | composed of `description`, `location.name`, `category.name`, `category.systemType`, plus an `urgency_hint` field; PII stripped (assertion test) |
| `/api/complaints/[id]` | reporter view | only `data.id, status, slaAcknowledgeBy, slaResolveBy, description, photoUrls, createdAt` (no AI rationale, no severity) |
| `/api/complaints/[id]` | admin view | all reporter fields plus `priority, aiSuggestion.{categoryId, severity, rationale, model, ranAt}` (cost and token fields stripped per spec 0002 AC-13) |
| `/api/complaints/[id]` | technician view | reporter fields plus `priority` (technicians need severity to plan work) |
| `/track/[token]` | anonymous view | reporter fields, AI rationale stripped, severity stripped (the original submitter never saw AI fields, so the tracker shouldn't either) |

**Key invariants** (rules that must always hold):

- The locked eight Mongoose collections stay byte for byte unchanged; this feature writes only through the locked Mongoose models and the existing `lib/db/models/complaint.ts` `pre('save')` hook and `pre('validate')` cross field validators per spec 0002 AC-3 through AC-6, AC-11, AC-12.
- `priority` always equals either `aiSuggestion.severity` (when AI succeeded) or `category.defaultSeverity` (when fallback activated). Never a third value.
- `parentComplaintId` is non null only when a duplicate was detected inside the same `categoryId + locationId` plus 30 minute window (per spec 0002 data invariants). Once set, never mutated to null by a later write.
- The AI prompt builder's unit test asserts that the strings `email`, `name`, `passwordHash`, `anonymousId` plus the reporter's user ID plus the reporter's email value never appear in the outgoing prompt payload.
- Photo upload rejection runs before any Cloudinary round trip; an oversized or wrong MIME photo never produces a partial write.
- The Mongoose transaction inside `submitComplaint` rolls back the parent claim plus the new row if either insert fails (per spec 0002 AC-11 atomicity).

**Security model**:

- Authentication on the reporter route: BetterAuth session enforced by `getServerSession` from `lib/auth/dal.ts` per spec 0004 (the route handler does the role check at the data layer). The DAL is in turn defended by a `requireRole("reporter")` call at the page level on `/complaints/new`. The proxy at project root handles the optimistic redirect on missing cookie for the admin and technician paths; the reporter-group paths live outside the proxy matcher so anonymous submissions can reach the route handler. No anonymous path on the session route; the anonymous path uses a JWT.
- Anonymous token: server signs a JWT with HS256 using `process.env.ANONYMOUS_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET` (with a `WARNING` log when the fallback secret is used). Claims include `sub` (the user's `_id`), `sid` (server issued), `iat`, and `exp` (now plus 90 days). The token is one and only one per anonymous submission; it is not a session token in the BetterAuth sense.
- Anonymous tracker view reveals no AI rationale, no severity, no `costUsd`, no `anonymousId`, no reporter `users._id`, no PII beyond what the original anonymous submitter saw at the redirect page.
- AI prompt PII discipline: enforced in `lib/ai/prompts.ts` plus verified by a test that snapshots the prompt payload and asserts no PII marker strings appear.
- Image storage: only Cloudinary HTTPS URLs persisted. The compressed bytes never enter MongoDB. Cloudinary's public ID is stored plus the secure URL.
- Description sanitization: NOT applied at write (we trust the Zod validated field). Display time uses `isomorphic-dompurify` on the detail page; because the description has no HTML in the writer, the sanitization is a defense in depth noop rather than a transformation.
- Cookie and session attributes: BetterAuth enforced (not modified by this feature).
- Rate limiting on `POST /api/complaints`: deferred per scope Deferred list (`@upstash/ratelimit` ships in a later feature). Once that feature lands, the route's rate limit window is per reporter plus per IP.

**Configuration required**:

- `OPENAI_API_KEY`, `OPENAI_API_URL`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`: already in `.env.example` per Feature 01. This spec uses all four; no new env var needed from this side.
- `CLOUDINARY_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: already in `.env.example`. No new env var needed.
- `ANONYMOUS_TOKEN_SECRET`: NEW, falls back to `BETTER_AUTH_SECRET` if unset. Add an `.env.example` comment: prefer a dedicated secret, falling back is acceptable for dev but not for a multi tenant deploy.
- `AI_TRIAGE_FALLBACK_TO_RULES`: NEW env var read at request time by `lib/ai/triage.ts`; default unset (rules OFF); when the daily cron sees monthly cost >$5 it flips to `"true"` so AI is bypassed. Add to `.env.example`.
- Models rates: lives in `lib/ai/cost.ts` as a static constant keyed by model name. No env var; the rate sheet updates only when the operator installs a new model.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: a reporter signs in, opens `/complaints/new`, picks the Plumbing category plus Engineering Block location, types a 200 character description, picks a 3 MB JPEG photo, leaves anonymous OFF, presses Submit. The server validates, detects no duplicate, runs AI triage (mocked to return `{ categoryName: "Plumbing Issues", severity: "High", rationale: "..." }`), persists with `priority: "High"`, computes `slaAcknowledgeBy` at `now + 4h`, `slaResolveBy` at `now + 24h`, redirects to `/complaints/:id` where the reporter sees status `Submitted` plus the two deadlines plus their photo. Verifies **AC-1**, **AC-2**.
- **Failure case**: mocked AI call rejects with a timeout; the route persists with `priority` equal to the chosen category's `defaultSeverity`, sets `aiSuggestion.enabled=true, fallback=true, error` describing the timeout; submission is still successful and the reporter lands at `/complaints/:id`. Verifies **AC-3**.
- **Failure case**: a second reporter submits the same `categoryId + locationId` within 30 minutes of the first; the server detects the duplicate inside the transaction (mocked AI is not invoked on this path), persists with `parentComplaintId` pointing at the first complaint, AI cost tracker logs zero tokens for this submission. Verifies **AC-4**.
- **Happy path**: a signed in reporter turns anonymous ON and submits; the server creates a hidden `users` row, persists the complaint with `isAnonymous: true`, returns a tracker URL; the reporter's response includes a `trackerUrl` field the UI can also render. Verifies **AC-5**.
- **Failure case**: photo upload with a 12 MB file is rejected with a typed `ApiError(code: 'invalid_photo')` before any Cloudinary round trip; the complaint is not created. Verifies **AC-6**.
- **Failure case**: a description shorter than ten characters is rejected at the route boundary with a typed `ApiError(code: 'invalid_description')`. Verifies **AC-1** input gate.
- **PII test**: the prompt builder test snapshots the prompt payload generated from a fixed reporter plus complaint input; asserts that the strings `email`, `name`, `passwordHash`, `anonymousId`, plus any superstring of the reporter's user ID or email value never appear. Verifies **AC-8**.
- **AI rationale visibility**: a reporter requesting `/complaints/:id` (own complaint) sees status, deadlines, description, photo; does NOT see `rationale` or `severity`. An admin requesting the same path sees `priority`, `rationale`, `severity`, `model`, `ranAt`. Verifies **AC-9**.
- **Build gates**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all green; end to end Playwright flow covers happy path, AI fallback, duplicate detection, anonymous path, photo happy plus rejection, description length rejection. Verifies **AC-10**.

## Build plan

Tracer Bullet ordering: stand up the submission path end to end (route handler plus AI plus persistence plus redirect) before thickening with the detail page, the tracker page, the cost cron, and the smoke tests. Each task tagged with the AC or ACs it satisfies.

1. **Install Vercel AI SDK plus Zod (already in package.json from Feature 01); confirm `sharp` plus `cloudinary` plus `isomorphic-dompurify` plus `react-hook-form` plus `@hookform/resolvers` are present in `package.json` per Feature 01**. Add `ANONYMOUS_TOKEN_SECRET` plus `AI_TRIAGE_FALLBACK_TO_RULES` to `.env.example`. Satisfies dependency prereqs for **AC-1** through **AC-10**.

2. **Build `/lib/ai/schemas.ts`** exporting the Zod schema for the AI output (`{ categoryName: string, severity: enum, rationale: string }`). Reused by `generateObject` and by the test fixtures. Satisfies **AC-2** schema baseline.

3. **Build `/lib/ai/prompts.ts`** exporting `buildUserPrompt({ description, location, category, urgencyHint })` and `buildSystemPrompt()` plus `scrubPII(input, blacklist)`. The scrubber throws if any PII marker string appears in the output. Satisfies **AC-8** prompt builder baseline.

4. **Build `/lib/ai/cost.ts`** exporting `computeCostUsd({ model, promptTokens, completionTokens })` keyed off a static rate sheet. Used by `lib/ai/triage.ts` and by the cost cap cron. Satisfies **AC-2** cost field requirement.

5. **Build `/lib/ai/fallback.ts`** exporting `fallbackCategorySeverity({ category, error })` returning `{ aiSuggestion: { enabled: true, fallback: true, error, rationale: 'Rules based fallback (no AI rationale)', severity: category.defaultSeverity, model: 'rules' } }`. The fallback shape matches the Zod schema's severity field. Satisfies **AC-3** fallback profile.

6. **Build `/lib/ai/triage.ts`** exporting `triageComplaint({ description, location, category })`. Wraps `generateObject` with the Zod schema, applies the timeout based on `OPENAI_TIMEOUT_MS` (default 8000 ms), and on timeout, non 2xx, or Zod parse failure returns the fallback from step 5. Returns the persisted `aiSuggestion` shape plus the cost. Satisfies **AC-2**, **AC-3**, **AC-8**.

7. **Build `/lib/storage/cloudinary.ts`** exporting `compressAndUpload({ file, maxBytes, mime })` returning `{ url, publicId }`. Validates MIME plus size first (rejects with `invalid_photo` typed error before any Cloudinary round trip), runs `sharp` resize plus encode, uploads via Cloudinary, returns the secure HTTPS URL plus the public ID. Satisfies **AC-6**, **AC-7**.

8. **Build `/lib/auth/anonymous-token.ts`** exporting `signAnonymousToken({ userId })` and `verifyAnonymousToken({ token })`. HS256; secret from `ANONYMOUS_TOKEN_SECRET || BETTER_AUTH_SECRET`. Claims: `sub`, `sid`, `iat`, `exp` (90 days). Satisfies **AC-5** token surface.

9. **Build `POST /api/complaints`** route handler at `app/api/complaints/route.ts`. Order: auth (session probe via `getServerSession` from `lib/auth/dal.ts`, the role gate is per-handler, not per-proxy, per spec 0004's proxy plus DAL split), rate limit (deferred per scope deferred list; placeholder for the rate limiting feature), Zod validate body (multipart parser), call `lib/db/helpers/duplicate-detection.ts` per spec 0002 AC-11 inside `mongoose.startSession()` plus `session.startTransaction()`, run `triage` only when no parent is found, persist via `ComplaintModel.create`, return NextResponse with `redirect('/complaints/<id>')` for authenticated submissions or `{ data: { trackerUrl } }` for anonymous ones. Apply `toPublicJSON` on the response. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-8**.

10. **Build `GET /api/complaints/[id]`** route handler at `app/api/complaints/[id]/route.ts`. Auth: session probe + role allowlist (reporters see own, admin sees any, technician sees assigned). Apply `toPublicJSON` to strip fields per the role aware wiring per `## Value sourcing`. Satisfies **AC-9** server side gate.

11. **Build `/app/(reporter)/complaints/new/page.tsx`** as a Server Component with a single `'use client'` form island holding all fields, react-hook-form plus Zod resolver, inline error feedback per field, Astryx form primitives. Submit calls the API route or a thin Server Action that delegates to the same `submitComplaint` logic; the route returns the new `_id` and the page redirects via `useRouter().push('/complaints/<id>')`. The server endpoint path is fixed by Feature 8's later spec. Satisfies **AC-1** UI surface.

12. **Build `/app/(reporter)/complaints/[id]/page.tsx`** as a Server Component fetching through the GET endpoint, renders status, deadlines (with `date-fns` formatting plus `SlaCountdown`), description echo, photo. The reporter view does NOT render `aiSuggestion.rationale` or `severity`. Admin views are gated by `requireRole("dicht_admin")` from `lib/auth/dal.ts` inside the page (defense in depth). Satisfies **AC-9** UI surface.

13. **Build `/app/(public)/track/[token]/page.tsx`** as a Server Component that runs `verifyAnonymousToken`, looks up the complaint by the token's `sub` (`users._id`) plus `isAnonymous: true`, and renders a status page with the same fields the original submitter saw. Returns a 410 response when the token is valid but the complaint is Closed, with a "this submission is closed" message and zero PII. Satisfies **AC-5** tracker UI.

14. **Build `scripts/ai-cost-check.ts`** exporting `runDailyCheck({ monthTotals })` returning the new value of `AI_TRIAGE_FALLBACK_TO_RULES`. Uses `lib/ai/cost.ts` plus a daily aggregator query against the Mongoose `complaints` collection filterable by `aiSuggestion.ranAt` within the current calendar month. Vercel cron coverage is added in a later slice (SLA cron). For now, `package.json` exposes a `check:ai-cost` script. Satisfies the $5 monthly cap enforcement contract documented in the cost invariants; full daily enforcement lands with the cron in Feature 9 or a follow up.

15. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. `npm run dev` boots. Hand exercise or Playwright: happy path reporter submission with photo, AI fallback when the mock OpenAI call rejects, duplicate detection when a second submission lands inside thirty minutes, anonymous submission with tracker URL returned, photo size rejection at 12 MB, description length rejection at five characters, anonymous tracker URL returning status after persistence. Verifies **AC-10**.

## Consequences

**Positive**:

- A reporter can submit a complaint end to end today; the path was previously gated by auth plus feature 4 and is now reachable.
- Duplicate detection runs before AI spend; peak fault periods at LASU (for example end of semester library HVAC failures) do not run the bill up by re triaging the same fault.
- The 8000 ms timeout rule based fallback guarantees submission availability; NFR-2.2 met without an external dependency flip.
- The same `BETTER_AUTH_SECRET` family handles the anonymous tracker JWT; one secret rotation covers both at the cost of one env var for the dedicated `ANONYMOUS_TOKEN_SECRET`.
- Server side sharp compression plus Cloudinary URL only (no MongoDB bytes for images) keeps the document size bounded.

**Negative / tradeoffs**:

- The AI call still costs real money at peak; the daily cron hooks in a later slice. Until then the operator monitors via a separate observability feature.
- A leaked anonymous tracker URL reveals status to anyone with the token for 90 days. Mitigated by token only revealing what the original submitter saw, but a leak is a leak.
- Single photo only; multi photo is a future follow up if LASU pilots show demand.
- `toPublicJSON` strips AI cost and token fields from responses per spec 0002 AC-13; this means even admin cannot read the exact token counts from a single complaint (they have to query the daily aggregator), which is intentional PII fairness.

**Neutral**:

- The locked eight Mongoose collections stay unchanged; this spec is purely additive in code.
- A new env var `ANONYMOUS_TOKEN_SECRET` introduced (`ANONYMOUS_TOKEN_SECRET || BETTER_AUTH_SECRET` fallback).
- A new env var `AI_TRIAGE_FALLBACK_TO_RULES` introduced (read at request time; default unset).
- One additional Server Action would be cleaner than the API route, but the multipart upload with file streaming is the canonical use case for the API route per code-standards; the API route is the surface here and Server Actions are reserved for internal mutations.
- New files added: `/lib/ai/{schemas,prompts,cost,fallback,triage}.ts`, `/lib/storage/cloudinary.ts`, `/lib/auth/anonymous-token.ts`, `/scripts/ai-cost-check.ts`, plus `app/api/complaints/route.ts`, `app/api/complaints/[id]/route.ts`, plus the three pages. Consistent with the locked file organization.

## Follow-up

- [ ] Daily cron that runs `runDailyCheck` from `scripts/ai-cost-check.ts` and writes the `AI_TRIAGE_FALLBACK_TO_RULES` env (or a runtime feature flag); lands with the SLA cron feature in Slice 3.
- [ ] `$50` model downgrade trigger when monthly cost exceeds the second tier; out of scope in MVP per the architecture's NFR-5; surface in progress tracker open questions.
- [ ] Rate limiting on `POST /api/complaints` via `@upstash/ratelimit` (in scope Deferred list).
- [ ] Multi photo upload (deferred unless LASU pilots show demand).
- [ ] Magic link plus OAuth authentication (lands with BetterAuth's deferred providers from Feature 4 follow up).
- [ ] A `lib/observability/ai-cost-logger.ts` for emitting per submission cost telemetry; depends on the observability feature in a later slice.
- [ ] A small `/api/admin/complaints/ai-rationale/[id]` endpoint for admins to fetch the AI rationale on demand with a typed query for "show rationale only" mode; not part of MVP, lands if admin UX feedback justifies it.
- [ ] Consider installing the `react-hook-form` community skill into `AGENTS.md` `## Agent skills` so future form builds reference the recommended patterns.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 5 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (AI stack with Vercel AI SDK plus `gpt-4o-mini`; image pipeline with sharp plus Cloudinary; route group allowlist per RBAC; rate limiting via `@upstash/ratelimit`; PII discipline)
- `context/code-standards.md` (API route handler ordering with the auth, rate limit, validate, side effects, persist, return sequence; the multipart form data plus Server Action verses REST guidance; the "every Server Action uses Zod first" pattern; the file organization for `/lib/ai/` plus `/lib/storage/`)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist; the "every env var listed in `.env.example`" requirement)
- `docs/specs/0002-data-model.md` (locked `complaints` schema including `aiSuggestion` sub doc shape, `parentComplaintId`, cross field invariants; locked `categories` and `locations` schemas; AC-3 forward only state machine; AC-4 anonymous cross field rule; AC-11 atomic duplicate detection transaction; AC-13 `toPublicJSON` PII redaction)
- `docs/specs/0003-design-system-ui-foundation.md` (the Astryx form primitives used in `/complaints/new`; the per role layout in `app/(reporter)/`; the `RouteGroupLayout` defense in depth session probe pattern)
- `docs/specs/0004-authentication/` (build spec `index.md`, rationale `rationale.md`, verify `verify.md`); the `useCurrentUser` hook used by reporter submit; the auth DAL plus the project root proxy that together enforce RBAC on `app/(reporter)/*` plus `/api/complaints`; the `BETTER_AUTH_SECRET` referenced from `ANONYMOUS_TOKEN_SECRET` fallback)
- `ai-sdk` skill at `C:/Users/Korede/.pi/agent/skills/ai-sdk/` (`generateObject` plus Zod schema usage, prompt patterns, error envelope handling)
- `nextjs-react-typescript` skill at `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/` (Server Component plus Client Component boundaries for the form, Server Action vs API route decisions)
- `zod-validation-expert` skill at `C:/Users/Korede/.agents/skills/zod-validation-expert/` (Zod schema patterns and error formatting for the description length bound)
- `mongodb` skill at `C:/Users/Korede/.agents/skills/mongodb/` (Mongoose schema patterns referenced by spec 0002, including the duplicate detection transaction shape)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line in `scope.md`: prove the whole pipe works before building any part of it fully)
- Vercel AI SDK `generateObject` plus Zod schema canonical usage (Vercel docs)
- Sharp plus Cloudinary upload canonical pattern (Cloudinary docs)
- Defensive in depth session probe on page level guards (matches spec 0004 plus spec 0003 patterns)
- BetterAuth session plus anonymous JWT signed with the same shared secret family
- Rules based fallback to `categories[].defaultSeverity` when AI fails (per NFR-2.2 in the academic doc)
- "Never compute and store derived values unless measured problem" applied to `priority` (computed once at write time from AI output, denormalized onto the document)
- PII discipline enforced at the builder level plus verified by tests (matches architecture plus spec 0002 AC-13)
- "Configuration required lists every env var explicitly" (architect skill convention)
