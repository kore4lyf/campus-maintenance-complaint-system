import { test, expect } from "@playwright/test";

test.describe("Feature 08: Technician queue smoke", () => {
  test("technician queue redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/technician/queue");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("/sign-in");
    expect(page.url()).toContain(encodeURIComponent("/technician/queue"));
  });

  test("technician assignments page redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/technician/assignments");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("/sign-in");
  });

  test("technician landing page redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/technician");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("/sign-in");
  });
});
