import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, seriousViolations, workspaceFixture } from "./helpers.js";

const guideButton = (page) => page.locator('.app-rail-button[aria-label="User guide"]');

test("user guide is searchable and the matching topic is brought into view", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await guideButton(page).click();
  const dialog = page.getByRole("dialog", { name: "User guide" });
  const search = dialog.getByRole("searchbox", { name: "Search guide" });
  await search.fill("backup");
  await expect(dialog.getByRole("button", { name: /Saving, backup and data/ })).toBeVisible();
  await dialog.getByRole("button", { name: /Saving, backup and data/ }).click();
  await expect(dialog.getByText(/Export backup/).first()).toBeVisible();
  await search.fill("no-match-phrase");
  await expect(dialog.getByText("No guide topics match your search.")).toBeVisible();
  await search.fill("");
  await expect(dialog.getByText("Quick start", { exact: true }).first()).toBeVisible();
});

test("user guide search is accessible and stays contained at 480px", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 760 });
  await openWorkbench(page, workspaceFixture());
  await guideButton(page).click();
  const dialog = page.getByRole("dialog", { name: "User guide" });
  await expect(dialog.getByRole("searchbox", { name: "Search guide" })).toBeFocused();
  const metrics = await dialog.locator(".workbench-modal-body").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
});
test("date range calendar icon controls expose the same hover and keyboard help as other icon actions", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Edit annual engagement" }).click();
  const dialog = page.getByRole("dialog", { name: /Edit annual engagement/ });
  const open = dialog.getByRole("button", { name: "Choose project date range" });
  await expect(open).toHaveAttribute("data-tooltip", "Choose project date range");
  await open.click();
  const previous = dialog.getByRole("button", { name: "Previous month" });
  const next = dialog.getByRole("button", { name: "Next month" });
  await expect(previous).toHaveAttribute("data-tooltip", "Previous month");
  await expect(next).toHaveAttribute("data-tooltip", "Next month");
  await previous.focus();
  await expect(previous).toBeFocused();
});

test("modal close and template editor icon actions retain accessible names and tooltips", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Template library" }).click();
  let dialog = page.getByRole("dialog", { name: "Template library" });
  await expect(dialog.getByRole("button", { name: "Close" })).toHaveAttribute("data-tooltip", "Close");
  await dialog.locator(".sample-library-card").first().getByRole("button", { name: "Edit template" }).click();
  dialog = page.getByRole("dialog", { name: "Edit template" });
  const firstNode = dialog.locator(".sample-edit-node").first();
  await expect(firstNode.getByRole("button", { name: "Move stage down" })).toHaveAttribute("data-tooltip", "Move stage down");
  await expect(firstNode.getByRole("button", { name: "Delete stage" })).toHaveAttribute("data-tooltip", "Delete stage");
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
});
