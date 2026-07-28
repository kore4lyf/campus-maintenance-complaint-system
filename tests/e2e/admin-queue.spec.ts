import { test, expect } from "@playwright/test";

test.describe("Feature 07: Admin queue smoke", () => {
  test("admin queue redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin/queue");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("/sign-in");
    expect(page.url()).toContain(encodeURIComponent("/admin/queue"));
  });

  test("admin reports page redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin/reports");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("/sign-in");
  });

  test("admin landing page redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("/sign-in");
  });
});
