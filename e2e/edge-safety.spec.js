import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openWorkbench, readStoredWorkspace, workspaceFixture } from './helpers.js';
import { mergeFixture, targetOf, sourceOf, readyGroupFixture } from '../tests/fixtures/edge-safety.js';
import { canonicalStorePayload, normalizeStore, STORAGE_KEY } from '../src/dashboard/model.js';
const errors = new WeakMap();
test.beforeEach(({ page }) => { const seen = []; errors.set(page, seen); page.on('pageerror', error => seen.push(error.message)); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });
async function quickOpen(page, term, company = false) {
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const dialog = page.getByRole('dialog'); const field = dialog.getByRole('combobox'); await field.fill(term);
  if (company) await dialog.getByRole('option').filter({ hasText: 'Company master' }).first().click();
  else await field.press('Enter');
}
async function openMerge(page, store = mergeFixture()) {
  await openWorkbench(page, store); await quickOpen(page, 'Fictional Twin', true);
  await page.getByRole('button', { name: 'Merge duplicate companies', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Merge this company', exact: true }).selectOption('merge-source');
  await dialog.getByRole('combobox', { name: 'Retain this company', exact: true }).selectOption('merge-target'); return dialog;
}
test('a syntax-valid corrupt startup never overwrites its original and can export exact bytes', async ({ page }) => {
  const s = mergeFixture(); s.engagements[0].entityId = 'missing-company'; const raw = JSON.stringify(s);
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); localStorage.setItem('audit-progress-workbench:language', 'en'); }, { key: STORAGE_KEY, raw });
  await page.goto('./'); await expect(page.locator('.workspace-recovery')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export original data' }).click();
  expect(await fs.readFile(await (await pending).path(), 'utf8')).toBe(raw);
});
test('ordinary restore refuses duplicate identities and preserves the current workspace', async ({ page }) => {
  await openWorkbench(page, mergeFixture()); const before = await readStoredWorkspace(page);
  const bad = structuredClone(before); bad.entities[1].id = bad.entities[0].id;
  await page.locator('summary[aria-label^="Backup"]').click(); const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  const messages = []; page.on('dialog', async d => { messages.push(d.message()); await d.accept(); });
  await (await chooser).setFiles({ name: 'fictional-invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
  await expect.poll(() => messages.length).toBe(1); expect(messages[0]).toContain('not a valid');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('a confirmed safe merge preserves source-only information and reloads without losing its project', async ({ page }) => {
  const dialog = await openMerge(page); const before = await readStoredWorkspace(page);
  await dialog.getByRole('button', { name: 'Confirm merge', exact: true }).click(); await expect(dialog).toHaveCount(0);
  const after = await readStoredWorkspace(page); expect(sourceOf(after)).toBeUndefined();
  expect(targetOf(after).notes).toBe(sourceOf(before).notes); expect(targetOf(after).incorporationDate).toBe('2010-04-01');
  expect(after.engagements[0].entityId).toBe('merge-target');
  expect(targetOf(after).taxDeadlines).toEqual(sourceOf(before).taxDeadlines);
  await page.reload(); await expect(page.locator('.audit-workbench')).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(after);
});
test('conflicting master notes block a destructive merge and cancellation changes nothing', async ({ page }) => {
  const s = mergeFixture(); targetOf(s).notes = 'Different target note'; const dialog = await openMerge(page, s);
  const before = await readStoredWorkspace(page); await expect(dialog.getByRole('button', { name: 'Confirm merge', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('alert')).toBeVisible(); await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('mismatched periods cannot display a ready group even after every readiness checkbox is checked', async ({ page }) => {
  await openWorkbench(page, readyGroupFixture()); await quickOpen(page, 'Example Consolidation 2026');
  await expect(page.locator('.group-status-strip').getByText('0/1', { exact: true })).toBeVisible();
  const row = page.locator('[data-component-id="part-alpha"]'); await expect(row).toHaveAttribute('data-match', 'mismatch');
  await row.getByRole('combobox').selectOption('alpha-current'); await expect(page.locator('.group-status-strip').getByText('1/1', { exact: true })).toBeVisible();
});
test('confirming an IME candidate does not submit a new company', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'New company', exact: true }).click(); const dialog = page.getByRole('dialog');
  const field = dialog.getByLabel('Legal entity *'); await field.fill('虚构客户公司');
  await field.dispatchEvent('compositionstart'); await field.press('Enter');
  await expect(dialog).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
  await field.dispatchEvent('compositionend'); await field.press('Enter'); await expect(dialog).toHaveCount(0);
  expect((await readStoredWorkspace(page)).entities.filter(e => e.legalName === '虚构客户公司')).toHaveLength(1);
});
test('duplicate native submit events create only one company', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'New company', exact: true }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Legal entity *').fill('Single fictional submission');
  await dialog.locator('form').evaluate(form => {
    const submitter = form.querySelector('[type="submit"]');
    for (let i = 0; i < 2; i++) form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter }));
  });
  await expect(dialog).toHaveCount(0); const after = await readStoredWorkspace(page);
  expect(after.entities).toHaveLength(before.entities.length + 1);
  expect(after.engagements).toEqual(before.engagements);
});
test('stage editing shares IME and duplicate-submit protection without changing existing criteria', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.locator('.workstream-card').first().locator('.workstream-card-select').click();
  await page.getByRole('button', { name: 'Add stage', exact: true }).click(); const dialog = page.getByRole('dialog');
  const name = dialog.getByLabel('Stage name *'); await name.fill('新增复核节点');
  await name.dispatchEvent('compositionstart'); await name.press('Enter'); await expect(dialog).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before); await name.dispatchEvent('compositionend');
  await dialog.locator('form').evaluate(form => {
    const submitter = form.querySelector('[type=submit]');
    for (let i = 0; i < 2; i++) form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter }));
  });
  await expect(dialog).toHaveCount(0); const after = await readStoredWorkspace(page);
  const nodes = after.engagements[0].workstreams[0].nodes;
  expect(nodes.slice(0,-1)).toEqual(before.engagements[0].workstreams[0].nodes); expect(nodes.at(-1).title).toBe('新增复核节点');
  expect(after.engagements[0].workstreams[1]).toEqual(before.engagements[0].workstreams[1]);
});
test('failed field validation can be corrected and submitted once without losing literal text', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'New company', exact: true }).click(); const dialog = page.getByRole('dialog');
  const name = dialog.getByLabel('Legal entity *'); await name.fill('   '); await dialog.locator('[type=submit]').click();
  await expect(dialog).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
  const literal = 'Fictional <img src=x onerror="window.__injected=true"> & 子公司'; await name.fill(literal); await name.press('Enter');
  await expect(dialog).toHaveCount(0); await expect(page.getByRole('heading', { name: literal, exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__injected)).toBeUndefined(); expect(await page.locator('.entity-overview img').count()).toBe(0);
  const after = await readStoredWorkspace(page); expect(after.entities.some(e => e.legalName === literal)).toBe(true);
  expect(after.engagements).toEqual(before.engagements);
});
for (const [language, expected] of [['en', 'Master data conflict'], ['zh-Hans', '长期资料存在冲突'], ['zh-Hant', '長期資料存在衝突']]) {
  test(`merge conflict is readable and non-destructive at 480px in ${language}`, async ({ page }, info) => {
    const s = mergeFixture(); targetOf(s).notes = 'Conflicting fictional note'; await openWorkbench(page, s);
    await page.evaluate(lang => localStorage.setItem('audit-progress-workbench:language', lang), language);
    await page.reload(); await expect(page.locator('.audit-workbench')).toBeVisible();
    await page.locator('.tree-entity-row').filter({ hasText: 'Fictional Twin Limited' }).last().click();
    await page.locator('.entity-overview-footer button').click(); const dialog = page.getByRole('dialog');
    await dialog.locator('.merge-entities-form select').first().selectOption('merge-source');
    await dialog.locator('.merge-entities-form select').last().selectOption('merge-target');
    const before = await readStoredWorkspace(page); await page.setViewportSize({ width: 480, height: 640 });
    await expect(dialog.getByRole('alert')).toContainText(expected);
    await expect(dialog.locator('[type=submit]')).toBeDisabled();
    const bounds = await dialog.evaluate(e => ({ width:e.clientWidth, scroll:e.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width+1);
    await page.screenshot({ path: info.outputPath(`merge-${language}.png`) });
    await dialog.locator('[data-modal-close]').click(); expect(await readStoredWorkspace(page)).toEqual(before);
  });
}
test('unsupported date years cannot be saved and later strand the workspace in recovery', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.locator('.detail-facts .date-range-fact button').click();
  const dialog = page.getByRole('dialog'); const due = dialog.locator('input[type=date]').last();
  await dialog.locator('input[type=date]').first().fill('');
  await due.fill('10000-01-01'); await dialog.getByRole('button', { name: 'Save engagement schedule', exact: true }).click();
  await expect(dialog).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
  await due.fill('2026-12-01'); await dialog.getByRole('button', { name: 'Save engagement schedule', exact: true }).click();
  await expect(dialog).toHaveCount(0); await page.reload(); await expect(page.locator('.audit-workbench')).toBeVisible();
  expect((await readStoredWorkspace(page)).engagements[0].dueDate).toBe('2026-12-01');
});
