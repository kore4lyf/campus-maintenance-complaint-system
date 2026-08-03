import type { Page, BrowserContext } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

export type UserRole = "reporter" | "dicht_admin" | "dicht_technician";

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export async function createTestUser(
  overrides?: Partial<TestUser> & { role?: UserRole },
): Promise<TestUser> {
  const email =
    overrides?.email ??
    `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.lasu.edu.ng`;
  const password = overrides?.password ?? "TestPassword123!";
  const name = overrides?.name ?? "E2E User";
  const role: UserRole = overrides?.role ?? "reporter";

  let lastError: string = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}/api/test/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });

    if (res.ok) {
      return { email, password, name, role };
    }
    lastError = `${res.status} ${await res.text()}`;
    if (res.status !== 500) break;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }

  throw new Error(`Failed to create test user after retries: ${lastError}`);
}

export async function signInAsTestUser(
  context: BrowserContext,
  user: TestUser,
): Promise<void> {
  await context.addCookies([
    {
      name: "test-session",
      value: user.email,
      domain: "localhost",
      path: "/",
    },
  ]);
}

export async function signInAsAdmin(
  context: BrowserContext,
): Promise<TestUser> {
  const user = await createTestUser({ role: "dicht_admin" });
  await signInAsTestUser(context, user);
  return user;
}

export async function signInAsTechnician(
  context: BrowserContext,
): Promise<TestUser> {
  const user = await createTestUser({ role: "dicht_technician" });
  await signInAsTestUser(context, user);
  return user;
}

export async function ensureAuthenticated(page: Page): Promise<void> {
  const user = await createTestUser();
  await signInAsTestUser(page.context(), user);

  await page.goto("/complaints/mine", { timeout: 60_000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });
}

let cachedSeededIds: { categoryId: string; locationId: string } | null = null;

/**
 * Fetch the first seeded category and location IDs from the complaint form
 * page. Caches after first call so subsequent `submitComplaintViaAPI` calls
 * skip the page navigation entirely.
 */
async function resolveSeededIds(page: Page): Promise<{ categoryId: string; locationId: string }> {
  if (cachedSeededIds) return cachedSeededIds;

  await page.goto("/complaints/new", { timeout: 60_000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });

  const categoryId = await page
    .getByLabel(/category/i)
    .locator("option")
    .nth(1)
    .getAttribute("value");

  const locationId = await page
    .getByLabel(/location/i)
    .locator("option")
    .nth(1)
    .getAttribute("value");

  if (!categoryId || !locationId) {
    throw new Error("seed missing categories/locations");
  }

  cachedSeededIds = { categoryId, locationId };
  return cachedSeededIds;
}

/**
 * Submit a complaint directly via the API. Fetches seeded category/location
 * IDs once (cached), then POSTs to `/api/complaints` (bypassing form UI
 * and AI triage latency).
 * The page context must carry the reporter test-session cookie.
 */
export async function submitComplaintViaAPI(
  page: Page,
  description = "E2E test: automatic API submission via helper.",
  /** Delay (ms) after submission to avoid rapid-fire OpenAI rate limits. */
  delayMs = 500,
): Promise<string> {
  const { categoryId, locationId } = await resolveSeededIds(page);

  // Ensure we're on a localhost page so fetch() sends cookies
  if (!page.url().startsWith(BASE_URL)) {
    await page.goto(BASE_URL, { waitUntil: "commit", timeout: 30_000 });
  }

  const result = await page.evaluate(
    async (args: { categoryId: string; locationId: string; description: string }) => {
      let lastError = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        const form = new FormData();
        form.set("categoryId", args.categoryId);
        form.set("locationId", args.locationId);
        form.set("description", args.description);
        form.set("isAnonymous", "false");

        const res = await fetch("/api/complaints", { method: "POST", body: form });
        const json = await res.json();
        if (res.ok && json.data?.id) {
          return json.data.id as string;
        }
        lastError = `${res.status} ${json.error?.message ?? JSON.stringify(json)}`;
        if (res.status !== 500) break;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
      throw new Error(`Complaint API failed after retries: ${lastError}`);
    },
    { categoryId, locationId, description },
  );

  if (delayMs > 0) {
    await page.waitForTimeout(delayMs);
  }

  return result;
}

/**
 * Submit a complaint via the UI form. Assumes the page is already on
 * `/complaints/new` and the user is authenticated as a reporter.
 */
export async function submitComplaintViaUI(
  page: Page,
  description = "E2E test: automatic submission via helper.",
): Promise<string> {
  const category = await page
    .getByLabel(/category/i)
    .locator("option")
    .nth(1)
    .getAttribute("value");
  const location = await page
    .getByLabel(/location/i)
    .locator("option")
    .nth(1)
    .getAttribute("value");
  if (!category || !location) throw new Error("seed missing categories/locations");

  await page.getByLabel(/category/i).selectOption(category);
  await page.getByLabel(/location/i).selectOption(location);
  await page
    .getByLabel(/describe the fault/i)
    .pressSequentially(description);

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("/api/complaints") && res.request().method() === "POST",
    { timeout: 90_000 },
  );
  await page.getByRole("button", { name: /submit complaint/i }).click();
  const apiResponse = await responsePromise;
  const payload = await apiResponse.json();

  if (!apiResponse.ok() || !payload?.data?.id) {
    throw new Error(
      `Complaint submission failed: ${apiResponse.status()} ${payload?.error?.message ?? "unknown"}`,
    );
  }

  await page.waitForURL(/\/complaints\/[a-f0-9]{24}/, { timeout: 30_000 }).catch(() => {});
  return payload.data.id as string;
}

/**
 * Assign a complaint to a technician via the admin queue API.
 * The page context must carry the admin test-session cookie.
 */
export async function assignComplaintViaAPI(
  page: Page,
  complaintId: string,
  technicianEmail: string,
): Promise<void> {
  // Ensure we're on a localhost page so fetch() sends cookies
  if (!page.url().startsWith(BASE_URL)) {
    await page.goto(BASE_URL, { waitUntil: "commit", timeout: 30_000 });
  }

  const result = await page.evaluate(
    async (args: {
      baseUrl: string;
      complaintId: string;
      technicianEmail: string;
    }) => {
      const base = args.baseUrl;

      // 1. Find the technician
      const techRes = await fetch(`${base}/api/admin/technicians`);
      const techJson = await techRes.json();
      const tech = techJson.data?.find(
        (t: { email: string }) => t.email === args.technicianEmail,
      );
      if (!tech) throw new Error(`Technician ${args.technicianEmail} not found`);

      // 2. Get complaint version from admin queue (try all statuses)
      let version = 0;
      try {
        const queueRes = await fetch(`${base}/api/admin/queue`);
        const queueJson = await queueRes.json();
        const item = queueJson.data?.find(
          (i: Record<string, unknown>) => String(i._id) === args.complaintId,
        );
        if (item && typeof (item as { __v?: unknown }).__v === "number") {
          version = (item as { __v: number }).__v;
        }
      } catch {
        // If queue lookup fails, assume version 0 (just-created complaint)
      }

      // 3. Assign
      const assignRes = await fetch(`${base}/api/admin/queue/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: args.complaintId,
          assignedToTechId: tech._id,
          expectedVersion: version,
          note: "E2E assignment",
        }),
      });
      if (!assignRes.ok) {
        const errBody = await assignRes.json().catch(() => null);
        throw new Error(
          `Assign failed: ${assignRes.status} ${errBody?.error?.message ?? "unknown"}`,
        );
      }
    },
    { baseUrl: BASE_URL, complaintId, technicianEmail },
  );
}

/**
 * Transition a complaint status via the technician API.
 * The page context must carry the technician test-session cookie.
 */
export async function transitionComplaintViaAPI(
  page: Page,
  complaintId: string,
  toStatus: "Acknowledged" | "In Progress" | "Resolved",
  note?: string,
  photo?: { buffer: string; mime: string; name: string },
): Promise<void> {
  const detail = await page.evaluate(async (id: string) => {
    const res = await fetch(`/api/technician/queue/${id}`);
    return res.json();
  }, complaintId);

  const item = detail.data;
  if (!item) throw new Error(`Complaint ${complaintId} not found for technician`);

  // Wrap the transition payload in a "body" JSON field, matching how
  // the TransitionForm component sends multipart/form-data requests.
  const payload: Record<string, unknown> = {
    expectedVersion: item.__v ?? 0,
    toStatus,
  };
  if (note) payload.note = note;

  // Build the form data entries as JSON so we can reconstruct inside page.evaluate
  const entries: [string, string | { buffer: string; mime: string; name: string }][] = [
    ["body", JSON.stringify(payload)],
  ];
  if (photo && toStatus === "Resolved") {
    entries.push(["photo", photo]);
  }

  await page.evaluate(
    async (args: { complaintId: string; entriesJson: string }) => {
      const raw = JSON.parse(args.entriesJson) as [string, string | { buffer: string; mime: string; name: string }][];
      const form = new FormData();
      for (const [k, v] of raw) {
        if (typeof v === "string") {
          form.set(k, v);
        } else {
          // Decode base64 photo
          const binaryStr = atob(v.buffer);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: v.mime });
          form.set(k, blob, v.name);
        }
      }

      const res = await fetch(`/api/technician/queue/${args.complaintId}/transition`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        throw new Error(`Transition failed: ${res.status} ${await res.text()}`);
      }
    },
    { complaintId, entriesJson: JSON.stringify(entries) },
  );
}
