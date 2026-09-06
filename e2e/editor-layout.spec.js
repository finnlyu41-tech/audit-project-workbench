import { openOutstandingFilters, openOutstandingMore, expandOutstandingItem } from './outstanding-helpers.js';
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

for (const width of [480, 800, 1440]) {
  test(`status editor controls stay contained at ${width}px`, async ({ page }, testInfo) => {
    await openWorkbench(page, workspaceFixture());
    await openOutstandingMore(page); await page.getByRole("button", { name: "Statuses and colours", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".status-editor")).toBeVisible();
    await page.setViewportSize({ width, height: 760 });
    await page.screenshot({ path: testInfo.outputPath(`status-${width}.png`) });
    const errors = await dialog.locator(".status-editor-row").evaluateAll((rows) => rows.flatMap((row) => {
      const box = row.getBoundingClientRect();
      const controls = [...row.querySelectorAll("input, button")].map((element) => element.getBoundingClientRect());
      return controls.filter((rect) => rect.width && (rect.left < box.left - 1 || rect.right > box.right + 1))
        .map((rect) => ({ rowWidth: box.width, left: rect.left - box.left, right: rect.right - box.right }));
    }));
    expect(errors).toEqual([]);
    for (const row of await dialog.locator(".status-editor-row").all()) {
      const color = await row.locator("input[type=color]").boundingBox();
      const name = await row.locator(".status-name-field input").boundingBox();
      expect(color.height).toBe(42); expect(name.height).toBe(42);
      expect(color.x + color.width + 8).toBeLessThanOrEqual(name.x);
      expect(Math.abs(color.y - name.y)).toBeLessThanOrEqual(1);
    }
    const body = await dialog.locator(".workbench-modal-body").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(body.scroll).toBeLessThanOrEqual(body.width + 1);
  });
}
for (const width of [480, 800, 1440]) {
  test(`template and category editors fit without overlapping controls at ${width}px`, async ({ page }, testInfo) => {
    await openWorkbench(page, workspaceFixture());
    await page.getByRole("button", { name: "Template library" }).click();
    await page.locator(".sample-library-actions > button").first().click();
    let dialog = page.getByRole("dialog");
    await expect(dialog.locator(".category-editor")).toBeVisible();
    await page.setViewportSize({ width, height: 760 });
    const metrics = await dialog.locator(".workbench-modal-body").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    await page.screenshot({ path: testInfo.outputPath(`category-${width}.png`) });
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
    for (const row of await dialog.locator(".category-editor-row").all()) {
      const field = await row.locator("input").boundingBox();
      const actions = await row.locator(":scope > div").boundingBox();
      expect(field.x + field.width).toBeLessThanOrEqual(actions.x + 1);
    }
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").locator(".sample-library-card").first().getByRole("button", { name: "Edit template" }).click();
    dialog = page.getByRole("dialog");
    await expect(dialog.locator(".sample-editor")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`template-${width}.png`) });
    const templateMetrics = await dialog.locator(".workbench-modal-body").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(templateMetrics.scroll).toBeLessThanOrEqual(templateMetrics.width + 1);
  });
}
test("status and template configuration dialogs remain accessible", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await openOutstandingMore(page); await page.getByRole("button", { name: "Statuses and colours", exact: true }).click();
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Template library" }).click();
  await page.getByRole("dialog").locator(".sample-library-card").first().getByRole("button", { name: "Edit template" }).click();
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
});
test("status name, color and order edits do not change engagement data", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  await openOutstandingMore(page); await page.getByRole("button", { name: "Statuses and colours", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const first = dialog.locator(".status-editor-row").first();
  await first.locator(".status-name-field input").fill("Awaiting documents");
  await first.locator('input[type="color"]').fill("#386641");
  await first.getByRole("button", { name: "Move status down" }).click();
  await dialog.getByRole("button", { name: "Save statuses" }).click();
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
  await openOutstandingMore(page); await page.getByRole("button", { name: "Statuses and colours", exact: true }).click();
  const updated = page.getByRole("dialog").locator(".status-editor-row").nth(1);
  await expect(updated.locator(".status-name-field input")).toHaveValue("Awaiting documents");
  await expect(updated.locator('input[type="color"]')).toHaveValue("#386641");
});
