import { test, expect, type Page } from "@playwright/test";
import {
  ensureAuthenticated,
  signInAsAdmin,
} from "./helpers";

/*
 * Anonymous submission — critical happy paths only:
 * - Anonymous submit redirects to detail page
 * - Admin view shows "Anonymous Reporter" instead of real name
 */

async function gotoComplaintNew(page: Page): Promise<void> {
  await page.getByRole("link", { name: /submit/i }).first().click();
  await page.waitForURL(/\/complaints\/new/);
  await page.waitForLoadState("networkidle");
}

test.describe("Anonymous submission flow", () => {
  test("anonymous submission redirects to complaint detail", async ({ page }) => {
    await ensureAuthenticated(page);
    await gotoComplaintNew(page);

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
    await page.getByLabel(/describe the fault/i).fill("Anonymous: leaking pipe in Male Hostel B ceiling.");
    await page.getByLabel(/submit anonymously/i).check();
    await page.getByRole("button", { name: /submit complaint/i }).click();

    await page.waitForURL(/\/complaints\/[a-f0-9]{24}/, { timeout: 90_000 });
    await expect(page.getByText(/leaking pipe in male hostel b/i)).toBeVisible();
  });

  test("admin view shows Anonymous Reporter for anonymous submission", async ({ page }) => {
    await ensureAuthenticated(page);
    await gotoComplaintNew(page);

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
    await page.getByLabel(/describe the fault/i).fill("Anonymous: broken window in library.");
    await page.getByLabel(/submit anonymously/i).check();
    await page.getByRole("button", { name: /submit complaint/i }).click();

    await page.waitForURL(/\/complaints\/[a-f0-9]{24}/, { timeout: 90_000 });

    await page.context().clearCookies();
    await signInAsAdmin(page.context());

    await page.goto("/admin/queue");
    await page.waitForLoadState("networkidle");
    const searchBox = page.getByPlaceholder(/search/i);
    await searchBox.fill("broken window");
    await expect(page.getByText(/broken window/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/anonymous reporter/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
