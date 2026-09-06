import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

async function openEditor(page, kind) {
  await openWorkbench(page, workspaceFixture());
  if (kind === "outstanding") await page.getByRole("button", { name: "Add outstanding item", exact: true }).click();
  else if (kind === "workstream") await page.getByRole("button", { name: "Add workstream", exact: true }).click();
  else {
    await page.locator(".workstream-card-select").first().click();
    if (kind === "stage") await page.getByRole("button", { name: "Add stage", exact: true }).click();
    else {
      await page.locator('.node-board [role="tab"]').first().click();
      await page.locator(".node-detail-panel .add-condition").click();
    }
  }
  return page.getByRole("dialog");
}
async function groupEditor(page) {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Template library" }).click();
  await page.getByRole("dialog").getByRole("tab", { name: "Holding company templates", exact: true }).click();
  await page.getByRole("dialog").locator(".sample-library-card").first().getByRole("button", { name: "Edit template" }).click();
  return page.getByRole("dialog", { name: "Edit holding company template" });
}
for (const kind of ["stage", "criterion", "outstanding", "workstream"]) {
  test(`${kind} draft survives refused close and discard leaves business records unchanged`, async ({ page }) => {
    const dialog = await openEditor(page, kind); const before = await readStoredWorkspace(page);
    if (kind === "workstream") await dialog.getByLabel("Workstream type").selectOption({ index: 1 });
    else await dialog.locator("form input").first().fill("Unsaved fictional text");
    let prompts = 0;
    const reject = async (prompt) => { prompts++; await prompt.dismiss(); };
    page.on("dialog", reject);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible(); expect(prompts).toBe(1);
    await expect(dialog.locator(".modal-unsaved")).toBeVisible();
    page.off("dialog", reject); page.once("dialog", (prompt) => prompt.accept());
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden(); expect(await readStoredWorkspace(page)).toEqual(before);
  });
}

test("space-only required names explain the validation failure instead of silently ignoring Save", async ({ page }) => {
  const dialog = await openEditor(page, "stage"); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Stage name *", { exact: true }).fill("   ");
  await dialog.getByRole("button", { name: "Save stage", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("cannot contain only spaces");
  await expect(dialog.locator('input[required]')).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("group template fields have names and controls pass the accessibility gate", async ({ page }) => {
  await groupEditor(page);
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
});
for (const kind of ["stage", "criterion", "outstanding"]) {
  test(`${kind} validation clears on correction and save targets the intended record`, async ({ page }) => {
    const dialog = await openEditor(page, kind);
    const before = await readStoredWorkspace(page);
    const field = dialog.locator("form input").first();
    const save = kind === "outstanding" ? dialog.getByRole("button", { name: "Save outstanding item", exact: true }) : dialog.locator('button[type="submit"]');
    await field.fill("   "); await save.click();
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.getByRole("alert")).toContainText("cannot contain only spaces");
    expect(await readStoredWorkspace(page)).toEqual(before);
    await field.fill("Fictional follow-up");
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    let prompts = 0;
    page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
    await save.click(); await expect(dialog).toBeHidden(); expect(prompts).toBe(0);
    const after = await readStoredWorkspace(page);
    // Existing legacy-view writes also touch the company timestamp; all company content must stay unchanged.
    const companyContent = (entities) => entities.map(({ updatedAt, ...fields }) => fields);
    expect(companyContent(after.entities)).toEqual(companyContent(before.entities));
    expect(after.engagements[0].reportingPeriods).toEqual(before.engagements[0].reportingPeriods);
    if (kind === "outstanding") {
      expect(after.engagements[0].outstandingItems.at(-1).title).toBe("Fictional follow-up");
      expect(after.engagements[0].workstreams).toEqual(before.engagements[0].workstreams);
    } else {
      const nodes = after.engagements[0].workstreams[0].nodes;
      if (kind === "stage") {
        expect(nodes.at(-1).title).toBe("Fictional follow-up");
        expect(nodes.at(-1).conditions).toEqual([]);
      } else expect(nodes[0].conditions.at(-1)).toMatchObject({ label: "Fictional follow-up", done: false });
      expect(after.engagements[0].outstandingItems).toEqual(before.engagements[0].outstandingItems);
    }
  });
}
for (const kind of ["stage", "criterion", "outstanding"]) {
  test(`${kind} reverted draft closes without a discard prompt`, async ({ page }) => {
    const dialog = await openEditor(page, kind); const before = await readStoredWorkspace(page);
    const field = dialog.locator("form input").first();
    await field.fill("Temporary text"); await expect(dialog.locator(".modal-unsaved")).toBeVisible();
    await field.fill(""); await expect(dialog.locator(".modal-unsaved")).toHaveCount(0);
    let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden(); expect(prompts).toBe(0);
    expect(await readStoredWorkspace(page)).toEqual(before);
  });
}
for (const width of [480, 800, 1440]) {
  test(`group template inputs and icon actions align at ${width}px`, async ({ page }, testInfo) => {
    const dialog = await groupEditor(page);
    await page.setViewportSize({ width, height: 640 });
    for (const input of await dialog.locator("form input").all()) {
      await expect(input).toHaveAccessibleName(/\S/);
      expect((await input.boundingBox()).height).toBe(42);
    }
    for (const row of await dialog.locator(".sample-condition-editor > div, .readiness-template-grid > section > div").all()) {
      const field = await row.locator("input").boundingBox();
      const action = await row.locator("button").boundingBox();
      expect(field.x + field.width + 4).toBeLessThanOrEqual(action.x);
      expect(Math.abs(field.y + field.height / 2 - action.y - action.height / 2)).toBeLessThanOrEqual(1);
      await expect(row.locator("button")).toHaveAttribute("data-tooltip", /\S/);
    }
    const metrics = await dialog.locator(".workbench-modal-body").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
    await expect(dialog.locator('button[type="submit"]')).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`group-template-${width}.png`) });
  });
}

test("workstream save retains existing workstreams and does not pre-complete new work", async ({ page }) => {
  const dialog = await openEditor(page, "workstream"); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Workstream template").selectOption("");
  await dialog.locator('button[type="submit"]').click(); await expect(dialog).toBeHidden();
  const after = await readStoredWorkspace(page); const streams = after.engagements[0].workstreams;
  expect(streams.slice(0, -1)).toEqual(before.engagements[0].workstreams);
  expect(streams.at(-1).nodes).toEqual([]);
});
test("group template icon edits affect only the saved template, not existing engagements", async ({ page }) => {
  const dialog = await groupEditor(page); const before = await readStoredWorkspace(page);
  const original = before.groupSamples[0];
  const firstTitle = await dialog.locator(".sample-edit-node > header > input").first().inputValue();
  const conditions = original.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
  const readiness = Object.values(original.readinessTemplates).flat().length;
  await dialog.getByRole("button", { name: "Move stage down", exact: true }).first().click();
  await dialog.getByRole("button", { name: "Delete criterion", exact: true }).first().click();
  await dialog.getByRole("button", { name: "Delete readiness criterion", exact: true }).first().click();
  await expect(dialog.locator(".modal-unsaved")).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByRole("dialog", { name: "Template library" })).toBeVisible();
  const after = await readStoredWorkspace(page);
  const saved = after.groupSamples.find((item) => item.id === original.id);
  // Built-in group templates have localized editor IDs; assert the visible order, not generated IDs.
  expect(saved.nodes[1].title).toBe(firstTitle);
  expect(saved.nodes.reduce((sum, node) => sum + node.conditions.length, 0)).toBe(conditions - 1);
  expect(Object.values(saved.readinessTemplates).flat().length).toBe(readiness - 1);
  expect(after.engagements).toEqual(before.engagements);
  expect(after.entities).toEqual(before.entities);
});
test("daily validation remains readable, linked and accessible in a narrow dialog", async ({ page }, testInfo) => {
  const dialog = await openEditor(page, "outstanding");
  await page.setViewportSize({ width: 480, height: 640 });
  const input = dialog.locator('input[required]');
  await input.fill("   "); await dialog.getByRole('button', { name: 'Save outstanding item', exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  const errorId = await input.getAttribute("aria-describedby");
  expect(errorId).toBe(await dialog.getByRole("alert").getAttribute("id"));
  await expect(dialog.getByRole("alert")).toBeInViewport();
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
  const metrics = await dialog.locator(".workbench-modal-body").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
  await page.screenshot({ path: testInfo.outputPath("daily-validation-480.png") });
});
