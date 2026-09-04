import { expect, test } from "@playwright/test";
import { openWorkbench, workspaceFixture } from "./helpers.js";

// 1024 CSS px also covers a 1280px desktop at 125% browser zoom.
for (const width of [1024, 1280, 1440, 1920]) {
  test(`keeps the desktop workspace operable without page overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWorkbench(page, workspaceFixture());
    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    await expect(page.locator(".app-rail")).toBeVisible();
    await expect(page.locator(".project-panel")).toBeVisible();
    await expect(page.locator(".project-detail")).toBeVisible();
    const historyBox = await page.locator(".workspace-history-controls").boundingBox();
    const detailHeaderBox = await page.locator(".detail-header").boundingBox();
    expect(historyBox.height).toBe(0);
    expect(historyBox.y).toBeGreaterThanOrEqual(detailHeaderBox.y - 4);
    expect(historyBox.y).toBeLessThanOrEqual(detailHeaderBox.y + detailHeaderBox.height);

    if (width < 1400) {
      const openOutstanding = page.getByRole("button", { name: "Expand outstanding centre" });
      await expect(openOutstanding).toBeVisible();
      await openOutstanding.click();
      await expect(page.getByRole("complementary", { name: "Outstanding centre" }).getByText("Outstanding centre", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Collapse outstanding centre" }).click();
      await expect(openOutstanding).toBeVisible();
    }

    await page.getByRole("button", { name: "Management reports" }).click();
    await expect(page.getByRole("heading", { name: "Portfolio report" })).toBeVisible();
    const reportMetrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(reportMetrics.scrollWidth).toBeLessThanOrEqual(reportMetrics.clientWidth + 1);

    await page.locator(".app-rail-button[aria-label='Project schedule']").click();
    await expect(page.locator(".schedule-scroll")).toBeVisible();
    const scheduleMetrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scheduleClientWidth: document.querySelector(".schedule-scroll")?.clientWidth || 0,
      scheduleScrollWidth: document.querySelector(".schedule-scroll")?.scrollWidth || 0,
    }));
    expect(scheduleMetrics.scrollWidth).toBeLessThanOrEqual(scheduleMetrics.clientWidth + 1);
    expect(scheduleMetrics.scheduleScrollWidth).toBeGreaterThanOrEqual(scheduleMetrics.scheduleClientWidth);
    await page.getByRole("button", { name: /Edit the project schedule for Example Services Limited/ }).click();
    const dialog = page.getByRole("dialog", { name: /Project schedule · Example Services Limited/ });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(width);
  });
}

for (const width of [1024, 1920]) {
  test(`home overview reflows without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWorkbench(page, workspaceFixture(), { home: true });
    await expect(page.getByRole("heading", { name: "Work overview" })).toBeVisible();
    await expect(page.locator(".home-metric-grid > button")).toHaveCount(4);
    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      columnCount: getComputedStyle(document.querySelector(".home-overview-columns")).gridTemplateColumns.split(" ").length,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.columnCount).toBe(width === 1024 ? 1 : 2);
    const overviewBox = await page.locator(".home-overview").boundingBox();
    expect(overviewBox.x).toBeGreaterThanOrEqual(0);
    expect(overviewBox.x + overviewBox.width).toBeLessThanOrEqual(width);
  });
}

test("long annual engagement forms scroll inside the dialog while the header remains available", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 560 });
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Edit annual engagement" }).click();
  const dialog = page.getByRole("dialog", { name: /Edit annual engagement/ });
  const body = dialog.locator(".workbench-modal-body");
  const before = await dialog.locator(":scope > header").boundingBox();
  const dimensions = await body.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await body.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(dialog.getByRole("button", { name: "Save engagement" })).toBeVisible();
  const after = await dialog.locator(":scope > header").boundingBox();
  expect(after.y).toBeCloseTo(before.y, 0);
  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("company navigation and schedule company columns resize by dragging and persist", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openWorkbench(page, workspaceFixture());
  const panel = page.locator(".project-panel");
  const navBefore = (await panel.boundingBox()).width;
  const navHandle = await page.locator(".project-panel-resizer").boundingBox();
  await page.mouse.move(navHandle.x + navHandle.width / 2, navHandle.y + 120);
  await page.mouse.down();
  await page.mouse.move(navHandle.x + navHandle.width / 2 + 90, navHandle.y + 120, { steps: 5 });
  await page.mouse.up();
  const navAfter = (await panel.boundingBox()).width;
  expect(navAfter).toBeGreaterThan(navBefore + 60);
  expect(await page.evaluate(() => Number(localStorage.getItem("audit-progress-workbench:navigation-width")))).toBeGreaterThan(navBefore + 60);

  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  await expect(page.locator(".schedule-reporting-period")).toHaveText("YE December 31, 2026");
  const corner = page.locator(".schedule-corner");
  const scheduleBefore = (await corner.boundingBox()).width;
  const scheduleHandle = await page.locator(".schedule-column-resizer").boundingBox();
  await page.mouse.move(scheduleHandle.x + scheduleHandle.width / 2, scheduleHandle.y + 20);
  await page.mouse.down();
  await page.mouse.move(scheduleHandle.x + scheduleHandle.width / 2 + 80, scheduleHandle.y + 20, { steps: 5 });
  await page.mouse.up();
  const scheduleAfter = (await corner.boundingBox()).width;
  expect(scheduleAfter).toBeGreaterThan(scheduleBefore + 50);
  expect(await page.evaluate(() => Number(localStorage.getItem("audit-progress-workbench:schedule-meta-width")))).toBeGreaterThan(scheduleBefore + 50);

  await page.reload();
  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  await expect(page.locator(".schedule-corner")).toBeVisible();
  expect((await page.locator(".project-panel").boundingBox()).width).toBeCloseTo(navAfter, 0);
  expect((await page.locator(".schedule-corner").boundingBox()).width).toBeCloseTo(scheduleAfter, 0);
});

test("simplified view compacts navigation and schedule while retaining core project identity", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openWorkbench(page, workspaceFixture());

  const navigationToggle = page.locator(".navigation-density-toggle");
  const detailedNavigationWidth = (await page.locator(".project-panel").boundingBox()).width;
  await expect(navigationToggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".tree-engagement-period")).toContainText("Alex Chan");
  await navigationToggle.click();
  await expect(navigationToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".tree-engagement-period")).not.toContainText("Alex Chan");
  await expect(page.locator(".workspace-tree .tree-progress")).toHaveCount(0);
  await expect.poll(async () => (await page.locator(".project-panel").boundingBox()).width)
    .toBeLessThan(detailedNavigationWidth - 50);
  const compactNavigationWidth = (await page.locator(".project-panel").boundingBox()).width;
  await expect(page.locator(".project-panel-resizer")).toBeHidden();
  expect(await page.locator(".filter-tabs").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(4);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("audit-progress-workbench:simplified-view"))).toBe("true");

  await page.getByRole("tab", { name: "Projects", exact: true }).click();
  await expect(page.locator(".flat-engagement-type")).toHaveText("Audit");
  await expect(page.locator(".flat-engagement-company")).toContainText("Example Services Limited");
  await expect(page.locator(".flat-engagement-company")).not.toContainText("December 31, 2026");
  await expect(page.locator(".flat-engagement-period")).toHaveText("YE December 31, 2026");

  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  const compactRow = page.locator(".schedule-row-meta");
  await expect(page.locator(".schedule-grid")).toHaveAttribute("data-simplified", "true");
  await expect(page.locator(".schedule-reporting-period")).toHaveText("YE December 31, 2026");
  await expect(page.locator(".schedule-project-type")).toContainText("Audit");
  await expect(page.locator(".schedule-project-type")).not.toContainText("December 31, 2026");
  await expect(page.locator(".schedule-project-type")).not.toContainText("Alex Chan");
  const compactHeight = (await compactRow.boundingBox()).height;

  await page.locator(".schedule-detail-toggle").click();
  await expect(page.locator(".schedule-grid")).not.toHaveAttribute("data-simplified", "true");
  await expect(page.locator(".schedule-reporting-period")).toHaveText("YE December 31, 2026");
  await expect(page.locator(".schedule-project-type")).toContainText("Alex Chan");
  expect((await compactRow.boundingBox()).height).toBeGreaterThan(compactHeight);

  await navigationToggle.click();
  await page.reload();
  await expect(page.locator(".navigation-density-toggle")).toHaveAttribute("aria-pressed", "true");
  expect((await page.locator(".project-panel").boundingBox()).width).toBeCloseTo(compactNavigationWidth, 0);
});
