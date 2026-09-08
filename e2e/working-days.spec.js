import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, readStoredWorkspace } from "./helpers.js";
import { scheduleWorkspace } from "../tests/fixtures/schedule-workspace.js";
import { annualSourceFixture } from "../tests/fixtures/annual-source.js";
import { canonicalStorePayload, emptyStore, makeEntity } from "../src/dashboard/model.js";
const modal = page => page.getByRole("dialog");
const errors = new WeakMap();
test.beforeEach(({ page }) => { const list = []; errors.set(page, list); page.on("pageerror", error => list.push(error.message)); });
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
async function openSchedule(page) {
  await openWorkbench(page, scheduleWorkspace());
  await page.locator('.app-rail-button[aria-label="Project schedule"]').click();
  await page.locator(".schedule-row-edit").first().click();
}
async function estimate(page, start = "2026-09-30", days = "3") {
  await modal(page).getByRole("button", { name: "Working days", exact: true }).click();
  await modal(page).getByRole("spinbutton", { name: "Estimated working days" }).fill(days);
  await modal(page).getByLabel("Project start", { exact: true }).fill(start);
}
const save = page => modal(page).getByRole("button", { name: "Save engagement schedule", exact: true }).click();
test("estimated duration saves only operational dates and intent; reload retains mode", async ({ page }) => {
  await openSchedule(page); const before = await readStoredWorkspace(page);
  await estimate(page); await expect(modal(page).getByLabel("Calculated end date")).toHaveValue("2026-10-05");
  await expect(modal(page).getByLabel("Calculated end date")).toHaveAttribute("readonly", "");
  await save(page); await expect(modal(page)).toHaveCount(0);
  const after = await readStoredWorkspace(page), job = after.engagements.find(e => e.schedulePlan);
  expect(job).toMatchObject({ startDate: "2026-09-30", dueDate: "2026-10-05", schedulePlan: { workdays: 3, calendar: "HK" } });
  const strip = ({ startDate, dueDate, schedulePlan, updatedAt, ...rest }) => rest;
  expect(after.engagements.map(strip)).toEqual(before.engagements.map(strip)); expect(after.entities).toEqual(before.entities);
  await page.reload(); await page.locator('.app-rail-button[aria-label="Project schedule"]').click(); await page.locator(".schedule-row-edit").first().click();
  await expect(modal(page).getByRole("button", { name: "Working days", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(modal(page).getByRole("spinbutton")).toHaveValue("3");
  await expect(modal(page).getByLabel("Calculated end date")).toHaveValue("2026-10-05");
  await modal(page).getByRole("spinbutton").fill("4");
  await expect(modal(page).getByLabel("Calculated end date")).toHaveValue("2026-10-06");
  await modal(page).getByRole("button", { name: "Manual dates" }).click();
  await expect(modal(page).getByLabel("Deadline")).toHaveValue("2026-10-06");
  await modal(page).getByLabel("Deadline").fill("2026-10-10"); await save(page);
  const manual = (await readStoredWorkspace(page)).engagements.find(e => e.id === job.id);
  expect(manual.dueDate).toBe("2026-10-10"); expect(manual.schedulePlan).toBeUndefined();
});
test("holiday start rolls forward visibly and retains the requested start", async ({ page }) => {
  await openSchedule(page); await estimate(page, "2026-04-03", "1");
  await expect(modal(page).locator(".working-day-preview")).toContainText("The selected start is a non-working day");
  await expect(modal(page).getByLabel("Calculated end date")).toHaveValue("2026-04-08");
  await save(page);
  const job = (await readStoredWorkspace(page)).engagements.find(e => e.schedulePlan);
  expect(job).toMatchObject({ startDate: "2026-04-08", dueDate: "2026-04-08", schedulePlan: { requestedStartDate: "2026-04-03", workdays: 1 } });
});
test("invalid estimates and missing calendar coverage cannot save; cancel preserves the workspace", async ({ page }) => {
  await openSchedule(page); const before = await readStoredWorkspace(page);
  await estimate(page, "2026-09-30", "0"); await save(page); await expect(modal(page)).toHaveCount(1);
  await modal(page).getByRole("spinbutton").fill("1.5"); await save(page); await expect(modal(page)).toHaveCount(1);
  await modal(page).getByRole("spinbutton").fill("2");
  await modal(page).getByLabel("Project start").fill("2027-12-31");
  await expect(modal(page).getByLabel("Calculated end date")).toHaveValue("");
  await save(page); await expect(modal(page)).toHaveCount(1);
  expect(await readStoredWorkspace(page)).toEqual(before);
  page.once("dialog", dialog => dialog.accept());
  await modal(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(modal(page)).toHaveCount(0); expect(await readStoredWorkspace(page)).toEqual(before);
});
test("new annual engagement accepts a working-day plan without altering reporting periods", async ({ page }) => {
  const store = canonicalStorePayload(emptyStore());
  store.entities.push(makeEntity({ id: "workdays-company", legalName: "Working Days Example Limited", incorporationDate: "2025-01-01", fiscalYearPreset: "calendar" }));
  await openWorkbench(page, store); await page.getByRole("button", { name: "New annual engagement", exact: true }).click();
  await modal(page).getByRole("button", { name: "Blank engagement", exact: true }).click();
  await estimate(page, "2026-04-02", "2");
  await modal(page).getByRole("button", { name: "Create annual engagement", exact: true }).click();
  await expect(modal(page)).toHaveCount(0);
  const job = (await readStoredWorkspace(page)).engagements[0];
  expect(job).toMatchObject({ startDate: "2026-04-02", dueDate: "2026-04-08", schedulePlan: { workdays: 2 } });
  expect(job.periodStart).toBe("2025-01-01"); expect(job.periodEnd).toBe("2025-12-31");
});
test("working-day edits preserve an unchanged historical custom period marker", async ({ page }) => {
  const fixture = annualSourceFixture();
  const historical = fixture.store.engagements.find((item) => item.id === fixture.currentId);
  historical.periodPreset = "custom";
  historical.reportingPeriods = historical.reportingPeriods.map((period) => ({ ...period, periodPreset: "custom" }));
  await openWorkbench(page, fixture.store); const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Edit annual engagement", exact: true }).click();
  await estimate(page, "2026-09-30", "3");
  await modal(page).getByRole("button", { name: "Save engagement", exact: true }).click();
  await expect(modal(page)).toHaveCount(0);
  const after = await readStoredWorkspace(page), saved = after.engagements.find((item) => item.id === fixture.currentId);
  const original = before.engagements.find((item) => item.id === fixture.currentId);
  expect(saved.periodPreset).toBe("custom");
  expect(saved.reportingPeriods).toEqual(original.reportingPeriods);
  expect(saved.periodStart).toBe(original.periodStart); expect(saved.periodEnd).toBe(original.periodEnd);
  expect(saved).toMatchObject({ startDate: "2026-09-30", dueDate: "2026-10-05", schedulePlan: { workdays: 3 } });
});
for (const [language, width, label] of [["en", 1440, "Working days"], ["zh-Hans", 800, "按工作天数"], ["zh-Hant", 800, "按工作天數"]])
  test(`schedule controls align and remain accessible in ${language}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await openSchedule(page); await estimate(page);
    await modal(page).getByRole("button", { name: "Save engagement schedule" }).click();
    await page.locator(".language-summary").click();
    await page.locator(".language-menu > button").nth({ "zh-Hans": 0, "zh-Hant": 1, en: 2 }[language]).click();
    await page.locator(".schedule-row-edit").first().click();
    await expect(modal(page).getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
    const rects = await modal(page).locator(".working-day-inputs input").evaluateAll(nodes => nodes.map(n => {
      const r = n.getBoundingClientRect(); return { height: r.height, top: r.top, right: r.right };
    }));
    expect(rects).toHaveLength(3); expect(rects.every(r => Math.abs(r.height - 42) < 1)).toBe(true);
    expect(Math.max(...rects.map(r => r.top)) - Math.min(...rects.map(r => r.top))).toBeLessThan(1);
    expect(rects.every(r => r.right <= width)).toBe(true);
    const overflow = await modal(page).evaluate(el => el.scrollWidth > el.clientWidth + 1); expect(overflow).toBe(false);
    const accessibility = await new AxeBuilder({ page }).include(".workbench-modal").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(accessibility.violations.filter(v => ["serious", "critical"].includes(v.impact))).toEqual([]);
    await modal(page).screenshot({ path: testInfo.outputPath(`working-days-${language}.png`) });
  });
