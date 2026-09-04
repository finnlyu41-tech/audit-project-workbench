import { expect, test } from "@playwright/test";
import { hierarchyFixture, openWorkbench, readStoredWorkspace } from "./helpers.js";

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
