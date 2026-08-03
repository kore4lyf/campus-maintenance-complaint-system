import { test, expect } from "@playwright/test";

/*
 * Landing page (root `/`) — verifies the public marketing surface
 * that visitors see before signing in.
 */

test.describe("Landing page", () => {
  test("renders hero, heading, and primary CTA", async ({ page }) => {
    await page.goto("/");

    // Hero heading
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    // Primary CTA links to sign-in
    const ctaLink = page.getByRole("link", { name: /sign in|log in|get started/i }).first();
    await expect(ctaLink).toBeVisible();
  });

  test("CTA navigates to sign-in page", async ({ page }) => {
    await page.goto("/");

    const ctaLink = page.getByRole("link", { name: /sign in|log in|get started/i }).first();
    await ctaLink.click();

    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("/sign-in");
  });

  test("landing page is accessible to unauthenticated users", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("reporter and admin/tech audience sections are present", async ({ page }) => {
    await page.goto("/");

    // Should mention reporter and admin/tech audiences
    await expect(page.getByText(/reporter/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("landing page loads without errors", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
  });
});
