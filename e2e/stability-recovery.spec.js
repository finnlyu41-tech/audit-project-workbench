import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { recoveryWorkspace } from '../tests/fixtures/recovery-workspace.js';
import { STORAGE_KEY } from '../src/dashboard/model.js';
import { holdingWorkspace } from '../tests/fixtures/holding-workspace.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
const quick = (page) => page.getByRole('region', { name: 'Quick update', exact: true });
const browserErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = []; browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });
async function exportPayload(page) {
  await page.locator('summary[aria-label^="Backup"]').click(); const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  return fs.readFile(await (await download).path(), 'utf8');
}

async function openHolding(page) {
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const query = page.getByRole('dialog').getByRole('combobox');
  await query.fill('Example Consolidation 2026'); await query.press('Enter');
  await expect(quick(page)).toHaveCount(1);
}
async function restore(page, payload, accept = true) {
  await page.locator('summary[aria-label^="Backup"]').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  page.once('dialog', (dialog) => accept ? dialog.accept() : dialog.dismiss());
  await (await chooser).setFiles({ name: 'fictional.apw.json', mimeType: 'application/json', buffer: Buffer.from(payload) });
}
for (const [label, raw] of [['damaged', '{"version":11,"entities":['], ['future', '{"version":99,"entities":[],"engagements":[]}']]) {
  test(`startup preserves ${label} data instead of autosaving an empty workspace`, async ({ page }) => {
    await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key: STORAGE_KEY, raw });
    await page.goto('./'); await page.locator('.audit-workbench, .workspace-recovery').waitFor();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
    await expect(page.locator('.workspace-recovery')).toBeVisible();
  });
}
test('restoring a backup invalidates old quick drafts even when record IDs match', async ({ page }) => {
  await openWorkbench(page, holdingWorkspace()); await openHolding(page);
  const before = await readStoredWorkspace(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('Discarded pre-restore owner');
  await restore(page, JSON.stringify(before));
  await expect(page.getByRole('heading', { name: 'Work overview' })).toBeVisible();
  await openHolding(page);
  await expect(quick(page).locator('form')).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('browser write failure stays visible and exports current memory, not the stale saved copy', async ({ page }) => {
  await openWorkbench(page, holdingWorkspace()); await openHolding(page);
  const before = await readStoredWorkspace(page);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    window.__allowWrites = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, STORAGE_KEY);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('In-memory reviewer');
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await expect(page.locator('.persistence-safety-alert')).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
  const notice = page.locator('.persistence-safety-alert');
  await notice.getByRole('button', { name: 'Retry saving' }).click();
  await expect(notice).toContainText('The latest applied changes');
  await page.locator('.app-rail-button[aria-label="Home"]').click(); await expect(notice).toBeVisible();
  const download = page.waitForEvent('download'); await notice.getByRole('button', { name: 'Export backup' }).click();
  const exported = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
  expect(exported.engagements.find((item) => item.id === 'holding-annual').owner).toBe('In-memory reviewer');
  expect(await readStoredWorkspace(page)).toEqual(before); await page.evaluate(() => window.__allowWrites());
  await notice.getByRole('button', { name: 'Retry saving' }).click(); await expect(notice).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(exported);

});
test('export after continuous group and project work restores exactly in a clean browser context', async ({ page, browser }) => {
  await openWorkbench(page, recoveryWorkspace()); await openHolding(page);
  const original = await readStoredWorkspace(page);
  expect(original.entities.find((item) => item.id === 'holding-alpha').taxDeadlines[0].revisions).toHaveLength(1);
  expect(original.engagements.find((item) => item.id === 'alpha-current').reportingPeriods).toHaveLength(2);
  expect(original.engagements.find((item) => item.id === 'recovery-middle-annual').consolidation.nodes[0].conditions[0].done).toBe(true);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('Recovery Reviewer');
  await quick(page).getByLabel('Project notes').fill('Fictional follow-up\n保留原文');
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await page.locator('[data-component-id="part-alpha"]').getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  let query = page.getByRole('dialog').getByRole('combobox');
  await query.fill('Alpha 2026'); await query.press('Enter');
  await page.getByRole('button', { name: 'Archive project', exact: true }).click();
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Include archived records' }).check();
  query = page.getByRole('dialog').getByRole('combobox'); await query.fill('Alpha 2026'); await query.press('Enter');
  await expect(page.locator('.archive-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  const expected = await readStoredWorkspace(page);
  expect(expected.entities).toEqual(original.entities);
  expect(expected.engagements.find((item) => item.id === 'alpha-current').reportingPeriods).toEqual(original.engagements.find((item) => item.id === 'alpha-current').reportingPeriods);
  const payload = await exportPayload(page); expect(JSON.parse(payload)).toEqual(expected);
  const clean = await browser.newContext({ locale: 'en-HK', timezoneId: 'Asia/Hong_Kong' });
  try {
    const restored = await clean.newPage(); await restored.goto(page.url());
    await expect(restored.getByText('No companies yet', { exact: true })).toBeVisible();
    await restore(restored, payload); await expect.poll(() => readStoredWorkspace(restored)).toEqual(expected);
    await restored.reload(); await expect(restored.locator('.audit-workbench')).toBeVisible();
    expect(await readStoredWorkspace(restored)).toEqual(expected); expect(JSON.parse(await exportPayload(restored))).toEqual(expected);
  } finally { await clean.close(); }
});
test('recovery exports exact original bytes and requires confirmation before a validated replacement', async ({ page }) => {
  const raw = '{"version":11,\n "damaged": "虚构资料"';
  await page.addInitScript(({ key, raw }) => {
    if (sessionStorage.getItem('recovery-seeded')) return;
    localStorage.setItem(key, raw); localStorage.setItem('audit-progress-workbench:persistence-settings', '{"mode":"linked_file"}');
    sessionStorage.setItem('recovery-seeded', 'true');
  }, { key: STORAGE_KEY, raw });
  await page.goto('./'); const recovery = page.locator('.workspace-recovery');
  await expect(recovery).toBeVisible(); const download = page.waitForEvent('download');
  await recovery.getByRole('button', { name: 'Export original data' }).click();
  expect(await fs.readFile(await (await download).path(), 'utf8')).toBe(raw);
  const data = recoveryWorkspace();
  for (const accept of [false, true]) {
    const choose = page.waitForEvent('filechooser'); await recovery.getByRole('button', { name: 'Restore a valid backup' }).click();
    page.once('dialog', (prompt) => accept ? prompt.accept() : prompt.dismiss());
    await (await choose).setFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    if (!accept) { await expect(recovery).toBeVisible(); expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(raw); }
  }
  await expect(page.locator('.audit-workbench')).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(data);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audit-progress-workbench:persistence-settings')).mode)).toBe('browser');
  await page.reload(); await expect(page.locator('.audit-workbench')).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(data);
});
test('a cancelled ordinary restore preserves the current quick draft and all records', async ({ page }) => {
  await openWorkbench(page, holdingWorkspace()); await openHolding(page); const before = await readStoredWorkspace(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('Keep cancelled restore draft');
  await restore(page, JSON.stringify(before), false);
  await expect(quick(page).getByLabel('Owner', { exact: true })).toHaveValue('Keep cancelled restore draft');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('a denied startup read cannot write an empty replacement and retry can recover access', async ({ page }) => {
  const data = recoveryWorkspace();
  await page.addInitScript(({ key, data }) => {
    localStorage.setItem(key, JSON.stringify(data));
    const get = Storage.prototype.getItem; const set = Storage.prototype.setItem;
    window.__workspaceWrites = 0; window.__denyRead = true;
    Storage.prototype.getItem = function (name) { if (name === key && window.__denyRead) throw new DOMException('Synthetic denied read', 'SecurityError'); return get.call(this, name); };
    Storage.prototype.setItem = function (name, value) { if (name === key) window.__workspaceWrites++; return set.call(this, name, value); };
  }, { key: STORAGE_KEY, data });
  await page.goto('./'); await expect(page.locator('.workspace-recovery')).toBeVisible();
  expect(await page.evaluate(() => window.__workspaceWrites)).toBe(0);
  await expect(page.getByRole('button', { name: 'Restore a valid backup' })).toBeDisabled();
  await page.evaluate(() => { window.__denyRead = false; });
  await page.getByRole('button', { name: 'Retry reading' }).click();
  await expect(page.locator('.audit-workbench')).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(data);
});
test('invalid recovery files and failed writes preserve the original instead of partially opening', async ({ page }) => {
  const raw = '{damaged'; await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key: STORAGE_KEY, raw });
  await page.goto('./'); const recovery = page.locator('.workspace-recovery');
  let choose = page.waitForEvent('filechooser'); await recovery.getByRole('button', { name: 'Restore a valid backup' }).click();
  await (await choose).setFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') });
  await expect(recovery).toContainText('This is not a valid');
  await page.evaluate((key) => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) {
    if (name === key) throw new DOMException('Synthetic quota', 'QuotaExceededError'); return set.call(this, name, value); }; }, STORAGE_KEY);
  choose = page.waitForEvent('filechooser'); await recovery.getByRole('button', { name: 'Restore a valid backup' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await (await choose).setFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(recoveryWorkspace())) });
  await expect(recovery).toContainText('Recovery did not complete');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
});
for (const [language, title] of [['en', 'Workspace recovery required'], ['zh-Hans', '工作台资料需要恢复'], ['zh-Hant', '工作台資料需要恢復']]) {
  test(`recovery is accessible, private and usable at 480px in ${language}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 480, height: 560 });
    await page.addInitScript(({ key, language }) => {
      localStorage.setItem(key, '{private-recovery-marker');
      localStorage.setItem('audit-progress-workbench:language', language);
    }, { key: STORAGE_KEY, language });
    await page.goto('./'); const recovery = page.locator('.workspace-recovery');
    await expect(recovery.getByRole('heading')).toHaveText(title);
    await expect(recovery).not.toContainText('private-recovery-marker');
    expect(await recovery.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    for (const button of await recovery.getByRole('button').all()) {
      await button.focus(); await expect(button).toBeFocused(); expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(42);
    }
    await page.screenshot({ path: testInfo.outputPath(`recovery-${language}.png`) });
  });
}
