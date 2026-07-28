import { test, expect } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

test.describe("Feature 06: Reporter dashboard smoke", () => {
  test("reporter dashboard page loads", async ({ page }) => {
    await ensureAuthenticated(page);
    await expect(page.url()).toContain("/complaints");
  });

  test("complaint new page is accessible from dashboard", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.getByRole("link", { name: /submit/i }).click();
    await page.waitForURL(/\/complaints\/new/);
    await expect(
      page.getByRole("button", { name: /submit complaint/i }),
    ).toBeVisible();
  });
});
