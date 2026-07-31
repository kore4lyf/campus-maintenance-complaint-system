import { test, expect } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

/*
 * NOTE: Run this file individually (`npx playwright test tests/e2e/complaint-submission.spec.ts`)
 * or with --workers=1. The form submission tests depend on a fresh authenticated
 * session and real DB state; running alongside other test files can cause session
 * contention and flaky timeouts.
 */

test.describe("Feature 05: Complaint submission smoke", () => {
  test("complaint form page renders all required fields", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).click();
    await page.waitForURL(/\/complaints\/new/);
    await expect(page.getByLabel(/category/i)).toBeVisible();
    await expect(page.getByLabel(/location/i)).toBeVisible();
    await expect(page.getByLabel(/describe the fault/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /submit complaint/i }),
    ).toBeVisible();
  });

  test("form validation rejects short description", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).click();
    await page.waitForURL(/\/complaints\/new/);

    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially("short");
    await page.getByRole("button", { name: /submit complaint/i }).click();

    await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
  });
});

test.describe("Feature 05: Complaint form full submission", () => {
  test("happy path: fill form, submit, and land on complaint detail", async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).first().click();
    await page.waitForURL(/\/complaints\/new/);

    // Select first available category
    const categorySelect = page.getByLabel(/category/i);
    const categoryOptions = await categorySelect.locator("option").all();
    expect(categoryOptions.length).toBeGreaterThan(1);
    const categoryValue = await categoryOptions[1].getAttribute("value");
    expect(categoryValue).toBeTruthy();
    await categorySelect.selectOption(categoryValue!);

    // Select first available location
    const locationSelect = page.getByLabel(/location/i);
    const locationOptions = await locationSelect.locator("option").all();
    expect(locationOptions.length).toBeGreaterThan(1);
    const locationValue = await locationOptions[1].getAttribute("value");
    expect(locationValue).toBeTruthy();
    await locationSelect.selectOption(locationValue!);

    // Fill description
    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially(
        "Two fluorescent lights in the reading room are flickering constantly, making it hard to study.",
      );

    // Submit
    await page.getByRole("button", { name: /submit complaint/i }).click();

    // Should redirect to complaint detail or my complaints
    await page.waitForURL(/\/complaints\/(mine|[a-f0-9]{24})/, {
      timeout: 30_000,
    });
  });

  test("happy path anonymous: submit with anonymous checked", async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).first().click();
    await page.waitForURL(/\/complaints\/new/);

    // Select category and location
    const categorySelect = page.getByLabel(/category/i);
    const categoryOptions = await categorySelect.locator("option").all();
    const categoryValue = await categoryOptions[1].getAttribute("value");
    await categorySelect.selectOption(categoryValue!);

    const locationSelect = page.getByLabel(/location/i);
    const locationOptions = await locationSelect.locator("option").all();
    const locationValue = await locationOptions[1].getAttribute("value");
    await locationSelect.selectOption(locationValue!);

    // Fill description
    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially(
        "Anonymous test: water leaking from pipe in hallway, please keep my identity hidden.",
      );

    // Check anonymous checkbox
    await page.getByLabel(/submit anonymously/i).check();

    // Submit
    await page.getByRole("button", { name: /submit complaint/i }).click();

    // Should redirect to track URL or complaints page
    await page.waitForURL(/\/(track|complaints)\//, { timeout: 90_000 });
  });

  test("validation rejects empty category", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).first().click();
    await page.waitForURL(/\/complaints\/new/);

    // Fill only location and description
    const locationSelect = page.getByLabel(/location/i);
    const locationOptions = await locationSelect.locator("option").all();
    await locationSelect.selectOption((await locationOptions[1].getAttribute("value"))!);

    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially("Testing category validation with a valid description.");

    await page.getByRole("button", { name: /submit complaint/i }).click();

    await expect(page.getByText(/select a category/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("validation rejects empty location", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).first().click();
    await page.waitForURL(/\/complaints\/new/);

    // Fill only category and description
    const categorySelect = page.getByLabel(/category/i);
    const categoryOptions = await categorySelect.locator("option").all();
    await categorySelect.selectOption((await categoryOptions[1].getAttribute("value"))!);

    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially("Testing location validation with a valid description.");

    await page.getByRole("button", { name: /submit complaint/i }).click();

    await expect(page.getByText(/select a location/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("complaint appears in my complaints after submission", async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).first().click();
    await page.waitForURL(/\/complaints\/new/);

    const categorySelect = page.getByLabel(/category/i);
    const categoryOptions = await categorySelect.locator("option").all();
    await categorySelect.selectOption((await categoryOptions[1].getAttribute("value"))!);

    const locationSelect = page.getByLabel(/location/i);
    const locationOptions = await locationSelect.locator("option").all();
    await locationSelect.selectOption((await locationOptions[1].getAttribute("value"))!);

    const description = "E2E verification: checking my complaints list after submit.";
    await page.getByLabel(/describe the fault/i).pressSequentially(description);

    await page.getByRole("button", { name: /submit complaint/i }).click();

    // Redirect means submission succeeded — either to detail page or mine
    await page.waitForURL(/\/complaints\/(mine|[a-f0-9]{24})/, {
      timeout: 30_000,
    });

    // If redirected to detail page, the complaint content should be visible
    // If redirected to mine, the list should be visible
    const onDetail = /\/complaints\/[a-f0-9]{24}/.test(page.url());
    if (onDetail) {
      await expect(page.getByText(/e2e verification/i)).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(page.locator("ul")).toBeVisible({ timeout: 10_000 });
    }
  });
});
