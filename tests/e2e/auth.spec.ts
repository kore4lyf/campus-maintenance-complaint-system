import { test, expect } from "@playwright/test";
import { ensureAuthenticated, createTestUser } from "./helpers";

/*
 * NOTE: Run this file individually (`npx playwright test tests/e2e/auth.spec.ts`)
 * or with --workers=1. The sign-up/sign-in happy-path tests create rapid user
 * sessions that can contend with each other when run alongside other test files,
 * causing flaky timeout failures on waitForURL.
 */

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

test.describe("Feature 04: Sign-up form submission", () => {
  test("happy path: fill sign-up form, submit, and redirect to complaints", async ({
    page,
  }) => {
    const email = `e2e-signup-${Date.now()}@test.lasu.edu.ng`;
    const password = "TestPassword123!";
    const name = "E2E Sign Up User";

    await page.goto("/sign-up");

    // Fill form
    await page.getByLabel(/display name/i).fill(name);
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill(password);

    // Submit and wait for pending state (confirms submission started)
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByRole("button", { name: /creating account/i })).toBeVisible({ timeout: 5000 });

    // Should redirect away from sign-up (form uses 350ms setTimeout before push)
    await page.waitForURL((url) => !url.pathname.includes("/sign-up"), {
      timeout: 30_000,
    });

    // Should be on a protected page (complaints)
    await expect(page.url()).toContain("/complaints");
  });

  test("validation rejects short password", async ({ page }) => {
    await page.goto("/sign-up");

    await page.getByLabel(/display name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("validation rejects invalid email", async ({ page }) => {
    await page.goto("/sign-up");

    await page.getByLabel(/display name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByRole("textbox", { name: /password/i }).fill("Password123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("validation rejects empty name", async ({ page }) => {
    await page.goto("/sign-up");

    // Fill email and password but leave name empty
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("Password123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/display name is required/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("duplicate email shows error", async ({ page }) => {
    // Create a user first
    const email = `e2e-dup-${Date.now()}@test.lasu.edu.ng`;
    await createTestUser({ email });

    // Try to sign up with same email
    await page.goto("/sign-up");
    await page.getByLabel(/display name/i).fill("Duplicate User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("Password123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Feature 04: Sign-in form submission", () => {
  test("happy path: fill sign-in form, submit, and redirect to complaints", async ({
    page,
  }) => {
    // Create a test user first
    const email = `e2e-signin-${Date.now()}@test.lasu.edu.ng`;
    const password = "TestPassword123!";
    await createTestUser({ email, password });

    await page.goto("/sign-in");

    // Fill form
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill(password);

    // Submit and wait for pending state (confirms submission started)
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("button", { name: /signing in/i })).toBeVisible({ timeout: 5000 });

    // Should redirect away from sign-in (form uses 250ms setTimeout before push)
    await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
      timeout: 30_000,
    });

    // Should be on a protected page (complaints)
    await expect(page.url()).toContain("/complaints");
  });

  test("wrong password shows error", async ({ page }) => {
    const email = `e2e-wrongpw-${Date.now()}@test.lasu.edu.ng`;
    await createTestUser({ email, password: "CorrectPassword123!" });

    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("WrongPassword999!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });

  test("nonexistent email shows error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill("nonexistent-user@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });

  test("validation rejects invalid email format", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill("not-valid-email");
    await page.getByRole("textbox", { name: /password/i }).fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("validation rejects short password", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("short");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
