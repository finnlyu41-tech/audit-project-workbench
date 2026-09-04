import { expect, test } from "@playwright/test";
import { hierarchyFixture, openWorkbench, readStoredWorkspace } from "./helpers.js";

test("expands and collapses every visible company branch in one action", async ({ page }) => {
  await openWorkbench(page, hierarchyFixture());
  const bulkToggle = page.locator(".workspace-tree-bulk-actions button");
  if (await bulkToggle.getAttribute("aria-label") === "Collapse all companies") await bulkToggle.click();
  await expect(bulkToggle).toHaveAttribute("aria-label", "Expand all companies");
  await bulkToggle.click();
  await expect(bulkToggle).toHaveAttribute("aria-label", "Collapse all companies");
  await expect(page.locator(".tree-expander[aria-expanded='false']")).toHaveCount(0);
  await bulkToggle.click();
  await expect(page.locator(".tree-children")).toHaveCount(0);
  await expect(bulkToggle).toHaveAttribute("aria-label", "Expand all companies");
});

test("moves a standalone company directly into an expanded second-level holding company", async ({ page }) => {
  await openWorkbench(page, hierarchyFixture());
  const source = page.locator(".tree-entity-row").filter({ hasText: "Standalone Company Limited" });
  const target = page.locator(".tree-entity-row[data-kind='holding_company']").filter({ hasText: "Regional Holdings" });

  for (let index = 0; index < 4 && !(await target.isVisible()); index += 1) {
    const expander = page.getByRole("button", { name: "Expand company" }).first();
    if (!(await expander.count())) break;
    await expander.click();
  }

  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  await source.dragTo(target);

  const stored = await readStoredWorkspace(page);
  const standalone = stored.entities.find((entity) => entity.legalName === "Standalone Company Limited");
  const middle = stored.entities.find((entity) => entity.legalName === "Regional Holdings");
  expect(standalone.parentEntityId).toBe(middle.id);
  expect(stored.entities.filter((entity) => entity.id !== middle.id)
    .every((entity) => standalone.parentEntityId !== entity.id)).toBe(true);
});
