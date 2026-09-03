import { expect, test } from "@playwright/test";
import { hierarchyFixture, openWorkbench, readStoredWorkspace } from "./helpers.js";

test("moves a standalone company directly into an expanded second-level holding company", async ({ page }) => {
  await openWorkbench(page, hierarchyFixture());
  await page.getByRole("button", { name: "Expand holding company" }).click();
  await page.getByRole("button", { name: "Expand holding company" }).click();

  const source = page.locator(".tree-project-row").filter({ hasText: "Standalone company" });
  const target = page.locator(".tree-group-row").filter({ hasText: "Regional Holdings" });
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  await source.dragTo(target);

  const stored = await readStoredWorkspace(page);
  const standalone = stored.projects.find((project) => project.name === "Standalone company");
  const middle = stored.groups.find((group) => group.name === "Regional Holdings");
  expect(middle.members.some((member) => member.kind === "project" && member.refId === standalone.id)).toBe(true);
  expect(stored.groups.filter((group) => group.id !== middle.id)
    .every((group) => group.members.every((member) => member.refId !== standalone.id))).toBe(true);
});
