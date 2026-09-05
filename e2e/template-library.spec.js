import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { templateLibraryFixture } from "../tests/fixtures/template-library.js";
import { openWorkbench, readStoredWorkspace, seriousViolations } from "./helpers.js";
const library = (page) => page.getByRole("dialog", { name: "Template library", exact: true });
async function openLibrary(page, store = templateLibraryFixture()) {
  await openWorkbench(page, store);
  await page.getByRole("button", { name: "Template library", exact: true }).click();
  await expect(library(page)).toBeVisible();
}
test("template names descriptions and version notes are not truncated at 480px", async ({ page }, testInfo) => {
  await openLibrary(page); await page.setViewportSize({ width: 480, height: 760 });
  await page.screenshot({ path: testInfo.outputPath("library-before.png") });
  const clipped = await library(page).locator(".sample-library-select strong, .sample-library-select small, .sample-library-metadata i")
    .evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent));
  expect(clipped).toEqual([]);
});
test("selected template state is exposed to keyboard and assistive technology", async ({ page }) => {
  await openLibrary(page);
  await expect(library(page).locator('.sample-library-card[data-selected] .sample-library-select')).toHaveAttribute("aria-pressed", "true");
});
test("saved template is revealed when its updated tags no longer match the old filter", async ({ page }) => {
  await openLibrary(page);
  await library(page).getByRole("combobox", { name: "Filter by tag" }).selectOption("review");
  await library(page).getByRole("button", { name: "Edit template", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit template", exact: true });
  await editor.getByLabel("Tags", { exact: true }).fill("updated");
  await editor.getByRole("button", { name: "Save template", exact: true }).click();
  await expect(library(page).locator('.sample-library-card').filter({ hasText: "Alpha Annual" })).toBeFocused();
});
test("search tag sort and category controls change only the library view", async ({ page }) => {
  await openLibrary(page); const before = await readStoredWorkspace(page);
  const query = library(page).getByRole("searchbox", { name: "Find templates in this category" });
  await query.fill("ＡＬＰＨＡ ２０２６ review");
  await expect(library(page).locator(".sample-library-card")).toHaveCount(1);
  await library(page).getByRole("combobox", { name: "Filter by tag" }).selectOption("beta");
  await expect(library(page).getByText("No templates match the filters", { exact: true })).toBeVisible();
  await expect(library(page).getByText("No templates yet", { exact: true })).toHaveCount(0);
  await library(page).getByRole("button", { name: "Clear template filters", exact: true }).first().click();
  await expect(query).toBeFocused(); await expect(query).toHaveValue("");
  await expect(library(page).locator(".sample-library-card")).toHaveCount(2);
  await library(page).getByRole("combobox", { name: "Sort templates" }).selectOption("name");
  await query.fill("NOTINDEXEDSTAGETEXT");
  await expect(library(page).locator(".sample-library-card")).toHaveCount(0);
  await query.fill("beta 2025"); await expect(library(page).locator(".sample-library-card")).toHaveCount(1);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("duplicating a filtered template reveals its actual copy without altering engagement work", async ({ page }) => {
  await openLibrary(page); const before = await readStoredWorkspace(page);
  await library(page).getByRole("searchbox").fill("beta");
  await library(page).getByRole("button", { name: "Duplicate template", exact: true }).click();
  const after = await readStoredWorkspace(page);
  const copy = after.samples.find((item) => !before.samples.some((source) => source.id === item.id));
  expect(copy).toBeTruthy(); expect(after.engagements).toEqual(before.engagements); expect(after.entities).toEqual(before.entities);
  await expect(library(page).locator(`[data-template-id="${copy.id}"]`)).toBeFocused();
  await expect(library(page).getByRole("searchbox")).toHaveValue("");
});
test("cancel preserves search and tag filters while the existing draft guard protects changes", async ({ page }) => {
  await openLibrary(page); const before = await readStoredWorkspace(page);
  await library(page).getByRole("searchbox").fill("alpha");
  await library(page).getByRole("combobox", { name: "Filter by tag" }).selectOption("review");
  await library(page).getByRole("button", { name: "Edit template", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit template", exact: true });
  await editor.getByLabel("Tags", { exact: true }).fill("unsaved");
  page.once("dialog", (prompt) => prompt.dismiss());
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor.getByLabel("Tags", { exact: true })).toHaveValue("unsaved");
  page.once("dialog", (prompt) => prompt.accept());
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(library(page).getByRole("searchbox")).toHaveValue("alpha");
  await expect(library(page).getByRole("combobox", { name: "Filter by tag" })).toHaveValue("review");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("group template saves clear stale metadata filters and affect templates only", async ({ page }) => {
  await openLibrary(page); const before = await readStoredWorkspace(page);
  await library(page).getByRole("tab", { name: "Holding company templates", exact: true }).click();
  await library(page).getByRole("searchbox").fill("holding 2026");
  await library(page).getByRole("combobox", { name: "Filter by tag" }).selectOption("review");
  await library(page).getByRole("button", { name: "Edit template", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit holding company template", exact: true });
  await editor.getByLabel("Tags", { exact: true }).fill("updated-group");
  await editor.getByRole("button", { name: "Save holding company template", exact: true }).click();
  await expect(library(page).locator('[data-template-id="library-group"]')).toBeFocused();
  const after = await readStoredWorkspace(page); expect(after.engagements).toEqual(before.engagements); expect(after.samples).toEqual(before.samples);
});
test("choosing a default template changes only the saved preference", async ({ page }) => {
  await openLibrary(page); const before = await readStoredWorkspace(page);
  const button = library(page).locator('[data-template-id="library-beta"] .sample-library-select');
  await button.focus(); await button.press("Enter"); await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(library(page).locator('[data-template-id="library-alpha"] .sample-library-select')).toHaveAttribute("aria-pressed", "false");
  const after = await readStoredWorkspace(page);
  expect(after.selectedSampleIdsByCategory.audit).toBe("library-beta");
  expect(after.engagements).toEqual(before.engagements); expect(after.samples).toEqual(before.samples);
});
test("a new template remains visible after saving under a nonmatching tag", async ({ page }) => {
  await openLibrary(page); const before = await readStoredWorkspace(page);
  await library(page).getByRole("combobox", { name: "Filter by tag" }).selectOption("beta");
  await library(page).getByRole("button", { name: "New template", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New template", exact: true });
  await editor.getByLabel("Template name *", { exact: true }).fill("New fictional procedure");
  await editor.getByRole("button", { name: "Save template", exact: true }).click();
  await expect(library(page).locator(".sample-library-card").filter({ hasText: "New fictional procedure" })).toBeFocused();
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
});
test("a genuinely empty category retains its creation action and deletion still requires confirmation", async ({ page }) => {
  await openLibrary(page); const before = await readStoredWorkspace(page);
  await library(page).getByRole("tab", { name: "Bookkeeping", exact: true }).click();
  await expect(library(page).getByText("No templates yet", { exact: true })).toBeVisible();
  await library(page).getByRole("tab", { name: "Audit", exact: true }).click();
  page.once("dialog", (prompt) => prompt.dismiss());
  await library(page).locator('[data-template-id="library-beta"]').getByRole("button", { name: "Delete template" }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const width of [480, 800, 1440]) {
  test(`business and group libraries fit with aligned actions at ${width}px`, async ({ page }, testInfo) => {
    await openLibrary(page); await page.setViewportSize({ width, height: 760 });
    for (const group of [false, true]) {
      if (group) await library(page).getByRole("tab", { name: "Holding company templates", exact: true }).click();
      const body = await library(page).locator(".workbench-modal-body").evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
      expect(body.scroll).toBeLessThanOrEqual(body.client + 1);
      const fields = await library(page).locator(".template-library-tools input, .template-library-tools select")
        .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
      expect(fields).toEqual([42, 42, 42]);
      const card = library(page).locator(".sample-library-card").first();
      const select = card.locator(".sample-library-select"); await select.focus();
      for (const button of await card.locator("footer button").all()) {
        expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(36);
        expect(await button.evaluate((element) => getComputedStyle(element).alignItems)).toBe("center");
      }
      const clipped = await card.locator("strong, small, em, .sample-library-metadata i")
        .evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent));
      expect(clipped).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`library-${group ? "group" : "business"}-${width}.png`) });
      expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
    }
  });
}
