import { expect, test } from "@playwright/test";
import { makeTaxDeadline } from "../src/dashboard/model.js";
import { accessibilityFixture, localDateOffset, makeCompany, openWorkbench, readStoredWorkspace } from "./helpers.js";

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

test("schedule rows can be dragged into a saved order and open focused date settings", async ({ page }) => {
  const store = accessibilityFixture();
  const second = makeCompany(store, { name: "Second engagement", entity: "Second Company Limited" });
  second.startDate = "2026-11-01";
  second.dueDate = "2026-12-15";
  store.projects.push(second);
  await openWorkbench(page, store);

  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  const firstRow = page.locator(".schedule-row-meta").filter({ hasText: "Example Services Limited" });
  const secondRow = page.locator(".schedule-row-meta").filter({ hasText: "Second Company Limited" });
  await secondRow.locator(".schedule-drag-handle").dragTo(firstRow, { targetPosition: { x: 120, y: 3 } });

  await expect(page.locator(".schedule-row-open strong").first()).toHaveText("Second Company Limited");
  const firstRowHeight = await firstRow.evaluate((element) => element.getBoundingClientRect().height);
  await secondRow.locator(".schedule-drag-handle").dragTo(firstRow,
    { targetPosition: { x: 120, y: firstRowHeight - 2 } });
  await expect(page.locator(".schedule-row-open strong").first()).toHaveText("Example Services Limited");
  await secondRow.locator(".schedule-drag-handle").focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(page.locator(".schedule-row-open strong").first()).toHaveText("Second Company Limited");
  let stored = await readStoredWorkspace(page);
  expect(stored.scheduleOrder[0]).toBe(`project:${second.id}`);

  await page.reload();
  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  await expect(page.locator(".schedule-row-open strong").first()).toHaveText("Second Company Limited");

  await page.getByRole("button", { name: "Edit the project schedule for Second Company Limited" }).click();
  const dialog = page.getByRole("dialog", { name: "Project schedule · Second Company Limited" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Project start").fill("2026-11-03");
  await dialog.getByLabel("Deadline").fill("2026-12-20");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(page.locator(".schedule-view")).toBeVisible();
  stored = await readStoredWorkspace(page);
  const saved = stored.projects.find((project) => project.id === second.id);
  expect(saved.startDate).toBe("2026-11-03");
  expect(saved.dueDate).toBe("2026-12-20");
});

test("holding-company and legacy company dates open in focused schedule settings", async ({ page }) => {
  const store = accessibilityFixture();
  store.projects[0].entity = "";
  store.projects[0].name = "Legacy engagement";
  const holding = store.groups[0];
  holding.startDate = "2026-09-15";
  holding.dueDate = "2026-12-31";
  await openWorkbench(page, store);

  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  await page.getByRole("button", { name: "Edit the project schedule for Legacy engagement" }).click();
  let dialog = page.getByRole("dialog", { name: "Project schedule · Legacy engagement" });
  await dialog.getByLabel("Project start").fill("2026-09-02");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: `Edit the project schedule for ${holding.name}` }).click();
  dialog = page.getByRole("dialog", { name: `Project schedule · ${holding.name}` });
  await dialog.getByLabel("Deadline").fill("2027-01-15");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  const stored = await readStoredWorkspace(page);
  expect(stored.projects[0].startDate).toBe("2026-09-02");
  expect(stored.projects[0].entity).toBe("");
  expect(stored.groups.find((group) => group.id === holding.id).dueDate).toBe("2027-01-15");
});

test("archived schedule graphics open read-only records and never a date editor", async ({ page }) => {
  const store = accessibilityFixture();
  store.projects[0].archived = true;
  store.groups[0].archived = true;
  store.groups[0].startDate = "2026-09-01";
  store.groups[0].dueDate = "2026-11-30";
  store.scheduleOrder = [`project:${store.projects[0].id}`, `group:${store.groups[0].id}`];
  const datesBefore = store.projects.concat(store.groups).map(({ id, startDate, dueDate }) => ({ id, startDate, dueDate }));
  await openWorkbench(page, store);

  await page.getByRole("tab", { name: /Archived/ }).click();
  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  await expect(page.locator(".schedule-row-edit")).toHaveCount(0);
  await page.locator(".schedule-bar").first().click();
  await expect(page.locator(".archive-banner")).toBeVisible();
  await expect(page.getByRole("dialog", { name: /Project schedule/ })).toHaveCount(0);

  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  await page.locator(".schedule-bar").nth(1).click();
  await expect(page.locator(".archive-banner")).toBeVisible();
  await expect(page.getByRole("dialog", { name: /Project schedule/ })).toHaveCount(0);
  const stored = await readStoredWorkspace(page);
  expect(stored.projects.concat(stored.groups).map(({ id, startDate, dueDate }) => ({ id, startDate, dueDate })))
    .toEqual(datesBefore);
});
