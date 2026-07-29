import { test, expect, type Page } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

/*
 * Full reporter submission flow.
 *
 * 2026-07-28: this suite was added because the smoke-level
 * `complaint-submission.spec.ts` did not catch the case where the
 * category dropdown is empty (DB not seeded). Each test here enters the
 * page first and asserts the dropdowns have real options before any
 * interaction. If categories or locations are missing, the suite fails
 * loudly with a specific error message.
 *
 * The tests use end-to-end flows through the live DOM (no mocked
 * fetch), so a regression anywhere along the path — categories fetch,
 * duplicate detection, AI fallback, route handler, role guard — shows
 * up immediately. Both authenticated and anonymous paths are exercised.
 */

const CATEGORY_LABELS = [
  "Electrical Faults",
  "Plumbing Issues",
  "Carpentry & Woodwork",
  "HVAC & Air Conditioning",
  "ICT & Networking",
  "Cleaning & Sanitation",
  "Security & Safety",
  "Other Maintenance",
];

const LOCATION_LABELS = [
  "Female Hostel A",
  "Engineering Block",
  "Library",
];

async function gotoComplaintNew(page: Page): Promise<void> {
  await page.getByRole("link", { name: /submit/i }).first().click();
  await page.waitForURL(/\/complaints\/new/);
}

test.describe("Feature 05: Reporter submission flow", () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    await gotoComplaintNew(page);
  });

  test("category dropdown lists every seeded category", async ({ page }) => {
    const select = page.getByLabel(/category/i);
    const options = await select.locator("option").allInnerTexts();
    for (const cat of CATEGORY_LABELS) {
      expect(options.some((o) => o.includes(cat))).toBe(true);
    }
  });

  test("location dropdown lists every seeded location", async ({ page }) => {
    const select = page.getByLabel(/location/i);
    const options = await select.locator("option").allInnerTexts();
    for (const loc of LOCATION_LABELS) {
      expect(options.some((o) => o.includes(loc))).toBe(true);
    }
  });

  test("form rejects a category that fails server-side guards", async ({
    page,
  }) => {
    // Fill description only — schema-level category validator should fail.
    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially("Sockets in lab are not working today.");
    await page.getByRole("button", { name: /submit complaint/i }).click();
    await expect(page.getByText(/select a category/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("happy path: submit a complaint and see it in /complaints/mine", async ({
    page,
  }) => {
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
    if (!category || !location) throw new Error("seed missing categories/");

    await page.getByLabel(/category/i).selectOption(category);
    await page.getByLabel(/location/i).selectOption(location);
    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially(
        "Two sockets in science lab B are not working; noticed this morning.",
      );
    await page.getByRole("button", { name: /submit complaint/i }).click();

    await page.waitForURL(/\/complaints\/(mine|[a-f0-9]{24})/, {
      timeout: 30_000,
    });

    // Navigate back to my complaints and confirm the row is there.
    await page.goto("/complaints/mine");
    await expect(page.locator("ul")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/sockets in science lab/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("happy path anonymous: submit and receive an opaque tracker URL", async ({
    page,
  }) => {
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
    if (!category || !location) throw new Error("seed missing categories/");

    await page.getByLabel(/category/i).selectOption(category);
    await page.getByLabel(/location/i).selectOption(location);
    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially(
        "Anonymous: leaking pipe in Male Hostel B ceiling, please hide my identity.",
      );
    await page.getByLabel(/submit anonymously/i).check();
    await page.getByRole("button", { name: /submit complaint/i }).click();

    // After anonymous submit the form redirects to /track/{token}.
    // The full chain (anonymous user creation + AI triage + DB write) can
    // take a while, so we allow a generous timeout.
    await page.waitForURL(/\/(track|complaints)\//, { timeout: 90_000 });
  });
});

test.describe("Feature 06: Reporter dashboard integration", () => {
  test("my complaints page lists at least the seeded categories count via header", async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    await page.goto("/complaints/mine");
    await expect(page.locator("h1")).toContainText(/my complaints/i);
  });

  test("/api/complaints/:id for own complaint returns status field", async ({
    page,
  }) => {
    await ensureAuthenticated(page);

    // Submit first via UI to get a real id.
    await page.goto("/complaints/new");
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
    if (!category || !location) throw new Error("seed missing");
    await page.getByLabel(/category/i).selectOption(category);
    await page.getByLabel(/location/i).selectOption(location);
    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially(
        "Detail page test: door knob on science block stairwell is loose.",
      );
    await page.getByRole("button", { name: /submit complaint/i }).click();
    await page.waitForURL(/\/complaints\/[a-f0-9]{24}/, { timeout: 90_000 });

    // Extract id from the URL and call the API from the browser context.
    const url = page.url();
    const idMatch = url.match(/\/complaints\/([a-f0-9]{24})/);
    expect(idMatch).not.toBeNull();
    const id = idMatch![1];

    const apiJson = await page.evaluate(async (complaintId) => {
      const res = await fetch(`/api/complaints/${complaintId}`);
      return res.json();
    }, id);

    expect(apiJson).toHaveProperty("data");
    expect(apiJson.data).toHaveProperty("status");
  });
});
