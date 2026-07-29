# User Flows

Every action a user can take in the app, grouped by role.

---

## 1. Anonymous Visitor (no account)

### Landing page

Open `/`. See the hero, stats, how-it-works section, and CTAs.

- **"Report a fault"** goes to `/complaints/new`. You will be asked to sign in first.
- **"File anonymously"** goes to `/complaints/new` with the anonymous toggle pre-selected.
- **"Sign in"** goes to `/sign-in`.
- **"Create an account"** goes to `/sign-up`.

### Anonymous complaint

1. Go to `/complaints/new`.
2. Pick a **Category** (e.g. Electrical Faults).
3. Pick a **Location** (e.g. Library).
4. Write a **Description** (10 to 2000 characters).
5. Toggle **"Submit anonymously"** on.
6. Click **Submit**.

The app processes the complaint (AI triage runs in the background), then redirects you to a private tracker URL like `/track/[token]`. Bookmark this URL — it is the only way to check your complaint status without an account.

### Track an anonymous complaint

Open your bookmarked `/track/[token]` URL at any time. You will see:

- Current status (Submitted, Acknowledged, In Progress, Resolved, Closed)
- SLA countdown timers (acknowledge-by, resolve-by)
- Description and attached photos
- Status history timeline

When the complaint reaches Closed, the page shows an empty state with a link to file a new one.

---

## 2. Reporter (campus member with an account)

### Sign up

1. Go to `/sign-up`.
2. Enter your **name**, **email**, and **password**.
3. Click **Create account**.

You are redirected to `/complaints/mine`.

### Sign in

1. Go to `/sign-in`.
2. Enter your **email** and **password**.
3. Click **Sign in**.

If you were redirected here from a protected page, you land back there after signing in.

### File a complaint

1. From anywhere, click **"Submit"** in the top nav (or **"New complaint"** on your dashboard).
2. Pick a **Category** from the dropdown.
3. Pick a **Location** from the dropdown.
4. Write a **Description** of the fault (10 to 2000 characters).
5. Optionally attach a **photo** (file picker).
6. Click **Submit complaint**.

The app runs AI triage in the background (assigns a severity level and rationale), uploads your photo to cloud storage, and creates the complaint. You are redirected to the complaint detail page.

### View your complaints

Go to `/complaints/mine` (the **"My complaints"** link in the nav). You see a live-updating list of every complaint you have filed, sorted newest-first. Each row shows status, category, location, and creation date.

- Click any row to open the complaint detail.
- Toggle **"Closed claims"** to include resolved and closed complaints.

### View complaint detail

Open `/complaints/[id]` by clicking a complaint from your list. You see:

- **Status** pill (Submitted, Acknowledged, In Progress, Resolved, Closed)
- **SLA panel** — two countdown tiles: "Acknowledge by" and "Resolve by"
- **Category** and **Location**
- **Description** text
- **Attached photos** (if any)
- **Status history timeline** — every status change with timestamp and actor name

You can only see your own complaints. Trying to open someone else's gives a 403.

### What happens after you file

1. Your complaint enters the queue as **Submitted**.
2. A DICT admin picks it up and assigns it to a technician. You get a notification.
3. The technician acknowledges it (**Acknowledged**), starts working (**In Progress**), and resolves it (**Resolved**) with a proof-of-fix photo.
4. An admin closes it (**Closed**).

Each status change appears on your timeline. If the technician or admin misses an SLA deadline, the complaint is escalated automatically.

---

## 3. DICT Technician (maintenance staff)

### Sign in

Technician accounts are created by admins (seeded in the database). You sign in at `/sign-in` with the email and password your admin gave you.

### View your assignments

After signing in you land on `/technician/assignments`. You see every complaint assigned to you, sorted by SLA urgency. Breached complaints have a red indicator.

The list updates in real time via Ably push — when an admin assigns you a new complaint, it appears instantly.

Each row shows:
- Status
- Severity (Critical / High / Medium / Low)
- Category and Location
- SLA deadline (or breach indicator)

Click any row to open the assignment detail.

### Work on a complaint

Open `/technician/assignments/[id]`. You see the full complaint:

- Status, severity, category, location
- Reporter name (unless anonymous)
- SLA countdown timers
- Description and attached photos
- Status history timeline

The action sidebar lets you transition the complaint through the workflow:

#### Transition: Acknowledge

If the complaint is **Submitted**, click **Acknowledge**. Optionally add a note (e.g. "On it"). This starts the resolution SLA timer.

```
Submitted -> Acknowledged
```

#### Transition: In Progress

If the complaint is **Acknowledged**, click **Start work** (or **In Progress**). Add a note if you want.

```
Acknowledged -> In Progress
```

#### Transition: Resolved

If the complaint is **In Progress**, click **Resolve**. You must attach exactly one proof-of-fix photo. Add a note describing what you did.

```
In Progress -> Resolved
```

The photo is compressed and uploaded to cloud storage. The complaint status updates, the reporter gets a notification, and the admin queue updates in real time.

### Important rules

- You can only transition complaints assigned to you.
- You can only move forward ( Submitted -> Acknowledged -> In Progress -> Resolved). You cannot go backward.
- Every transition uses optimistic locking. If someone else changes the complaint at the same time, you get a "version mismatch" error and must refresh.
- Resolving without a photo is rejected.

---

## 4. DICT Admin (department administrator)

### Sign in

Admin accounts are seeded by the system. Sign in at `/sign-in`.

### Manage the queue

Go to `/admin/queue` (the **"Queue"** link in the nav). This is your primary workspace.

**Layout:**
- **Left column:** Filters — severity, age (today / 7 days / 30 days / all), location.
- **Center:** Complaint queue sorted by SLA urgency (breaches first).
- **Right column:** Recent actions feed (your last 24 hours of assignments).

**KPI strip** at the top shows:
- Total complaints in view
- Breached count (red)
- Unassigned count (yellow)

#### Assign a complaint to a technician

1. Click any complaint row in the queue.
2. The **Assign dialog** opens.
3. Pick a **technician** from the dropdown (populated from `/api/admin/technicians`).
4. Optionally add a **note**.
5. Click **Assign**.

The complaint is assigned. The technician gets an Ably push notification, the complaint disappears from the unassigned pool, and your action appears in the recent actions feed.

#### Filter the queue

Use the filter controls to narrow the view:
- **Severity:** Critical, High, Medium, Low
- **Age:** Today, Last 7 days, Last 30 days, All time
- **Location:** Pick a specific building or area

Filters combine (AND logic). The queue updates instantly.

#### View escalations

The escalation ribbon at the top shows the count of SLA breaches in the last hour. Breached complaints appear with a red left border and a breach kind label (acknowledge overdue / resolve overdue).

### Analytics and reports

Go to `/admin/reports` (the **"Reports"** link in the nav). You see:

- **Breach count cards** — acknowledge breaches vs resolve breaches
- **Average resolution time**
- **Backlog count** — open complaints older than 7 days
- **Bar charts** — complaints by category, by location, by severity

#### Filter reports

Use the filter bar to narrow by:
- **Time window:** Today, 7 days, 30 days, 90 days, or custom date range
- **Severity:** Critical, High, Medium, Low
- **Location:** One or more buildings
- **Status:** Submitted, Acknowledged, In Progress, Resolved, Closed

All charts and cards update when you change filters.

#### Export data

At the top of the reports page:

- **Export CSV** — downloads a spreadsheet of all filtered complaints (columns: ID, date, status, priority, category, location, SLA deadlines, resolved date, breach kind).
- **Export PDF** — generates a formatted PDF report with the same data.

### Complaint detail (admin view)

Admins can open any complaint at `/complaints/[id]`. Unlike reporters (who see only their own) and technicians (who see only assigned), admins see the full document including:
- AI suggestion (model, severity, rationale, cost)
- Escalation flag
- Priority level

---

## 5. Status lifecycle

Every complaint follows this path:

```
Submitted
    |
    v
Acknowledged  (technician acknowledges, starts ack SLA)
    |
    v
In Progress   (technician begins work)
    |
    v
Resolved      (technician resolves with proof-of-fix photo)
    |
    v
Closed        (admin closes the loop)
```

### SLA enforcement

Each complaint has two deadlines computed at creation time:
- **Acknowledge by:** e.g. 4 hours from submission (varies by category)
- **Resolve by:** e.g. 24 hours from submission (varies by category)

A cron job (`/api/cron/sla-sweep`) runs periodically. If a deadline is missed:
1. The complaint is flagged as `escalated`.
2. An escalation notification is sent to the admin.
3. An Ably event is pushed to the admin queue channel.

### Duplicate detection

If two complaints with the same category and location are filed within 30 minutes, the second one is flagged as a potential duplicate. The AI triage uses a rules-based fallback instead of calling the model, and a `parentComplaintId` link is created.

### Anonymous complaints

Anonymous complaints work the same way through the pipeline, but:
- No reporter ID is stored on the complaint.
- A hidden user record is created with a synthetic email.
- A JWT-based tracker token is returned to the submitter.
- The reporter name shows as "Anonymous Reporter" to technicians and admins.

---

## 6. Quick reference: URLs

| URL | Who can see it |
|---|---|
| `/` | Anyone |
| `/sign-in` | Anyone |
| `/sign-up` | Anyone |
| `/track/[token]` | Anyone with the token |
| `/complaints/mine` | Reporter (own complaints) |
| `/complaints/new` | Reporter (signed in) |
| `/complaints/[id]` | Reporter (own), Technician (assigned), Admin (all) |
| `/admin/queue` | Admin |
| `/admin/reports` | Admin |
| `/technician/assignments` | Technician |
| `/technician/assignments/[id]` | Technician (assigned) |
