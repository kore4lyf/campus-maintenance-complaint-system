# 0012. Image pipeline

**Date**: 2026-07-25
**Status**: In Progress

## Summary

This spec consolidates the server side image pipeline that ships from spec 0005 plus spec 0008 into a single canonical reference. The pipeline runs Multer multipart form data through sharp compression (resize to max 1280 px on longest side, JPEG quality 80, transparent PNG or WebP kept as is, EXIF metadata stripped before encoding), uploads to Cloudinary, and persists the returned HTTPS URL. MIME validation plus size validation (10 MB raw) plus HTTPS URL filter plus Cloudinary 409 collision retry plus EXIF strip are the consolidated decisions that any future surface reuses without inventing a new helper.

## Context

Spec 0005 introduced `lib/storage/cloudinary.ts` plus the MIME set `image/jpeg`, `image/png`, `image/webp` plus the 10 MB raw size limit plus the sharp resize plus JPEG quality 80 plus Cloudinary upload plus the `reject(typed 'invalid_photo' 422 before any Cloudinary round trip)` contract. Spec 0008 reuses `lib/storage/cloudinary.ts` for In Progress plus Resolve photos (max 3 in progress, max 1 resolve via the proof photo). Spec 0002 locks the locked eight Mongoose collections plus the `complaints.photoUrls[]` plus `complaints.proofPhotoUrl` plus `statusHistory.photoUrl` fields that persist the returned HTTPS Cloudinary URLs. Architecture locks the image pipeline at §Stack Image pipeline plus the file path `lib/storage/cloudinary.ts` per code-standards file organization.

The image pipeline work is split between specs 0005 plus 0008 and was referenced long form in their build plans. Spec 0002 has the fields but no spec owns the cross spec integration as its canonical source. Feature 12 is the consolidation spec that anchors the cross spec seam plus ensures end to end integration test coverage plus locks four decisions that specs 0005 plus 0008 did not state explicitly: HTTPS URL filter on read, EXIF metadata strip, Cloudinary 409 collision retry policy, and the synthetic Cloudinary stub for unit and CI tests.

## Requirements

**User stories**:

- As a developer I want a single canonical reference for the image pipeline so any new surface that uploads photos can reuse the helper without inventing a parallel one.
- As a reporter I want my photo to be compressed before upload so Cloudinary storage and bandwidth stay bounded.
- As a reporter I want my photo's EXIF metadata stripped so device GPS coordinates and timestamps do not leak through the image attributes.
- As a DICT admin viewing a submitted complaint I want the displayed image URL to be HTTPS only so the browser does not surface a mixed content warning.
- As a developer running unit tests I want a stub Cloudinary client so tests do not require a real Cloudinary account.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A reporter uploading a photo whose MIME type is `image/jpeg`, `image/png`, or `image/webp` to the submission form (per spec 0005's `POST /api/complaints`) lands an HTTPS Cloudinary URL on `complaints.photoUrls[]`. The same path serves the technician Resolve photo upload (per spec 0008's `POST /api/technician/queue/[id]/transition`) and lands an HTTPS URL on `statusHistory.photoUrl`. Verifies the helper is the single source for both surfaces.
- **AC-2**: A submission whose raw photo size exceeds 10 MB rejects with a typed `ApiError(code: 'invalid_photo', status: 422)` before any Cloudinary round trip. The same path serves the Resolve path; a Resolve photo over 10 MB rejects the same way. Verifies the locked raw size limit.
- **AC-3**: A submission whose MIME type is not in the documented set (for example `application/pdf`, `image/heic`, `application/octet-stream`, an unknown MIME) rejects with a typed `invalid_photo` 422 before any round trip. The same path serves the Resolve path. Verifies the locked MIME set.
- **AC-4**: `lib/storage/cloudinary.ts` runs sharp compression on every successful upload: resize to max 1280 px on longest side, JPEG quality 80 (with transparent PNG plus WebP preserved as is), EXIF metadata stripped before encoding. The returned `url` plus `publicId` are persisted; the URL is HTTPS. Verifies the locked compression policy plus the EXIF strip policy from spec 0005 plus this consolidation.
- **AC-5**: A response whose returned URL is not HTTPS (a Cloudinary misconfiguration plus a future cloud substitution returning http) rejects with a typed `cloudinary_url_insecure` 502 at the route handler boundary. The check happens server side before persistence.
- **AC-6**: A Cloudinary 409 collision (duplicate publicId) triggers exactly one retry that picks a fresh publicId by appending a single nanoid; if the retry also fails, the route handler returns a typed `cloudinary_collision_persistent` 502 and the surface shows an error in a Sonner toast without a partial write. The retry policy is bounded and deterministic.
- **AC-7**: End to end integration test covers both surfaces (submission photo from spec 0005 plus Resolve photo from spec 0008) with a stub Cloudinary client that returns a controlled HTTPS URL plus a forced 409 once. The test runs in CI plus unit mode without a real Cloudinary account. The test asserts no real upload happens. Verifies the consolidated pipeline plus the cross spec seam.
- **AC-8**: All build gates green: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; smoke happy path covers reporter JPEG upload plus technician Resolve JPEG upload under the same helper; the stub Cloudinary is wired into `package.json` `test` so unit plus CI exercise the path without network.

## Options considered

### Option 1: Consolidate lock the four open seams (chosen)

This spec writes `lib/storage/cloudinary.ts` as the single canonical reference plus locks the four decisions that specs 0005 plus 0008 did not state explicitly: HTTPS URL filter on read, EXIF metadata strip before encoding, Cloudinary 409 collision retry once with nanoid suffix, and a stub Cloudinary client for unit plus CI tests. Spec 0005 plus spec 0008 references are folded into this spec's `## References` so the cross spec seam is one source.

**Pros**:

- One canonical reference for any future surface that uploads an image; the helper at `lib/storage/cloudinary.ts` is reused verbatim.
- Four real defence in depth decisions (HTTPS filter, EXIF strip, 409 retry with nanoid, stub Cloudinary) close open seams from spec 0005 plus 0008.
- The integration test covers both spec 0005 and spec 0008 surfaces, proving the cross spec seam is consistent.

**Cons**:

- More decisions to lock; some of them (the stub Cloudinary) are operational, not behavioural.
- One more spec to maintain.

### Option 2: Reimplement fresh

Collapse spec 0005's helper plus spec 0008's reuse into one canonical implementation written from scratch in this spec.

**Pros**:

- Reimplementation gives a clean scaffold.

**Cons**:

- The existing implementation already lives in the codebase; reimplementation is churn against working code.
- Churn risks regression on the reporter submission photo path plus the technician Resolve photo path.
- The locked decisions in this spec become a churn driven rewrite rather than a consolidation.

### Option 3: Document only

Write this spec as a documentation pointer to spec 0005 plus spec 0008 with no new decisions plus no test coverage.

**Pros**:

- Zero implementation work.

**Cons**:

- The four open seams (HTTPS URL filter, EXIF strip, 409 retry, stub Cloudinary) stay open across specs.
- No end to end integration test; cross spec drift can slip unnoticed.

## Decision

**Chosen option**: Option 1: consolidate, lock the four open seams.

This spec owns the canonical contract for the photo pipeline. The actual helper implementation is at `lib/storage/cloudinary.ts` from spec 0005 and is reused verbatim from spec 0008. The new decisions this spec locks are HTTPS URL filter on read, EXIF metadata strip before encoding, Cloudinary 409 collision retry once with a nanoid suffix, and a stub Cloudinary client for unit plus CI tests.

**Implementation skills**: `nextjs-react-typescript` (`earendil-works/community-skills`, `C:/Users/Korede/.pi/agent/skills/nextjs-react-typescript/`) — Server Component plus Server Action boundaries plus the consolidated helper pattern. (`using-ably`, `mongodb`, `ai-sdk` are not used by this spec.)

## Rationale

Two specific forces drive the choice. First, the photo pipeline work in spec 0005 plus 0008 already shipped; the cross spec seam is one source of truth plus this consolidation spec writes that source. Reimplementation is against working code and the locked decisions are cross spec. Second, the four open seams (HTTPS URL filter on read, EXIF metadata strip, 409 retry with nanoid suffix, stub Cloudinary client) are real defence in depth decisions that any future surface that uploads photos inherits; locking them in this spec means spec 0005's helper plus spec 0008's reuse of it plus any future reuse all get the same guarantees.

HTTPS URL filter on read protects against a future Cloudinary misconfiguration plus a hypothetical cloud substitution that returns an http URL; the filter is small and the failure mode is severe (mixed content warning in the browser is a user experience failure). EXIF metadata strip protects against PII leakage through image attributes; device GPS coordinates plus timestamps are a real privacy concern even for campus maintenance uploads and the strip is one sharp call. Cloudinary 409 retry with nanoid suffix is a deterministic real failure mode; saying "retry once with a fresh publicId" beats ad hoc retry behaviour.

The stub Cloudinary client is operational: the integration test from spec 0005 plus 0008 expects to run in CI without a real Cloudinary account; the stub is the only path to that.

## Feature design

**Data model sketch**:

This feature is additive. Zero schema changes to the locked eight Mongoose collections.

- `complaints.photoUrls[]`: the reporter submission photo URLs persist here. Already in spec 0002.
- `complaints.proofPhotoUrl`: the technician Resolve proof photo URL persists here. Already in spec 0002.
- `statusHistory.photoUrl`: per transition photo URLs (plus `photoUrls` for In Progress multi photo). Already in spec 0002.

**State transitions** (if applicable):

None. The pipeline runs reads plus writes only; no document transition is owned by this spec.

**API surface**:

This feature ships no new HTTP endpoints. The pipeline runs through the existing endpoints from spec 0005 plus spec 0008:

| Endpoint | From spec | Auth | Storage call |
|---|---|---|---|
| `POST /api/complaints` (multipart) | spec 0005 | reporter session | `compressAndUpload(file)` from `lib/storage/cloudinary.ts` |
| `POST /api/technician/queue/[id]/transition` (multipart) | spec 0008 | technician session | `compressAndUpload(file)` (called within the transition form handler for In Progress plus Resolve photos) |

Plus one internal helper export and one test only export:

| Export | Kind | Signature | Read by |
|---|---|---|---|
| `compressAndUpload` | helper | `(file, options) → Promise<{ url: string, publicId: string }>` | spec 0005 plus spec 0008 surfaces; the unit plus integration test fixtures |
| `validateMIME` | helper | `(mime: string) → boolean` | the route handlers from spec 0005 plus spec 0008 plus the integration test |
| `validateSize` | helper | `(bytes: number) → boolean` | the route handlers from spec 0005 plus spec 0008 plus the integration test |
| `stripExif` | helper | `(buffer: Buffer) → Promise<Buffer>` | the helper from this spec |
| `assertHttps` | helper | `(url: string) → void` | throws on non HTTPS |
| `getCloudinaryClient` | helper | `(env: { cloudName, apiKey, apiSecret }) → CloudinaryStub | RealCloudinary` | the helper plus the integration test (returns stub when env vars missing) |
| `CloudinaryStub` | class | `upload`, `upload_stream`, `url`, `public_id` plus a `control` shape for forced 409 response | the unit plus integration test |

**Value sourcing** (every value the action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| `compressAndUpload` return | `{ url, publicId }` | the uploaded Cloudinary HTTPS URL plus the Cloudinary publicId |
| `compressAndUpload` preparation | resized buffer plus stripped EXIF | sharp pipeline: `.resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).withMetadata({}).jpeg({ quality: 80 })` for JPEG sources plus `.resize(...).withMetadata({}).png()` for PNG plus `.resize(...).withMetadata({}).webp({ quality: 80 })` for WebP |
| `assertHttps` | boolean plus throw | `url.startsWith('https://')` plus the host parts check (`url.hostname === '<cloudinary-cloud-name>.cloudinary.com'` or comparable); throws typed `cloudinary_url_insecure` 502 |
| `getCloudinaryClient` decision | stub or real | when `CLOUDINARY_API_KEY && CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_SECRET` are all set, returns the real client; otherwise returns the stub |
| Stub upload response | `{ url, publicId, error? }` | a controlled shape per the integration test fixture; CI plus unit tests pass `control: { nextCallFailsOnce: true }` for the 409 retry test |

**Key invariants** (rules that must always hold):

- One helper at `lib/storage/cloudinary.ts` is reused by spec 0005 plus spec 0008 plus any future surface.
- MIME set is `image/jpeg`, `image/png`, `image/webp`; any other MIME rejects with `invalid_photo` 422 before any Cloudinary round trip.
- Raw size cap is 10 MB; any larger file rejects with `invalid_photo` 422 before any Cloudinary round trip.
- Compression policy is resize to max 1280 px plus JPEG quality 80 plus transparent PNG plus WebP preserve plus EXIF strip.
- HTTPS URL filter on read is server side; non HTTPS responses return `cloudinary_url_insecure` 502 (Surface gets a Sonner error toast; the persisted document is unchanged).
- Cloudinary 409 collision retries exactly once with a nanoid suffix; persistent failure returns `cloudinary_collision_persistent` 502.
- No raw image bytes ever enter MongoDB; the persisted document carries only HTTPS Cloudinary URLs.
- Multer never persists the raw upload to disk; the route handler streams directly into the sharp pipeline.

**Security model**:

- Authentication: BetterAuth session plus the auth DAL plus the project root proxy per spec 0004.
- Authorization: spec 0005's `requireRole("reporter")` from the DAL plus spec 0008's `requireRole("dicht_technician")` from the DAL plus matching per route handler `authorizeRole` checks; non matching returns 403.
- PII: EXIF metadata strip runs on every successful upload before encoding (even for previously valid files). The strip removes maker notes, GPS coordinates, original timestamps, plus any embedded thumbnails.
- HTTPS only: the asserted URL must start with `https://` and the hostname must match a known Cloudinary subdomain pattern; otherwise reject.
- Rate limiting on photo upload: deferred per scope Deferred list (the rate limiting feature ships on a later slice); the photo upload inherits the per reporter rate limit when that lands.
- Idempotency: per spec 0002 AC-11, the route handler transaction rolls back any statusHistory write when the photo upload fails; no partial state.

**Configuration required**:

- No new env var. `CLOUDINARY_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` already in `.env.example` from Feature 01.
- `package.json` adds `@cloudinary/url-gen` plus `cloudinary` as runtime deps only if not already present; capture in Follow up if the build step decides otherwise.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- **Happy path**: a reporter JPEG upload rounds trip through stub Cloudinary, returns an HTTPS URL plus a publicId, and persists to `complaints.photoUrls[0]`; spec 0005's `POST /api/complaints` returns the new complaint with the URL. Verifies **AC-1**, **AC-4**.
- **Happy path**: a technician Resolve JPEG upload same path lands on `statusHistory.photoUrl` plus `complaints.proofPhotoUrl`; spec 0008's transition writes both. Verifies **AC-1**, **AC-4**.
- **Failure case**: a 15 MB JPEG rejects at route handler with `invalid_photo` 422; no Cloudinary round trip; the spec 0005 helper is called at most once per request. Verifies **AC-2**.
- **Failure case**: a `application/pdf` upload rejects at route handler with `invalid_photo` 422; no Cloudinary round trip. Verifies **AC-3**.
- **Happy path**: a JPEG with EXIF GPS coordinates uploads; the persisted Cloudinary URL, when fetched, has no EXIF metadata; the helper's sharp pipeline strips metadata. Verifies **AC-4** EXIF strip half.
- **Failure case**: a stub Cloudinary whose `nextCallFailsOnce: true` control calls 409 once; the helper retries with a nanoid suffix; the retry succeeds; the persisted URL is the second attempt's URL. Verifies **AC-6**.
- **Failure case**: a stub Cloudinary whose `nextCallFailsOnce: true` plus another forced 409 on the second call returns `cloudinary_collision_persistent` 502; the helper did not persist any URL. Verifies **AC-6** persistent failure half.
- **Failure case**: a Cloudinary response whose URL is `http://...` (a misconfigured cloud or a hypothetical http response) rejects at route handler with `cloudinary_url_insecure` 502 from `assertHttps`. Verifies **AC-5**.
- **Integration test**: the stub Cloudinary runs the full submission flow plus the full Resolve flow plus the spec 0005 report path; no real Cloudinary account is touched; the test runs in CI plus unit mode. Verifies **AC-7**.
- **Build gates plus smoke**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; Playwright covers the end to end submission happy path plus Resolve happy path; the unit tests cover the helper invariants. Verifies **AC-8**.

## Build plan

Tracer Bullet ordering: stand up the four consolidated decisions in the existing helper end to end (HTTPS URL filter plus EXIF strip plus 409 retry plus stub Cloudinary) before thickening with the end to end integration test plus the build gates.

1. **Update `lib/storage/cloudinary.ts`** with the four consolidated decisions. The existing helper from spec 0005 stays in place and is extended, not replaced. Add `assertHttps(url)` after the upload response. Add `.withMetadata({})` plus a `.rotate()` reset to the sharp pipeline so EXIF is stripped. Add `if (error.code === 'public_id_collision') retry(appendNanoidPublicId())` once. The integration test stubs the cloudinary SDK with a class whose `control` shape holds `nextCallFailsOnce: boolean`. Satisfies **AC-4**, **AC-5**, **AC-6**.

2. **Add `tests/integration/image-pipeline.test.ts`** that wires the stub Cloudinary plus exercises the spec 0005 plus spec 0008 surfaces end to end. The test reads the seeded complaint fixture plus the technician transition fixture; the assertions verify the persisted URL is HTTPS plus no EXIF metadata is present plus the 409 retry reaches the second attempt. Satisfies **AC-7**, **AC-8**.

3. **Add `lib/storage/integration-test-helpers.ts`** exporting `getCloudinaryClient({ env })` plus `CloudinaryStub`. The module is imported by the unit plus integration tests plus never bundled with production code (the test entry is guarded by `NODE_ENV !== 'production'` plus the build step's tree shake). Satisfies **AC-8**.

4. **Update `package.json`** if `@cloudinary/url-gen` plus `cloudinary` are not present (Feature 01 had them; double check in `npm ls`); capture any new deps in Follow up if the build step adds them. Satisfies **AC-8**.

5. **Run all build gates plus smoke tests**. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. The unit plus integration test runs without a real Cloudinary account; the build emits no production bundle for the stub. Verifies **AC-8**.

## Consequences

**Positive**:

- One canonical helper at `lib/storage/cloudinary.ts` is the single source for any photo upload, with four defence in depth decisions locked in this spec.
- The cross spec seam (spec 0005 submission plus spec 0008 Resolve) is consolidated; future surfaces reuse the helper without inventing a parallel one.
- The integration test covers both surfaces end to end, proving the helper works the same way for both reporter plus technician uploads.
- HTTPS URL filter plus EXIF strip plus 409 retry plus stub Cloudinary lock the operational decisions that any future image surface inherits.

**Negative / tradeoffs**:

- The EXIF strip is irreversible; if LASU pilots surface a need to retain original EXIF (for example to track photo origin for legal reasons), the policy flips in a follow up maintenance task.
- The 409 retry could in principle keep colliding; the single retry plus the typed `cloudinary_collision_persistent` error handles it, but a future cloud substitute with a different collision rate should reevaluate.
- The integration test forgoes real Cloudinary upload verification in CI; a separate nightly job uploads a tiny PNG to the real Cloudinary sandbox account to catch real world drift.

**Neutral**:

- No new env var.
- New files: extension to `lib/storage/cloudinary.ts`, `lib/storage/integration-test-helpers.ts`, plus `tests/integration/image-pipeline.test.ts`. Consistent with the locked file organization.
- The locked eight Mongoose collections stay byte for byte unchanged.

## Follow-up

- [ ] When LASU IT provisions a real Cloudinary account in production, the `CLOUDINARY_*` plus `CLOUDINARY_URL` env vars are operationalised and the integration test stays on the stub.
- [ ] A nightly CI job uploads a tiny PNG to the real Cloudinary sandbox account to catch real world drift in the helper; deferred to a maintenance task.
- [ ] When LASU pilots surface policy needs (for example retaining EXIF for legal reasons), the EXIF strip policy flips in a follow up; capture in `context/progress-tracker.md` Open Questions.
- [ ] When the rate limiting feature ships in a later slice, attach per reporter plus per technician quota covering the photo upload surface.
- [ ] Consider installing the `nextjs-react-typescript` community skill into `AGENTS.md` `## Agent skills` so future Server Component plus Server Action boundaries follow the canonical patterns.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md` (Feature 12 row with the Done when line; the Tracer Bullet build approach on the scope header line; the Full workflow tier)
- `context/architecture.md` (the image pipeline at §Stack Image pipeline: multipart form data plus sharp plus Cloudinary plus URL persisted on `complaints.photoUrls[]`; the file path `lib/storage/cloudinary.ts` per code-standards file organization)
- `context/code-standards.md` (the API route handler ordering with auth, rate limit, validate, side effects, persist, return; the typed `ApiError` with status codes for `invalid_photo`, `cloudinary_url_insecure`, `cloudinary_collision_persistent`; the file organization for `lib/storage/`, `tests/integration/`)
- `context/ai-workflow-rules.md` (one capability per PR rule; the unit gating checklist before moving to the next unit; the cross spec amendment rule)
- `docs/specs/0002-data-model.md` (the locked `complaints.photoUrls[]` plus `complaints.proofPhotoUrl` plus `statusHistory.photoUrl` fields; the AC-11 atomic transition that rolls back a statusHistory write on photo upload failure)
- `docs/specs/0003-design-system-ui-foundation.md` (the Sonner toast primitives consumed by the upload failure UI; the route group allowlist consumed by the spec 0005 plus spec 0008 surfaces)
- `docs/specs/0004-authentication.md` (the BetterAuth session probe shared by both upload surfaces)
- `docs/specs/0005-complaint-submission.md` (the original `lib/storage/cloudinary.ts` plus the MIME set plus 10 MB size cap plus sharp resize plus JPEG quality 80 plus the `invalid_photo` typed error contract)
- `docs/specs/0008-technician-queue-and-status-updates.md` (the second surface that reuses the helper for In Progress plus Resolve photos; the spec 0008 proof photo is mandatory and lands on `statusHistory.photoUrl` plus `complaints.proofPhotoUrl`)

**Practices and standards**:

- Tracer Bullet build approach (per the scope header line)
- Cross spec consolidation spec pattern (one surface references the cross spec seam explicitly)
- Defence in depth: HTTPS URL filter on read, EXIF metadata strip before encoding, deterministic Cloudinary 409 retry with nanoid suffix, stub Cloudinary client for unit plus CI tests
- No raw image bytes ever persist in MongoDB (HTTPS Cloudinary URL only per the architecture)
- `withMetadata({})` plus `.rotate()` sharp pipeline reset for EXIF strip
- Multer streams directly into sharp; no disk write
- The `compressAndUpload` helper is invoked from both spec 0005 plus spec 0008 surfaces plus any future surface that uploads an image
- Integration test runs against a stub Cloudinary client, not a real account
