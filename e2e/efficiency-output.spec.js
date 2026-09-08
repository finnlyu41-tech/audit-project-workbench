import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readStoredWorkspace, seriousViolations } from './helpers.js';
import { openEfficiency, openRecord, dialog, recordErrors, scheduleDialog } from './efficiency-helpers.js';
import { holdingWorkspace } from '../tests/fixtures/holding-workspace.js';
import { efficiencyWorkspace } from '../tests/fixtures/efficiency-workspace.js';
import { openWorkbench } from './helpers.js';
recordErrors(test);

async function chooseBackup(page, payload, name = 'fictional-compare.json') {
  await page.locator('summary[aria-label^="Backup"]').click();
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Compare backup', exact: true }).click();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
}

test('record-level backup comparison is read-only and hides private notes even when record counts are identical', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page), changed = structuredClone(before);
  changed.engagements[0].dueDate = '2026-10-07'; changed.engagements[0].notes = 'DO-NOT-DISPLAY-COMPARE';
  await chooseBackup(page, changed);
  await expect(dialog(page)).toContainText('2026-10-07'); await expect(dialog(page)).toContainText('2026-10-05');
  await expect(dialog(page)).not.toContainText('DO-NOT-DISPLAY-COMPARE'); await expect(dialog(page)).not.toContainText('PRIVATE-');
  expect(await readStoredWorkspace(page)).toEqual(before);
  page.once('dialog', d => d.dismiss()); await dialog(page).getByRole('button', { name: 'Continue to restore confirmation' }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test('invalid backup comparison cannot progress to restoration or mutate business records', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page); await chooseBackup(page, { version: 999, entities: [] });
  await expect(dialog(page).getByRole('alert')).toContainText('invalid');
  await expect(dialog(page).getByRole('button', { name: 'Continue to restore confirmation' })).toBeDisabled();
  await dialog(page).locator('.modal-actions').getByRole('button', { name: 'Close', exact: true }).click(); expect(await readStoredWorkspace(page)).toEqual(before);
});

test('export reflects current filtering and table order and protects formula-like strings and hidden data', async ({ page }) => {
  const fixture = efficiencyWorkspace(); fixture.entities[0].legalName = '=FORMULA Example';
  await openEfficiency(page, fixture); const before = await readStoredWorkspace(page);
  await page.locator('.app-rail-button[aria-label="Management reports"]').click();
  await page.getByRole('combobox', { name: 'Owner', exact: true }).selectOption('Alex Example');
  await page.getByText('Copy / export current table', { exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download current table CSV' }).click();
  const file = await download, csv = await fs.readFile(await file.path(), 'utf8');
  expect(csv).toContain("'=FORMULA Example"); expect(csv).toContain('2025');
  for (const value of ['PRIVATE-', 'Blair Example', 'Efficiency Beta']) expect(csv).not.toContain(value);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('test denial'); } } }));
  await page.getByRole('button', { name: 'Copy current table', exact: true }).click();
  await expect(page.getByLabel('Table text for manual copying')).toHaveValue(/'=FORMULA Example/);
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test('outline preview appends only to a template draft and prevents silently saving an unappended outline', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Template library', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Edit template', exact: true }).first().click();
  await dialog(page).getByText('Paste workflow outline', { exact: true }).click();
  const text = dialog(page).getByLabel('Workflow outline'); await text.fill('New synthetic stage\n  New first condition\n  New second condition');
  await dialog(page).getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(text).toBeFocused(); await expect(dialog(page)).toContainText('Edit template');
  await dialog(page).getByRole('button', { name: 'Preview outline', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Append to template draft', exact: true }).click();
  await expect(text).toHaveValue('');
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog(page).getByRole('button', { name: 'Save template', exact: true }).click();
  const after = await readStoredWorkspace(page); expect(after.samples.some(s => s.nodes.some(n => n.title === 'New synthetic stage' && n.conditions.length === 2))).toBe(true);
  expect(after.engagements).toEqual(before.engagements); expect(after.entities).toEqual(before.entities);
});

test('group readiness explains actual blockers and missing annual creation returns for an explicit scoped link', async ({ page }) => {
  await openWorkbench(page, holdingWorkspace()); await openRecord(page, 'Example Consolidation 2026');
  const panel = page.locator('.holding-components-panel'), before = await readStoredWorkspace(page);
  await panel.getByRole('button', { name: 'Search and filter components', exact: true }).click();
  await panel.getByRole('button', { name: /Not ready only/ }).click();
  const beta = panel.locator('[data-component-id="part-beta"]');
  await beta.getByText('View reasons for not being ready', { exact: true }).click();
  await expect(beta).toContainText('No corresponding annual engagement is assigned');
  await beta.getByRole('button', { name: 'Create the missing corresponding year', exact: true }).click();
  await expect(dialog(page).getByLabel('Reporting start date *', { exact: true })).toHaveValue('2026-01-01');
  await expect(dialog(page).getByLabel('Reporting end date *', { exact: true })).toHaveValue('2026-12-31');
  await dialog(page).getByRole('button', { name: 'Blank engagement', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  await expect(dialog(page)).toContainText('Confirm linking the new annual engagement');
  const created = await readStoredWorkspace(page); expect(created.engagements).toHaveLength(before.engagements.length + 1);
  expect(created.engagements.find(e => e.id === 'holding-annual').consolidation.components[1].engagementId).toBeNull();
  await dialog(page).getByRole('button', { name: 'Confirm link', exact: true }).click();
  const after = await readStoredWorkspace(page), parent = after.engagements.find(e => e.id === 'holding-annual');
  const child = after.engagements.find(e => e.entityId === 'holding-beta');
  expect(parent.consolidation.components[1].engagementId).toBe(child.id);
  expect(parent.consolidation.components[1].readinessConditions).toEqual(before.engagements[0].consolidation.components[1].readinessConditions);
  expect(parent.consolidation.components.filter(c => c.id !== 'part-beta')).toEqual(before.engagements[0].consolidation.components.filter(c => c.id !== 'part-beta'));
  expect(after.entities).toEqual(before.entities);
});

test('archive blockers give actionable annual/tax paths without archiving the company or hiding tax work', async ({ page }) => {
  await openEfficiency(page); await openRecord(page, 'EAL', true); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Archive company', exact: true }).click();
  await expect(dialog(page)).toContainText('Items to review before archiving');
  await expect(dialog(page)).toContainText('Unfinished tax deadlines');
  await dialog(page).getByRole('button', { name: 'Open and review this year', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0); await expect(page.locator('.detail-title > p')).toContainText('Efficiency Alpha Limited');
  expect(await readStoredWorkspace(page)).toEqual(before);
});

for (const [language, width] of [['en', 1440], ['zh-Hans', 800], ['zh-Hant', 480]]) test(`new workday form and readonly differences remain readable and accessible ${language} ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 }); await openEfficiency(page);
  await page.locator('.language-summary').click(); await page.locator('.language-menu > button').nth({ 'zh-Hans': 0, 'zh-Hant': 1, en: 2 }[language]).click();
  await page.locator(`.app-rail-button[aria-label="${{ en: 'Project schedule', 'zh-Hans': '项目排期', 'zh-Hant': '項目排期' }[language]}"]`).click();
  await page.locator('.schedule-row-edit').first().click();
  await dialog(page).locator('.schedule-mode button').nth(1).click();
  await dialog(page).locator('input[type="number"]').first().fill('3');
  await dialog(page).locator('.efficiency-grid select').first().selectOption('backward');
  await dialog(page).locator('.working-day-inputs input[type="date"]').first().fill('2026-10-05');
  await expect(dialog(page).locator('.working-day-preview')).toBeVisible();
  expect(await dialog(page).evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  const input = dialog(page).locator('.working-day-inputs input');
  for (const el of await input.all()) { const box = await el.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(42); expect(box.width).toBeGreaterThan(100); }
  expect(seriousViolations(await new AxeBuilder({ page }).include('.workbench-modal').withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  await dialog(page).screenshot({ path: info.outputPath(`efficiency-${language}-${width}.png`) });
});
