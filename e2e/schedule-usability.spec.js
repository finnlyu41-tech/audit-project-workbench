import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { scheduleWorkspace } from "../tests/fixtures/schedule-workspace.js";
import { openWorkbench, readStoredWorkspace, seriousViolations } from "./helpers.js";

async function openSchedule(page, store = scheduleWorkspace()) {
  await page.clock.setFixedTime(new Date("2026-09-05T12:00:00+08:00"));
  await openWorkbench(page, store);
  await page.locator('.app-rail-button[aria-label="Project schedule"]').click();
  await expect(page.locator(".schedule-scroll")).toBeVisible();
}

test("schedule precision controls offer consistent readable targets", async ({ page }) => {
  await openSchedule(page);
  for (const button of await page.locator(".schedule-precision button").all()) {
    expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(36);
  }
});
test("same-company date actions identify their reporting years", async ({ page }) => {
  await openSchedule(page);
  const bars = page.locator(".schedule-bar"); await expect(bars).toHaveCount(2);
  expect(await bars.nth(0).getAttribute("aria-label")).toContain("2025");
  expect(await bars.nth(1).getAttribute("aria-label")).toContain("2026");
  expect(await bars.nth(0).getAttribute("aria-label")).not.toBe(await bars.nth(1).getAttribute("aria-label"));
  const markers = page.locator(".schedule-tax-marker"); await expect(markers).toHaveCount(2);
  expect(await markers.nth(0).getAttribute("aria-label")).not.toBe(await markers.nth(1).getAttribute("aria-label"));
});
test("a normal wheel scrolls through projects rather than moving the dates sideways", async ({ page }) => {
  await openSchedule(page, scheduleWorkspace(12));
  const scroll = page.locator(".schedule-scroll");
  await scroll.evaluate((element) => { element.scrollLeft = 150; element.scrollTop = 0; });
  const initial = await scroll.evaluate((element) => element.scrollLeft);
  const box = await scroll.boundingBox();
  await page.mouse.move(box.x + Math.min(box.width - 20, 350), box.y + 120);
  await page.mouse.wheel(0, 280);
  await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await scroll.evaluate((element) => element.scrollLeft)).toBeCloseTo(initial, 0);
});
test("schedule search and missing-date filters never change dates, tax links or saved order", async ({ page }) => {
  await openSchedule(page); const before = await readStoredWorkspace(page);
  const search = page.getByRole("searchbox", { name: "Find scheduled projects" });
  const scope = page.getByRole("combobox", { name: "Schedule dates" });
  const width = await page.locator(".schedule-calendar-header").evaluate((element) => element.style.width);
  await search.fill("ＳＣＨＥＤＵＬＥ ２０２６ alex bookkeeping");
  await expect(page.locator(".schedule-row-meta")).toHaveCount(1);
  await expect(page.locator(".schedule-row-meta")).toHaveAttribute("data-schedule-key", "project:schedule-current");
  expect(await page.locator(".schedule-calendar-header").evaluate((element) => element.style.width)).toBe(width);
  await search.fill(""); await scope.selectOption("incomplete");
  await expect(page.locator(".schedule-row-meta")).toHaveCount(2);
  await expect(page.locator('[data-schedule-key="project:schedule-partial"] .schedule-date-summary')).toContainText("31 Dec 2026");
  await search.fill("PRIVATE-SCHEDULE-NOTE"); await expect(page.locator(".schedule-row-meta")).toHaveCount(0);
  await page.locator(".schedule-empty").getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toBeFocused(); await expect(scope).toHaveValue("all");
  await expect(page.locator(".schedule-row-meta")).toHaveCount(4);
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("editing a filtered schedule uses the existing guarded form and changes only its dates", async ({ page }) => {
  await openSchedule(page); const before = await readStoredWorkspace(page);
  const search = page.getByRole("searchbox", { name: "Find scheduled projects" }); await search.fill("blair");
  await page.locator(".schedule-row-edit").click();
  const dialog = page.getByRole("dialog", { name: /^Project schedule/ });
  await dialog.locator('input[type="date"]').first().fill("2026-10-01");
  page.once("dialog", (prompt) => prompt.dismiss());
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.locator('input[type="date"]').first()).toHaveValue("2026-10-01");
  await dialog.getByRole("button", { name: "Save engagement schedule" }).click();
  await expect(search).toHaveValue("blair");
  const after = await readStoredWorkspace(page);
  const saved = after.engagements.find((item) => item.id === "schedule-partial");
  expect(saved.startDate).toBe("2026-10-01"); expect(saved.dueDate).toBe("2026-12-31");
  const original = before.engagements.find((item) => item.id === saved.id);
  expect(saved.reportingPeriods).toEqual(original.reportingPeriods); expect(saved.workstreams).toEqual(original.workstreams);
  expect(after.entities).toEqual(before.entities); expect(after.scheduleOrder).toEqual(before.scheduleOrder);
  expect(after.engagements.filter((item) => item.id !== saved.id)).toEqual(before.engagements.filter((item) => item.id !== saved.id));
});

test("archive filters cannot expose schedule edits or allow keyboard reordering", async ({ page }) => {
  await openSchedule(page); const before = await readStoredWorkspace(page);
  await page.getByRole("tab", { name: /^Archived/ }).click();
  await page.getByRole("searchbox", { name: "Find scheduled projects" }).fill("2024");
  await expect(page.locator(".schedule-row-meta")).toHaveCount(1);
  await expect(page.locator(".schedule-row-edit")).toHaveCount(0);
  await expect(page.locator(".schedule-row-meta")).toHaveAttribute("draggable", "false");
  await page.locator(".schedule-row-open").press("Alt+ArrowDown");
  await page.locator(".schedule-bar").click();
  await expect(page.locator(".archive-banner")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("horizontal scrolling and Today remain usable without changing project order", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await openSchedule(page);
  const before = await readStoredWorkspace(page); const scroll = page.locator(".schedule-scroll");
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await scroll.evaluate((element) => { element.scrollLeft = 0; });
  const box = await scroll.boundingBox(); await page.mouse.move(box.x + box.width - 40, box.y + 100);
  await page.mouse.wheel(250, 0);
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".schedule-today-header")).toBeInViewport();
  expect(await readStoredWorkspace(page)).toEqual(before);
});

for (const width of [800, 1024, 1440, 1920]) {
  test(`schedule metadata and controls fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await openSchedule(page);
    for (const control of await page.locator(".schedule-filters input, .schedule-filters select").all()) {
      expect((await control.boundingBox()).height).toBe(42);
    }
    const pageBounds = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(pageBounds.scroll).toBeLessThanOrEqual(pageBounds.width + 1);
    for (const row of await page.locator(".schedule-row-meta").all()) {
      const bounds = await row.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
      await expect(row.locator(".schedule-date-summary")).toBeVisible();
    }
    for (const tick of await page.locator(".schedule-weeks span").all()) {
      const size = await tick.evaluate((element) => ({ width: element.clientWidth, content: element.scrollWidth }));
      expect(size.content).toBeLessThanOrEqual(size.width + 1);
    }
    const scroll = await page.locator(".schedule-scroll").boundingBox();
    const fixed = await page.locator(".schedule-corner").boundingBox();
    expect(scroll.width - fixed.width).toBeGreaterThan(100);
    await page.screenshot({ path: testInfo.outputPath(`schedule-${width}.png`) });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
  });
}

test("filtered keyboard reordering preserves hidden projects and all date values", async ({ page }) => {
  await openSchedule(page); const before = await readStoredWorkspace(page);
  await page.getByRole("searchbox", { name: "Find scheduled projects" }).fill("alex");
  await expect(page.locator(".schedule-row-meta")).toHaveCount(2);
  await page.locator('[data-schedule-key="project:schedule-current"] .schedule-row-open').press("Alt+ArrowUp");
  await expect(page.locator(".schedule-row-meta").first()).toHaveAttribute("data-schedule-key", "project:schedule-current");
  const after = await readStoredWorkspace(page);
  expect(after.engagements).toEqual(before.engagements); expect(after.entities).toEqual(before.entities);
  expect([...after.scheduleOrder].sort()).toEqual([...before.scheduleOrder].sort());
  expect(after.scheduleOrder.indexOf("project:schedule-current")).toBeLessThan(after.scheduleOrder.indexOf("project:schedule-previous"));
});
