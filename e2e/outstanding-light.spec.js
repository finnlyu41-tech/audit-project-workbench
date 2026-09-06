import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
import { openOutstandingFilters, openOutstandingMore, expandOutstandingItem } from './outstanding-helpers.js';
import { annualSourceFixture } from '../tests/fixtures/annual-source.js';
import { outstandingCenterFixture } from '../tests/fixtures/outstanding-center.js';
import { toTraditional } from '../src/dashboard/traditional.js';
const center = page => page.locator('.outstanding-center');
const rows = page => center(page).locator('.outstanding-item');
function fixture() {
  const f = annualSourceFixture(); const job = f.store.engagements.find(e => e.id === f.currentId);
  job.outstandingItems = Array.from({ length: 8 }, (_, i) => ({ id: `light-${i}`, title: `Fictional request ${i + 1}`,
    status: 'missing_document', note: `Private detail ${i + 1}`, workstreamId: null }));
  return f;
}
async function open(page, data = fixture()) {
  await openWorkbench(page, data.store);
  if (await page.locator('.outstanding-rail-toggle').isVisible()) await page.locator('.outstanding-rail-toggle').click();
  await expect(rows(page)).toHaveCount(8); return data;
}
test('default view prioritizes the list, not filters, notes or management controls', async ({ page }) => {
  await open(page); const before = await readStoredWorkspace(page);
  await expect(center(page).getByRole('searchbox')).toHaveCount(0);
  await expect(center(page).locator('.outstanding-tools-panel, .outstanding-more-actions, .outstanding-item-details')).toHaveCount(0);
  await expect(center(page).getByRole('button', { name: /^(Edit|Delete|Client follow-up draft)$/ })).toHaveCount(0);
  await expect(center(page).locator('.outstanding-context-summary strong')).toHaveCount(1);
  for (const row of await rows(page).all()) await expect(row.locator('.outstanding-item-toggle')).toHaveAttribute('aria-expanded', 'false');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('one explicit disclosure reveals notes and edit controls without changing records', async ({ page }) => {
  await open(page); const before = await readStoredWorkspace(page);
  const first = rows(page).nth(0); await first.locator('.outstanding-item-toggle').focus(); await page.keyboard.press('Enter');
  await expect(first.locator('.outstanding-note')).toHaveText('Private detail 1');
  await expect(first.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  await expandOutstandingItem(rows(page).nth(1)); await expect(first.locator('.outstanding-item-details')).toHaveCount(0);
  await expect(center(page).locator('.outstanding-item-details')).toHaveCount(1);
  const edit = rows(page).nth(1).getByRole('button', { name: 'Edit', exact: true }); await edit.click();
  const modal = page.getByRole('dialog'); await modal.getByLabel('Outstanding item *').fill('Unsaved changed title');
  page.once('dialog', p => p.dismiss()); await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(modal.getByLabel('Outstanding item *')).toHaveValue('Unsaved changed title');
  page.once('dialog', p => p.accept()); await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(edit).toBeFocused(); expect(await readStoredWorkspace(page)).toEqual(before);
});
test('active filters remain apparent when their controls are folded and can be cleared directly', async ({ page }) => {
  await open(page); const before = await readStoredWorkspace(page); await openOutstandingFilters(page);
  await center(page).getByRole('searchbox').fill('request 3'); await expect(rows(page)).toHaveCount(1);
  await center(page).getByRole('combobox', { name: 'Filter by outstanding status' }).selectOption('missing_document');
  await center(page).getByRole('searchbox').press('Escape');
  await expect(center(page).locator('.outstanding-tools-panel')).toHaveCount(0);
  await expect(center(page).locator('.outstanding-filter-toggle')).toBeFocused();
  await expect(center(page).locator('.outstanding-active-filters')).toContainText('2');
  await center(page).getByRole('button', { name: 'Reset to open items', exact: true }).click();
  await expect(rows(page)).toHaveCount(8); await expect(center(page).locator('.outstanding-active-filters')).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('More retains the existing settings and draft dialogs without creating records', async ({ page }) => {
  await open(page);
  const before = await readStoredWorkspace(page);
  await openOutstandingMore(page);
  const settings = center(page).getByRole('button', { name: 'Statuses and colours', exact: true });
  await settings.click();
  await expect(page.getByRole('dialog').locator('.status-editor')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(settings).toBeFocused();
  await center(page).getByRole('button', { name: 'Client follow-up draft', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.follow-up-composer')).toBeVisible();
  await page.getByRole('dialog').locator('[data-modal-close]').click();
  await center(page).getByRole('button', { name: 'Client follow-up draft', exact: true }).press('Escape');
  await expect(center(page).locator('.outstanding-more-actions')).toHaveCount(0);
  await expect(center(page).locator('.outstanding-more-toggle')).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('status chips retain configured multi-state choices and a useful next focus', async ({ page }) => {
  const data = fixture();
  data.store.outstandingStatuses.push({ id: 'internal-review', label: 'Internal review', closed: false, color: '#345678' });
  await open(page, data); const before = await readStoredWorkspace(page);
  const first = rows(page).first(); const control = first.getByRole('combobox');
  await control.focus(); await control.selectOption('internal-review');
  await expect(control).toBeFocused();
  await expect(first.locator('.outstanding-status-chip > span')).toHaveText('Internal review');
  await control.selectOption('resolved'); await expect(rows(page)).toHaveCount(7);
  await expect(rows(page).first().getByRole('combobox')).toBeFocused();
  const after = await readStoredWorkspace(page); const prior = before.engagements.find(e => e.id === data.currentId);
  const changed = after.engagements.find(e => e.id === data.currentId);
  expect(changed.outstandingItems[0].status).toBe('resolved');
  expect(changed.workstreams).toEqual(prior.workstreams); expect(changed.reportingPeriods).toEqual(prior.reportingPeriods);
  expect(changed.outstandingItems.slice(1)).toEqual(prior.outstandingItems.slice(1));
});
test('Delete stays in item More and cancelling confirmation leaves the item intact', async ({ page }) => {
  await open(page); const before = await readStoredWorkspace(page); const first = rows(page).first();
  await expandOutstandingItem(first);
  await first.getByRole('button', { name: 'More item actions' }).click();
  page.once('dialog', p => p.dismiss()); await first.getByRole('button', { name: 'Delete', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await first.getByRole('button', { name: 'Delete', exact: true }).press('Escape');
  await expect(first.getByRole('button', { name: 'More item actions' })).toBeFocused();
  await expect(first.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
});
test('holding view groups by source engagement and does not mix identical item IDs', async ({ page }) => {
  await openWorkbench(page, outstandingCenterFixture());
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox').fill('overview holding 2026');
  await page.getByRole('dialog').getByRole('combobox').press('Enter');
  if (await page.locator('.outstanding-rail-toggle').isVisible()) await page.locator('.outstanding-rail-toggle').click();
  const before = await readStoredWorkspace(page);
  const parent = center(page).locator('[data-source-id="overview-group"]');
  const child = center(page).locator('[data-source-id="overview-combined"]');
  await expect(parent.locator('.outstanding-group-heading')).toContainText('Overview Holding');
  await expect(child.locator('.outstanding-group-heading')).toContainText('2025');
  await expect(child.locator('.outstanding-group-heading')).toContainText('2026');
  await expect(child.locator('.outstanding-group-heading')).toHaveCount(1);
  const childRow = child.locator('.outstanding-item').first(); await expandOutstandingItem(childRow);
  await expect(parent.locator('.outstanding-item-details')).toHaveCount(0);
  await childRow.getByRole('combobox').selectOption('resolved');
  const after = await readStoredWorkspace(page);
  expect(after.engagements.find(e => e.id === 'overview-group')).toEqual(before.engagements.find(e => e.id === 'overview-group'));
  expect(after.engagements.find(e => e.id === 'overview-combined').outstandingItems[0].status).toBe('resolved');
});
for (const [width, height] of [[1440, 900], [800, 560]]) {
  test(`short-item density and text size at ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height }); await open(page);
    if (await page.locator('.outstanding-rail-toggle').isVisible()) await page.locator('.outstanding-rail-toggle').click();
    const bar = await center(page).locator('.outstanding-center-tools').boundingBox(); expect(bar.height).toBeLessThanOrEqual(64);
    for (const row of await rows(page).all()) expect(await row.locator('strong').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    await page.screenshot({ path: info.outputPath(`light-${width}.png`) });
  });
}
for (const language of ['en', 'zh-Hans', 'zh-Hant']) {
  test(`disclosures and long text remain usable at 480px in ${language}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 480, height: 640 });
    const data = fixture(); data.store.engagements.find(e => e.id === data.currentId).outstandingItems[0].title = '长标题 Long request '.repeat(9);
    await open(page, data); const before = await readStoredWorkspace(page);
    await page.locator('.language-summary').click();
    await page.locator('.language-menu > button').nth({ 'zh-Hans': 0, 'zh-Hant': 1, en: 2 }[language]).click();
    if (await page.locator('.outstanding-rail-toggle').isVisible()) await page.locator('.outstanding-rail-toggle').click();
    const label = language === 'en' ? 'Search and filter outstanding items' : language === 'zh-Hant' ? toTraditional('搜索与筛选待清事项') : '搜索与筛选待清事项';
    await expect(center(page).locator('.outstanding-filter-toggle')).toHaveAccessibleName(label);
    await openOutstandingFilters(page);
    for (const control of await center(page).locator('.outstanding-tools-panel input, .outstanding-tools-panel select').all()) expect((await control.boundingBox()).height).toBe(42);
    await center(page).locator('.outstanding-filter-toggle').click();
    await expandOutstandingItem(rows(page).first()); await rows(page).first().locator('.outstanding-item-actions button').first().focus();
    await expect(rows(page).first().locator('.outstanding-item-actions button').first()).toBeInViewport();
    expect(await center(page).evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await rows(page).first().evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    expect(await readStoredWorkspace(page)).toEqual(before);
    await page.screenshot({ path: info.outputPath(`light-${language}.png`) });
  });
}
