import { openOutstandingFilters, openOutstandingMore, expandOutstandingItem } from './outstanding-helpers.js';
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { outstandingCenterFixture } from "../tests/fixtures/outstanding-center.js";
import { openWorkbench, readStoredWorkspace, seriousViolations } from "./helpers.js";

const center = (page) => page.locator(".outstanding-center");
async function openCenter(page, store = outstandingCenterFixture(), term = "overview 2025", includeArchived = false) {
  await openWorkbench(page, store);
  await page.getByRole("button", { name: "Quick open", exact: true }).click();
  const query = page.getByRole("dialog", { name: "Quick open" }).getByRole("combobox");
  if (includeArchived) await page.getByRole("dialog", { name: "Quick open" }).getByRole("checkbox").check();
  await query.fill(term); await query.press("Enter");
  if (await page.locator(".outstanding-rail-toggle").isVisible()) await page.locator(".outstanding-rail-toggle").click();
  await expect(center(page)).toBeVisible(); await openOutstandingFilters(page);
}
test("long outstanding text and status controls fit the sidebar", async ({ page }, testInfo) => {
  await openCenter(page);
  await page.screenshot({ path: testInfo.outputPath("outstanding-layout.png") });
  const bounds = await center(page).locator(".outstanding-list").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
  for (const select of await center(page).locator(".outstanding-tools-panel select").all()) expect((await select.boundingBox()).height).toBe(42);
  for (const select of await center(page).locator(".outstanding-status-chip select").all()) expect((await select.boundingBox()).height).toBeGreaterThanOrEqual(36);
});
test("saving a new item clears old closed filters and focuses the saved card", async ({ page }) => {
  await openCenter(page); await center(page).getByRole("button", { name: /Cleared \/ archived/ }).click();
  await center(page).getByRole("button", { name: "Add outstanding item", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add outstanding item" });
  await dialog.getByLabel("Outstanding item *").fill("Newly saved confirmation");
  await dialog.getByRole("button", { name: "Save outstanding item" }).click();
  await expect(center(page).locator(".outstanding-item").filter({ hasText: "Newly saved confirmation" })).toBeFocused();
});
test("closing an item from the open list moves keyboard focus to the next item", async ({ page }) => {
  await openCenter(page);
  const first = center(page).locator(".outstanding-item").first();
  await first.locator("select").focus(); await first.locator("select").selectOption("resolved");
  await expect(center(page).locator(".outstanding-item").filter({ hasText: "Follow up on the final confirmation" }).locator("select")).toBeFocused();
});
test("combined search, module and status filters change only the view", async ({ page }) => {
  await openCenter(page); const before = await readStoredWorkspace(page);
  const search = center(page).getByRole("searchbox", { name: "Find outstanding items" });
  await search.fill("ｆｉｎａｌ ａｌｅｘ");
  await expect(center(page).locator(".outstanding-item")).toHaveCount(1);
  await center(page).getByRole("combobox", { name: "Filter by outstanding status" }).selectOption("long-review");
  await expect(center(page).locator(".outstanding-item")).toHaveCount(0);
  await center(page).getByRole("button", { name: "Reset to open items", exact: true }).first().click();
  await expect(search).toBeFocused(); await expect(search).toHaveValue("");
  await expect(center(page).locator(".outstanding-item")).toHaveCount(2);
  await search.fill("NONINDEXEDCONFIDENTIALNOTE");
  await expect(center(page).locator(".outstanding-item")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("editing a filtered subsidiary item reveals only its own saved card in the holding view", async ({ page }) => {
  await openCenter(page, outstandingCenterFixture(), "overview holding 2026");
  const before = await readStoredWorkspace(page);
  const search = center(page).getByRole("searchbox"); await search.fill("signed alex");
  await expandOutstandingItem(center(page).locator(".outstanding-item").first());
  await center(page).getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit outstanding item" });
  await dialog.getByLabel("Outstanding item *").fill("Subsidiary changed title");
  await dialog.getByRole("button", { name: "Save outstanding item" }).click();
  await expect(search).toHaveValue("");
  await expect(page.locator(".detail-title > p")).toContainText("Overview Holding Limited");
  const focused = center(page).locator('.outstanding-item[data-revealed="true"]');
  await expect(focused).toHaveCount(1); await expect(focused).toBeFocused();
  await expect(focused).toContainText("Subsidiary changed title");
  const after = await readStoredWorkspace(page);
  expect(after.engagements.find((item) => item.id === "overview-group")).toEqual(before.engagements.find((item) => item.id === "overview-group"));
  const edited = after.engagements.find((item) => item.id === "overview-combined");
  const original = before.engagements.find((item) => item.id === edited.id);
  expect(edited.workstreams).toEqual(original.workstreams);
  expect(edited.reportingPeriods).toEqual(original.reportingPeriods);
  expect(edited.outstandingItems[1]).toEqual(original.outstandingItems[1]);
});
test("refusing to discard an edit keeps both the draft and its source filters", async ({ page }) => {
  await openCenter(page); const before = await readStoredWorkspace(page);
  await center(page).getByRole("searchbox").fill("final alex");
  await expandOutstandingItem(center(page).locator(".outstanding-item").first());
  const editTrigger = center(page).getByRole("button", { name: "Edit", exact: true });
  await editTrigger.focus(); await editTrigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Edit outstanding item" });
  const name = dialog.getByLabel("Outstanding item *"); await name.fill("Unsaved draft");
  page.once("dialog", (prompt) => prompt.dismiss());
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(name).toHaveValue("Unsaved draft");
  page.once("dialog", (prompt) => prompt.accept());
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(center(page).getByRole("searchbox")).toHaveValue("final alex");
  await expect(center(page).getByRole("button", { name: "Edit", exact: true })).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("deletion confirmation protects records and removal restores a usable focus target", async ({ page }) => {
  await openCenter(page); const before = await readStoredWorkspace(page);
  await center(page).getByRole("searchbox").fill("final alex");
  await expandOutstandingItem(center(page).locator(".outstanding-item").first());
  await center(page).getByRole("button", { name: "More item actions", exact: true }).click();
  page.once("dialog", (prompt) => prompt.dismiss());
  await center(page).getByRole("button", { name: "Delete", exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
  page.once("dialog", (prompt) => prompt.accept());
  await center(page).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(center(page).getByRole("searchbox")).toBeFocused();
  await expect(center(page).locator(".outstanding-item")).toHaveCount(0);
  const after = await readStoredWorkspace(page);
  expect(after.engagements.find((item) => item.id === "overview-combined").outstandingItems).toHaveLength(2);
  expect(after.engagements.find((item) => item.id === "overview-combined").workstreams)
    .toEqual(before.engagements.find((item) => item.id === "overview-combined").workstreams);
});
test("source links reset stale navigation filters and focus the selected subsidiary item", async ({ page }) => {
  await openCenter(page, outstandingCenterFixture(), "overview holding 2026");
  const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Open navigation filters" }).click();
  await page.getByRole("combobox", { name: "Owner filter" }).selectOption("Morgan Parent");
  await center(page).getByRole("searchbox").fill("final alex");
  await expandOutstandingItem(center(page).locator(".outstanding-item").first());
  await center(page).locator(".outstanding-source button").click();
  await expect(center(page).locator(".outstanding-item").filter({ hasText: "Follow up on the final confirmation" })).toBeFocused();
  await expect(page.locator(".detail-title > p")).toContainText("Overview Example International Limited");
  await expect(page.getByRole("combobox", { name: "Owner filter" })).toHaveValue("");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("archived sources can be searched and opened without editable item controls", async ({ page }) => {
  await openCenter(page, outstandingCenterFixture(), "overview 2024", true);
  const before = await readStoredWorkspace(page);
  await center(page).getByRole("searchbox").fill("archived");
  const card = center(page).locator(".outstanding-item"); await expect(card).toHaveCount(1);
  await expect(card.locator("select, .outstanding-item-actions")).toHaveCount(0);
  await expect(center(page).getByRole("button", { name: "Add outstanding item", exact: true })).toHaveCount(0);
  await expandOutstandingItem(card); await card.locator(".outstanding-source button").click();
  await expect(page.locator(".archive-banner")).toBeVisible(); await expect(card).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("saving an explicitly cleared item reveals it in the cleared list without audit changes", async ({ page }) => {
  await openCenter(page); const before = await readStoredWorkspace(page);
  await center(page).getByRole("button", { name: "Add outstanding item", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add outstanding item" });
  await dialog.getByLabel("Outstanding item *").fill("Saved as cleared");
  await dialog.getByRole("combobox", { name: "Outstanding status", exact: true }).selectOption("resolved");
  await dialog.getByRole("button", { name: "Save outstanding item" }).click();
  await expect(center(page).getByRole("button", { name: /Cleared \/ archived/ })).toHaveAttribute("aria-pressed", "true");
  await expect(center(page).locator(".outstanding-item").filter({ hasText: "Saved as cleared" })).toBeFocused();
  const after = await readStoredWorkspace(page);
  expect(after.engagements.find((item) => item.id === "overview-combined").workstreams)
    .toEqual(before.engagements.find((item) => item.id === "overview-combined").workstreams);
});
for (const [width, height] of [[800, 560], [1024, 900], [1440, 900], [1920, 900]]) {
  test(`outstanding search and long item actions fit at ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height }); await openCenter(page);
    const box = await center(page).evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(box.scroll).toBeLessThanOrEqual(box.width + 1);
    const tabTexts = center(page).locator(".outstanding-visibility-tabs button > span");
    for (const label of await tabTexts.all()) expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    for (const field of await center(page).locator(".outstanding-tools-panel input, .outstanding-tools-panel select").all()) expect((await field.boundingBox()).height).toBe(42);
    const row = center(page).locator(".outstanding-item").first();
    await expandOutstandingItem(row);
    const edit = row.getByRole("button", { name: "Edit", exact: true }); await edit.focus();
    await expect(edit).toBeInViewport();
    const geometry = await row.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth,
      noteWidth: element.querySelector("p").clientWidth, noteScroll: element.querySelector("p").scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
    expect(geometry.noteScroll).toBeLessThanOrEqual(geometry.noteWidth + 1);
    expect((await edit.boundingBox()).height).toBeGreaterThanOrEqual(36);
    expect(await edit.evaluate((element) => getComputedStyle(element).alignItems)).toBe("center");
    await page.screenshot({ path: testInfo.outputPath(`outstanding-${width}.png`) });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
  });
}

// Aggregate lists must reveal a saved source item in the current list, not a hidden annual view.
const aggregateViews = { workspace: 'Home', schedule: 'Project schedule', report: 'Management reports' };
async function openAggregateCenter(page, scope) {
  // Leave a real annual selection behind before entering an aggregate view.
  await openCenter(page);
  if (scope === 'entity') {
    await page.getByRole('button', { name: 'Quick open', exact: true }).click();
    const picker = page.getByRole('dialog', { name: 'Quick open' });
    await picker.getByRole('combobox').fill('Overview Example');
    await picker.getByRole('option').filter({ hasText: 'Company master' }).click();
    await expect(page.locator('.entity-overview')).toBeVisible();
  } else {
    await page.locator('.app-rail').getByRole('button', { name: aggregateViews[scope], exact: true }).click();
  }
  await openOutstandingFilters(page);
}
async function assertOnlyOutstandingEdit(page, before, fields) {
  await expect.poll(async () => {
    const saved = (await readStoredWorkspace(page)).engagements.find(e => e.id === 'overview-combined').outstandingItems[0];
    return Object.fromEntries(Object.keys(fields).map(key => [key, saved[key]]));
  }).toEqual(fields);
  const after = await readStoredWorkspace(page);
  const edited = after.engagements.find(e => e.id === 'overview-combined');
  const saved = edited.outstandingItems[0];
  expect(Number.isFinite(Date.parse(saved.updatedAt))).toBe(true);
  expect(Number.isFinite(Date.parse(edited.updatedAt))).toBe(true);
  const expected = structuredClone(before);
  const expectedEngagement = expected.engagements.find(e => e.id === edited.id);
  expectedEngagement.updatedAt = edited.updatedAt;
  Object.assign(expectedEngagement.outstandingItems[0], fields, { updatedAt: saved.updatedAt });
  // Includes other years, masters, workflow completion, tax, group snapshots and shared item IDs.
  expect(after).toEqual(expected);
  return after;
}
for (const scope of ['workspace', 'entity', 'schedule', 'report']) {
  for (const status of ['long-review', 'resolved']) {
    test(`aggregate save keeps the edited item visible in the ${scope} list with ${status} status`, async ({ page }, testInfo) => {
      await openAggregateCenter(page, scope);
      const before = await readStoredWorkspace(page);
      const search = center(page).getByRole('searchbox');
      await search.fill('signed alex');
      await center(page).getByRole('combobox', { name: 'Filter by outstanding status' }).selectOption('long-review');
      const original = center(page).locator('.outstanding-item');
      await expect(original).toHaveCount(1); await expandOutstandingItem(original);
      await original.getByRole('button', { name: 'Edit', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Edit outstanding item' });
      const fields = { title: 'Confirmation reviewed in aggregate view', status };
      await dialog.getByLabel('Outstanding item *').fill(fields.title);
      await dialog.getByRole('combobox', { name: 'Outstanding status', exact: true }).selectOption(status);
      await dialog.getByRole('button', { name: 'Save outstanding item' }).click();
      const after = await assertOnlyOutstandingEdit(page, before, fields);
      await expect(search).toHaveValue('');
      await expect(center(page).getByRole('combobox', { name: 'Filter by outstanding status' })).toHaveValue('all');
      await expect(center(page).locator('.outstanding-visibility-tabs button').nth(status === 'resolved' ? 1 : 0))
        .toHaveAttribute('aria-pressed', 'true');
      const revealed = center(page).locator('.outstanding-item[data-revealed="true"]');
      await expect(revealed).toHaveCount(1); await expect(revealed).toContainText(fields.title);
      await expect(revealed).toBeFocused(); await expect(revealed).toBeInViewport();
      await expect(center(page).locator('[data-source-id="overview-combined"] .outstanding-item[data-revealed="true"]')).toHaveCount(1);
      if (scope === 'entity') await expect(page.locator('.entity-overview')).toBeVisible();
      else await expect(page.locator('.app-rail').getByRole('button', { name: aggregateViews[scope], exact: true })).toHaveAttribute('data-active', 'true');
      await page.screenshot({ path: testInfo.outputPath(`${scope}-${status}-saved.png`) });
      await page.reload();
      await expect(page.locator('.audit-workbench')).toBeVisible();
      expect(await readStoredWorkspace(page)).toEqual(after);
    });
  }
}
for (const scope of ['workspace', 'entity']) {
  test(`aggregate cancel preserves filters, focus and all records in the ${scope} list`, async ({ page }) => {
    await openAggregateCenter(page, scope); const before = await readStoredWorkspace(page);
    const search = center(page).getByRole('searchbox'); await search.fill('signed alex');
    const row = center(page).locator('.outstanding-item'); await expandOutstandingItem(row);
    const trigger = row.getByRole('button', { name: 'Edit', exact: true }); await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Edit outstanding item' });
    await dialog.getByLabel('Outstanding item *').fill('Unsaved aggregate draft');
    page.once('dialog', prompt => prompt.dismiss());
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog.getByLabel('Outstanding item *')).toHaveValue('Unsaved aggregate draft');
    page.once('dialog', prompt => prompt.accept());
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(search).toHaveValue('signed alex'); await expect(trigger).toBeFocused();
    expect(await readStoredWorkspace(page)).toEqual(before);
  });
  for (const [language, languageIndex, saveLabel] of [['en', 2, 'Save outstanding item'], ['zh-Hans', 0, '保存待清事项'], ['zh-Hant', 1, '儲存待清事項']]) {
    test(`aggregate saved-item reveal fits 480px in ${language} on the ${scope} list`, async ({ page }, testInfo) => {
      await openAggregateCenter(page, scope);
      await page.locator('.language-summary').click();
      await page.locator('.language-menu button').nth(languageIndex).click();
      await page.setViewportSize({ width: 480, height: 640 }); await openOutstandingFilters(page);
      const before = await readStoredWorkspace(page);
      await center(page).getByRole('searchbox').fill('signed alex');
      const row = center(page).locator('.outstanding-item'); await expect(row).toHaveCount(1);
      await expandOutstandingItem(row); await row.locator('.outstanding-item-actions > button').first().click();
      const dialog = page.locator('.workbench-modal');
      const title = 'Reviewed confirmation — 已核对';
      await dialog.locator('input[required]').fill(title);
      await dialog.getByRole('button', { name: saveLabel, exact: true }).click();
      await assertOnlyOutstandingEdit(page, before, { title });
      const revealed = center(page).locator('.outstanding-item[data-revealed="true"]');
      await expect(revealed).toHaveCount(1); await expect(revealed).toBeFocused(); await expect(revealed).toBeInViewport();
      await expect(revealed).toContainText(title);
      expect(await revealed.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${scope}-${language}-480-saved.png`) });
    });
  }
}
