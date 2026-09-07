import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { holdingWorkspace } from "../tests/fixtures/holding-workspace.js";
import { openWorkbench, readStoredWorkspace, seriousViolations } from "./helpers.js";

const panel = (page) => page.locator(".holding-components-panel");
async function openHolding(page, store = holdingWorkspace()) {
  await openWorkbench(page, store);
  await page.getByRole("button", { name: "Quick open", exact: true }).click();
  const query = page.getByRole("dialog").getByRole("combobox", { name: "Find company or engagement" });
  if (store.engagements.find((entry) => entry.id === "holding-annual").archived) {
    await page.getByRole("dialog").getByRole("checkbox", { name: "Include archived records" }).check();
  }
  await query.fill("Example Consolidation 2026"); await query.press("Enter");
  await expect(panel(page)).toBeVisible();
  const filters = panel(page).getByRole("button", { name: "Search and filter components", exact: true });
  if (await filters.count()) await filters.click();
  const history = panel(page).getByRole("button", { name: /Show historical components/ });
  if (await history.count()) await history.click();
}

test("holding component fields are readable and contained in a narrow workspace", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 900 }); await openHolding(page);
  await panel(page).scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath("holding-layout-1024.png") });
  const fields = await panel(page).locator(".holding-component-rows select").evaluateAll((elements) =>
    elements.map((element) => ({ height: element.getBoundingClientRect().height, font: parseFloat(getComputedStyle(element).fontSize) })));
  for (const field of fields) { expect(field.height).toBe(42); expect(field.font).toBeGreaterThanOrEqual(14); }
  expect(await panel(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});
test("a mismatched assigned period is explicitly identified", async ({ page }) => {
  await openHolding(page);
  const row = panel(page).locator(".holding-component-rows > article").first();
  await expect(row.locator(".component-period-message")).toContainText("Selected reporting periods do not match");
});
test("opening an archived component selects its read-only source instead of an active fallback", async ({ page }) => {
  await openHolding(page); const before = await readStoredWorkspace(page);
  await panel(page).locator(".holding-component-rows > article").filter({ hasText: "Cedar Example Limited" })
    .getByRole("button").click();
  await expect(page.locator(".archive-banner")).toBeVisible();
  await expect(page.locator(".detail-title > p")).toContainText("Cedar Example Limited");
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("component search and assignment filters never change the saved annual scope", async ({ page }) => {
  await openHolding(page); const before = await readStoredWorkspace(page);
  const search = panel(page).getByRole("searchbox", { name: "Find components" });
  await search.fill("alpha alex"); await expect(panel(page).locator(".holding-component-rows > article")).toHaveCount(1);
  await panel(page).getByRole("button", { name: /Period mismatch/ }).click();
  await expect(panel(page).locator("[data-component-id=part-alpha]")).toBeVisible();
  await search.fill(""); await panel(page).getByRole("button", { name: /Unassigned projects/ }).click();
  await expect(panel(page).locator(".holding-component-rows > article")).toHaveCount(2);
  await expect(panel(page).getByText("Former Example Limited", { exact: true })).toBeVisible();
  await search.fill("not-an-example"); await expect(panel(page).locator(".component-filter-empty")).toBeVisible();
  await panel(page).locator(".component-filter-empty").getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toBeFocused(); await expect(panel(page).locator(".holding-component-rows > article")).toHaveCount(4);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("changing an assignment updates only that snapshot and keeps the edited row visible", async ({ page }) => {
  await openHolding(page); const before = await readStoredWorkspace(page);
  await panel(page).getByRole("button", { name: /Period mismatch/ }).click();
  const select = panel(page).locator("[data-component-id=part-alpha] select"); await select.focus();
  await select.selectOption("alpha-current"); await expect(select).toBeFocused(); await expect(select).toHaveValue("alpha-current");
  await expect(panel(page).locator(".holding-component-rows > article")).toHaveCount(4);
  const after = await readStoredWorkspace(page);
  const oldParent = before.engagements.find((entry) => entry.id === "holding-annual");
  const parent = after.engagements.find((entry) => entry.id === "holding-annual");
  expect(parent.consolidation.components[0].engagementId).toBe("alpha-current");
  expect(parent.consolidation.components[0].periodSnapshot.periodEnd).toBe("2026-12-31");
  expect(parent.consolidation.components[0].readinessConditions).toEqual(oldParent.consolidation.components[0].readinessConditions);
  expect(parent.consolidation.components.slice(1)).toEqual(oldParent.consolidation.components.slice(1));
  expect(parent.reportingPeriods).toEqual(oldParent.reportingPeriods); expect(after.entities).toEqual(before.entities);
  expect(after.engagements.filter((entry) => entry.id !== parent.id)).toEqual(before.engagements.filter((entry) => entry.id !== parent.id));
  await expect(panel(page).locator("[data-component-id=part-alpha]")).toHaveAttribute("data-match", "matched");
});
test("readiness checks remain explicit and do not complete audit workflow conditions", async ({ page }) => {
  await openHolding(page); const before = await readStoredWorkspace(page);
  const row = panel(page).locator("[data-component-id=part-alpha]"); await row.getByRole("checkbox").check();
  await expect(row.locator(".component-readiness strong")).toHaveText("1/1");
  await expect(row).toHaveAttribute("data-match", "mismatch");
  const after = await readStoredWorkspace(page); const parent = after.engagements.find((entry) => entry.id === "holding-annual");
  expect(parent.consolidation.components[0].readinessConditions[0].done).toBe(true);
  expect(after.engagements.filter((entry) => entry.id !== parent.id)).toEqual(before.engagements.filter((entry) => entry.id !== parent.id));
  expect(parent.consolidation.nodes).toEqual(before.engagements.find((entry) => entry.id === parent.id).consolidation.nodes);
  expect(after.entities).toEqual(before.entities);
});
test("component navigation clears stale owner filters instead of hiding its source", async ({ page }) => {
  await openHolding(page); const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Open navigation filters" }).click();
  await page.getByRole("combobox", { name: "Owner filter" }).selectOption("Morgan Keeper");
  await panel(page).locator("[data-component-id=part-alpha]").getByRole("button").click();
  await expect(page.locator(".detail-title > p")).toContainText("Alpha Example International");
  await expect(page.getByRole("combobox", { name: "Owner filter" })).toHaveValue("");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("missing-company rows retain their fictional historical identity", async ({ page }) => {
  await openHolding(page);
  const before = await readStoredWorkspace(page);
  const missing = panel(page).locator("[data-component-id=part-missing]");
  await expect(missing.getByRole("combobox")).toBeDisabled();
  await expect(missing).toContainText("Former Example Limited");
  await expect(missing.getByRole("button")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("an archived holding scope can be searched without exposing edit controls", async ({ page }) => {
  const store = holdingWorkspace();
  store.engagements.find((entry) => entry.id === "holding-annual").archived = true;
  await openHolding(page, store); const before = await readStoredWorkspace(page);
  await panel(page).getByRole("searchbox", { name: "Find components" }).fill("alpha");
  await expect(panel(page).getByRole("combobox")).toBeDisabled();
  await expect(panel(page).getByRole("checkbox")).toBeDisabled();
  await expect(panel(page).locator(":scope > header").getByRole("button")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const width of [800, 1440, 1920]) {
  test(`holding component layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openHolding(page);
    await panel(page).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`holding-${width}.png`) });
    const bounds = await panel(page).evaluate((element) => ({
      width: element.clientWidth, scroll: element.scrollWidth,
      textOverflow: [...element.querySelectorAll("*")].filter((child) => child.clientWidth > 0 && child.scrollWidth > child.clientWidth + 1)
        .map((child) => ({ tag: child.tagName, className: child.className, width: child.clientWidth, scroll: child.scrollWidth, overflow: getComputedStyle(child).overflowX })),
      overflow: [...element.querySelectorAll("*")].filter((child) => child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1)
        .map((child) => ({ tag: child.tagName, className: child.className, width: child.getBoundingClientRect().width })),
    }));
    expect(bounds.scroll, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.width + 1);
    for (const row of await panel(page).locator(".holding-component-rows > article").all()) {
      const select = await row.getByRole("combobox").boundingBox();
      expect(select.height).toBe(42);
      const name = row.locator(".component-identity strong");
      expect(await name.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const progress = row.locator(".component-progress");
      const ring = await progress.getByRole("progressbar").boundingBox();
      const label = await progress.locator(":scope > span").boundingBox();
      expect(ring.width).toBeGreaterThanOrEqual(24);
      expect(Math.abs(ring.y + ring.height / 2 - label.y - label.height / 2)).toBeLessThanOrEqual(2);
      const box = await row.boundingBox();
      expect(select.x + select.width).toBeLessThanOrEqual(box.x + box.width + 1);
    }
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(seriousViolations(audit)).toEqual([]);
  });
}
test("filtering components does not change portfolio counters or accept a structure sync", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await openHolding(page); const before = await readStoredWorkspace(page);
  const summary = await page.locator(".group-status-strip").innerText();
  await panel(page).getByRole("searchbox", { name: "Find components" }).fill("beta");
  expect(await page.locator(".group-status-strip").innerText()).toBe(summary);
  page.once("dialog", (dialog) => dialog.dismiss());
  await panel(page).locator(":scope > header").getByRole("button").click();
  expect(await readStoredWorkspace(page)).toEqual(before);
  for (const label of await page.locator(".group-status-strip > article > span").all()) {
    expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
});
test("an empty saved scope is not automatically populated by opening the panel", async ({ page }) => {
  const store = holdingWorkspace();
  store.engagements.find((entry) => entry.id === "holding-annual").consolidation.components = [];
  await openHolding(page, store); const before = await readStoredWorkspace(page);
  await expect(panel(page).locator(".entity-empty-projects")).toBeVisible();
  await expect(panel(page).getByRole("searchbox")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
