import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { accessibilityFixture, openWorkbench, seriousViolations } from "./helpers.js";

async function expectNoSeriousViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(seriousViolations(results)).toEqual([]);
}

test("primary workspaces and dialogs have no serious accessibility violations", async ({ page }) => {
  await openWorkbench(page, accessibilityFixture());
  await expectNoSeriousViolations(page);

  await page.getByRole("button", { name: "Template library" }).click();
  await expectNoSeriousViolations(page);
  await page.keyboard.press("Escape");

  await page.locator(".app-rail-button[aria-label='Settings']").click();
  await expectNoSeriousViolations(page);
  await page.keyboard.press("Escape");

  await page.locator(".tree-group-row").filter({ hasText: "Example Holdings Limited" }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: /Tax deadlines:/ }).click();
  await expectNoSeriousViolations(page);
});

test("tablists support arrow, Home and End keys with one tab stop", async ({ page }) => {
  await openWorkbench(page, accessibilityFixture());
  const statusTabs = page.getByRole("tablist", { name: "Project status" });
  const active = statusTabs.getByRole("tab", { name: /Active/ });
  await active.focus();
  await page.keyboard.press("ArrowRight");
  await expect(statusTabs.getByRole("tab", { name: /Completed/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(statusTabs.getByRole("tab", { name: /Archived/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(active).toHaveAttribute("aria-selected", "true");
  await expect(statusTabs.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
});
