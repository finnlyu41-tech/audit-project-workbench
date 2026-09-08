import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { openEfficiency, openRecord, dialog, alpha, recordErrors } from './efficiency-helpers.js';
import { readStoredWorkspace } from './helpers.js';
import { efficiencyWorkspace } from '../tests/fixtures/efficiency-workspace.js';
import { LOCAL_DRAFTS_KEY, SAVED_FILTERS_KEY, PRODUCTIVITY_OPTIONS_KEY } from '../src/dashboard/local-productivity.js';
recordErrors(test);
async function enableDrafts(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await dialog(page).getByLabel('Keep unsubmitted drafts in this browser for up to 7 days').check();
  await dialog(page).getByRole('button', { name: 'Done', exact: true }).click();
}
async function refreshDiscardBrowserPrompt(page) { page.once('dialog', d => d.accept()); await page.reload(); }
async function draftRows(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), LOCAL_DRAFTS_KEY); }
async function waitDraft(page) { await expect.poll(() => draftRows(page)).not.toEqual([]); }

test('opt-in quick drafts recover on reload, remain outside business backup and disappear after explicit save', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page); await enableDrafts(page);
  await page.getByRole('button', { name: 'Quick edit', exact: true }).click();
  await page.locator('.quick-update-form').getByRole('textbox', { name: 'Project notes', exact: true }).fill('UNCOMMITTED-FICTIONAL-DRAFT');
  await waitDraft(page); expect(await readStoredWorkspace(page)).toEqual(before);
  await refreshDiscardBrowserPrompt(page); await openRecord(page, 'EAL Alex');
  await expect(page.getByRole('button', { name: 'Restore into form', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restore into form', exact: true }).click();
  await expect(page.locator('.quick-update-form').getByRole('textbox', { name: 'Project notes', exact: true })).toHaveValue('UNCOMMITTED-FICTIONAL-DRAFT');
  await page.locator('.quick-update-form').getByRole('button', { name: 'Save updates', exact: true }).click();
  await expect.poll(() => draftRows(page)).toEqual([]);
  expect((await alpha(page)).notes).toBe('UNCOMMITTED-FICTIONAL-DRAFT');
  await page.reload(); await openRecord(page, 'EAL Alex'); await expect(page.getByRole('button', { name: 'Restore into form' })).toHaveCount(0);
});

test('company draft cancellation explicitly discards only that draft', async ({ page }) => {
  await openEfficiency(page, undefined, { home: true }); const before = await readStoredWorkspace(page); await enableDrafts(page);
  await page.locator('.home-overview').getByRole('button', { name: 'New company', exact: true }).click();
  await dialog(page).getByLabel('Legal entity *', { exact: true }).fill('Unsubmitted Company Example'); await waitDraft(page);
  await refreshDiscardBrowserPrompt(page); await page.locator('.app-rail-button[aria-label="Home"]').click();
  await page.locator('.home-overview').getByRole('button', { name: 'New company', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Restore into form', exact: true }).click();
  await expect(dialog(page).getByLabel('Legal entity *', { exact: true })).toHaveValue('Unsubmitted Company Example');
  page.once('dialog', d => d.accept()); await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect.poll(() => draftRows(page)).toEqual([]); expect(await readStoredWorkspace(page)).toEqual(before);
});

test('malformed saved draft cannot crash or overwrite an editor and can be inspected then discarded', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page); await enableDrafts(page);
  await page.evaluate(({ draftKey, before }) => localStorage.setItem(draftKey, JSON.stringify([{ key: 'quick:eff-alpha-year',
    baseline: JSON.stringify(before.engagements[0]), data: { values: 123, scheduleDraft: null }, expires: Date.now() + 3600000 }])), { draftKey: LOCAL_DRAFTS_KEY, before });
  await page.reload(); await openRecord(page, 'EAL Alex');
  await page.getByRole('button', { name: 'Restore into form', exact: true }).click();
  await expect(page.getByText('View original draft content', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Discard this draft', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before); expect(await draftRows(page)).toEqual([]);
});

test('disabled recovery writes no draft and a quota failure never masquerades as saving business records', async ({ page }) => {
  await openEfficiency(page); await page.getByRole('button', { name: 'Quick edit', exact: true }).click();
  await page.locator('.quick-update-form').getByRole('textbox', { name: 'Project notes', exact: true }).fill('Disabled draft');
  await page.waitForTimeout(450); expect(await draftRows(page)).toEqual([]);
  await page.locator('.quick-update-form').getByRole('button', { name: 'Cancel', exact: true }).click();
  await enableDrafts(page); await page.evaluate(key => {
    const original = Storage.prototype.setItem; Storage.prototype.setItem = function(name, value) {
      if (name === key) throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); return original.call(this, name, value);
    };
  }, LOCAL_DRAFTS_KEY);
  const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Quick edit', exact: true }).click();
  await page.locator('.quick-update-form').getByRole('textbox', { name: 'Project notes', exact: true }).fill('Failed draft storage');
  await expect(page.locator('.local-draft-offer')).toContainText('Temporary draft could not be saved');
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test('real backup download round-trips optional fields and approved restoration clears draft/filter caches', async ({ page, browser }) => {
  const fixture = efficiencyWorkspace(); fixture.entities[0].followUpLanguage = 'zh-Hant';
  fixture.engagements[0].nextAction = { kind: 'outstanding', itemId: 'same-item' };
  fixture.engagements[0].remainingWork = { days: 4, asOf: '2026-09-08' };
  await openEfficiency(page, fixture); const before = await readStoredWorkspace(page);
  await page.locator('summary[aria-label^="Backup"]').click(); const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const payload = await fs.readFile(await (await download).path(), 'utf8'); expect(JSON.parse(payload)).toEqual(before);
  const context = await browser.newContext({ locale: 'en-HK', timezoneId: 'Asia/Hong_Kong' });
  try {
    const fresh = await context.newPage(); await fresh.goto(page.url());
    await fresh.evaluate(({ drafts, filters, options }) => {
      localStorage.setItem(drafts, JSON.stringify([{ key: 'same-id-old-draft', baseline: '{}', data: {}, expires: Date.now() + 3600000 }]));
      localStorage.setItem(filters, JSON.stringify([{ scope: 'home', name: 'Old scope', values: { owner: 'Old owner', priorityFilter: 'all' } }]));
      localStorage.setItem(options, JSON.stringify({ drafts: true }));
    }, { drafts: LOCAL_DRAFTS_KEY, filters: SAVED_FILTERS_KEY, options: PRODUCTIVITY_OPTIONS_KEY });
    await fresh.locator('summary[aria-label^="Backup"]').click(); const chooser = fresh.waitForEvent('filechooser');
    await fresh.getByRole('button', { name: 'Restore backup', exact: true }).click(); fresh.once('dialog', d => d.accept());
    await (await chooser).setFiles({ name: 'fictional-efficiency-backup.json', mimeType: 'application/json', buffer: Buffer.from(payload) });
    await expect.poll(() => readStoredWorkspace(fresh)).toEqual(before);
    expect(await fresh.evaluate(key => localStorage.getItem(key), LOCAL_DRAFTS_KEY)).toBeNull();
    expect(await fresh.evaluate(key => localStorage.getItem(key), SAVED_FILTERS_KEY)).toBeNull();
    await fresh.reload(); expect(await readStoredWorkspace(fresh)).toEqual(before);
  } finally { await context.close(); }
});
