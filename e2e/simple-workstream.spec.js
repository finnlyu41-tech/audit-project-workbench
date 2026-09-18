import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, workspaceFixture, readStoredWorkspace, seriousViolations } from './helpers.js';
import { toTraditional } from '../src/dashboard/traditional.js';

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
  dialog = await settings(page);
  await dialog.getByRole('combobox', { name: 'Workstream status', exact: true }).selectOption('on_hold');
  await dialog.getByLabel('Owner', { exact: true }).fill('Module coordinator');
  await dialog.getByLabel('Start', { exact: true }).fill('2026-09-01');
  await dialog.getByLabel('Due date', { exact: true }).fill('2026-09-30');
  await dialog.getByLabel('Notes', { exact: true }).fill('Literal <review> 备注');
  await dialog.getByRole('button', { name: 'Save workstream', exact: true }).click();
  await expect.poll(async () => (await savedModule(page)).simpleStatus).toBe('on_hold');
  await expect(page.locator('.simple-workstream')).toBeVisible();
  await expect(page.locator('.workflow-panel').getByRole('checkbox')).toHaveCount(0);
  await expect(page.locator('.simple-workstream')).toContainText('Literal <review> 备注');
  await expect(page.locator('.workstream-card').first()).not.toContainText('Next stage');
  await page.locator('.simple-workstream').getByLabel('Workstream status').selectOption('completed');
  await expect.poll(async () => (await savedModule(page)).simpleStatus).toBe('completed');
  await expect(page.locator('.project-focus-facts')).toContainText('1/2 completed');
  await page.reload();
  await page.locator('.workstream-card').first().locator('button').click();
  await expect(page.locator('.simple-workstream').getByLabel('Workstream status')).toHaveValue('completed');
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
  await expect(page.getByRole('tab', { name: /Engagement setup/ })).toBeVisible();
  expect((await savedModule(page)).nodes).toEqual(original.nodes);
  await page.getByRole('switch', { name: 'Pro mode', exact: true }).click();
  dialog = await settings(page);
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
  await page.locator('.workstream-card').nth(2).locator('button').click();
  await expect(page.locator('.simple-workstream').getByLabel('Workstream status')).toHaveValue('not_started');
  await page.locator('.simple-workstream').getByLabel('Workstream status').selectOption('in_progress');
  await expect.poll(async () => (await readStoredWorkspace(page)).engagements[0].workstreams[2].simpleStatus).toBe('in_progress');
});

for (const language of ['en', 'zh-Hans', 'zh-Hant']) test(`simple mode stays readable and accessible in ${language}`, async ({ page }, info) => {
  const fixture = workspaceFixture(); Object.assign(fixture.projects[0].workstreams[0], { mode: 'simple', simpleStatus: 'in_progress',
    notes: 'Example literal notes <review> 中文 with a long unbroken reference '.repeat(4) });
  await openWorkbench(page, fixture, { businessMode: 'simple' });
  await page.evaluate(value => localStorage.setItem('audit-progress-workbench:language', value), language);
  await page.reload(); await page.locator('.workstream-card').first().locator('button').click();
  const expected = language === 'en' ? 'Simple mode' : language === 'zh-Hant' ? toTraditional('简化模式') : '简化模式';
  await expect(page.locator('.simple-workstream')).toContainText(expected);
  await expect(page.locator('.project-focus-summary')).not.toContainText('Add stages');
  const before = await readStoredWorkspace(page);
  for (const width of [800, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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
  await page.locator('.workstream-card').first().locator('button').click();
  await expect(page.locator('.simple-workstream').getByLabel('Workstream status')).toBeDisabled();
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
