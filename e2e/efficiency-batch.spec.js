import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { readStoredWorkspace } from './helpers.js';
import { openEfficiency, openRecord, dialog, previewApply, alpha, recordErrors } from './efficiency-helpers.js';
import { openOutstandingMore } from './outstanding-helpers.js';
import { closeOutstandingPane } from './panel-helpers.js';
import { efficiencyWorkspace } from '../tests/fixtures/efficiency-workspace.js';
import { calculateBackwardSchedule } from '../src/dashboard/working-days.js';
recordErrors(test);
async function selectItems(page, titles = ['Bank statement', 'Inventory schedule']) {
  await openOutstandingMore(page); await page.getByRole('button', { name: 'Select multiple items', exact: true }).click();
  for (const title of titles) await page.getByLabel(`Select item: ${title}`, { exact: true }).check();
}
async function openScheduleBatch(page) {
  await page.locator('.app-rail-button[aria-label="Project schedule"]').click();
  await page.getByRole('button', { name: 'Search and filter schedules', exact: true }).click();
  await page.getByRole('button', { name: 'Adjust work schedules in bulk', exact: true }).click();
}

test('multiline entry previews duplicates and commits once to the exact source, with reversible changes', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page);
  await openOutstandingMore(page); await page.getByRole('button', { name: 'Paste multiline outstanding items', exact: true }).click();
  await dialog(page).getByLabel('Multiline outstanding items').fill('Bank statement\n\nSynthetic invoice\nSynthetic inventory');
  await dialog(page).getByRole('button', { name: 'Preview changes' }).click();
  await expect(dialog(page).getByLabel('New outstanding items preview')).toContainText('3 items will be added');
  await expect(dialog(page)).toContainText('An item with this title already exists');
  await dialog(page).getByRole('button', { name: 'Confirm and apply' }).click();
  await expect(dialog(page)).toHaveCount(0);
  const after = await readStoredWorkspace(page); expect(after.engagements[0].outstandingItems).toHaveLength(5);
  expect(after.engagements[1]).toEqual(before.engagements[1]); expect(after.entities).toEqual(before.entities);
  await page.getByRole('button', { name: 'Undo this batch change', exact: true }).click();
  expect((await alpha(page)).outstandingItems.map(({ updatedAt, ...item }) => item)).toEqual(before.engagements[0].outstandingItems.map(({ updatedAt, ...item }) => item));
});

test('bulk status changes require preview, preserve same-id foreign items and can undo without affecting audit progress', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page); await selectItems(page);
  await page.getByRole('button', { name: 'Change selected statuses', exact: true }).click();
  await expect(dialog(page).getByRole('button', { name: 'Confirm and apply' })).toBeDisabled();
  await dialog(page).getByLabel('Change all to').selectOption('resolved'); await previewApply(page);
  expect((await alpha(page)).outstandingItems.every(i => i.status === 'resolved')).toBe(true);
  expect((await alpha(page)).workstreams).toEqual(before.engagements[0].workstreams);
  expect((await readStoredWorkspace(page)).engagements[1]).toEqual(before.engagements[1]);
  await page.getByRole('button', { name: 'Undo this batch change', exact: true }).click();
  expect((await alpha(page)).outstandingItems.map(({ updatedAt, ...item }) => item)).toEqual(before.engagements[0].outstandingItems.map(({ updatedAt, ...item }) => item));
});

test('a changed source cannot commit an old bulk preview', async ({ page }) => {
  await openEfficiency(page); await selectItems(page, ['Bank statement']);
  await page.getByRole('button', { name: 'Change selected statuses', exact: true }).click();
  await dialog(page).getByLabel('Change all to').selectOption('resolved');
  await dialog(page).getByRole('button', { name: 'Preview changes' }).click();
  await page.locator('.outstanding-item').filter({ hasText: 'Bank statement' }).locator('select').evaluate(select => {
    select.value = 'awaiting_client'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const changed = await readStoredWorkspace(page);
  await dialog(page).getByRole('button', { name: 'Confirm and apply' }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('changed');
  expect(await readStoredWorkspace(page)).toEqual(changed);
});

test('selected titles carry into follow-up, company language persists and subject/body output remains reviewed and local', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page); await selectItems(page, ['Bank statement']);
  await page.getByRole('button', { name: 'Prepare follow-up for selected items', exact: true }).click();
  await expect(dialog(page).getByLabel('Source company and annual engagement')).toHaveValue('eff-alpha-year');
  await expect(dialog(page).locator('.follow-up-items input:checked')).toHaveCount(1);
  await dialog(page).getByLabel('Draft language').selectOption('zh-Hant');
  await dialog(page).getByRole('button', { name: "Remember this company's draft language", exact: true }).click();
  await expect(page.locator('.language-summary')).toHaveAttribute('aria-label', 'Language · English');
  await dialog(page).getByRole('button', { name: 'Generate preview', exact: true }).click();
  const review = dialog(page).getByLabel('I have checked the source and draft content before copying or downloading.');
  await expect(dialog(page).getByRole('button', { name: 'Copy subject', exact: true })).toBeDisabled(); await review.check();
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } }));
  await dialog(page).getByRole('button', { name: 'Copy subject', exact: true }).click();
  expect(await page.evaluate(() => window.copied)).toContain('Efficiency Alpha Limited');
  expect(await page.evaluate(() => window.copied)).not.toContain('\n');
  await dialog(page).getByRole('button', { name: 'Copy body', exact: true }).click();
  expect(await page.evaluate(() => window.copied)).toContain('Bank statement');
  expect(await page.evaluate(() => window.copied)).not.toContain('Inventory schedule');
  await dialog(page).getByLabel('Use a generic download filename without the client name').uncheck();
  const download = page.waitForEvent('download'); await dialog(page).getByRole('button', { name: 'Download text draft', exact: true }).click();
  const file = await download, text = await fs.readFile(await file.path(), 'utf8');
  expect(file.suggestedFilename()).toContain('EAL_'); expect(file.suggestedFilename()).toContain('2025-01-01');
  for (const secret of ['PRIVATE-', 'Inventory schedule', 'Different company request']) expect(text).not.toContain(secret);
  const after = await readStoredWorkspace(page); expect(after.engagements).toEqual(before.engagements);
  expect(after.entities.find(e => e.id === 'eff-alpha').followUpLanguage).toBe('zh-Hant');
  await dialog(page).locator('.modal-actions').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare follow-up for selected items', exact: true }).click();
  await expect(dialog(page).getByLabel('Draft language')).toHaveValue('zh-Hant');
});

test('sending is explicit, due follow-ups link to original items and do not change workflow completion', async ({ page }) => {
  await openEfficiency(page); const before = await alpha(page); await selectItems(page, ['Bank statement']);
  await page.getByRole('button', { name: 'Record sending and next follow-up', exact: true }).click();
  await dialog(page).getByLabel('Actual sent date', { exact: true }).fill('2026-09-04');
  await dialog(page).getByLabel('Working days until follow-up').fill('3');
  await previewApply(page);
  expect((await alpha(page)).outstandingItems[0].followUp).toMatchObject({ sentDate: '2026-09-04', dueDate: '2026-09-09', interval: 3 });
  expect((await alpha(page)).workstreams).toEqual(before.workstreams);
  await closeOutstandingPane(page); await page.locator('.app-rail-button[aria-label="Home"]').click();
  await page.getByText(/^Next follow-up is due/).click();
  await page.locator('.home-overview .efficiency-row').filter({ hasText: 'Bank statement' }).click();
  await expect(page.locator('.outstanding-item[data-revealed]')).toContainText('Bank statement');
});

test('shift preview retains workday duration and tax dates; sequential scheduling follows the chosen order', async ({ page }) => {
  await openEfficiency(page); const before = await readStoredWorkspace(page); await openScheduleBatch(page);
  const choices = dialog(page).getByRole('group', { name: 'Select engagements to adjust', exact: true });
  await choices.getByRole('checkbox').first().check(); await choices.getByRole('checkbox').nth(1).check();
  await dialog(page).getByLabel('Working days to shift (negative means earlier)').fill('3');
  await previewApply(page);
  expect((await alpha(page)).startDate).toBe('2026-10-06'); expect((await alpha(page)).dueDate).toBe('2026-10-08');
  expect((await readStoredWorkspace(page)).entities).toEqual(before.entities);
  await page.getByRole('button', { name: 'Undo this batch change', exact: true }).click();
  await page.getByRole('button', { name: 'Adjust work schedules in bulk', exact: true }).click();
  await dialog(page).getByLabel('Batch scheduling mode').selectOption('sequence');
  await choices.getByRole('checkbox').first().check(); await choices.getByRole('checkbox').nth(1).check();
  await dialog(page).getByLabel('First engagement start date').fill('2026-09-30');
  await dialog(page).getByRole('region', { name: 'Execution order', exact: true }).getByLabel('Estimated working days').nth(0).fill('2');
  await dialog(page).getByRole('region', { name: 'Execution order', exact: true }).getByLabel('Estimated working days').nth(1).fill('2');
  await previewApply(page);
  const after = await readStoredWorkspace(page); expect(after.engagements[0]).toMatchObject({ startDate: '2026-09-30', dueDate: '2026-10-02' });
  expect(after.engagements[1]).toMatchObject({ startDate: '2026-10-05', dueDate: '2026-10-06' });
  expect(after.engagements.map(e => e.reportingPeriods)).toEqual(before.engagements.map(e => e.reportingPeriods));
});

test('locked latest finish refuses shifting beyond the target instead of moving the promised deadline', async ({ page }) => {
  const store = efficiencyWorkspace(), plan = calculateBackwardSchedule('2026-10-05', '3');
  Object.assign(store.engagements[0], { startDate: plan.startDate, dueDate: plan.dueDate, schedulePlan: plan.schedulePlan });
  await openEfficiency(page, store); const before = await readStoredWorkspace(page); await openScheduleBatch(page);
  await dialog(page).getByRole('group', { name: 'Select engagements to adjust' }).getByRole('checkbox').first().check();
  await dialog(page).getByRole('button', { name: 'Preview changes' }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('locked');
  await expect(dialog(page).getByRole('button', { name: 'Confirm and apply' })).toBeDisabled(); expect(await readStoredWorkspace(page)).toEqual(before);
});

test('batch annual creation follows each actual period and resets only the new engagement', async ({ page }) => {
  await openEfficiency(page, undefined, { home: true }); const before = await readStoredWorkspace(page);
  await page.getByText('Saved filters and annual tools', { exact: true }).click();
  await page.getByRole('button', { name: 'Create next annual engagements in bulk', exact: true }).click();
  await dialog(page).getByRole('checkbox', { name: 'Efficiency Alpha Limited', exact: true }).check();
  await dialog(page).getByRole('checkbox', { name: 'Efficiency Beta Limited', exact: true }).check();
  await dialog(page).getByRole('button', { name: 'Use prior-year owner · Alex Example', exact: true }).click();
  await previewApply(page); const after = await readStoredWorkspace(page); expect(after.engagements).toHaveLength(4);
  const newRows = after.engagements.filter(e => !before.engagements.some(old => old.id === e.id));
  expect(newRows.find(e => e.entityId === 'eff-alpha')).toMatchObject({ periodStart: '2026-01-01', periodEnd: '2026-12-31', owner: 'Alex Example', startDate: '', dueDate: '', outstandingItems: [] });
  expect(newRows.find(e => e.entityId === 'eff-beta')).toMatchObject({ periodStart: '2026-07-01', periodEnd: '2027-06-30', owner: '' });
  expect(after.engagements.filter(e => before.engagements.some(old => old.id === e.id))).toEqual(before.engagements);
  expect(newRows.flatMap(e => e.workstreams).flatMap(w => w.nodes).flatMap(n => n.conditions).some(c => c.done)).toBe(false);
});
