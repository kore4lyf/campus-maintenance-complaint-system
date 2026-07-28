import { test, expect } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

test.describe("Feature 04: Authentication smoke", () => {
  test("sign-up page renders all required fields", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /password/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();
  });

  test("sign-in page renders all required fields", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /password/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("sign-up creates a reporter account and redirects", async ({ page }) => {
    await ensureAuthenticated(page);
    const url = page.url();
    expect(url).not.toContain("/sign-up");
    expect(url).not.toContain("/sign-in");
  });

  test("sign-in with invalid credentials shows error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill("nonexistent@test.lasu.edu.ng");
    await page
      .getByRole("textbox", { name: /password/i })
      .fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });

  test("protected admin route redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    await expect(page.url()).toContain("/sign-in");
    await expect(page.url()).toContain("redirect");
  });

  test("protected technician route redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/technician");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    await expect(page.url()).toContain("/sign-in");
    await expect(page.url()).toContain("redirect");
  });

  test("authenticated user can access reporter pages", async ({ page }) => {
    await ensureAuthenticated(page);
    await expect(page.url()).toContain("/complaints");
  });
});
