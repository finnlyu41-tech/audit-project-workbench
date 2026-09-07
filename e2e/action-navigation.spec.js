import { closeOutstandingPane } from './panel-helpers.js';
import { openOutstandingFilters } from './outstanding-helpers.js';
import { expect, test } from "@playwright/test";
import { makeCompany, openWorkbench, readStoredWorkspace, workspaceFixture } from "./helpers.js";

const home = (page) => page.locator('.app-rail-button[aria-label="Home"]');

test("next action opens and focuses the exact unfinished stage without changing progress", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].workstreams[0].nodes[0].conditions.forEach((condition) => { condition.done = true; });
  await openWorkbench(page, store);
  const before = await readStoredWorkspace(page);
  await page.locator(".next-action-link").click();
  const detail = page.locator(".node-detail-panel");
  await expect(detail.getByRole("heading", { name: "Audit execution" })).toBeVisible();
  await expect(detail).toBeFocused();
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
  await page.getByRole("tab", { name: /Audit execution/ }).click();
  await expect(detail).toHaveCount(0);
  await page.locator(".next-action-link").click();
  await expect(detail).toBeFocused();
});

test("home outstanding actions reveal the exact card on a narrow workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 760 });
  const store = workspaceFixture();
  store.projects[0].outstandingItems = Array.from({ length: 14 }, (_, index) => ({
    id: `focus-${index}`, title: index === 13 ? "Target approval" : `Other approval ${index}`,
    status: "missing_document", note: "Fictional navigation test", workstreamId: null,
    createdAt: index === 13 ? "2020-01-01T00:00:00Z" : "2026-09-01T00:00:00Z",
  }));
  await openWorkbench(page, store, { home: true });
  const before = await readStoredWorkspace(page);
  await page.locator(".home-priority-list > button").filter({ hasText: "Target approval" }).click();
  const card = page.locator(".outstanding-item").filter({ hasText: "Target approval" });
  await expect(card).toBeVisible();
  await expect(card).toBeFocused();
  await expect(card).toBeInViewport();
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
});

test("deadline actions reveal their source even when navigation has stale owner filters", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].dueDate = "2020-01-01";
  const other = makeCompany(store, { entity: "Other Example Limited" });
  other.owner = "Blair";
  store.projects.push(other);
  await openWorkbench(page, store);
  await page.getByRole("button", { name: "Open navigation filters" }).click();
  await page.getByRole("combobox", { name: "Owner filter" }).selectOption("Blair");
  await home(page).click();
  await page.locator('.home-priority-list > button[data-urgency="overdue"]').first().click();
  await expect(page.locator(".detail-title > p")).toContainText("Example Services Limited");
  await expect(page.getByRole("combobox", { name: "Owner filter" })).toHaveValue("");
});

test("empty next workstream is revealed without creating or completing a stage", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].workstreams[0].nodes = [];
  await openWorkbench(page, store);
  const before = await readStoredWorkspace(page);
  await page.locator(".next-action-link").click();
  await expect(page.locator(".node-board")).toBeFocused();
  await expect(page.getByRole("button", { name: "Add stage", exact: true })).toBeVisible();
  await expect(page.locator(".node-detail-panel")).toHaveCount(0);
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
});

test("outstanding navigation clears a previous closed-items filter and preserves drafts", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].outstandingItems = [{ id: "target", title: "Target approval", status: "missing_document", note: "", workstreamId: null }];
  await openWorkbench(page, store);
  await page.getByRole("button", { name: "Quick edit" }).click();
  await page.locator(".quick-update-form").getByLabel("Owner", { exact: true }).fill("Unsaved editor");
  await openOutstandingFilters(page);
  await page.locator(".outstanding-visibility-tabs > button").nth(1).click();
  await home(page).click();
  await page.locator(".home-priority-list > button").filter({ hasText: "Target approval" }).click();
  await expect(page.locator(".outstanding-item").filter({ hasText: "Target approval" })).toBeFocused();
  await expect(page.locator(".quick-update-form").getByLabel("Owner", { exact: true })).toHaveValue("Unsaved editor");
  await closeOutstandingPane(page);
  await page.locator(".quick-update-form").getByRole("button", { name: "Cancel", exact: true }).click();
});
