import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, workspaceFixture, readStoredWorkspace, seriousViolations, localDateOffset } from './helpers.js';
import { makeOutstandingItem, makeTaxDeadline } from '../src/dashboard/model.js';
import { toTraditional } from '../src/dashboard/traditional.js';

const browserErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });

const savedModule = async page => (await readStoredWorkspace(page)).engagements[0].workstreams[0];
async function settings(page) {
  await page.getByRole('button', { name: 'Configure selected workstream', exact: true }).click();
  return page.getByRole('dialog');
}

test('switch mode, edit whole-module details, persist status and restore the original workflow', async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page), original = await savedModule(page);
  await page.locator('.workstream-card').first().locator('button').click();
  let dialog = await settings(page);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('switch', { name: 'Pro mode', exact: true }).click();
  const row = page.locator('.simple-workstream').first();
  await row.getByRole('combobox', { name: 'Workstream status', exact: true }).selectOption('on_hold');
  await row.getByLabel('Owner', { exact: true }).fill('Module coordinator');
  await row.getByLabel('Owner', { exact: true }).press('Enter');
  await row.locator('summary').click();
  await row.getByLabel('Start', { exact: true }).fill('2026-09-01');
  await row.getByLabel('Due date', { exact: true }).fill('2026-09-30');
  await row.getByRole('textbox', { name: 'Notes', exact: true }).fill('Literal <review> 备注');
  await row.getByRole('textbox', { name: 'Notes', exact: true }).press('Tab');
  await expect.poll(async () => (await savedModule(page)).simpleStatus).toBe('on_hold');
  await expect(row).toBeVisible();
  await expect(page.locator('.workflow-panel').getByRole('checkbox')).toHaveCount(0);
  await expect(row.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue('Literal <review> 备注');
  await expect(page.locator('.workstream-card')).toHaveCount(0);
  await row.getByLabel('Workstream status').selectOption('completed');
  await expect.poll(async () => (await savedModule(page)).simpleStatus).toBe('completed');
  await expect(page.locator('.simple-project-summary')).toContainText('1/2 completed');
  await page.reload();
  await expect(row.getByLabel('Workstream status')).toHaveValue('completed');
  expect(await savedModule(page)).toMatchObject({ owner: 'Module coordinator', startDate: '2026-09-01', dueDate: '2026-09-30', notes: 'Literal <review> 备注' });
  expect((await savedModule(page)).nodes).toEqual(original.nodes);
  const current = await readStoredWorkspace(page);
  expect(current.entities).toEqual(before.entities);
  expect(current.engagements[0].owner).toBe(before.engagements[0].owner);
  expect(current.engagements[0].dueDate).toBe(before.engagements[0].dueDate);
  expect(current.engagements[0].workstreams[1]).toEqual({ ...before.engagements[0].workstreams[1], mode: 'simple' });
  expect(current.engagements[0].outstandingItems).toEqual(before.engagements[0].outstandingItems);
  await page.getByRole('switch', { name: 'Pro mode', exact: true }).click();
  await expect.poll(async () => (await savedModule(page)).mode || 'full').toBe('full');
  await expect(page.locator('.simple-workstream')).toHaveCount(0);
  await page.locator('.workstream-card').first().locator('button').click();
  await expect(page.getByRole('tab', { name: /Engagement setup/ })).toBeVisible();
  expect((await savedModule(page)).nodes).toEqual(original.nodes);
  await page.getByRole('switch', { name: 'Pro mode', exact: true }).click();
  await row.locator('summary').click();
  await row.getByRole('button', { name: 'Edit workstream details', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Workstream status')).toHaveValue('completed');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect.poll(async () => (await savedModule(page)).mode).toBe('simple');
});

test('a new simple module starts without template nodes and updates status without setup prompts', async ({ page }) => {
  await openWorkbench(page, workspaceFixture(), { businessMode: 'simple' });
  await page.getByRole('button', { name: 'Add workstream', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workstream type').selectOption('bookkeeping');
  await expect(dialog.getByLabel('Workstream template', { exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Add workstream', exact: true }).click();
  await expect.poll(async () => (await readStoredWorkspace(page)).engagements[0].workstreams.length).toBe(3);
  const module = (await readStoredWorkspace(page)).engagements[0].workstreams[2];
  expect(module.nodes).toEqual([]); expect(module.mode).toBe('simple');
  const row = page.locator('.simple-workstream').nth(2);
  await expect(row.getByLabel('Workstream status')).toHaveValue('not_started');
  await row.getByLabel('Workstream status').selectOption('in_progress');
  await expect.poll(async () => (await readStoredWorkspace(page)).engagements[0].workstreams[2].simpleStatus).toBe('in_progress');
});

test('inline edits reject reversed dates, preserve composition and save before switching mode', async ({ page }) => {
  const fixture = workspaceFixture(); fixture.projects[0].workstreams[0].startDate = '2026-09-01';
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  const before = await readStoredWorkspace(page), row = page.locator('.simple-workstream').first();
  const due = row.getByLabel('Due date', { exact: true }), owner = row.getByLabel('Owner', { exact: true });
  await due.fill('2026-08-01'); await due.press('Enter');
  expect(await due.evaluate(element => element.validity.rangeUnderflow)).toBe(true);
  expect(await readStoredWorkspace(page)).toEqual(before);
  await due.press('Escape'); await expect(due).toHaveValue(before.engagements[0].workstreams[0].dueDate);
  await owner.fill('草稿');
  await owner.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(owner).toBeFocused(); expect(await readStoredWorkspace(page)).toEqual(before);
  await owner.press('Escape'); await expect(owner).toHaveValue('Alex Chan');
  await row.locator('summary').click();
  const start = row.getByLabel('Start', { exact: true });
  await start.fill('2026-12-01'); await start.press('Enter');
  expect(await start.evaluate(element => element.validity.rangeOverflow)).toBe(true);
  expect(await readStoredWorkspace(page)).toEqual(before); await start.press('Escape');
  const notes = row.getByRole('textbox', { name: 'Notes', exact: true });
  await notes.fill('Line one'); await notes.press('Enter'); await notes.pressSequentially('Line two');
  await page.getByRole('switch', { name: 'Pro mode', exact: true }).click();
  await expect.poll(async () => (await savedModule(page)).notes).toBe('Line one\nLine two');
  expect((await savedModule(page)).nodes).toEqual(before.engagements[0].workstreams[0].nodes);
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe(before.engagements[0].owner);
});

test('Simple home keeps deadlines, outstanding, recent visits and backup while Pro restores full tools', async ({ page }) => {
  const fixture = workspaceFixture();
  fixture.projects[0].startDate = ''; fixture.projects[0].priority = 'urgent';
  fixture.projects[0].taxDeadlines.push(makeTaxDeadline({ dueDate: localDateOffset(-1), category: 'profits_tax_filing' }));
  fixture.projects[0].outstandingItems.push(makeOutstandingItem({ title: 'Fictional signed confirmation' }));
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  const before = await readStoredWorkspace(page);
  await expect(page.locator('.simple-project-details')).not.toHaveAttribute('open');
  await expect(page.locator('.detail-facts')).toBeHidden();
  await page.locator('.simple-project-details > summary').click();
  await expect(page.locator('.detail-facts')).toBeVisible();
  await page.getByRole('button', { name: 'Example Services Limited', exact: true }).click();
  await expect(page.locator('.entity-overview .simple-project-details')).not.toHaveAttribute('open');
  await expect(page.locator('.annual-progress')).toHaveCount(0);
  await expect(page.locator('.annual-project-open')).toContainText('YE December 31, 2026');
  await expect(page.locator('.annual-owner')).toContainText('Alex Chan');
  await expect(page.locator('.annual-schedule')).toContainText('31 Oct 2026');
  await page.locator('.annual-project-open').click();
  await page.locator('.app-rail-button[aria-label="Home"]').click();
  await expect(page.locator('.home-metric-grid, .home-active-panel')).toHaveCount(0);
  await expect(page.locator('.home-priority-list [data-category="deadline"]')).toBeVisible();
  await expect(page.locator('.home-priority-list')).toContainText('Fictional signed confirmation');
  await expect(page.locator('.home-recent')).toContainText('Example Services Limited');
  await expect(page.locator('[data-category="setup"], [data-category="manual_priority"]')).toHaveCount(0);
  await expect(page.locator('.home-priority-filters > button')).toHaveCount(5);
  for (const name of ['Project schedule', 'Management reports', 'Template library'])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Deadline alerts/ })).toBeVisible();
  await page.locator('summary[aria-label^="Backup"]').click();
  await expect(page.getByRole('button', { name: 'Export backup', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore backup', exact: true })).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await page.getByRole('switch', { name: 'Pro mode', exact: true }).click();
  await expect(page.locator('.home-metric-grid')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Management reports', exact: true })).toBeVisible();
  await expect(page.locator('[data-category="manual_priority"]')).toBeVisible();
  await page.getByRole('group', { name: 'Priority filters' }).getByRole('button', { name: /Manual priority/ }).click();
  await page.getByRole('switch', { name: 'Pro mode', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Priority filters' }).getByRole('button', { name: /All actions/ })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => readStoredWorkspace(page)).toEqual(before);
});

for (const language of ['en', 'zh-Hans', 'zh-Hant']) test(`simple mode stays readable and accessible in ${language}`, async ({ page }, info) => {
  const fixture = workspaceFixture(); Object.assign(fixture.projects[0].workstreams[0], { mode: 'simple', simpleStatus: 'in_progress',
    notes: 'Example literal notes <review> 中文 with a long unbroken reference '.repeat(4) });
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  await page.evaluate(value => localStorage.setItem('audit-progress-workbench:language', value), language);
  await page.reload();
  const row = page.locator('.simple-workstream').first();
  const expected = language === 'en' ? 'Workstream status' : language === 'zh-Hant' ? toTraditional('模块状态') : '模块状态';
  await expect(row.getByLabel(expected)).toHaveValue('in_progress');
  await row.locator('summary').click();
  await expect(page.locator('.workflow-panel')).toHaveCount(0);
  const before = await readStoredWorkspace(page);
  for (const width of [375, 430, 800, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await row.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    if (width === 430 || width === 1440) await page.screenshot({ path: info.outputPath(`simple-${language}-${width}.png`) });
  }
  await page.screenshot({ path: info.outputPath(`simple-${language}.png`) });
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test('archived simple workstreams keep their status and details read-only', async ({ page }) => {
  const fixture = workspaceFixture(); fixture.projects[0].archived = true;
  Object.assign(fixture.projects[0].workstreams[0], { mode: 'simple', simpleStatus: 'completed' });
  await openWorkbench(page, fixture, { home: true }); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Quick open', exact: true });
  await picker.getByRole('combobox').fill('Example Services Limited');
  await picker.getByRole('option').filter({ hasText: 'Company master' }).click();
  await page.locator('.annual-project-open').click();
  await expect(page.locator('.simple-workstream').getByLabel('Workstream status')).toBeDisabled();
  await expect(page.locator('.simple-workstream').getByLabel('Owner', { exact: true })).toBeDisabled();
  await expect(page.locator('.simple-workstream').getByLabel('Due date', { exact: true })).toBeDisabled();
  await page.locator('.simple-workstream summary').click();
  await expect(page.locator('.simple-workstream').getByLabel('Notes', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Edit workstream details', exact: true })).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});


test('missing preference defaults to Simple globally and Pro choice survives reload and backup', async ({ page, browser }) => {
  const fixture = workspaceFixture(); delete fixture.businessMode;
  await openWorkbench(page, fixture, { businessMode: null });
  const toggle = page.getByRole('switch', { name: 'Pro mode', exact: true });
  await expect(toggle).not.toBeChecked();
  await expect.poll(async () => (await readStoredWorkspace(page)).businessMode).toBe('simple');
  expect((await readStoredWorkspace(page)).engagements[0].workstreams.every(w => w.mode === 'simple')).toBe(true);
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect.poll(async () => (await readStoredWorkspace(page)).businessMode).toBe('pro');
  await page.reload();
  await expect(toggle).toBeChecked();
  const restored = await browser.newPage();
  await openWorkbench(restored, await readStoredWorkspace(page));
  await expect(restored.getByRole('switch', { name: 'Pro mode', exact: true })).toBeChecked();
  await restored.close();
});


test('completing every simple module keeps the empty active-filter view stable', async ({ page }) => {
  const fixture = workspaceFixture();
  for (const w of fixture.projects[0].workstreams) Object.assign(w, { mode: 'simple', simpleStatus: 'completed' });
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  const toggle = page.getByRole('switch', { name: 'Pro mode', exact: true });
  await toggle.click(); await expect(toggle).toBeChecked();
  await toggle.click(); await expect(toggle).not.toBeChecked();
  await expect.poll(async () => (await readStoredWorkspace(page)).businessMode).toBe('simple');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
});
