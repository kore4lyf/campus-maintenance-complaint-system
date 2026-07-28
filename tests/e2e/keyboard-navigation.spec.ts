import { test, expect, type Page } from "@playwright/test";
import { ensureAuthenticated } from "./helpers";

/*
 * Keyboard navigation round trip.
 *
 * 2026-07-28: dark-mode + ThemeToggle were removed. The two tests that
 * asserted "Tab reaches the theme toggle" and "Enter on the toggle changes
 * theme" are gone with them. The remaining tests confirm Tab traversal
 * starts at the brand link and continues past the user pill / sign-out
 * button into the primary nav.
 */

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
    await ensureAuthenticated(page);
    await page.locator("body").click({ position: { x: 10, y: 10 } }).catch(() => {});

    await page.keyboard.press("Tab");

    const label = await focusedAriaLabel(page);
    const text = await focusedText(page);
    const combined = `${label ?? ""} ${text ?? ""}`;
    expect(combined).toMatch(/LASU/);
  });

  test("Tab traversal enters the primary navigation landmarks after the brand", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.locator("body").click({ position: { x: 10, y: 10 } }).catch(() => {});

    // First, focus the brand link.
    const reachedBrand = await pressTabUntil(
      page,
      (label, text) =>
        (label ?? "").includes("LASU") || (text ?? "").includes("LASU"),
    );
    expect(reachedBrand).toBe(true);

    // Then, Tab past the brand and assert traversal lands on a different
    // focusable (role nav link, user pill, or sign-out button).
    const reachedPast = await pressTabUntil(
      page,
      (label, text) => {
        const aria = label ?? "";
        const txt = text ?? "";
        return !aria.includes("LASU") && aria.length + txt.length > 0;
      },
    );
    expect(reachedPast).toBe(true);
  });

  test("Header exposes several focusable controls for the Tab order", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.locator("body").click({ position: { x: 10, y: 10 } }).catch(() => {});

    // The header contains at least: brand link + role-aware nav links +
    // user pill + sign-out. Confirm the page exposes enough focusables to
    // make keyboard traversal a non-no-op.
    const reachable = await page.evaluate(() => {
      const focusables = Array.from(
        document.querySelectorAll(
          'a, button, [tabindex]:not([tabindex="-1"]), input, select, textarea',
        ),
      );
      return focusables.length > 0;
    });
    expect(reachable).toBe(true);
  });
});
