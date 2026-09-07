import { openProjectNavigation } from './panel-helpers.js';
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

const home = (page) => page.locator('.app-rail-button[aria-label="Home"]');
const panel = (page) => page.getByRole("region", { name: "Quick update" });

test("quick updates save in place without changing reporting periods or completion conditions", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  await panel(page).getByRole("button", { name: "Quick edit" }).click();
  await panel(page).getByLabel("Owner", { exact: true }).fill("Morgan Lee");
  await panel(page).getByLabel("Deadline", { exact: true }).fill("2026-11-30");
  await panel(page).getByLabel("Project notes").fill("Next: request the signed report.\nFollow up with the client.");
  await panel(page).getByRole("button", { name: "Save updates" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(panel(page).getByRole("status")).toContainText("Updates applied");
  const after = await readStoredWorkspace(page);
  expect(after.engagements[0].owner).toBe("Morgan Lee");
  expect(after.engagements[0].dueDate).toBe("2026-11-30");
  expect(after.engagements[0].notes).toContain("Next: request the signed report.");
  expect(after.engagements[0].reportingPeriods).toEqual(before.engagements[0].reportingPeriods);
  expect(after.engagements[0].workstreams).toEqual(before.engagements[0].workstreams);
  expect(after.entities).toEqual(before.entities);
  await page.reload();
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe("Morgan Lee");
});
test("unsaved quick drafts survive navigation and cancel without changing records", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  await panel(page).getByRole("button", { name: "Quick edit" }).click();
  await panel(page).getByLabel("Owner", { exact: true }).fill("Unsaved owner");
  await home(page).click();
  await page.locator(".home-project-row").first().click();
  await expect(panel(page).getByLabel("Owner", { exact: true })).toHaveValue("Unsaved owner");
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
  await panel(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(panel(page).getByRole("button", { name: "Quick edit" })).toBeFocused();
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
});

test("quick date validation keeps invalid changes out of the saved workspace", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  await panel(page).getByRole("button", { name: "Quick edit" }).click();
  await panel(page).getByLabel("Deadline", { exact: true }).fill("2026-08-01");
  await panel(page).getByRole("button", { name: "Save updates" }).click();
  await expect(panel(page).getByLabel("Deadline", { exact: true })).toBeVisible();
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
  await panel(page).getByRole("button", { name: "Cancel", exact: true }).click();
});
test("outstanding shortcut filters the list and show-more exposes every matching action", async ({ page }) => {
  const store = workspaceFixture();
  store.projects[0].outstandingItems = Array.from({ length: 7 }, (_, index) => ({
    id: `wait-${index}`, title: `Approval ${index + 1}`, status: "missing_document", note: "", workstreamId: null,
    createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
  }));
  await openWorkbench(page, store, { home: true });
  await page.locator(".home-metric-grid > button").filter({ has: page.getByText("Outstanding items", { exact: true }) }).click();
  await expect(page.getByRole("group", { name: "Priority filters" }).getByRole("button", { name: /Outstanding items/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".home-priority-list > button")).toHaveCount(5);
  await page.getByRole("button", { name: /Show more/ }).click();
  await expect(page.locator(".home-priority-list > button")).toHaveCount(7);
  await page.getByRole("button", { name: "Show first 5 only" }).click();
  await expect(page.locator(".home-priority-list > button")).toHaveCount(5);
});

test("recent shortcuts survive reload and clearing history does not delete projects", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  await home(page).click();
  await expect(page.locator(".home-recent")).toContainText("Example Services Limited");
  await page.reload();
  await home(page).click();
  await expect(page.locator(".home-recent")).toContainText("Example Services Limited");
  const beforeClear = await readStoredWorkspace(page);
  expect(beforeClear.engagements).toEqual(before.engagements);
  await page.getByRole("button", { name: "Clear recent history" }).click();
  await expect(page.locator(".home-recent")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(beforeClear);
});
test("company advanced fields are optional and preserve entered values while collapsed", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await openProjectNavigation(page);
  await page.getByRole("button", { name: "New company" }).click();
  const dialog = page.getByRole("dialog", { name: "New company" });
  const disclosure = dialog.locator(".advanced-section");
  await expect(disclosure).not.toHaveAttribute("open");
  await dialog.getByLabel("Legal entity *").fill("Example New Company Limited");
  await disclosure.locator("summary").click();
  await dialog.getByLabel("Company notes").fill("Retain this note after collapsing.");
  await disclosure.locator("summary").click();
  await expect(dialog.getByLabel("Company notes")).toBeHidden();
  await dialog.getByRole("button", { name: "Create company", exact: true }).click();
  const saved = (await readStoredWorkspace(page)).entities.find((entity) => entity.legalName === "Example New Company Limited");
  expect(saved.notes).toBe("Retain this note after collapsing.");
});

test("action home, inline editor and expanded company form remain accessible", async ({ page }) => {
  await openWorkbench(page, workspaceFixture(), { home: true });
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
  await page.locator(".home-project-row").first().click();
  await panel(page).getByRole("button", { name: "Quick edit" }).click();
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
  await panel(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await openProjectNavigation(page);
  await page.getByRole("button", { name: "New company" }).click();
  await page.getByRole("dialog").locator(".advanced-section > summary").click();
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
});
for (const width of [1024, 1440, 1920]) {
  test(`action layout fits at ${width}px with readable project cards`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openWorkbench(page, workspaceFixture(), { home: true });
    await expect(page.locator(".outstanding-center-shell")).toBeVisible();
    const geometry = await page.locator(".home-project-row").first().evaluate((element) => ({
      viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth,
      card: element.clientWidth, content: element.scrollWidth,
    }));
    expect(geometry.page).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(geometry.content).toBeLessThanOrEqual(geometry.card + 1);
    await expect(page.locator(".home-project-row time").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`) });
    await page.locator(".home-project-row").first().click();
    await panel(page).getByRole("button", { name: "Quick edit" }).click();
    const fields = await panel(page).locator("input").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(fields).toEqual([42, 42, 42]);
    await page.screenshot({ path: testInfo.outputPath(`quick-update-${width}.png`) });
    await panel(page).getByRole("button", { name: "Cancel", exact: true }).click();
    await openProjectNavigation(page);
    await page.getByRole("button", { name: "New company" }).click();
    await page.screenshot({ path: testInfo.outputPath(`company-${width}.png`) });
  });
}
