import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

const panel = (page) => page.getByRole("region", { name: "Quick update" });
const summary = (page) => page.getByTestId("project-focus-summary");

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

test("stable project metadata stays visible and editable without competing with current work", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const focus = summary(page);
  const facts = page.locator(".detail-facts");
  const secondary = facts.locator(".detail-fact-secondary");

  await expect(focus).toBeVisible();
  await expect(secondary).toHaveCount(3);
  await expect(secondary.nth(0).locator("dt")).toHaveText("Owner");
  await expect(secondary.nth(1).locator("dt")).toHaveText("Financial reporting standard / framework");
  await expect(secondary.nth(2).locator("dt")).toHaveText("Parent holding company");
  await expect(secondary.getByRole("button")).toHaveCount(3);

  const hierarchy = await page.evaluate(() => {
    const focusBox = document.querySelector(".project-focus-summary").getBoundingClientRect();
    const factsBox = document.querySelector(".detail-facts").getBoundingClientRect();
    const cells = [...document.querySelectorAll(".detail-facts > .detail-fact")];
    const owner = cells[0].getBoundingClientRect();
    const schedule = cells[1].getBoundingClientRect();
    const secondaryWeight = getComputedStyle(cells[0].querySelector("dd")).fontWeight;
    const workStateWeight = getComputedStyle(cells[4].querySelector("dd")).fontWeight;
    return {
      focusTop: focusBox.top, factsTop: factsBox.top,
      ownerWidth: owner.width, scheduleWidth: schedule.width,
      secondaryWeight: Number(secondaryWeight), workStateWeight: Number(workStateWeight),
      pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(hierarchy.focusTop).toBeLessThan(hierarchy.factsTop);
  expect(hierarchy.scheduleWidth).toBeGreaterThan(hierarchy.ownerWidth + 20);
  expect(hierarchy.secondaryWeight).toBeLessThan(hierarchy.workStateWeight);
  expect(hierarchy.pageWidth).toBeLessThanOrEqual(hierarchy.viewportWidth + 1);

  await secondary.nth(0).getByRole("button").click();
  await expect(page.getByRole("dialog", { name: /Owner/ })).toBeVisible();
  await page.getByRole("dialog", { name: /Owner/ }).getByRole("button", { name: "Cancel" }).click();
  await expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
});
