import { expect, test } from "@playwright/test";
import { makeTaxDeadline } from "../src/dashboard/model.js";
import { accessibilityFixture, localDateOffset, openWorkbench } from "./helpers.js";

test("deadline alerts navigate to the source and the schedule aggregates same-day tax markers", async ({ page }) => {
  const store = accessibilityFixture();
  const dueDate = localDateOffset(7);
  store.projects[0].startDate = localDateOffset(-400);
  store.projects[0].dueDate = localDateOffset(400);
  store.projects[0].taxDeadlines.push(makeTaxDeadline({ category: "employers_return", taxYear: "2025/26",
    owner: "Alex Chan", dueDate, reminderDays: 30 }));
  await openWorkbench(page, store);

  await page.locator(".deadline-alert-trigger").click();
  const alerts = page.getByRole("dialog", { name: "Deadline alerts" });
  await alerts.getByRole("tab", { name: /Tax/ }).click();
  await expect(alerts.locator(".deadline-alert-row")).toHaveCount(2);
  await alerts.locator(".deadline-alert-row").first().click();
  const taxDialog = page.getByRole("dialog", { name: "Tax deadlines" });
  await expect(taxDialog.locator(".tax-deadline-row[data-focused='true']")).toBeVisible();
  await taxDialog.getByRole("button", { name: "Close" }).click();

  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  const schedule = page.locator(".schedule-scroll");
  await expect(schedule).toBeVisible();
  await expect(page.locator(".schedule-today-header")).toBeVisible();
  await expect(page.locator(".schedule-today-line")).toHaveCount(2);
  await schedule.evaluate((element) => { element.scrollLeft = 0; });
  await page.getByRole("button", { name: "Today" }).click();
  await expect.poll(() => schedule.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const centredPosition = await schedule.evaluate((element) => element.scrollLeft);
  await schedule.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => schedule.evaluate((element) => element.scrollLeft)).toBeGreaterThan(centredPosition);
  const marker = page.locator(".schedule-tax-marker").filter({ has: page.locator("strong", { hasText: "2" }) });
  await expect(marker).toHaveCount(1);
  await expect(marker.locator("strong")).toHaveText("2");
  await marker.click();
  await expect(page.getByRole("dialog", { name: "Tax deadlines" })).toBeVisible();
});
