import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { outstandingCenterFixture } from '../tests/fixtures/outstanding-center.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
const dialog = page => page.getByRole('dialog', { name: 'Client follow-up draft', exact: true });
const body = page => dialog(page).getByLabel('Follow-up draft (subject and body)');
async function open(page, group = false) {
  await openWorkbench(page, outstandingCenterFixture());
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const query = page.getByRole('dialog', { name: 'Quick open', exact: true }).getByRole('combobox');
  await query.fill(group ? 'overview holding 2026' : 'overview 2025'); await query.press('Enter');
  if (await page.locator('.outstanding-rail-toggle').isVisible()) await page.locator('.outstanding-rail-toggle').click();
  const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Client follow-up draft', exact: true }).click();
  return before;
}
async function generate(page) {
  await dialog(page).getByRole('button', { name: 'Select all open items in this engagement' }).click();
  await dialog(page).getByRole('button', { name: 'Generate preview', exact: true }).click();
}
test('preview and real text download contain only explicitly chosen source titles and do not change records', async ({ page }) => {
  const before = await open(page); await expect(dialog(page).getByRole('button', { name: 'Generate preview' })).toBeDisabled();
  await dialog(page).getByRole('checkbox', { name: 'Follow up on the final confirmation', exact: true }).check();
  await dialog(page).getByRole('button', { name: 'Generate preview' }).click();
  const text = await body(page).inputValue(); expect(text).toContain('Follow up on the final confirmation');
  for (const privateText of ['NONINDEXEDCONFIDENTIALNOTE', 'Morgan Parent', 'Parent approval confirmation', 'Previously resolved']) expect(text).not.toContain(privateText);
  await expect(dialog(page).getByRole('button', { name: 'Download text draft' })).toBeDisabled();
  await dialog(page).getByRole('checkbox', { name: 'I have checked the source and draft content before copying or downloading.' }).check();
  const download = page.waitForEvent('download'); await dialog(page).getByRole('button', { name: 'Download text draft' }).click();
  const file = await download; expect(await fs.readFile(await file.path(), 'utf8')).toBe(text);
  expect(file.suggestedFilename()).toMatch(/^apw-client-follow-up-.*\.txt$/);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('group draft requires a single source and never mixes identical item IDs across companies', async ({ page }) => {
  const before = await open(page, true);
  const select = dialog(page).getByLabel('Source company and annual engagement');
  await expect(select).toHaveValue(''); await expect(dialog(page).getByRole('button', { name: 'Generate preview' })).toBeDisabled();
  await select.selectOption('overview-group'); await generate(page);
  await expect(body(page)).toHaveValue(/Parent approval confirmation/);
  expect(await body(page).inputValue()).not.toContain('Follow up on the final confirmation');
  await select.selectOption('overview-combined'); await expect(body(page)).toHaveCount(0);
  await expect(dialog(page).locator('.follow-up-items input:checked')).toHaveCount(0);
  await generate(page); expect(await body(page).inputValue()).not.toContain('Parent approval confirmation');
  expect(await body(page).inputValue()).toContain('2025'); expect(await body(page).inputValue()).toContain('2026');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('manual edits reset review and rejected source changes retain the entire draft', async ({ page }) => {
  await open(page, true); const select = dialog(page).getByLabel('Source company and annual engagement');
  await select.selectOption('overview-group'); await generate(page);
  const review = dialog(page).getByRole('checkbox', { name: 'I have checked the source and draft content before copying or downloading.' });
  await review.check(); await body(page).fill('User amended wording'); await expect(review).not.toBeChecked();
  page.once('dialog', prompt => prompt.dismiss()); await select.selectOption('overview-combined');
  await expect(select).toHaveValue('overview-group'); await expect(body(page)).toHaveValue('User amended wording');
  page.once('dialog', prompt => prompt.dismiss()); await page.keyboard.press('Escape'); await expect(body(page)).toBeVisible();
  page.once('dialog', prompt => prompt.accept()); await select.selectOption('overview-combined');
  await expect(body(page)).toHaveCount(0);
});
test('copy failures remain explicit and a successful copy uses only the reviewed text', async ({ page }) => {
  const before = await open(page); await generate(page);
  await dialog(page).getByRole('checkbox', { name: 'I have checked the source and draft content before copying or downloading.' }).check();
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic denial'); } } }));
  await dialog(page).getByRole('button', { name: 'Copy draft' }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('Automatic copying failed'); await expect(body(page)).toBeFocused();
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.syntheticCopiedText = text; } } }));
  await dialog(page).getByRole('button', { name: 'Copy draft' }).click();
  await expect(dialog(page).getByRole('status')).toContainText('Nothing has been sent');
  expect(await page.evaluate(() => window.syntheticCopiedText)).toBe(await body(page).inputValue());
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('changing the source item through the backing UI invalidates an open preview', async ({ page }) => {
  await open(page); await generate(page);
  await dialog(page).getByRole('checkbox', { name: 'I have checked the source and draft content before copying or downloading.' }).check();
  // Simulate another UI update, not a claim of cross-tab synchronization.
  await page.locator('.outstanding-item').filter({ hasText: 'Follow up on the final confirmation' }).locator('select').evaluate(select => {
    select.value = 'resolved'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(dialog(page).getByRole('alert')).toContainText('Source information changed');
  await expect(dialog(page).getByRole('button', { name: 'Download text draft' })).toBeDisabled();
  await expect(dialog(page).getByRole('button', { name: 'Copy draft' })).toBeDisabled();
});
test('a source link leaves the draft and focuses the exact original item', async ({ page }) => {
  const before = await open(page, true); await dialog(page).getByLabel('Source company and annual engagement').selectOption('overview-combined');
  await dialog(page).getByRole('button', { name: 'View source item：Follow up on the final confirmation', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('.outstanding-item').filter({ hasText: 'Follow up on the final confirmation' })).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('cleared and archived items are not offered and generation makes no data requests', async ({ page }) => {
  const before = await open(page);
  await expect(dialog(page).getByRole('checkbox', { name: 'Previously resolved confirmation' })).toHaveCount(0);
  const requests = []; page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType()) || request.method() !== 'GET') requests.push(request.url());
  });
  await generate(page); expect(requests).toEqual([]); expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const [language, label] of [['en', 'Client follow-up draft'], ['zh-Hans', '客户跟进草稿'], ['zh-Hant', '客戶跟進草稿']]) {
  test(`client draft has readable sources and reachable actions at 480px in ${language}`, async ({ page }, info) => {
    await open(page); await page.getByRole('dialog').locator('[data-modal-close]').click();
    await page.locator('.language-summary').click();
    await page.locator('.language-menu > button').nth({ 'zh-Hans': 0, 'zh-Hant': 1, en: 2 }[language]).click();
    await page.locator('.outstanding-followup-trigger').click();
    await page.setViewportSize({ width: 480, height: 640 }); const surface = page.getByRole('dialog', { name: label, exact: true });
    await surface.locator('.follow-up-items > header button').first().click();
    await surface.locator('.follow-up-preview-action').click();
    const text = surface.locator('.follow-up-preview textarea'); await expect(text).toBeVisible();
    const value = await text.inputValue(); expect(value).toContain('Follow up on the final confirmation');
    expect(value).not.toContain('NONINDEXEDCONFIDENTIALNOTE');
    await surface.locator('.follow-up-review input').check();
    for (const select of await surface.locator('select').all()) expect((await select.boundingBox()).height).toBe(42);
    for (const button of await surface.locator('.modal-actions button').all()) {
      await button.scrollIntoViewIfNeeded(); await expect(button).toBeInViewport({ ratio: 1 });
    }
    expect(await surface.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze())).toEqual([]);
    await page.screenshot({ path: info.outputPath(`follow-up-${language}.png`) });
  });
}
