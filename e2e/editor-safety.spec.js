import { openOutstandingFilters, openOutstandingMore, expandOutstandingItem } from './outstanding-helpers.js';
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

async function companyDialog(page) {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "New company" }).click();
  return page.getByRole("dialog", { name: "New company" });
}
async function templateDialog(page) {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Template library" }).click();
  await page.getByRole("dialog").locator(".sample-library-card").first().getByRole("button", { name: "Edit template" }).click();
  return page.getByRole("dialog", { name: "Edit template" });
}

test("dirty company cannot be silently closed with Escape", async ({ page }) => {
  const dialog = await companyDialog(page);
  const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Legal entity *").fill("Unsaved Example Limited");
  let confirmations = 0;
  page.on("dialog", async (prompt) => { confirmations += 1; await prompt.dismiss(); });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  expect(confirmations).toBe(1);
  await expect(dialog.getByLabel("Legal entity *")).toHaveValue("Unsaved Example Limited");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("template save actions remain in the short dialog viewport", async ({ page }) => {
  const dialog = await templateDialog(page);
  await page.setViewportSize({ width: 800, height: 560 });
  await expect(dialog.getByRole("button", { name: "Save template", exact: true })).toBeInViewport();
});

test("IME Escape does not close a clean company form", async ({ page }) => {
  const dialog = await companyDialog(page);
  await dialog.getByLabel("Legal entity *").dispatchEvent("keydown", { key: "Escape", isComposing: true });
  await expect(dialog).toBeVisible();
});
for (const action of ["Close", "Cancel", "backdrop"]) {
  test(`dirty company ${action} requires an explicit discard decision`, async ({ page }) => {
    const dialog = await companyDialog(page); const before = await readStoredWorkspace(page);
    await dialog.getByLabel("Legal entity *").fill("Unsaved Example Limited");
    const dismiss = async (prompt) => { expect(prompt.type()).toBe("confirm"); await prompt.dismiss(); };
    page.on("dialog", dismiss);
    if (action === "backdrop") await page.locator(".workbench-modal-backdrop").click({ position: { x: 2, y: 2 } });
    else await dialog.getByRole("button", { name: action, exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Legal entity *")).toHaveValue("Unsaved Example Limited");
    page.off("dialog", dismiss); page.once("dialog", (prompt) => prompt.accept());
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden(); expect(await readStoredWorkspace(page)).toEqual(before);
  });
}

test("reverting values removes both the unsaved badge and page-leave protection", async ({ page }) => {
  const dialog = await companyDialog(page);
  const isProtected = () => page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));
  expect(await isProtected()).toBe(false);
  await dialog.getByLabel("Legal entity *").fill("Temporary");
  await expect(dialog.locator(".modal-unsaved")).toHaveText("Unsaved changes"); expect(await isProtected()).toBe(true);
  await dialog.getByLabel("Legal entity *").fill("");
  await expect(dialog.locator(".modal-unsaved")).toHaveCount(0); expect(await isProtected()).toBe(false);
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden(); expect(prompts).toBe(0);
});
test("status reorder is protected without typing and discard preserves stored statuses", async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await openOutstandingMore(page); await page.getByRole("button", { name: "Statuses and colours", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Move status down" }).first().click();
  await expect(dialog.locator(".modal-unsaved")).toHaveText("Unsaved changes");
  page.once("dialog", (prompt) => prompt.accept()); await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden(); expect(await readStoredWorkspace(page)).toEqual(before);
});

test("failed save stays protected and a successful save clears the draft guard", async ({ page }) => {
  const dialog = await companyDialog(page); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Entity type (optional)").fill("Fictional type");
  await dialog.getByRole("button", { name: "Create company", exact: true }).click();
  await expect(dialog.locator(".modal-unsaved")).toHaveText("Unsaved changes");
  await expect(dialog.getByLabel("Legal entity *")).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog.getByLabel("Legal entity *").fill("Saved Example Limited");
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog.getByRole("button", { name: "Create company", exact: true }).click();
  await expect(dialog).toBeHidden(); expect(prompts).toBe(0);
  expect((await readStoredWorkspace(page)).entities.some((entity) => entity.legalName === "Saved Example Limited")).toBe(true);
  expect(await page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(false);
});
test("collapsing a required batch field cannot hide its validation focus", async ({ page }) => {
  const dialog = await companyDialog(page);
  await dialog.getByRole("button", { name: "Holding company batch" }).click();
  await dialog.getByLabel("Legal entity *").fill("Example Holdings");
  await dialog.locator(".advanced-section > summary").click();
  await dialog.locator("button[type=submit]").click();
  await expect(dialog.locator(".advanced-section")).toHaveAttribute("open");
  await expect(dialog.locator(".group-batch-list input").first()).toBeFocused();
});

test("Tab trapping includes a disclosure summary when other form controls are disabled", async ({ page }) => {
  const dialog = await companyDialog(page);
  await dialog.locator("form").evaluate((form) => form.querySelectorAll("input,select,textarea,button").forEach((element) => { element.disabled = true; }));
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  const summary = dialog.locator(".advanced-section > summary");
  await close.focus(); await page.keyboard.press("Shift+Tab"); await expect(summary).toBeFocused();
  await page.keyboard.press("Tab"); await expect(close).toBeFocused();
});

test("calendar Escape dismisses the calendar before the guarded annual editor", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Edit annual engagement" }).click();
  const dialog = page.getByRole("dialog", { name: /Edit annual engagement/ });
  await dialog.getByLabel("Owner", { exact: true }).fill("Draft owner");
  await dialog.getByRole("button", { name: "Choose project date range" }).click();
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await page.keyboard.press("Escape"); await expect(dialog.locator(".schedule-range-calendar")).toHaveCount(0);
  await expect(dialog).toBeVisible(); expect(prompts).toBe(0);
  await page.keyboard.press("Escape"); await expect(dialog).toBeVisible(); expect(prompts).toBe(1);
});
for (const editor of ["template", "group", "categories"]) {
  test(`${editor} configuration protects structural or text edits on cancel`, async ({ page }) => {
    await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
    await page.getByRole("button", { name: "Template library" }).click();
    if (editor === "group") await page.getByRole("dialog").getByRole("tab").last().click();
    if (editor === "categories") await page.getByRole("dialog").getByRole("button", { name: "Manage categories" }).click();
    else await page.getByRole("dialog").locator(".sample-library-card").first().getByRole("button", { name: "Edit template" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('form input:not([type="checkbox"])').first().fill("Changed example configuration");
    let prompts = 0; const reject = async (prompt) => { prompts++; await prompt.dismiss(); };
    page.on("dialog", reject); await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog.locator(".modal-unsaved")).toHaveText("Unsaved changes"); expect(prompts).toBe(1);
    page.off("dialog", reject); page.once("dialog", (prompt) => prompt.accept());
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Template library" })).toBeVisible();
    expect(await readStoredWorkspace(page)).toEqual(before);
  });
}

for (const width of [480, 1440]) {
  test(`protected template actions remain accessible and aligned at ${width}px`, async ({ page }, testInfo) => {
    const dialog = await templateDialog(page); await page.setViewportSize({ width, height: 560 });
    await dialog.getByLabel("Template name *").fill("Draft template");
    await expect(dialog.getByRole("button", { name: "Save template", exact: true })).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeInViewport();
    const body = await dialog.locator(".workbench-modal-body").evaluate((node) => ({ width: node.clientWidth, scroll: node.scrollWidth }));
    expect(body.scroll).toBeLessThanOrEqual(body.width + 1);
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
    const save = await dialog.getByRole("button", { name: "Save template", exact: true }).boundingBox();
    const bounds = await dialog.boundingBox();
    expect(save.y + save.height).toBeLessThanOrEqual(bounds.y + bounds.height - 2);
    await page.screenshot({ path: testInfo.outputPath(`editor-safety-${width}.png`) });
  });
}
test("a gesture starting inside the editor and ending on the backdrop is not a close request", async ({ page }) => {
  const dialog = await companyDialog(page); const field = dialog.getByLabel("Legal entity *");
  const box = await field.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
  await page.mouse.move(2, 2, { steps: 3 }); await page.mouse.up();
  await expect(dialog).toBeVisible();
});

test("switching from a dirty annual editor to a new year also requires discard confirmation", async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Edit annual engagement" }).click();
  const dialog = page.getByRole("dialog", { name: /Edit annual engagement/ });
  await dialog.getByLabel("Owner", { exact: true }).fill("Unsaved owner");
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog.locator(".period-create-another").last().click();
  await expect(dialog).toBeVisible(); expect(prompts).toBe(1);
  await expect(dialog.getByLabel("Owner", { exact: true })).toHaveValue("Unsaved owner");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("a focused field near the end of a long template is not covered by its action footer", async ({ page }) => {
  const dialog = await templateDialog(page);
  await page.setViewportSize({ width: 480, height: 560 });
  const field = dialog.locator('.sample-condition-editor input').last();
  await field.focus(); await expect(field).toBeFocused();
  const footer = await dialog.locator('.sample-editor-actions').boundingBox();
  const box = await field.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(footer.y + 1);
});
