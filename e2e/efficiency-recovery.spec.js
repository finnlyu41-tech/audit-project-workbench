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

// Hold only the existing 350 ms draft-persistence callback, not browser input
// or animation timers, so feedback arrives during one real pointer gesture.
async function holdDraftFeedback(page) {
  await page.evaluate(() => {
    const original = window.setTimeout.bind(window);
    window.syntheticHeldDraftFeedback = [];
    window.setTimeout = (callback, delay, ...args) => {
      if (delay !== 350 || typeof callback !== 'function') return original(callback, delay, ...args);
      return original(() => window.syntheticHeldDraftFeedback.push(() => callback(...args)), delay);
    };
  });
}
// Compare layout coordinates, excluding the existing 1px :active transform.
async function draftActionPosition(action) {
  return action.evaluate(element => {
    const box = element.getBoundingClientRect(), value = getComputedStyle(element).transform;
    const transform = value === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(value);
    return { x: box.x - transform.m41, y: box.y - transform.m42, width: box.width, height: box.height };
  });
}
for (const restored of [false, true]) for (const viewport of [{ width: 1440, height: 900 }, { width: 800, height: 560 }]) {
  test(`draft feedback cannot move Save during a ${restored ? 'restored' : 'new'} quick edit at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport); await openEfficiency(page);
    const before = await readStoredWorkspace(page); await enableDrafts(page);
    const notes = 'FICTIONAL-POINTER-SAVE';
    if (restored) {
      await page.getByRole('button', { name: 'Quick edit', exact: true }).click();
      await page.locator('.quick-update-form').getByRole('textbox', { name: 'Project notes', exact: true }).fill(notes);
      await waitDraft(page); await refreshDiscardBrowserPrompt(page); await openRecord(page, 'EAL Alex');
    }
    await holdDraftFeedback(page);
    await page.getByRole('button', { name: restored ? 'Restore into form' : 'Quick edit', exact: true }).click();
    const form = page.locator('.quick-update-form');
    if (!restored) await form.getByRole('textbox', { name: 'Project notes', exact: true }).fill(notes);
    await expect(form.getByRole('textbox', { name: 'Project notes', exact: true })).toHaveValue(notes);
    await expect.poll(() => page.evaluate(() => window.syntheticHeldDraftFeedback.length)).toBeGreaterThan(0);
    const save = form.getByRole('button', { name: 'Save updates', exact: true });
    await save.scrollIntoViewIfNeeded(); const position = await draftActionPosition(save);
    await page.mouse.move(position.x + position.width / 2, position.y + position.height / 2);
    await page.mouse.down();
    let afterFeedback;
    try {
      await page.evaluate(() => window.syntheticHeldDraftFeedback.splice(0).forEach(callback => callback()));
      await expect(page.locator('.local-draft-offer').getByRole('status')).toHaveText('Temporary draft retained in this browser; not submitted.');
      afterFeedback = await draftActionPosition(save);
    } finally { await page.mouse.up(); }
    expect(afterFeedback.y).toBeCloseTo(position.y, 1);
    expect(afterFeedback.x).toBeCloseTo(position.x, 1);
    await expect(form).toHaveCount(0);
    await expect.poll(() => draftRows(page)).toEqual([]);
    await expect.poll(async () => (await alpha(page)).notes).toBe(notes);
    const after = await readStoredWorkspace(page), saved = after.engagements.find(e => e.id === 'eff-alpha-year');
    expect(after).toEqual({ ...before, engagements: before.engagements.map(e => e.id === saved.id ? { ...e, notes, updatedAt: saved.updatedAt } : e) });
    await page.reload(); await openRecord(page, 'EAL Alex');
    expect(await readStoredWorkspace(page)).toEqual(after);
    await expect(page.getByRole('button', { name: 'Restore into form', exact: true })).toHaveCount(0);
  });
}
