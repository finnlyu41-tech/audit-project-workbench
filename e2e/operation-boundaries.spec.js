import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { operationBoundaryFixture } from '../tests/fixtures/operation-boundaries.js';
import { openWorkbench, readStoredWorkspace } from './helpers.js';
import { expandOutstandingItem } from './outstanding-helpers.js';
const browserErrors = new WeakMap();
test.beforeEach(({ page }) => {
  const errors = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(({ page }) => { expect(browserErrors.get(page)).toEqual([]); });
const job = (store, id = 'holding-annual') => store.engagements.find(e => e.id === id);
async function go(page, query, archived = false) {
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick open', exact: true });
  if (archived) await dialog.getByRole('checkbox', { name: 'Include archived records' }).check();
  const input = dialog.getByRole('combobox'); await input.fill(query); await input.press('Enter');
  await expect(dialog).toHaveCount(0);
}
async function start(page, term = 'Alpha Example 2025', store = operationBoundaryFixture(), archived = false) {
  await openWorkbench(page, store); await go(page, term, archived);
  if (await page.locator('.outstanding-rail-toggle').isVisible()) await page.locator('.outstanding-rail-toggle').click();
  return readStoredWorkspace(page);
}
for (const group of [false, true]) test(`${group ? 'holding' : 'ordinary'} status changes preserve the full frozen scope and current relationships`, async ({ page }) => {
  const before = await start(page, group ? 'Example Consolidation 2026' : 'Alpha Example 2025');
  const row = page.locator('.outstanding-item').filter({ hasText: group ? 'Parent approval pending' : 'Component confirmation pending' });
  await row.getByRole('combobox').selectOption('resolved');
  const after = await readStoredWorkspace(page);
  expect(job(after).consolidation).toEqual(job(before).consolidation);
  expect(after.entities).toEqual(before.entities);
  expect(job(after, group ? 'holding-annual' : 'alpha-old').outstandingItems[0].status).toBe('resolved');
  await page.reload(); expect((await readStoredWorkspace(page)).engagements).toEqual(after.engagements);
});
for (const group of [false, true]) test(`${group ? 'consolidation' : 'ordinary'} workflow checkbox changes only its selected criterion`, async ({ page }) => {
  const before = await start(page, group ? 'Example Consolidation 2026' : 'Alpha Example 2025');
  if (group) await page.getByRole('tab', { name: 'Consolidation stages', exact: true }).click();
  else await page.locator('.workstream-card-select').first().click();
  await page.locator('.node-board [role=tab]').first().click();
  await page.locator('.node-detail-panel').getByRole('checkbox').first().check();
  const after = await readStoredWorkspace(page);
  expect(job(after).consolidation.components).toEqual(job(before).consolidation.components);
  expect(after.entities).toEqual(before.entities);
  expect(after.engagements.filter(e => e.id !== (group ? 'holding-annual' : 'alpha-old')))
    .toEqual(before.engagements.filter(e => e.id !== (group ? 'holding-annual' : 'alpha-old')));
});
test('annual owner dialog keeps the edited record visible instead of losing it to old filters', async ({ page }) => {
  await start(page); await page.getByRole('button', { name: 'Open navigation filters' }).click();
  await page.getByRole('combobox', { name: 'Owner filter', exact: true }).selectOption('Alex Example');
  await page.getByRole('button', { name: 'Edit annual engagement', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByLabel('Owner', { exact: true }).fill('Reassigned fictional owner');
  await dialog.getByRole('button', { name: 'Save engagement', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.detail-title > p')).toContainText('Alpha Example');
  await expect(page.locator('.detail-facts')).toContainText('Reassigned fictional owner');
});
test('restoring an annual record cannot reactivate it underneath an archived company', async ({ page }) => {
  const store = operationBoundaryFixture(); store.entities.find(e => e.id === 'holding-parent').archived = true;
  job(store).archived = true; const before = await start(page, 'Example Consolidation 2026', store, true);
  await page.locator('.detail-actions').getByRole('button', { name: 'Restore', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await expect(page.locator('.archive-banner')).toBeVisible();
});
test('deleting a subsidiary item from the group view does not remove unmatched components', async ({ page }) => {
  const before = await start(page, 'Example Consolidation 2026');
  const row = page.locator('.outstanding-item').filter({ hasText: 'Component confirmation pending' });
  await expandOutstandingItem(row); await row.getByRole('button', { name: 'More item actions', exact: true }).click();
  page.once('dialog', d => d.dismiss()); await row.getByRole('button', { name: 'Delete', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
  page.once('dialog', d => d.accept()); await row.getByRole('button', { name: 'Delete', exact: true }).click();
  const after = await readStoredWorkspace(page); expect(job(after, 'alpha-old').outstandingItems).toHaveLength(0);
  expect(job(after)).toEqual(job(before)); expect(after.entities).toEqual(before.entities);
  await expect(page.locator('[data-component-id]')).toHaveCount(4);
});
test('restoring a completed annual record keeps that exact completed record selected', async ({ page }) => {
  const store = operationBoundaryFixture(); const target = job(store, 'alpha-old'); target.archived = true;
  target.workstreams.forEach(w => w.nodes.forEach(n => n.conditions.forEach(c => { c.done = true; })));
  const before = await start(page, 'Alpha Example 2025', store, true);
  await page.locator('.detail-actions').getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.locator('.detail-title > p')).toContainText('2025');
  await expect(page.locator('.archive-banner')).toHaveCount(0);
  const after = await readStoredWorkspace(page); expect(job(after, 'alpha-old').archived).toBe(false);
  expect(job(after, 'alpha-old').workstreams).toEqual(job(before, 'alpha-old').workstreams);
  expect(job(after)).toEqual(job(before)); expect(after.entities).toEqual(before.entities);
});
for (const kind of ['project', 'group']) test(`archived ${kind} company cannot expose editable child work after malformed legacy restoration`, async ({ page }) => {
  const store = operationBoundaryFixture(); const group = kind === 'group';
  store.entities.find(e => e.id === (group ? 'holding-parent' : 'holding-alpha')).archived = true;
  const before = await start(page, group ? 'Example Consolidation 2026' : 'Alpha Example 2025', store, true);
  await expect(page.locator('.archive-banner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit annual engagement', exact: true })).toHaveCount(0);
  await expect(page.locator('.outstanding-add')).toHaveCount(0); expect(await readStoredWorkspace(page)).toEqual(before);
});
test('owner-only editing must not import another year framework into an explicitly blank record', async ({ page }) => {
  const store = operationBoundaryFixture(); job(store, 'alpha-current').reportingFramework = 'Other year contractual basis';
  job(store, 'alpha-old').reportingFramework = '';
  const before = await start(page, 'Alpha Example 2025', store);
  await page.getByRole('button', { name: 'Edit project details：Owner', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Owner', { exact: true }).fill('Owner only');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  const after = await readStoredWorkspace(page); const { owner, updatedAt, ...fields } = job(after, 'alpha-old');
  const { owner: previousOwner, updatedAt: previousTime, ...previousFields } = job(before, 'alpha-old');
  expect(owner).toBe('Owner only'); expect(fields).toEqual(previousFields);
  expect(after.entities).toEqual(before.entities);
});
test('an untouched annual editor keeps an intentionally blank framework rather than inheriting another year', async ({ page }) => {
  const store = operationBoundaryFixture(); job(store, 'alpha-current').reportingFramework = 'Other year contractual basis';
  job(store, 'alpha-old').reportingFramework = '';
  const before = await start(page, 'Alpha Example 2025', store);
  await page.getByRole('button', { name: 'Edit annual engagement', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Financial reporting standard / framework', { exact: true })).toHaveValue('');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('workflow edits and status changes survive real backup restore without losing historical scope', async ({ page, browser }) => {
  const before = await start(page);
  await page.locator('.outstanding-item').getByRole('combobox').selectOption('resolved');
  await page.locator('.workstream-card-select').first().click();
  await page.locator('.node-board [role=tab]').first().click(); await page.locator('.node-detail-panel').getByRole('checkbox').first().check();
  const expected = await readStoredWorkspace(page);
  expect(expected.entities).toEqual(before.entities); expect(job(expected)).toEqual(job(before));
  await page.locator('summary[aria-label^="Backup"]').click(); const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const payload = await fs.readFile(await (await download).path(), 'utf8'); expect(JSON.parse(payload)).toEqual(expected);
  const context = await browser.newContext({ locale: 'en-HK', timezoneId: 'Asia/Hong_Kong' });
  try {
    const restored = await context.newPage(); await restored.goto(page.url());
    await expect(restored.locator('.audit-workbench')).toBeVisible();
    await restored.locator('summary[aria-label^="Backup"]').click(); const choose = restored.waitForEvent('filechooser');
    await restored.getByRole('button', { name: 'Restore backup', exact: true }).click();
    restored.once('dialog', d => d.accept()); await (await choose).setFiles({ name: 'fictional-boundaries.json',
      mimeType: 'application/json', buffer: Buffer.from(payload) });
    await expect.poll(() => readStoredWorkspace(restored)).toEqual(expected); await restored.reload();
    await expect(restored.locator('.audit-workbench')).toBeVisible(); expect(await readStoredWorkspace(restored)).toEqual(expected);
  } finally { await context.close(); }
});
test('a framework-only edit retains its matching owner navigation filter', async ({ page }) => {
  const before = await start(page); await page.getByRole('button', { name: 'Open navigation filters' }).click();
  await page.getByRole('combobox', { name: 'Owner filter', exact: true }).selectOption('Alex Example');
  await page.getByRole('button', { name: 'Edit project details：Financial reporting standard / framework', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByLabel('Financial reporting standard / framework', { exact: true }).fill('Fictional framework');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Owner filter', exact: true })).toHaveValue('Alex Example');
  const after = await readStoredWorkspace(page); const { reportingFramework, updatedAt, ...rest } = job(after, 'alpha-old');
  const { reportingFramework: oldFramework, updatedAt: oldTime, ...oldRest } = job(before, 'alpha-old');
  expect(reportingFramework).toBe('Fictional framework'); expect(rest).toEqual(oldRest); expect(after.entities).toEqual(before.entities);
});
for (const language of ['en', 'zh-Hans', 'zh-Hant']) test(`archive master protection is readable and does not change records in ${language}`, async ({ page }, info) => {
  const store = operationBoundaryFixture(); store.entities.find(e => e.id === 'holding-parent').archived = true; job(store).archived = true;
  const before = await start(page, 'Example Consolidation 2026', store, true);
  await page.locator('.language-summary').click();
  await page.locator('.language-menu > button').nth({ 'zh-Hans': 0, 'zh-Hant': 1, en: 2 }[language]).click();
  await page.setViewportSize({ width: 800, height: 560 });
  await page.locator('.detail-actions > button').first().click();
  await expect(page.locator('.feedback-copy')).toContainText(/company master|公司主档|公司主檔/);
  expect(await readStoredWorkspace(page)).toEqual(before);
  await page.screenshot({ path: info.outputPath(`archive-protection-${language}.png`) });
});
