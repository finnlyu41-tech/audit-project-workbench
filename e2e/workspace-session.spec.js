import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, readStoredWorkspace, workspaceFixture, seriousViolations } from './helpers.js';
import { STORAGE_KEY, canonicalStorePayload, normalizeStore } from '../src/dashboard/model.js';
import { WORKSPACE_SESSION_LOCK } from '../src/dashboard/workspace-session.js';
import { toTraditional } from '../src/dashboard/traditional.js';
const occupied = page => page.locator('.workspace-session-gate[data-session-state=occupied]');
const retry = page => page.getByRole('button', { name: 'Check again and open', exact: true });
async function newBlocked(context, { instrument = false } = {}) {
  const other = await context.newPage();
  if (instrument) await other.addInitScript(key => {
    window.workspaceCalls = { reads: 0, writes: 0, pickers: 0 };
    const get = Storage.prototype.getItem; const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(name) { if (name === key) window.workspaceCalls.reads++; return get.call(this, name); };
    Storage.prototype.setItem = function(name, value) { if (name === key) window.workspaceCalls.writes++; return set.call(this, name, value); };
    window.showOpenFilePicker = window.showSaveFilePicker = async () => { window.workspaceCalls.pickers++; throw new Error('must not open'); };
  }, STORAGE_KEY);
  await other.goto('./?view=detail'); await expect(occupied(other)).toBeVisible();
  await expect(other.locator('.audit-workbench')).toHaveCount(0); return other;
}
test('second window cannot overwrite a first-window update and retry reads the latest saved snapshot', async ({ page, context }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  const other = await newBlocked(context, { instrument: true });
  const panel = page.locator('.quick-update-panel'); await panel.locator('header button').click();
  await panel.locator('input').first().fill('Fictional first-window owner'); await panel.locator('button[type=submit]').click();
  const latest = await readStoredWorkspace(page); expect(latest.engagements[0].owner).toBe('Fictional first-window owner');
  await retry(other).click(); await expect(occupied(other)).toBeVisible();
  expect(await other.evaluate(() => window.workspaceCalls)).toEqual({ reads: 0, writes: 0, pickers: 0 });
  await page.close(); await retry(other).click(); await expect(other.locator('.audit-workbench')).toBeVisible();
  expect(await readStoredWorkspace(other)).toEqual(latest);
  const second = other.locator('.quick-update-panel'); await second.locator('header button').click();
  await second.locator('textarea').fill('Fictional second-window note'); await second.locator('button[type=submit]').click();
  const final = await readStoredWorkspace(other);
  expect(final.engagements[0]).toMatchObject({ owner: 'Fictional first-window owner', notes: 'Fictional second-window note' });
  expect(final.engagements[0].workstreams).toEqual(before.engagements[0].workstreams);
  expect(final.engagements[0].reportingPeriods).toEqual(before.engagements[0].reportingPeriods);
  await other.close();
});
test('two waiting windows cannot take ownership together after the first closes', async ({ page, context }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  const b = await newBlocked(context); const c = await newBlocked(context); await page.close();
  await Promise.all([retry(b).click(), retry(c).click()]);
  await expect.poll(async () => (await b.locator('.audit-workbench').count()) + (await c.locator('.audit-workbench').count())).toBe(1);
  const owner = await b.locator('.audit-workbench').count() ? b : c; const waiting = owner === b ? c : b;
  await expect(occupied(waiting)).toBeVisible(); expect(await readStoredWorkspace(owner)).toEqual(before);
  await owner.close(); await retry(waiting).click(); await expect(waiting.locator('.audit-workbench')).toBeVisible(); await waiting.close();
});
test('reload and tab visibility changes do not create a second editor', async ({ page, context }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  const other = await newBlocked(context); await other.bringToFront(); await retry(other).click();
  await expect(occupied(other)).toBeVisible();
  await page.reload(); await expect(page.locator('.audit-workbench')).toBeVisible();
  await retry(other).click(); await expect(occupied(other)).toBeVisible();
  const held = await page.evaluate(async name => (await navigator.locks.query()).held.filter(lock => lock.name === name), WORKSPACE_SESSION_LOCK);
  expect(held).toHaveLength(1); expect(await readStoredWorkspace(page)).toEqual(before); await other.close();
});
test('independent browser profiles are not locked to one another', async ({ page, browser, baseURL }) => {
  await openWorkbench(page, workspaceFixture()); const isolated = await browser.newContext({ baseURL });
  try { const other = await isolated.newPage(); await openWorkbench(other, workspaceFixture());
    await expect(page.locator('.audit-workbench')).toBeVisible(); await expect(other.locator('.audit-workbench')).toBeVisible();
  } finally { await isolated.close(); }
});
test('missing API requires explicit single-window acknowledgement without pretending protection is active', async ({ page }) => {
  const raw = JSON.stringify(canonicalStorePayload(normalizeStore(workspaceFixture())));
  await page.addInitScript(({ key, raw }) => {
    localStorage.setItem(key, raw); Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
  }, { key: STORAGE_KEY, raw });
  await page.goto('./'); const gate = page.locator('[data-session-state=unsupported]'); await expect(gate).toBeVisible();
  await expect(page.locator('.audit-workbench')).toHaveCount(0);
  const proceed = gate.getByRole('button', { name: 'Continue with one window', exact: true }); await expect(proceed).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
  await gate.getByRole('checkbox').check(); await proceed.click(); await expect(page.locator('.audit-workbench')).toBeVisible();
  await expect(page.locator('.workspace-session-warning')).toContainText('protection is off');
  expect(await readStoredWorkspace(page)).toEqual(JSON.parse(raw));
});
test('denied native requests pause startup and never expose compatibility bypass', async ({ page }) => {
  await page.addInitScript(() => {
    window.realLocks = navigator.locks;
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: () => Promise.reject(new DOMException('Synthetic denial', 'SecurityError')) } });
  });
  await page.goto('./'); await expect(page.locator('[data-session-state=error]')).toBeVisible();
  await expect(page.locator('.audit-workbench')).toHaveCount(0); await expect(page.getByRole('checkbox')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await page.evaluate(() => Object.defineProperty(navigator, 'locks', { configurable: true, value: window.realLocks }));
  await retry(page).click(); await expect(page.locator('.audit-workbench')).toBeVisible();
});
test('navigating away releases ownership, and Back cannot start over another owner', async ({ page, context }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  const other = await newBlocked(context); await page.goto('about:blank');
  await retry(other).click(); await expect(other.locator('.audit-workbench')).toBeVisible();
  await page.goBack(); await expect(occupied(page)).toBeVisible();
  expect(await readStoredWorkspace(other)).toEqual(before); await other.close();
});
test('the recovery screen also owns the session and does not rewrite damaged data', async ({ page, context }) => {
  const raw = '{"version":11,"entities":["Fictional damaged text';
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: STORAGE_KEY, raw });
  await page.goto('./'); await expect(page.locator('.workspace-recovery')).toBeVisible();
  const other = await newBlocked(context, { instrument: true });
  expect(await other.evaluate(() => window.workspaceCalls)).toEqual({ reads: 0, writes: 0, pickers: 0 });
  await page.close(); await retry(other).click(); await expect(other.locator('.workspace-recovery')).toBeVisible();
  expect(await other.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(raw); await other.close();
});
for (const language of ['en', 'zh-Hans', 'zh-Hant']) {
  test(`blocked-window instructions are readable and accessible at 480px in ${language}`, async ({ page, context }, info) => {
    await openWorkbench(page, workspaceFixture());
    await page.evaluate(language => localStorage.setItem('audit-progress-workbench:language', language), language);
    const other = await newBlocked(context); await other.setViewportSize({ width: 480, height: 640 });
    const heading = language === 'en' ? 'Workbench is open in another window'
      : language === 'zh-Hans' ? '工作台已在另一窗口打开' : toTraditional('工作台已在另一窗口打开');
    await expect(other.getByRole('heading', { name: heading })).toBeVisible();
    expect(await occupied(other).evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(occupied(other).getByRole('button')).toBeInViewport({ ratio: 1 });
    expect(seriousViolations(await new AxeBuilder({ page: other }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    await other.screenshot({ path: info.outputPath(`window-${language}.png`) }); await other.close();
  });
}
test('opening another window does not discard a draft or hand over its active session', async ({ page, context }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Add outstanding item', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Add outstanding item', exact: true });
  await editor.getByLabel('Outstanding item *').fill('Fictional unsubmitted request');
  const other = await newBlocked(context); await retry(other).click(); await expect(occupied(other)).toBeVisible();
  await expect(editor.getByLabel('Outstanding item *')).toHaveValue('Fictional unsubmitted request');
  expect(await readStoredWorkspace(page)).toEqual(before);
  await editor.getByRole('button', { name: 'Save outstanding item', exact: true }).click();
  await expect(editor).toHaveCount(0); const saved = await readStoredWorkspace(page);
  await page.close(); await retry(other).click(); await expect(other.locator('.audit-workbench')).toBeVisible();
  expect(await readStoredWorkspace(other)).toEqual(saved); await other.close();
});
