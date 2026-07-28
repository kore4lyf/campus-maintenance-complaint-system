import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/user.json";

setup("authenticate as reporter", async ({ page }) => {
  const email = `e2e-setup-${Date.now()}@test.lasu.edu.ng`;

  await page.goto("/sign-up");
  await page.getByRole("button", { name: /create account/i }).waitFor();

  const nameInput = page.locator("#sign-up-name");
  await nameInput.click();
  await nameInput.pressSequentially("E2E Setup User", { delay: 10 });

  const emailInput = page.locator("#sign-up-email");
  await emailInput.click();
  await emailInput.pressSequentially(email, { delay: 10 });

  const passwordInput = page.locator("#sign-up-password");
  await passwordInput.click();
  await passwordInput.pressSequentially("TestPassword123!", { delay: 10 });

  await page.getByRole("button", { name: /create account/i }).click();

  await page.waitForURL(
    (url) =>
      url.pathname.includes("/complaints") ||
      url.pathname.includes("/admin") ||
      url.pathname.includes("/technician") ||
      url.pathname === "/" ||
      url.pathname === "/sign-up",
    { timeout: 30000 },
  );

  await page.context().storageState({ path: authFile });
});
