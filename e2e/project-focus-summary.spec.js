import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

const panel = (page) => page.getByRole("region", { name: "Quick update" });
const summary = (page) => panel(page).getByTestId("project-focus-summary");

test("project workspace leads with next action, deadline and separate work-state counts", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].outstandingItems = [{
    id: "focus-open", title: "Signed report outstanding", status: "missing_document", note: "", workstreamId: null,
    createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
  }];
  await openWorkbench(page, store);
  const before = await readStoredWorkspace(page);
  const focus = summary(page);
  await expect(focus).toBeVisible();
  await expect(focus.locator(".project-focus-next strong")).toHaveText("Engagement setup");
  await expect(focus.locator(".project-focus-facts > div").nth(0)).toContainText("31 Oct 2026");
  await expect(focus.locator(".project-focus-facts > div").nth(1)).toContainText("1");
  await expect(focus.locator(".project-focus-facts > div").nth(2)).toContainText("0/2");
  await expect(focus).not.toContainText("%");
  const hierarchy = await panel(page).evaluate((element) => ({
    summaryTop: element.querySelector(".project-focus-summary").getBoundingClientRect().top,
    toolbarTop: element.querySelector(":scope > header").getBoundingClientRect().top,
  }));
  expect(hierarchy.summaryTop).toBeLessThan(hierarchy.toolbarTop);
  await focus.locator("button.project-focus-next").click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("blank project summary describes work without inventing overall progress", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].workstreams = [];
  store.projects[0].outstandingItems = [];
  store.projects[0].dueDate = "";
  await openWorkbench(page, store);
  const focus = summary(page);
  await expect(focus).toBeVisible();
  await expect(focus).not.toContainText("%");
  await expect(focus.locator(".project-focus-next")).not.toHaveAttribute("role", "progressbar");
  await expect(focus.locator("button.project-focus-next")).toHaveCount(0);
});

test("focused project summary stays readable across desktop width and zoom equivalents and all UI languages", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].entity = "Example Very Long International Professional Services Company Limited";
  await openWorkbench(page, store);
  for (const width of [1280, 1440, 1920]) {
    for (const zoom of [0.8, 1, 1.25]) {
      await page.setViewportSize({ width: Math.round(width / zoom), height: 900 });
      const geometry = await summary(page).evaluate((element) => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        summary: element.clientWidth,
        summaryScroll: element.scrollWidth,
      }));
      expect(geometry.page).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.summaryScroll).toBeLessThanOrEqual(geometry.summary + 1);
    }
  }
  for (const index of [0, 1, 2]) {
    await page.locator(".language-summary").click();
    await page.locator(".language-menu > button").nth(index).click();
    await page.setViewportSize({ width: 1024, height: 720 });
    const geometry = await summary(page).evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  }
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
});
