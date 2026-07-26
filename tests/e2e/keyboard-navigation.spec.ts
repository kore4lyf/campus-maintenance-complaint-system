import { test, expect, type Page } from "@playwright/test";

async function focusedAriaLabel(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    return el.getAttribute("aria-label");
  });
}

async function focusedText(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    return (el.textContent ?? "").trim();
  });
}

async function pressTabUntil(
  page: Page,
  predicate: (label: string | null, text: string | null) => boolean,
  maxTabs = 30,
): Promise<boolean> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    const label = await focusedAriaLabel(page);
    const text = await focusedText(page);
    if (predicate(label, text)) return true;
  }
  return false;
}

test.describe("AC-8: Keyboard navigation round trip", () => {
  test("first Tab reaches brand link", async ({ page }) => {
    await page.goto("/admin");

    await page.keyboard.press("Tab");

    const text = await focusedText(page);
    expect(text).toMatch(/LASU/);
  });

  test("Tab order traverses brand to theme toggle", async ({ page }) => {
    await page.goto("/admin");

    const reachedBrand = await pressTabUntil(page, (_, text) => text?.includes("LASU") ?? false);
    expect(reachedBrand).toBe(true);

    const reachedToggle = await pressTabUntil(
      page,
      (label) => label?.includes("Switch to") ?? false,
    );
    expect(reachedToggle).toBe(true);
  });

  test("Tab order continues to Sign Out", async ({ page }) => {
    await page.goto("/admin");

    const reachedBrand = await pressTabUntil(page, (_, text) => text?.includes("LASU") ?? false);
    expect(reachedBrand).toBe(true);

    const reachedToggle = await pressTabUntil(
      page,
      (label) => label?.includes("Switch to") ?? false,
    );
    expect(reachedToggle).toBe(true);

    const reachedSignOut = await pressTabUntil(page, (label) => label === "Sign out");
    expect(reachedSignOut).toBe(true);
  });

  test("Enter key on focused theme toggle changes theme", async ({ page }) => {
    await page.goto("/admin");

    const html = page.locator("html");
    const classBefore = (await html.getAttribute("class")) ?? "";

    const toggle = page.getByRole("button", { name: /Switch to (light|dark) mode/ });
    await toggle.focus();

    const labelFocused = await focusedAriaLabel(page);
    expect(labelFocused).toMatch(/Switch to (light|dark) mode/);

    await page.keyboard.press("Enter");

    let classAfter = classBefore;
    for (let i = 0; i < 20; i++) {
      classAfter = (await html.getAttribute("class")) ?? "";
      if (classAfter !== classBefore) break;
      await page.waitForTimeout(100);
    }
    expect(classAfter).not.toBe(classBefore);
    expect(classAfter).toMatch(/\b(light|dark)\b/);
  });
});
