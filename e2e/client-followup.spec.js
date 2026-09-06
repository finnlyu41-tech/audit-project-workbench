import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { clientFollowupFixture } from '../tests/fixtures/client-followup.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
const dialog = (page) => page.getByRole('dialog', { name: 'Client follow-up draft', exact: true });
const preview = (page) => dialog(page).getByRole('textbox', { name: 'Follow-up draft (editable)', exact: true });
const generate = (page) => dialog(page).getByRole('button', { name: 'Generate follow-up draft', exact: true });
async function openDraft(page, group = false, fixture = clientFollowupFixture()) {
  await openWorkbench(page, fixture.store);
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const query = page.getByRole('dialog').getByRole('combobox');
  await query.fill(group ? 'overview holding 2026' : 'overview 2025'); await query.press('Enter');
  await page.getByRole('button', { name: 'Client follow-up draft', exact: true }).click();
  await expect(dialog(page)).toBeVisible(); return fixture;
}
async function generateFirst(page) {
  await dialog(page).getByRole('checkbox', { name: /signed accounts/ }).check(); await generate(page).click();
}
async function downloadText(page) {
  const waiting = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Download text draft', exact: true }).click();
  return fs.readFile(await (await waiting).path(), 'utf8');
}
test('draft starts unselected, excludes internal fields and downloads exactly the editable preview', async ({ page }) => {
  await openDraft(page); const before = await readStoredWorkspace(page);
  await expect(generate(page)).toBeDisabled(); await expect(dialog(page).getByRole('checkbox')).toHaveCount(2);
  await generateFirst(page); await expect(preview(page)).toBeFocused(); const text = await preview(page).inputValue();
  expect(text).toContain('请提供签署账目'); expect(text).toContain('2025'); expect(text).toContain('2026');
  expect(text).not.toMatch(/PRIVATE_|INTERNAL_|PARENT_ONLY|CLOSED_ITEM|shared-item/);
  expect(text).not.toContain('bank reconciliation');
  await preview(page).fill(text + '\nReviewed wording for this client.');
  expect(await downloadText(page)).toBe(text + '\nReviewed wording for this client.');
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog(page).locator('.modal-actions').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
});
test('group draft requires one explicit source and shared item IDs cannot mix companies', async ({ page }) => {
  const fixture = await openDraft(page, true); const before = await readStoredWorkspace(page);
  const source = dialog(page).getByRole('combobox', { name: 'Source company and engagement', exact: true });
  await expect(source).toHaveValue(''); await expect(generate(page)).toBeDisabled();
  await source.selectOption(fixture.groupId);
  await dialog(page).getByRole('checkbox', { name: 'PARENT_ONLY_REQUEST', exact: true }).check(); await generate(page).click();
  expect(await preview(page).inputValue()).not.toContain('请提供签署账目');
  await source.selectOption(fixture.sourceId); await expect(preview(page)).toHaveCount(0);
  await expect(dialog(page).getByRole('checkbox', { checked: true })).toHaveCount(0);
  await generateFirst(page); expect(await preview(page).inputValue()).not.toContain('PARENT_ONLY_REQUEST');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('manual draft edits are protected when switching sources or closing', async ({ page }) => {
  const fixture = await openDraft(page, true); const source = dialog(page).getByRole('combobox', { name: 'Source company and engagement', exact: true });
  await source.selectOption(fixture.sourceId); await generateFirst(page); await preview(page).fill('Manual draft to preserve');
  page.once('dialog', (prompt) => prompt.dismiss()); await source.selectOption(fixture.groupId);
  await expect(source).toHaveValue(fixture.sourceId); await expect(preview(page)).toHaveValue('Manual draft to preserve');
  page.once('dialog', (prompt) => prompt.dismiss()); await page.keyboard.press('Escape');
  await expect(preview(page)).toHaveValue('Manual draft to preserve');
  page.once('dialog', (prompt) => prompt.accept()); await source.selectOption(fixture.groupId);
  await expect(preview(page)).toHaveCount(0); await expect(source).toHaveValue(fixture.groupId);
});
test('copy rejection does not claim success and offers the exact text for manual copy or download', async ({ page }) => {
  await openDraft(page); await generateFirst(page); const expected = await preview(page).inputValue();
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: async () => { throw new DOMException('Synthetic permission denial', 'NotAllowedError'); } } }));
  await dialog(page).getByRole('button', { name: 'Copy draft', exact: true }).click();
  await expect(dialog(page).locator('.followup-notice[role=status]')).toContainText('Copy did not complete'); await expect(preview(page)).toBeFocused();
  expect(await preview(page).evaluate((el) => el.selectionEnd - el.selectionStart)).toBe(expected.length);
  expect(await downloadText(page)).toBe(expected);
});
test('copy success uses the explicit preview only and does not change the workspace', async ({ page }) => {
  await openDraft(page); const before = await readStoredWorkspace(page); await generateFirst(page);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: async (text) => { window.syntheticClipboard = text; } } }));
  await dialog(page).getByRole('button', { name: 'Copy draft', exact: true }).click();
  await expect(dialog(page).getByRole('status')).toContainText('Draft copied; nothing has been sent');
  expect(await page.evaluate(() => window.syntheticClipboard)).toBe(await preview(page).inputValue());
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('view-source action returns to the exact original item without modifying records', async ({ page }) => {
  await openDraft(page); const before = await readStoredWorkspace(page);
  await dialog(page).getByRole('button', { name: /View source item.*bank reconciliation/ }).click();
  await expect(dialog(page)).toHaveCount(0); await expect(page.locator('.outstanding-item').filter({ hasText: 'bank reconciliation' })).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('selection and language changes discard only an unedited preview and require a fresh generation', async ({ page }) => {
  await openDraft(page); await generateFirst(page);
  await dialog(page).getByRole('checkbox', { name: /bank reconciliation/ }).check();
  await expect(preview(page)).toHaveCount(0); await generate(page).click();
  expect(await preview(page).inputValue()).toContain('bank reconciliation');
  await dialog(page).getByRole('combobox', { name: 'Draft language', exact: true }).selectOption('zh-Hans');
  await expect(preview(page)).toHaveCount(0); await generate(page).click();
  expect(await preview(page).inputValue()).toContain('主题：待提供资料跟进');
});
test('follow-up generation makes no upload request and keeps all business data unchanged', async ({ page }) => {
  const requests = []; page.on('request', (request) => { if (!['GET', 'HEAD'].includes(request.method())) requests.push(request.url()); });
  await openDraft(page); const before = await readStoredWorkspace(page);
  await dialog(page).getByRole('button', { name: 'Select all open items in this source', exact: true }).click();
  await generate(page).click(); const text = await downloadText(page);
  expect(text).toContain('bank reconciliation'); expect(text).not.toContain('PRIVATE_');
  expect(await readStoredWorkspace(page)).toEqual(before); expect(requests).toEqual([]);
});
for (const [language, name, subject] of [['en', 'Client follow-up draft', 'Subject: Outstanding information request'],
  ['zh-Hans', '客户跟进草稿', '主题：待提供资料跟进'], ['zh-Hant', '客戶跟進草稿', '主旨：待提供資料跟進']]) {
  test(`follow-up preview is contained, accessible and downloadable at 480px in ${language}`, async ({ page }, info) => {
    const fixture = clientFollowupFixture(); await openWorkbench(page, fixture.store);
    await page.evaluate((value) => localStorage.setItem('audit-progress-workbench:language', value), language); await page.reload();
    await page.keyboard.press('Control+k');
    const search = page.getByRole('dialog').getByRole('combobox');
    await search.fill('overview 2025'); await search.press('Enter');
    const trigger = page.locator('[data-followup-open]'); await expect(trigger).toHaveAccessibleName(name); await trigger.click();
    const modal = page.getByRole('dialog'); await page.setViewportSize({ width: 480, height: 640 });
    await modal.getByRole('checkbox', { name: /signed accounts/ }).check(); await modal.locator('button[type=submit]').click();
    await expect(modal.locator('.followup-preview textarea')).toContainText(subject);
    const geometry = await modal.evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
    for (const select of await modal.locator('select').all()) expect((await select.boundingBox()).height).toBe(42);
    const actions = modal.locator('.modal-actions'); await actions.scrollIntoViewIfNeeded();
    for (const button of await actions.getByRole('button').all()) await expect(button).toBeInViewport({ ratio: 1 });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    const wait = page.waitForEvent('download'); await actions.locator('button').last().click();
    const text = await fs.readFile(await (await wait).path(), 'utf8'); expect(text).toContain(subject); expect(text).not.toMatch(/PRIVATE_|INTERNAL_/);
    await page.screenshot({ path: info.outputPath(`followup-${language}.png`) });
  });
}
test('consecutive new items feed a client draft directly without copying their internal notes', async ({ page }) => {
  await openDraft(page); await dialog(page).locator('.modal-actions').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Add outstanding item', exact: true }).click();
  const entry = page.getByRole('dialog', { name: 'Add outstanding item', exact: true });
  await entry.getByLabel('Outstanding item *').fill('New client request A');
  await entry.getByRole('textbox', { name: 'Description', exact: true }).fill('PRIVATE_NEW_INTERNAL_NOTE');
  await entry.getByRole('button', { name: 'Save and add another', exact: true }).click();
  await entry.getByLabel('Outstanding item *').fill('New client request B');
  await entry.getByRole('button', { name: 'Save outstanding item', exact: true }).click();
  const beforeDraft = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Client follow-up draft', exact: true }).click();
  await dialog(page).getByRole('checkbox', { name: 'New client request A', exact: true }).check();
  await dialog(page).getByRole('checkbox', { name: 'New client request B', exact: true }).check(); await generate(page).click();
  const text = await downloadText(page); expect(text).toContain('New client request A'); expect(text).toContain('New client request B');
  expect(text).not.toMatch(/PRIVATE_|INTERNAL_|signed accounts|bank reconciliation/);
  expect(await readStoredWorkspace(page)).toEqual(beforeDraft);
});
test('an empty or archived source never becomes a populated client draft', async ({ page }) => {
  const fixture = clientFollowupFixture();
  fixture.store.engagements.find((e) => e.id === fixture.sourceId).archived = true;
  const parent = fixture.store.engagements.find((e) => e.id === fixture.groupId); parent.outstandingItems[0].status = 'resolved';
  await openDraft(page, true, fixture);
  const source = dialog(page).getByRole('combobox', { name: 'Source company and engagement', exact: true });
  expect(await source.locator('option').evaluateAll((options) => options.map((option) => option.value))).not.toContain(fixture.sourceId);
  await source.selectOption(fixture.groupId); await expect(dialog(page).getByRole('checkbox')).toHaveCount(0);
  await expect(generate(page)).toBeDisabled(); await expect(dialog(page)).toContainText('no open items to follow up');
});
