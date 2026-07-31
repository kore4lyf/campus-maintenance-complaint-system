# User Flows

Every action a user can take in the app, grouped by role.

---

## 1. Reporter (campus member with an account)

### Sign up

- [x] Go to `/sign-up`.
- [x] Enter your **name**, **email**, and **password**.
- [x] Click **Create account**.
- [x] You are redirected to `/complaints/mine`.

### Sign in

- [x] Go to `/sign-in`.
- [x] Enter your **email** and **password**.
- [x] Click **Sign in**.
- [ ] If you were redirected here from a protected page, you land back there after signing in.

### File a complaint

- [x] From anywhere, click **"Submit"** in the top nav (or **"New complaint"** on your dashboard).
- [x] Pick a **Category** from the dropdown.
- [x] Pick a **Location** from the dropdown.
- [x] Write a **Description** of the fault (10 to 2000 characters).
- [ ] Optionally attach a **photo** (file picker).
- [ ] Toggle **"Submit anonymously"** on if you want to hide your identity from admin/technician.
- [x] Click **Submit complaint**.

The app runs AI triage in the background (assigns a severity level and rationale), uploads your photo to cloud storage, and creates the complaint. You are redirected to the complaint detail page.

**Anonymous mode**: When the toggle is on, the complaint retains your `reporterId` (so you can still view it in `/complaints/mine`), but admin and technician views show "Anonymous Reporter" instead of your name. No hidden user records or JWT tracker tokens are created.

### View your complaints

- [x] Go to `/complaints/mine` (the **"My complaints"** link in the nav). You see a live-updating list of every complaint you have filed, sorted newest-first. Each row shows status, category, location, and creation date.
- [x] Click any row to open the complaint detail.
- [ ] Toggle **"Show closed complaints"** to view only resolved and closed complaints. When unchecked, only open complaints are shown. When no closed complaints exist, a centered empty state with an icon informs you.

### View complaint detail

- [x] Open `/complaints/[id]` by clicking a complaint from your list. You see:
  - [x] **Status** pill (Submitted, Acknowledged, In Progress, Resolved, Closed)
  - [x] **SLA panel** — two countdown tiles: "Acknowledge by" and "Resolve by"
  - [x] **Category** and **Location**
  - [x] **Description** text
  - [x] **Attached photos** (if any)
  - [x] **Status history timeline** — every status change with timestamp and actor name
- [ ] You can only see your own complaints. Trying to open someone else's gives a 403.

### What happens after you file

1. Your complaint enters the queue as **Submitted**.
2. A DICT admin picks it up and assigns it to a technician. You get a notification.
3. The technician acknowledges it (**Acknowledged**), starts working (**In Progress**), and resolves it (**Resolved**) with a proof-of-fix photo.
4. The system automatically closes it (**Closed**) — no manual close step required.

Each status change appears on your timeline. If the technician or admin misses an SLA deadline, the complaint is escalated automatically.

---

## 2. DICT Technician (maintenance staff)

### Sign in

- [ ] Technician accounts are created by admins (seeded in the database). You sign in at `/sign-in` with the email and password your admin gave you.

### View your assignments

- [ ] After signing in you land on `/technician/assignments`. You see every complaint assigned to you, sorted by SLA urgency. Breached complaints have a red indicator.
- [ ] The list updates in real time via Ably push — when an admin assigns you a new complaint, it appears instantly.
- [ ] Each row shows: Status, Severity, Category and Location, SLA deadline (or breach indicator).
- [ ] Click any row to open the assignment detail.

### Work on a complaint

- [ ] Open `/technician/assignments/[id]`. You see the full complaint: Status, severity, category, location, Reporter name (or "Anonymous Reporter" if submitted anonymously), SLA countdown timers, Description and attached photos, Status history timeline.

#### Transition: Acknowledge

- [ ] If the complaint is **Submitted**, click **Acknowledge**. Optionally add a note (e.g. "On it"). This starts the resolution SLA timer.

#### Transition: In Progress

- [ ] If the complaint is **Acknowledged**, click **Start work** (or **In Progress**). Add a note if you want.

#### Transition: Resolved

- [ ] If the complaint is **In Progress**, click **Resolve**. You must attach exactly one proof-of-fix photo. Add a note describing what you did.
- [ ] The photo is compressed and uploaded to cloud storage. The complaint status updates to **Resolved**, then the system automatically transitions it to **Closed**. The reporter gets a notification, and the admin queue updates in real time.

### Important rules

- [ ] You can only transition complaints assigned to you.
- [ ] You can only move forward ( Submitted -> Acknowledged -> In Progress -> Resolved). You cannot go backward.
- [ ] Every transition uses optimistic locking. If someone else changes the complaint at the same time, you get a "version mismatch" error and must refresh.
- [ ] Resolving without a photo is rejected.

---

## 3. DICT Admin (department administrator)

### Sign in

- [ ] Admin accounts are seeded by the system. Sign in at `/sign-in`.

### Manage the queue

- [ ] Go to `/admin/queue` (the **"Queue"** link in the nav). This is your primary workspace.
- [ ] Layout: Left column (Filters), Center (Complaint queue), Right column (Recent actions feed).
- [ ] KPI strip at the top shows: Total complaints in view, Breached count (red), Unassigned count (yellow).

#### Assign a complaint to a technician

- [ ] Click any complaint row in the queue.
- [ ] The **Assign dialog** opens.
- [ ] Pick a **technician** from the dropdown (populated from `/api/admin/technicians`).
- [ ] Optionally add a **note**.
- [ ] Click **Assign**.
- [ ] The complaint is assigned. The technician gets an Ably push notification, the complaint disappears from the unassigned pool, and your action appears in the recent actions feed.

#### Filter the queue

- [ ] **Severity:** Critical, High, Medium, Low
- [ ] **Age:** Today, Last 7 days, Last 30 days, All time
- [ ] **Location:** Pick a specific building or area
- [ ] Filters combine (AND logic). The queue updates instantly.

#### View escalations

- [ ] The escalation ribbon at the top shows the count of SLA breaches in the last hour. Breached complaints appear with a red left border and a breach kind label (acknowledge overdue / resolve overdue).

### Analytics and reports

- [ ] Go to `/admin/reports` (the **"Reports"** link in the nav). You see: Breach count cards, Average resolution time, Backlog count, Bar charts.
- [ ] Filter reports by: Time window, Severity, Location, Status. All charts and cards update when you change filters.
- [ ] **Export CSV** — downloads a spreadsheet of all filtered complaints.
- [ ] **Export PDF** — generates a formatted PDF report with the same data.

### Complaint detail (admin view)

- [ ] Admins can open any complaint at `/complaints/[id]`. Unlike reporters (who see only their own) and technicians (who see only assigned), admins see the full document including: AI suggestion, Escalation flag, Priority level.

---

## 4. Status lifecycle

Every complaint follows this path:

```
Submitted -> Acknowledged -> In Progress -> Resolved -> Closed
```

The **Resolved → Closed** transition happens automatically — when a technician resolves a complaint, the system closes it in a two-step lifecycle, preserving audit trail entries for both actions.

### SLA enforcement

- [ ] Each complaint has two deadlines computed at creation time: Acknowledge by, Resolve by.
- [ ] A cron job (`/api/cron/sla-sweep`) runs periodically. If a deadline is missed: complaint flagged as `escalated`, escalation notification sent, Ably event pushed.

### Duplicate detection

- [ ] If two complaints with the same category and location are filed within 30 minutes, the second one is flagged as a potential duplicate.

### Anonymous complaints

- [ ] The reporter must be signed in to file.
- [ ] `reporterId` is always set on the complaint (links to the real user account).
- [ ] `isAnonymous` boolean is set to `true` when the toggle is checked.
- [ ] Admin and technician views show "Anonymous Reporter" instead of the reporter's name.
- [ ] The reporter can still view their own complaint in `/complaints/mine`.

---

## 5. Quick reference: URLs

| URL | Who can see it | Tested |
|---|---|---|
| `/` | Anyone | [x] |
| `/sign-in` | Anyone | [x] |
| `/sign-up` | Anyone | [x] |
| `/complaints/mine` | Reporter (own complaints) | [x] |
| `/complaints/new` | Reporter (signed in) | [x] |
| `/complaints/[id]` | Reporter (own), Technician (assigned), Admin (all) | [x] |
| `/admin/queue` | Admin | - [ ] |
| `/admin/reports` | Admin | - [ ] |
| `/technician/assignments` | Technician | - [ ] |
| `/technician/assignments/[id]` | Technician (assigned) | - [ ] |
