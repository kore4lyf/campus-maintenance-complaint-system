# 0001. Project setup and dependencies

**Date**: 2026-07-24
**Status**: Accepted

## Summary

The project will install all foundation dependencies at setup time so every later slice can build without waiting. The project name is `campus-maintenance-complaint-system`. All environment variables listed in the architecture context are declared in `.env.example`. TypeScript strict mode, ESLint 9, Jest with React Testing Library, and the full directory tree from `code-standards.md` are created at foundation time.

## Context

The project starts from a `create-next-app` scaffold (Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 + ESLint 9). The architecture context has already decided the full target stack: BetterAuth for authentication, Mongoose 8 + MongoDB for the data layer, Vercel AI SDK with OpenAI gpt-4o-mini for triage, Ably for real-time push, BullMQ + Upstash Redis for async work, Cloudinary + sharp for image processing, Recharts and @react-pdf/renderer for dashboards and reports. The decision is how to phase the installation and configuration of these dependencies: all at once or spread across slices. A Tracer Bullet approach means proving the whole pipe works end to end, so the foundation should be as complete as possible from day one.

## Requirements

**User stories**:

- As a developer, I want the project scaffolded and ready to build the first feature so that I do not need to install packages or create folders mid-build.
- As a developer, I want every environment variable listed in `.env.example` so that I know what external services are required.

**Acceptance criteria**:

- **AC-1**: All foundation dependencies from `architecture.md` are listed in `package.json` (dependencies and devDependencies).
- **AC-2**: `.env.example` contains every required environment variable plus `OPENAI_MODEL` and `OPENAI_API_URL` (MONGODB_URI, ABLY_API_KEY, OPENAI_API_KEY, CLOUDINARY_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, OPENAI_MODEL, OPENAI_API_URL).
- **AC-3**: TypeScript strict mode is enabled (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` in `tsconfig.json`).
- **AC-4**: The dev server boots without errors (`npm run dev` succeeds).
- **AC-5**: The production build passes (`npm run build` succeeds).
- **AC-6**: All directories from `code-standards.md` File Organization exist (app, lib/db/models, lib/auth, lib/ai, lib/sla, lib/queue, lib/realtime, lib/storage, lib/utils, components/ui, components/reporter, components/admin, components/technician, components/shared, tests/unit, tests/integration, tests/load, tests/fixtures, scripts, types, public, context).
- **AC-7**: Jest and React Testing Library are installed and `npm test` runs without errors.
- **AC-8**: ESLint 9 is configured and `npm run lint` runs without errors.

## Options considered

### Option 1: All foundation deps now

Install every dependency listed in `architecture.md` at project setup. This gives developers a complete workspace from the first minute. Each feature can start building immediately without a mid-build `npm install`.

**Pros**:
- No dependency gaps during development; every slice can be built in order.
- Matches Tracer Bullet philosophy (prove the whole pipe works).

**Cons**:
- Larger initial install footprint; some packages (Ably, BullMQ, Cloudinary) are not used until later slices.
- Unused packages in `package.json` can confuse new contributors.

**Recommendation**: The project is a single-team resource-constrained deployment. The overhead of unused packages is negligible compared to the developer experience gain of a complete scaffold.

### Option 2: Only direct scaffold deps now

Install only what the first slice (BetterAuth setup) needs now: create-next-app baseline, BetterAuth, Mongoose, TypeScript, Tailwind, Astryx. Defer everything else until the feature that needs it appears.

**Pros**: Leaner initial install; smaller `package.json` at setup time.

**Cons**: Each later slice requires an npm install step; the dependency list is incomplete until all slices are built; risks forgetting a dependency that was assumed to be installed already.

### Option 3: Minimal install now

Install only what npm create-next-app already gives you plus the minimum to make the dev server boot. Everything else is deferred until a feature explicitly needs it.

**Pros**: Absolute minimal starting point.

**Cons**: Adds no value over the scaffold; defers every architectural dependency decision to later.

## Decision

**Chosen option**: Option 1: All foundation deps now

All declaration-level dependencies from `architecture.md` are installed at project setup. The dev workspace is complete when the feature is complete.

**Implementation skills**: `nextjs-react-typescript` (`mindrally/skills`, `.agents/skills/nextjs-react-typescript/`) · `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `zod-validation-expert` (`sickn33/agentic-awesome-skills`, `.agents/skills/zod-validation-expert/`) · `astryx` (`Context7`, `.agents/skills/astryx/`) · `tailwind-design-system` (`wshobson/agents`, `.agents/skills/tailwind-design-system/`) · `ai-sdk` (`mindrally/skills`, `.agents/skills/ai-sdk/`) · `mongodb` (`hoodini/ai-agents-skills`, `.agents/skills/mongodb/`)

## Rationale

The project context files (`architecture.md`, `code-standards.md`, `ui-context.md`) already enumerate the full stack. Deferring dependency installation until a specific slice needs it would mean each slice has its own npm install step, which fragments the dev environment and risks version mismatches. The Tracer Bullet approach expects every layer to be wired from the foundation. The small cost of unused packages in package.json is far less than the cost of a missing dependency at build time. The recommended project name campus-maintenance-complaint-system matches the academic doc title and follows the kebab-case npm convention.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript 5.x strict | Already in scaffold; strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes per architecture.md |
| Framework | Next.js 16 (App Router) | Already in scaffold; matches architecture.md |
| UI framework | React 19 | Already in scaffold; matches architecture.md |
| Styling | Tailwind CSS 4 + Astryx | Per architecture.md; Astryx for base components, Tailwind for custom utilities |
| Database | MongoDB + Mongoose 8 | Per architecture.md; Atlas for hosting |
| Auth | BetterAuth with nextCookies plugin | Per architecture.md; HTTP-only cookie sessions |
| AI | Vercel AI SDK + OpenAI gpt-4o-mini | Per architecture.md; low cost per call |
| Real-time | Ably | Per architecture.md; push notifications |
| Queue/async | BullMQ + Upstash Redis | Per architecture.md; SLA sweep cron |
| File storage | Cloudinary + sharp | Per architecture.md; CDN + compression |
| Charts/export | Recharts + @react-pdf/renderer | Per architecture.md; dashboards + PDF |
| Rate limiting | @upstash/ratelimit + @upstash/redis | Per architecture.md; abuse prevention |
| Testing | Jest + React Testing Library | Per architecture.md |
| Lint/format | ESLint 9 only | Already in scaffold; no Prettier |

## Consequences

**Positive**:
- Every dependency is declared upfront so no slice hits a missing package.
- The package.json is the single source of truth for all project dependencies.
- The dev server, build, test, and lint commands all work from day one.

**Negative / tradeoffs**:
- The initial npm install takes longer than a minimal install.
- package.json contains packages not used until later slices (Ably, BullMQ, Recharts, etc.), which can look noisy to new contributors.
- Some environment variables (e.g. ABLY_API_KEY, CLOUDINARY_URL) must be supplied by the developer or their team before the corresponding features work, but they are declared early.

**Neutral**:
- .env.example will be a large file; developers can comment out variables for slices they are not currently building.
- The node_modules/ footprint is larger than a phased install would produce.

## Follow-up

- [ ] nextjs-react-typescript conventions not yet in root AGENTS.md; this applies to every file in the project and belongs at root level.
- [ ] better-auth-best-practices conventions not yet in root AGENTS.md; this applies to every file in the project and belongs at root level.
- [ ] zod-validation-expert conventions not yet in root AGENTS.md; this applies to every file in the project and belongs at root level.
- [ ] astryx conventions not yet in root AGENTS.md; this applies to every file in the project and belongs at root level.
- [ ] tailwind-design-system conventions not yet in root AGENTS.md; this applies to every file in the project and belongs at root level.
- [ ] ai-sdk conventions not yet in root AGENTS.md; this applies to every file in the project and belongs at root level.
- [ ] mongodb conventions not yet in root AGENTS.md; this applies to every file in the project and belongs at root level.