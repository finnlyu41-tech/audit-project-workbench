import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, workspaceFixture, readStoredWorkspace, seriousViolations } from './helpers.js';
import { toTraditional } from '../src/dashboard/traditional.js';

const browserErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });

async function simpleModuleEditor(page, editName = 'Edit workstream details') {
  const row = page.locator('.simple-workstream').first();
  if (!(await row.locator('details').evaluate(element => element.open))) await row.locator('summary').click();
  await row.getByRole('button', { name: editName, exact: true }).click();
  return page.getByRole('dialog');
}

test('Simple module form saves primary edits without clearing folded owner, dates, notes or nodes', async ({ page }) => {
  const changedAt = new Date(Date.now() + 60_000).toISOString();
  await page.clock.setFixedTime(new Date(changedAt));
  const fixture = workspaceFixture();
  Object.assign(fixture.projects[0].workstreams[0], { startDate: '2026-09-01', notes: 'Keep literal <scope> 中文\nSecond line' });
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  const before = await readStoredWorkspace(page);
  const dialog = await simpleModuleEditor(page);
  await expect(dialog.locator('.workstream-form-details')).not.toHaveAttribute('open');
  await expect(dialog.locator('input:visible, select:visible, textarea:visible')).toHaveCount(3);
  for (const label of ['Owner', 'Start']) {
    await expect(dialog.getByLabel(label, { exact: true })).toHaveCount(1);
    await expect(dialog.getByLabel(label, { exact: true })).toBeHidden();
  }
  // Role names exclude textarea contents and select options; exact label text does not.
  const foldedNotes = dialog.getByRole('textbox', { name: 'Notes', exact: true, includeHidden: true });
  await expect(foldedNotes).toHaveCount(1);
  await expect(foldedNotes).toBeHidden();
  await dialog.getByLabel('Workstream status').selectOption('on_hold');
  await dialog.getByLabel('Due date', { exact: true }).fill('2026-10-31');
  await dialog.getByRole('button', { name: 'Save workstream', exact: true }).click();
  const expected = structuredClone(before);
  Object.assign(expected.engagements[0].workstreams[0], { simpleStatus: 'on_hold', dueDate: '2026-10-31', updatedAt: changedAt });
  expected.engagements[0].updatedAt = changedAt;
  await expect.poll(() => readStoredWorkspace(page)).toEqual(expected);
  await page.reload();
  await expect.poll(() => readStoredWorkspace(page)).toEqual(expected);
  await simpleModuleEditor(page);
  await dialog.locator('.workstream-form-details > summary').focus(); await page.keyboard.press('Enter');
  await expect(dialog.getByLabel('Owner', { exact: true })).toHaveValue(before.engagements[0].workstreams[0].owner);
  await expect(dialog.getByLabel('Start', { exact: true })).toHaveValue('2026-09-01');
  await expect(dialog.getByRole('textbox', { name: 'Notes', exact: true, includeHidden: true })).toHaveValue('Keep literal <scope> 中文\nSecond line');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => readStoredWorkspace(page)).toEqual(expected);
});

test('Simple module form keeps folded new-module drafts and rejects blank custom names', async ({ page }) => {
  const changedAt = new Date(Date.now() + 60_000).toISOString();
  await page.clock.setFixedTime(new Date(changedAt));
  await openWorkbench(page, workspaceFixture(), { businessMode: 'simple' });
  const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Add workstream', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const details = dialog.locator('.workstream-form-details');
  await expect(dialog.locator('input:visible, select:visible, textarea:visible')).toHaveCount(3);
  await dialog.getByLabel('Workstream type').selectOption('custom');
  const customName = dialog.locator('input[required]');
  await expect(customName).toBeVisible();
  await expect(details).not.toHaveAttribute('open');
  await customName.fill('   ');
  await dialog.getByRole('button', { name: 'Add workstream', exact: true }).click();
  await expect(customName).toBeFocused();
  expect(await customName.evaluate(element => element.validity.valid)).toBe(false);
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog.getByLabel('Workstream type').selectOption('bookkeeping');
  await details.locator('summary').focus(); await page.keyboard.press('Enter');
  await dialog.getByLabel('Owner', { exact: true }).fill(' Fictional coordinator ');
  await dialog.getByLabel('Start', { exact: true }).fill('2026-09-01');
  const notes = dialog.getByRole('textbox', { name: 'Notes', exact: true, includeHidden: true });
  await notes.fill('Literal <draft> 中文'); await notes.press('Enter'); await notes.pressSequentially('Second line');
  await details.locator('summary').click();
  await expect(notes).toBeHidden();
  await dialog.getByLabel('Due date', { exact: true }).fill('2026-11-30');
  await dialog.getByLabel('Workstream status').selectOption('in_progress');
  await expect(details).not.toHaveAttribute('open');
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog.getByRole('button', { name: 'Add workstream', exact: true }).click();
  await expect.poll(async () => (await readStoredWorkspace(page)).engagements[0].workstreams.length).toBe(3);
  const added = (await readStoredWorkspace(page)).engagements[0].workstreams[2];
  expect(added).toMatchObject({ categoryId: 'bookkeeping', mode: 'simple', simpleStatus: 'in_progress', owner: 'Fictional coordinator',
    startDate: '2026-09-01', dueDate: '2026-11-30', notes: 'Literal <draft> 中文\nSecond line', nodes: [] });
  const expected = structuredClone(before);
  expected.engagements[0].workstreams.push(added); expected.engagements[0].updatedAt = changedAt;
  await expect.poll(() => readStoredWorkspace(page)).toEqual(expected);
  await page.reload();
  await expect.poll(() => readStoredWorkspace(page)).toEqual(expected);
});

test('Simple module form reveals invalid folded dates and preserves the discard confirmation', async ({ page }) => {
  const fixture = workspaceFixture(); fixture.projects[0].workstreams[0].startDate = '2026-09-01';
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  const before = await readStoredWorkspace(page);
  const dialog = await simpleModuleEditor(page);
  const details = dialog.locator('.workstream-form-details');
  const due = dialog.getByLabel('Due date', { exact: true });
  const start = dialog.getByLabel('Start', { exact: true });
  await due.fill('2026-08-01');
  await dialog.getByRole('button', { name: 'Save workstream', exact: true }).click();
  await expect(details).toHaveAttribute('open');
  await expect(start).toBeVisible();
  expect(await due.evaluate(element => element.validity.rangeUnderflow)).toBe(true);
  expect(await start.evaluate(element => element.validity.rangeOverflow)).toBe(true);
  expect(await readStoredWorkspace(page)).toEqual(before);
  await due.fill(before.engagements[0].workstreams[0].dueDate);
  await details.locator('summary').click();
  await expect(dialog).not.toHaveAttribute('data-dirty');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await simpleModuleEditor(page);
  await details.locator('summary').click();
  await start.fill('2026-12-01');
  await details.locator('summary').click();
  expect(await start.evaluate(element => element.reportValidity())).toBe(false);
  await expect(details).toHaveAttribute('open');
  await expect(start).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await start.fill('2026-09-01');
  const notes = dialog.getByRole('textbox', { name: 'Notes', exact: true, includeHidden: true });
  await notes.fill('Unsaved folded draft');
  await details.locator('summary').click();
  await expect(dialog).toHaveAttribute('data-dirty', 'true');
  page.once('dialog', confirmation => confirmation.dismiss());
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(notes).toHaveValue('Unsaved folded draft');
  expect(await readStoredWorkspace(page)).toEqual(before);
  page.once('dialog', confirmation => confirmation.accept());
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => readStoredWorkspace(page)).toEqual(before);
});

test('Pro module form retains its template chooser without Simple disclosures or data changes', async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Add workstream', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('combobox', { name: 'Workstream template', exact: true })).toBeVisible();
  await expect(dialog.locator('.workstream-form-details')).toHaveCount(0);
  await expect(dialog.getByLabel('Workstream status', { exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => readStoredWorkspace(page)).toEqual(before);
});

for (const language of ['en', 'zh-Hans', 'zh-Hant']) test(`Simple module form stays readable and accessible in ${language}`, async ({ page }, info) => {
  const fixture = workspaceFixture();
  fixture.projects[0].workstreams[0].notes = 'Example literal <review> 中文 '.repeat(8);
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  await page.evaluate(value => localStorage.setItem('audit-progress-workbench:language', value), language);
  await page.reload();
  const before = await readStoredWorkspace(page);
  const editName = language === 'en' ? 'Edit workstream details' : language === 'zh-Hant' ? toTraditional('编辑模块资料') : '编辑模块资料';
  const dialog = await simpleModuleEditor(page, editName);
  const details = dialog.locator('.workstream-form-details');
  await expect(details).not.toHaveAttribute('open');
  await expect(dialog.locator('input:visible, select:visible, textarea:visible')).toHaveCount(3);
  for (const width of [375, 430, 800, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (width === 430 || width === 1440) await page.screenshot({ path: info.outputPath(`simple-form-compact-${language}-${width}.png`) });
  }
  await details.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open');
  await expect(details.locator('textarea')).toHaveValue(before.engagements[0].workstreams[0].notes);
  const notesName = language === 'en' ? 'Notes' : language === 'zh-Hant' ? toTraditional('备注') : '备注';
  await expect(details.locator('textarea')).toHaveAccessibleName(notesName);
  await expect(dialog.locator('input:visible, select:visible, textarea:visible')).toHaveCount(6);
  for (const width of [430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`simple-form-details-${language}-${width}.png`) });
  }
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
