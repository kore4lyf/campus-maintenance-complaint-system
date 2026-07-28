import { test, expect, type Page } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

async function getHtmlClass(page: Page): Promise<string> {
  const value = await page.locator("html").getAttribute("class");
  return value ?? "";
}

async function clickThemeToggle(page: Page) {
  await page.evaluate(() => {
    const btn = document.querySelector(
      'button[aria-label*="Switch to"]',
    ) as HTMLButtonElement | null;
    if (btn) btn.click();
  });
}

test.describe("AC-7: Theme persistence round trip", () => {
  test("theme class is applied on initial paint", async ({ page }) => {
    await ensureAuthenticated(page);
    const classes = await getHtmlClass(page);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes).toMatch(/(light|dark|system)/);
  });

  test("theme toggle button switches theme and writes localStorage", async ({
    page,
  }) => {
    await ensureAuthenticated(page);

    const toggle = page.getByRole("button", {
      name: /Switch to (light|dark) mode/,
    });
    await expect(toggle).toBeVisible();

    const classBefore = await getHtmlClass(page);

    await clickThemeToggle(page);

    let classAfter = classBefore;
    for (let i = 0; i < 20; i++) {
      classAfter = await getHtmlClass(page);
      if (classAfter !== classBefore) break;
      await page.waitForTimeout(100);
    }
    expect(classAfter).not.toBe(classBefore);
    expect(classAfter).toMatch(/\b(light|dark)\b/);

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("theme"),
    );
    expect(stored).toMatch(/^(light|dark)$/);
  });

  test("theme survives a reload without flash", async ({ page }) => {
    await ensureAuthenticated(page);

    const toggle = page.getByRole("button", {
      name: /Switch to (light|dark) mode/,
    });
    await expect(toggle).toBeVisible();

    await clickThemeToggle(page);

    let classAfterToggle = "";
    for (let i = 0; i < 20; i++) {
      classAfterToggle = await getHtmlClass(page);
      if (classAfterToggle.match(/\b(light|dark)\b/)) break;
      await page.waitForTimeout(100);
    }
    expect(classAfterToggle).toMatch(/\b(light|dark)\b/);

    const storedBefore = await page.evaluate(() =>
      window.localStorage.getItem("theme"),
    );
    expect(storedBefore).toMatch(/^(light|dark)$/);

    await page.reload();

    const storedAfter = await page.evaluate(() =>
      window.localStorage.getItem("theme"),
    );
    expect(storedAfter).toBe(storedBefore);

    const classAfterReload = await getHtmlClass(page);
    expect(classAfterReload).toBe(classAfterToggle);
  });
});
