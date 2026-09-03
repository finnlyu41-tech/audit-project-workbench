import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTemplatePackage } from "../src/dashboard/template-packages.js";
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

  await page.getByRole("button", { name: "Management reports" }).click();
  await expectNoSeriousViolations(page);

  await page.locator(".tree-group-row").filter({ hasText: "Example Holdings Limited" }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: /Tax deadlines:/ }).click();
  await expectNoSeriousViolations(page);
});

test("template import preview has no serious accessibility violations", async ({ page }) => {
  const store = accessibilityFixture();
  const pkg = createTemplatePackage(store, { sampleIds: [store.samples.find((template) => template.categoryId === "audit").id] });
  await openWorkbench(page, store);
  await page.getByRole("button", { name: "Template library" }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import package" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "accessibility.apw-template.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(pkg)) });
  await expect(page.getByRole("dialog", { name: "Import package" })).toBeVisible();
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
