import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ALERT_TEST_NOW, deadlineAlertFixture } from "../tests/fixtures/deadline-alerts.js";
import { openWorkbench, readStoredWorkspace, seriousViolations } from "./helpers.js";

test.use({ timezoneId: "Asia/Hong_Kong" });
const dialogFor = (page) => page.getByRole("dialog", { name: "Deadline alerts", exact: true });
async function openAlerts(page, store = deadlineAlertFixture()) {
  await page.clock.setFixedTime(new Date(ALERT_TEST_NOW));
  await openWorkbench(page, store);
  await page.locator(".deadline-alert-trigger").click();
  await expect(dialogFor(page)).toBeVisible();
  return dialogFor(page);
}

test("long alert labels remain readable rather than ellipsized at 480px", async ({ page }, testInfo) => {
  const dialog = await openAlerts(page);
  await page.setViewportSize({ width: 480, height: 560 });
  await page.screenshot({ path: testInfo.outputPath("alert-layout.png") });
  const labels = await dialog.locator(".deadline-alert-copy strong, .deadline-alert-copy small").evaluateAll((items) =>
    items.map((item) => ({ text: item.textContent, width: item.clientWidth, scroll: item.scrollWidth })));
  for (const item of labels) expect(item.scroll, item.text).toBeLessThanOrEqual(item.width + 1);
});
test("same-name tax alerts expose their company in the accessible action name", async ({ page }) => {
  const dialog = await openAlerts(page);
  const matches = dialog.locator('.deadline-alert-row[data-urgency="due_today"]');
  await expect(matches).toHaveCount(2);
  for (const row of await matches.all()) await expect(row).toHaveAttribute("aria-label", /Atlas Example|Birch Example/);
});
test("combined search, urgency and scope filter only the existing alert view", async ({ page }) => {
  const dialog = await openAlerts(page); const before = await readStoredWorkspace(page);
  const search = dialog.getByRole("searchbox", { name: "Find deadline alerts" });
  await expect(search).toBeFocused(); await expect(dialog.locator(".deadline-alert-row")).toHaveCount(6);
  await search.fill("ａｔｌａｓ ａｌｅｘ ２０２５/２６");
  await expect(dialog.locator(".deadline-alert-row")).toHaveCount(3);
  await dialog.getByRole("combobox", { name: "Alert urgency" }).selectOption("due_today");
  await expect(dialog.locator(".deadline-alert-row")).toHaveCount(1);
  await dialog.getByRole("tab", { name: /Project/ }).click();
  await expect(dialog.locator(".deadline-alert-row")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Clear alert filters" }).click();
  await expect(search).toBeFocused(); await expect(search).toHaveValue("");
  await expect(dialog.locator(".deadline-alert-row")).toHaveCount(6);
  await search.fill("PRIVATE_REFERENCE_NOT_SEARCHABLE");
  await expect(dialog.locator(".deadline-alert-empty")).toBeVisible();
  await search.fill("PRIVATE_NOTE_NOT_SEARCHABLE");
  await expect(dialog.locator(".deadline-alert-row")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("opening one of two same-name tax alerts targets the selected company's actual deadline", async ({ page }) => {
  const dialog = await openAlerts(page); const before = await readStoredWorkspace(page);
  await dialog.getByRole("searchbox").fill("birch alex");
  await dialog.getByRole("combobox").selectOption("due_today");
  await dialog.locator(".deadline-alert-row").click();
  const taxes = page.getByRole("dialog", { name: /Tax deadlines.*Birch Example/ });
  await expect(taxes).toBeVisible();
  await expect(taxes.locator('.tax-deadline-row[data-focused="true"]')).toContainText("Tax payment");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("project alerts use their existing overdue status and clear stale navigation filters on open", async ({ page }) => {
  await page.clock.setFixedTime(new Date(ALERT_TEST_NOW));
  await openWorkbench(page, deadlineAlertFixture());
  await page.getByRole("button", { name: "Open navigation filters" }).click();
  await page.getByRole("combobox", { name: "Owner filter" }).selectOption("Alex Search");
  const before = await readStoredWorkspace(page);
  await page.locator(".deadline-alert-trigger").click(); const dialog = dialogFor(page);
  await dialog.getByRole("tab", { name: /Project/ }).click();
  await dialog.getByRole("combobox", { name: "Alert urgency" }).selectOption("overdue");
  await expect(dialog.locator(".deadline-alert-row")).toHaveCount(2);
  await dialog.locator('[data-alert-id="project:overview-next"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".detail-title > p")).toContainText("Atlas Example");
  await expect(page.getByRole("combobox", { name: "Owner filter" })).toHaveValue("");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("keyboard scope selection, search Enter and Escape retain modal navigation and source data", async ({ page }) => {
  await openAlerts(page); await page.keyboard.press("Escape");
  const trigger = page.locator(".deadline-alert-trigger"); await trigger.focus(); await trigger.press("Enter");
  const dialog = dialogFor(page); const before = await readStoredWorkspace(page);
  const all = dialog.getByRole("tab", { name: /^All/ }); await all.focus(); await all.press("ArrowRight");
  await expect(dialog.getByRole("tab", { name: /^Tax/ })).toHaveAttribute("aria-selected", "true");
  const search = dialog.getByRole("searchbox"); await search.fill("tax payment"); await search.press("Enter");
  await expect(dialog).toBeVisible(); await expect(dialog.locator(".deadline-alert-row")).toHaveCount(3);
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const [width, height] of [[480, 560], [800, 760], [1440, 900]]) {
  test(`alert controls and dates fit ${width}x${height} with a single modal scroll region`, async ({ page }, testInfo) => {
    const dialog = await openAlerts(page); await page.setViewportSize({ width, height });
    for (const field of await dialog.locator("input,select").all()) expect((await field.boundingBox()).height).toBe(42);
    const metrics = await dialog.evaluate((element) => {
      const body = element.querySelector(".workbench-modal-body");
      return { x: element.getBoundingClientRect().x, right: element.getBoundingClientRect().right,
        scroll: body.scrollWidth, width: body.clientWidth, listOverflow: getComputedStyle(element.querySelector(".deadline-alert-list")).overflowY };
    });
    expect(metrics.x).toBeGreaterThanOrEqual(0); expect(metrics.right).toBeLessThanOrEqual(width + 1);
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1); expect(metrics.listOverflow).toBe("visible");
    for (const row of await dialog.locator(".deadline-alert-row").all()) {
      const date = await row.locator("time").boundingBox(); const box = await row.boundingBox();
      expect(date.x).toBeGreaterThanOrEqual(box.x); expect(date.x + date.width).toBeLessThanOrEqual(box.x + box.width);
      expect(await row.locator(".deadline-alert-copy").evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const icon = await row.locator(":scope > i").boundingBox(); const copy = await row.locator(".deadline-alert-copy").boundingBox();
      expect(Math.abs(icon.y + icon.height / 2 - copy.y - copy.height / 2)).toBeLessThanOrEqual(2);
    }
    const last = dialog.locator(".deadline-alert-row").last(); await last.focus(); await expect(last).toBeInViewport();
    await expect(dialog.locator(":scope > header")).toBeInViewport();
    await dialog.locator(".workbench-modal-body").evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: testInfo.outputPath(`alerts-${width}.png`) });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
  });
}
test("no eligible alerts stays empty without creating deadlines or changing reminder rules", async ({ page }) => {
  const store = deadlineAlertFixture();
  store.engagements.forEach((entry) => { entry.dueDate = "2028-12-31"; });
  store.entities.forEach((entity) => entity.taxDeadlines.forEach((entry) => { entry.state = "completed"; }));
  const dialog = await openAlerts(page, store); const before = await readStoredWorkspace(page);
  await expect(dialog.locator(".deadline-alert-row")).toHaveCount(0);
  await expect(dialog.locator(".deadline-alert-summary")).toContainText("No deadlines need attention");
  await dialog.getByRole("searchbox").fill("missing"); await dialog.getByRole("button", { name: "Clear alert filters" }).click();
  await expect(dialog.getByRole("searchbox")).toHaveValue("");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
