# Campus Maintenance Complaint Management System (LASU)

Project Name: Campus Maintenance Complaint Management System (LASU)

This file follows the Idea-to-Product six-file context convention. Read together
with the other five context files in this directory plus `AGENT.md` (project root).

## Overview

The Campus Maintenance Complaint Management System (LASU) is a web-based platform
that digitises the full lifecycle of campus maintenance complaints at LASU — from
submission by students/staff, through AI-assisted triage (Vercel AI SDK + OpenAI
`gpt-4o-mini`) and SLA-bounded assignment, to transparent resolution and reporting.
It replaces LASU's manual and informal maintenance-reporting channels (verbal
reports, paper logs, scattered social-media groups) with a single source of truth
that gives DICT personnel a queue view, an SLA engine that escalates missed
deadlines, and reporters live status with photographic proof of repair. Built on
Next.js (App Router) + MongoDB + BetterAuth + Ably + Cloudinary + Tailwind +
Recharts, it is engineered to be lightweight enough for a resource-constrained
institution and extensible to other LASU campuses or peer institutions.

## Goals

- **Provision a single source of truth** for campus maintenance complaints at
  LASU. Durable, queryable MongoDB-backed records replace verbal reports, paper
  logs and scattered social-media groups; historical patterns (recurring faults
  by building or hostel) become analysable.
- **Reduce maintenance response delays.** SLA timers + automatic escalation up
  the DICT hierarchy compress median acknowledgement from days to under one
  hour for Critical-severity faults.
- **Bring transparency to the resolution loop.** Live status visible to
  reporters from any browser; proof-of-fix photo required before `Resolved`;
  anonymous submission lowers friction for sensitive situations.
- **Demonstrate** that a lightweight, AI-augmented, open-source stack
  (Next.js + MongoDB + Vercel AI SDK with `gpt-4o-mini` + BetterAuth + Ably +
  Cloudinary + Tailwind + Recharts) can deliver measurable service-quality gains
  for a resource-constrained institution and be replicated at peer universities.

## Core User Flow

Reporter submits via `/complaints/new` (category dropdown from the `categories`
collection, location dropdown from the `locations` collection, free-text
description 10–2000 characters, optional photo upload ≤ 10 MB JPG/PNG/WebP,
anonymous toggle) → server validates input (`Mongoose` schema) → duplicate-
detection check (same `categoryId` + `locationId` within 30 minutes; if a
match is found, the new complaint clusters to the existing one with
`parentComplaintId` set, AI triage is skipped to save cost) → AI triage call:
**Vercel AI SDK** `generateObject` with **Zod** schema sends `{ description,
building name, selected category }` to **OpenAI** `gpt-4o-mini`; receives
`{ categoryName, severity, rationale }` → final severity → SLA-table lookup:
severity → `slaAcknowledgeHrs` and `slaResolveHrs` → `slaAcknowledgeBy` and
`slaResolveBy` deadlines → complaint persisted with `aiSuggestion.*`
sub-document plus the standard fields; reporter sees `/complaints/:id` with
acknowledgement, ETA, and (optionally) AI rationale visible only to admin →
Admin sees new complaint in `/admin/queue`, filterable by severity/age/location;
assigns to a technician → **Ably** pushes real-time notification to
technician → Technician opens `/technician/queue`, clicks **Acknowledge**
(within SLA window — else escalation triggers: notification to DICT Admin,
then to DICT Director) → Technician updates status to **In Progress** with
notes + photos → Technician uploads proof-of-fix photo, marks **Resolved**;
`statusHistory` audit trail records each transition → Reporter sees status
timeline and proof-of-fix photo; admin reporting dashboard updates (Recharts:
volumes, average resolution time, SLA-breach count, backlog).

## Features

### Reporter Portal

- Web form at `/complaints/new` for submission with photo and anonymous
  toggle.
- Personal dashboard at `/complaints/mine` listing own complaints with live
  status.
- Anonymous toggle suppressing `reporterId`; AI prompt also stripped of PII
  per NFR-3.5 / NFR-6.
- Status timeline and proof-of-fix photo visible at `/complaints/:id`.

### AI-Assisted Triage (Vercel AI SDK + OpenAI `gpt-4o-mini`)

- Interprets free-text description; returns structured `{ categoryName,
  severity, rationale }` validated by Zod schema.
- Persisted on `complaints.aiSuggestion` sub-document with `model`, latency,
  prompt-token count, completion-token count, computed `costUsd`, run timestamp
  and `fallback` flag.
- **Rules-based fallback to `categories[].defaultSeverity` if call fails or
  times out** (`OPENAI_TIMEOUT_MS`, default 8000 ms) per NFR-2.2; submission
  is never blocked by an AI outage.

### DICT Admin Console

- `/admin/queue` filterable by severity, age, location.
- Assignment action: dropdown of `dicht_technician` users; creates an
  `assignments` record.
- Reassignment allowed (audited).
- SLA-breach overlay and escalation log.
- Reports dashboard with **Recharts** visualisations and PDF export via
  `@react-pdf/renderer`; CSV export for offline analysis.

### DICT Technician View

- `/technician/queue` showing assigned complaints sorted by SLA urgency.
- Acknowledge (transitions `Submitted → Acknowledged`, starts resolution
  timer).
- Update Status to **In Progress** (notes + photos).
- Mark **Resolved** (proof-of-fix photo mandatory; completes the audit trail
  with `statusHistory.proofPhotoUrl`).

### SLA Engine + Escalation

- **Vercel cron** endpoint `/api/cron/sla-sweep` runs every 5 minutes.
- Acknowledge breach (`now > slaAcknowledgeBy`, `status === 'Submitted'`)
  → notify DICT Admin via **Ably** and set `escalated = true`.
- Resolve breach (`now > slaResolveBy`, `status !== 'Resolved'`) → notify
  DICT Director.
- All escalations recorded in the `notifications` collection.

### Real-time Push (Ably)

- Assignment alerts to technicians on new assignment.
- Escalation warnings to admins.
- Status-update fan-out so the DICT console refreshes without a page reload.

### Reporting Dashboard

- Volume by category / location / severity.
- Average resolution time and SLA-breach count.
- Backlog count.
- Filters: time window, severity, location, status.
- PDF export via `@react-pdf/renderer`; CSV export for offline analysis.

### Auth & RBAC (BetterAuth)

- Three role classes: `reporter`, `dicht_admin`, `dicht_technician`.
- Email/password auth; HTTP-only cookie sessions.
- Route-level access checks on every protected request.

### Server-side Image Pipeline

- `multipart/form-data` → `sharp` compression → **Cloudinary** upload → URL
  persisted in `complaints.photoUrls[]`.
- MIME-type and size validated; non-image uploads rejected.

### Duplicate Detection

- Same `categoryId` + `locationId` within 30 minutes → cluster to existing
  complaint (`parentComplaintId` set).
- Runs **before** AI triage to reduce AI cost during peak fault periods.

## Scope

### In Scope

- Reporter roles: LASU students and staff.
- Resolver roles: DICT administrators and DICT technicians.
- A responsive web application (desktop and mobile browsers; no native mobile
  app).
- Complaint categorisation by campus location and system type (Electrical,
  Plumbing, Furniture, HVAC, ICT, Cleaning, Security, Other).
- AI-assisted triage (Vercel AI SDK + OpenAI `gpt-4o-mini`) with
  rules-based fallback.
- Four-tier SLA policy (Critical / High / Medium / Low) with two deadline
  fields (acknowledge, resolve) and automatic escalation up the DICT
  hierarchy.
- Anonymous submission mode with PII-stripped AI prompt.
- Reporter dashboard with live status and proof-of-fix photo.
- Admin reporting dashboard with Recharts visualisations and PDF/CSV export.
- Real-time push notifications via Ably.
- Image upload with `sharp` compression and Cloudinary storage.
- Duplicate detection within 30-minute category+location windows.
- Mongoose schema validation; BetterAuth session cookies; `@upstash/ratelimit`
  for rate limiting abuse.
- Jest + React Testing Library unit/integration tests; Apache JMeter or k6
  load testing of `/api/complaints` and `/api/complaints/:id`.

### Out of Scope

- Native mobile applications (iOS, Android).
- IoT sensor instrumentation / predictive maintenance via sensor streams —
  categorisation-level only at launch.
- Multi-tenant / multi-institution deployment — single LASU deployment only.
- University SSO / LDAP integration — local BetterAuth credentials only.
- ML-based fine-tuned triage (e.g. Naive Bayes baseline + transformer
  fine-tuning) — rules + AI via OpenAI is the launch state; ML fine-tuning
  is Phase 2.
- Local-language UI (Yoruba, pidgin, Hausa) — English only at launch.
- Email / SMS notification channels — in-app / Ably push only at launch.
- Asset / inventory registry beyond the `categories` collection fields.
- Non-maintenance grievance handling (academic, disciplinary, financial,
  security).
- On-device or self-hosted LLM inference — OpenAI API only.

## Success Criteria

- **Functional.** All five §1.4 objectives implemented and verified by tests.
- **SLA targets met.** Median acknowledgement time collapses from manual
  baseline of days to under 1 hour for Critical and under 24 hours for High;
  resolve within 4 hours / 24 hours respectively.
- **Service-quality lens addressed** (Tan, Suradi & Saludin, 2013):
  - speed of recovery via SLA + escalation;
  - management system via MongoDB / BetterAuth / `statusHistory`;
  - empowerment via anonymous mode + dashboard;
  - culture and psychology via anonymity reducing fear;
  - tangible compensation via proof-of-fix photo.
- **Performance.** `POST /api/complaints` (with AI triage) p95 under 4 s at
  typical load (10 concurrent); `GET /api/complaints/:id` under 200 ms p95;
  `GET /api/admin/queue` under 500 ms p95; SLA sweep cron completes within
  60 s for typical volume (<5,000 active); error rate < 1% at peak load.
- **Reliability.** AI fallback path activates within `OPENAI_TIMEOUT_MS`
  (default 8000 ms); submission is never blocked by an AI outage; SLA sweep
  failure does not block other API routes.
- **Cost.** AI triage cost ≤ $5 / month for up to 50,000 submissions/month via
  `gpt-4o-mini`; if exceeded, system flips to fallback-only mode per NFR-5.3.
- **UAT.** Pass rate ≥ 90% across reporter / admin / technician flows with
  documented defect log.
- **Pilot adoption.** ≥ 50% of LASU maintenance complaints flowing through
  the system by end of the first academic year (target — measured
  post-deployment).
