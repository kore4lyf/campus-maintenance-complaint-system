import { test, expect } from "@playwright/test";
import {
  createTestUser,
  signInAsTestUser,
  signInAsAdmin,
  submitComplaintViaAPI,
  assignComplaintViaAPI,
  transitionComplaintViaAPI,
} from "./helpers";

/*
 * Technician workflow — critical happy paths only:
 * - Full lifecycle: submit → assign → transition → resolve with photo → auto-close
 * - Technician queue view shows assigned complaints
 * - Unauthenticated access redirects to sign-in
 */

const TEST_DESCRIPTION =
  "Technician workflow E2E: broken window in Engineering Block.";

test.describe("Technician full workflow", () => {
  test("complete workflow through all status transitions", async ({ page }) => {
    // Submit as reporter
    const reporter = await createTestUser({ role: "reporter" });
    await signInAsTestUser(page.context(), reporter);
    const complaintId = await submitComplaintViaAPI(page, TEST_DESCRIPTION);
    expect(complaintId).toMatch(/^[a-f0-9]{24}$/);

    // Assign as admin
    await page.context().clearCookies();
    await signInAsAdmin(page.context());
    await page.goto("/admin/queue", { timeout: 60_000 });
    const technician = await createTestUser({ role: "dicht_technician" });
    await assignComplaintViaAPI(page, complaintId, technician.email);

    // Switch to technician, do intermediate transitions via API
    await page.context().clearCookies();
    await signInAsTestUser(page.context(), technician);
    await transitionComplaintViaAPI(page, complaintId, "Acknowledged", "Noted");
    await transitionComplaintViaAPI(page, complaintId, "In Progress", "Working on it");

    // Resolve via UI with photo upload
    await page.goto(`/technician/assignments/${complaintId}`, { timeout: 60_000 });
    await expect(
      page.getByText(/broken window in engineering block/i),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("radio", { name: /mark resolved/i }),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("radio", { name: /mark resolved/i }).click();

    await expect(page.getByText(/choose proof photo/i)).toBeVisible({ timeout: 15_000 });

    const testPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64",
    );
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByText(/choose proof photo/i).click(),
    ]);
    await fileChooser.setFiles({
      name: "proof-of-fix.png",
      mimeType: "image/png",
      buffer: testPng,
    });

    await page.getByRole("button", { name: /confirm.*mark resolved/i }).click();
    await expect(page.getByText(/updated/i)).toBeVisible({ timeout: 15_000 });

    // Verify auto-close
    await expect(page.getByText(/closed/i).first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Technician queue view", () => {
  test("technician sees assigned complaints in queue", async ({ page }) => {
    const reporter = await createTestUser({ role: "reporter" });
    await signInAsTestUser(page.context(), reporter);
    const id = await submitComplaintViaAPI(page, "Queue view test: leaking faucet in Library.");

    await page.context().clearCookies();
    await signInAsAdmin(page.context());
    await page.goto("/admin/queue", { timeout: 60_000 });
    const tech = await createTestUser({ role: "dicht_technician" });
    await assignComplaintViaAPI(page, id, tech.email);

    await page.context().clearCookies();
    await signInAsTestUser(page.context(), tech);

    await page.goto("/technician/assignments");
    await expect(page.getByText(/leaking faucet in library/i)).toBeVisible({ timeout: 15_000 });
  });

  test("unauthenticated access redirects to sign-in", async ({ page }) => {
    await page.goto("/technician/assignments");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("/sign-in");
  });
});
