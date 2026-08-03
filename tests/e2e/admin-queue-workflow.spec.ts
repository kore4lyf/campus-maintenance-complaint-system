import { test, expect } from "@playwright/test";
import {
  createTestUser,
  signInAsTestUser,
  signInAsAdmin,
  submitComplaintViaAPI,
  assignComplaintViaAPI,
} from "./helpers";

/*
 * Admin queue workflow — critical happy paths only:
 * - Queue page renders with complaint rows
 * - Assign dialog opens and assigns a technician
 * - Reports page renders with KPIs
 */

test.describe("Admin queue page", () => {
  test("admin can view queue and see complaint", async ({ page }) => {
    const reporter = await createTestUser({ role: "reporter" });
    await signInAsTestUser(page.context(), reporter);
    const complaintId = await submitComplaintViaAPI(
      page,
      "Admin queue E2E: flickering lights in Library.",
    );

    await page.context().clearCookies();
    await signInAsAdmin(page.context());

    await page.goto("/admin/queue");
    await expect(
      page.getByText(/queue/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Use search to find our specific complaint
    const searchBox = page.getByPlaceholder(/search/i);
    await searchBox.fill("flickering lights");
    await expect(
      page.getByText(/flickering lights in library/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("admin can assign complaint to a technician", async ({ page }) => {
    const tech = await createTestUser({ role: "dicht_technician" });

    const reporter = await createTestUser({ role: "reporter" });
    await signInAsTestUser(page.context(), reporter);
    await submitComplaintViaAPI(
      page,
      "Assign test: cracked window in Male Hostel B.",
    );

    await page.context().clearCookies();
    await signInAsAdmin(page.context());

    await page.goto("/admin/queue");

    // Search for our complaint
    const searchBox = page.getByPlaceholder(/search/i);
    await searchBox.fill("cracked window");
    await expect(
      page.getByText(/cracked window in male hostel b/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Click the assign button on the complaint row
    const assignButton = page.getByRole("button", { name: /assign/i }).first();
    await assignButton.click();

    await expect(page.getByText(/assign.*technician/i).first()).toBeVisible({
      timeout: 10_000,
    });

    const techSelect = page.getByLabel("Technician", { exact: true });
    await expect(techSelect).toBeEnabled({ timeout: 10_000 });
    await techSelect.selectOption({ label: `${tech.name} · ${tech.email}` });

    await page.getByRole("button", { name: /confirm|assign/i }).last().click();

    await expect(page.getByText(/assigned|success/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("unauthenticated admin queue access redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/admin/queue");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("/sign-in");
  });
});

test.describe("Admin reports page", () => {
  test("reports page renders with KPIs", async ({ page }) => {
    await signInAsAdmin(page.context());

    await page.goto("/admin/reports");
    await expect(
      page.getByRole("heading", { name: /report/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/backlog|breach|resolution/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
