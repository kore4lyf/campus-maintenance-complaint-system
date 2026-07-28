import { test, expect } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

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

    // Type into description without filling category/location first so the
    // schema-order fires the description error before it fires the placeholder
    // error. Submission triggers schema validation regardless of which field
    // fails first, so we assert the description error specifically.
    await page
      .getByLabel(/describe the fault/i)
      .pressSequentially("short");
    await page.getByRole("button", { name: /submit complaint/i }).click();

    await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
  });
});
