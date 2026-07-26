# AI Workflow Rules

Project Name: Campus Maintenance Complaint Management System (LASU)

This file is part of the Idea-to-Product six-file context convention. Read together
with the other five context files in this directory.

## Approach

- **Feature-by-feature.** Build one user-facing capability at a time. Each
  capability = one PR + one unit-test commit + one docs update.
- **One unit at a time.** A "unit" = one sprint deliverable from the
  academic doc §3.3.2 sprint plan (e.g. "Sprint 1 — Unit 03: BetterAuth
  registration endpoint").
- **Read all six context files before any code.** Per `AGENT.md`, every AI
  session starts by reading these in this order:
  1. `project-overview.md`
  2. `architecture.md`
  3. `code-standards.md`
  4. `ui-context.md`
  5. `ai-workflow-rules.md` (this file)
  6. `progress-tracker.md`
- **Decisions go in docs first.** No architectural or scope decision is
  implemented before it is recorded in the relevant context file.
- **Cross-reference the academic doc and Developer Brief** before any
  implementation:
  - Academic doc: `Campus Maintenance Complaint Management System.md`
    (product behaviour, FRs, NFRs).
  - Developer Brief: `Developer Brief - AI Triage + Vercel AI SDK Migration.md`
    (developer-only decisions: env vars, schema, indexes).
- **Default model decisions** to the recommended candidate per the user's
  standing rule ("always go recommended unless I genuinely don't have
  enough info"). Pause explicitly with a *specific* question only when a
  decision is not derivable from the two source documents above or these
  six context files.

## Scoping Rules

- **One user-facing capability per PR.** Don't bundle auth + triage + reporting
  into one PR unless the docs spell out a unit that requires it.
- **PR ≤ 400 lines** of substantive change (excluding generated code, fixtures).
- **PR description must cite the source**: unit ID (e.g. "Unit-04: SLA sweep")
  and the §3.x of the academic doc / §3.x of the Developer Brief / §N of the
  applicable `context/` rule.
- **No feature outside the In Scope list** without first amending
  `context/project-overview.md In Scope` and removing it from
  `Out of Scope`.
- **No new dependency** (`package.json` addition) without justification in
  the PR description citing the unit and the underlying reason.
- **One commit per logical change.** Squash only if a PR has unrelated cleanup
  noise; do not collapse meaningful atomic steps.

## When to Split Work

- **At a module boundary.** End-of-sprint natural splits — e.g. when
  Sprint 3 ends with the AI route working, that's a natural split before
  extending with duplicate-detection.
- **At a route boundary.** A standalone route (`POST /api/complaints`) is
  its own unit; do not bundle it with the form UI even if they look related.
- **At a UI boundary.** A `<ComplaintForm />` component split from
  `<ComplaintDetail />` view = its own unit.
- **At a schema boundary.** A new collection (`notifications`) is its own
  data-tier unit.
- **At a test boundary.** A new test layer (e.g. introducing `k6` for the
  first time) is its own unit.
- **Prefer "many small PRs" over "one big PR"** when the unit count is
  ambiguous. Easier code review, easier rollback.

## Handling Missing Requirements

When the implementation hits a question not answered by any of:

- The academic doc (`Campus Maintenance Complaint Management System.md`)
- The Developer Brief (`Developer Brief - AI Triage + Vercel AI SDK Migration.md`)
- The six context files (`./context/*`)

Then:

1. **Stop.** Do not invent.
2. Add to `context/progress-tracker.md → Open Questions`.
3. **Surface to the user / supervisor** before proceeding.

### Forbidden behaviours

- **Inventing** new collections, roles, env vars not in the docs.
- **Adding** a dependency that is not in `package.json` without justification.
- **Making** a security-sensitive default (exposing an admin-only route,
  defaulting the AI feature flag `off`, etc.) without explicit user sign-off.
- **Skipping** the unit-gating checklist (§Before Moving to the Next Unit)
  by piling multiple units into one PR.
- **Logging** AI prompts containing user PII in server logs — the redact
  list in `/lib/utils/logger.ts` is the contract.
- **Inventing** "modern" library choices outside the stack list in
  `architecture.md` §Stack.

## Protected Files

The following are treated as **system of record** and are *modified only with
explicit user instruction and a documented reason*:

- `AGENT.md`
- `./context/*` (all six context files + `.idea-to-product.state.json`)
- The **academic doc** is treated as **read-only** by the build agent
  unless the user explicitly asks to edit it.
- The **Developer Brief** is alive but slow-moving — only updated when the
  underlying decision actually changes (e.g. we add a new env var).
- `package.json` — add dependencies **only when explicitly required by a
  unit**; never speculative dependencies.
- `tsconfig.json` — `strict + noUncheckedIndexedAccess +
  exactOptionalPropertyTypes` is the contract; deviations require sign-off.
- `tailwind.config.ts` — design tokens; only revised when the Astryx theme
  is genuinely revised.
- `/lib/auth/config.ts` (BetterAuth) — config changes affect every role;
  sign-off required.
- Mongoose schema files (`/lib/db/models/*`) — breaking schema changes
  require data migration strategy.

### Edit rules for protected files

- **No mass rewrites.** Edits should be small, surgical, with a documented
  reason in the PR description.
- **Updates to `context/`** are folded into a commit alongside the code
  change that triggered them, not deferred.
- **Updates to `progress-tracker.md`** happen in *every* meaningful commit
  (move unit In Progress → Completed on close-out).

## Keeping Docs in Sync

- After every meaningful implementation change, **update
  `./context/progress-tracker.md`**:
  - Move the unit from "In Progress" to "Completed".
  - Set "Current Goal" to the next unit.
  - Append any new Architecture Decision to the running log.
- After discovering a new truth (e.g. an env var, a constraint, a dependency
  choice), **update the relevant context file** in the same commit, not
  later.
- After discovering the academic doc is wrong or stale, surface it in
  `progress-tracker.md → Open Questions` and ask the user.
- **PR descriptions reference which `context/` file or academic doc
  section** they implemented. Example PR title:
  `Unit-04: SLA sweep cron endpoint + Ably escalation push`.
  Example PR description prefix:
  `Implements academic doc §3.3.6.7 SLA Engine + §4.3 fold of Tan five-factor lens. Reads: context/architecture.md §Invariants; context/code-standards.md §API Routes.`
- **After a unit completes**, check that all six `context/` files still
  describe reality. If reality drifted, update now — do not wait until the
  end of the project.

## Before Moving to the Next Unit

A unit is considered "complete" **only when all of the following are true**.
Treat this as a hard gating checklist — do not start the next unit if any
box is unchecked.

### Functional gates

- [ ] **Tests passing.** Unit + integration tests for the new code green
  locally (`npm test`).
- [ ] **Lint clean.** `npm run lint` passes; no ESLint warnings.
- [ ] **Type-check clean.** `npx tsc --noEmit` (or `npm run typecheck`)
  passes.
- [ ] **No `any`** introduced during this unit.
- [ ] **No `console.log`** left behind in committed code.
- [ ] **Idempotency-Key** header accepted on write endpoints if applicable.

### Domain gates

- [ ] **Manual smoke test** of the new flow performed in the dev server
  (e.g. submit a complaint as anonymous, see Ably push, see admin queue).
- [ ] **No PII leakage** — checked by running the AI prompt builder with
  PII fields and asserting `email`/`name` are stripped.

### Documentation gates

- [ ] **`context/progress-tracker.md` updated** to reflect completion and
  the next unit (In Progress → Completed; Current Goal bumped).
- [ ] **Architecture Decisions** appended if a real new decision was made.
- [ ] **Open Questions** appended if the unit surfaced an unresolved
  question.
- [ ] **`AGENT.md` reviewed** — almost always a no-change; update only if a
  new architectural rule emerged.
- [ ] If the unit added an env var or schema field, **`.env.example`** and
  **`context/architecture.md`** are updated in the same commit.
- [ ] If the unit changed UI tokens, **`tailwind.config.ts`** and
  **`context/ui-context.md`** are updated in the same commit.

### Ship gates

- [ ] Commit message references the unit ID and the source.
- [ ] PR description cites the academic doc / developer brief / `context/`
  file rule implemented.
- [ ] PR is ≤ 400 lines of substantive change.
- [ ] All review comments from a previous round are resolved (if any).

### Failure modes

- Any unchecked box = **do not start the next unit**. Either fix the unit
  in progress or surface a blocker to the user.
- If a discovered need invalidates a previously locked decision, **stop and
  ask the user** before implementing. Per §Handling Missing Requirements.
