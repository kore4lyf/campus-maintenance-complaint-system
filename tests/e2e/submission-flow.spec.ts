import { test, expect, type Page } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

/*
 * Reporter submission — critical happy paths only:
 * - Category dropdown lists every seeded category
 * - Happy path: submit a complaint and see it in /complaints/mine
 */

const CATEGORY_LABELS = [
  "Electrical Faults",
  "Plumbing Issues",
  "Carpentry & Woodwork",
  "HVAC & Air Conditioning",
  "ICT & Networking",
  "Cleaning & Sanitation",
  "Security & Safety",
  "Other Maintenance",
];

async function gotoComplaintNew(page: Page): Promise<void> {
  await page.getByRole("link", { name: /submit/i }).first().click();
  await page.waitForURL(/\/complaints\/new/);
}

test.describe("Reporter submission flow", () => {
  test("category dropdown lists every seeded category", async ({ page }) => {
    await ensureAuthenticated(page);
    await gotoComplaintNew(page);

    const select = page.getByLabel(/category/i);
    const options = await select.locator("option").allInnerTexts();
    for (const cat of CATEGORY_LABELS) {
      expect(options.some((o) => o.includes(cat))).toBe(true);
    }
  });

  test("happy path: submit a complaint and see it in /complaints/mine", async ({
    page,
  }) => {
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
    await page.getByLabel(/describe the fault/i).fill("Two sockets in science lab B are not working.");
    await page.getByRole("button", { name: /submit complaint/i }).click();

    await page.waitForURL(/\/complaints\/(mine|[a-f0-9]{24})/, { timeout: 30_000 });

    await page.goto("/complaints/mine");
    await expect(page.getByText(/sockets in science lab/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
