import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { canonicalStorePayload, normalizeStore } from '../src/dashboard/model.js';
import { openWorkbench, readStoredWorkspace, workspaceFixture, seriousViolations } from './helpers.js';
import { installMemoryFiles } from './linked-file-fixture.js';
const settings = page => page.getByRole('dialog', { name: 'Settings', exact: true });
async function start(page) {
  const data = canonicalStorePayload(normalizeStore(workspaceFixture()));
  await installMemoryFiles(page, JSON.stringify(data)); await openWorkbench(page, data); return data;
}
async function openSettings(page) { await page.locator('.app-rail-button[aria-label="Settings"]').click(); }
async function link(page) {
  await openSettings(page); await settings(page).getByRole('button', { name: 'Create and link file', exact: true }).click();
  await expect(settings(page).locator('.persistence-status-card')).toHaveAttribute('data-status', 'saved');
  await settings(page).getByRole('button', { name: 'Done', exact: true }).click();
}
async function editOwner(page, value) {
  await page.getByRole('button', { name: 'Quick edit', exact: true }).click();
  await page.locator('.quick-update-form').getByLabel('Owner', { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Save updates', exact: true }).click();
}
test('opening a file refuses a preview that changed before confirmation', async ({ page }) => {
  const before = await start(page); await openSettings(page);
  await settings(page).getByRole('button', { name: 'Open existing workbench file', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Open workbench file', exact: true });
  await expect(confirm).toBeVisible();
  await page.evaluate(() => { const data = JSON.parse(window.__memoryFiles.selected.text); data.engagements[0].owner = 'External preview change'; window.__memoryFiles.selected.text = JSON.stringify(data); });
  await confirm.getByRole('button', { name: 'Open and link', exact: true }).click();
  await expect(confirm.getByRole('alert')).toContainText('changed'); expect(await readStoredWorkspace(page)).toEqual(before);
  expect(await page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text).engagements[0].owner)).toBe('External preview change');
});
test('an external file edit is not overwritten by an ordinary browser update', async ({ page }) => {
  await start(page); await link(page);
  const writes = await page.evaluate(() => window.__memoryFiles.selected.writes.length);
  await page.evaluate(() => { const data = JSON.parse(window.__memoryFiles.selected.text); data.engagements[0].notes = 'External edit must survive'; window.__memoryFiles.selected.text = JSON.stringify(data); });
  await editOwner(page, 'New browser owner');
  await expect(page.getByRole('dialog', { name: 'Resolve version conflict', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(writes);
  expect(await page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text).engagements[0].notes)).toBe('External edit must survive');
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe('New browser owner');
});

test.afterEach(async ({ page }, info) => {
  await info.attach('synthetic-file-result', { body: JSON.stringify(await page.evaluate(() => {
    const file = window.__memoryFiles?.selected;
    return file && { writes: file.writes.length, storedFile: file.text, reads: file.reads };
  })), contentType: 'application/json' });
});
test('a delayed write drains the latest queued update without reporting the older copy as final', async ({ page }) => {
  await start(page); await link(page); await page.evaluate(() => { window.__memoryFiles.selected.hold = true; });
  await editOwner(page, 'First delayed owner');
  await expect.poll(() => page.evaluate(() => window.__memoryFiles.selected.waiters.length)).toBe(1);
  await editOwner(page, 'Latest delayed owner');
  await page.evaluate(() => window.__releaseFile());
  await expect.poll(() => page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text).engagements[0].owner)).toBe('Latest delayed owner');
  expect(await page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text))).toEqual(await readStoredWorkspace(page));
  const owners = await page.evaluate(() => window.__memoryFiles.selected.writes.map(text => JSON.parse(text).engagements[0].owner));
  expect(owners).toEqual(['Alex Chan', 'First delayed owner', 'Latest delayed owner']);
});
test('an external change during a slow write is preserved before the pending stream commits', async ({ page }) => {
  await start(page); await link(page); await page.evaluate(() => { window.__memoryFiles.selected.hold = true; });
  await editOwner(page, 'Slow browser edit');
  await expect.poll(() => page.evaluate(() => window.__memoryFiles.selected.waiters.length)).toBe(1);
  await page.evaluate(() => { const f = window.__memoryFiles.selected; const data = JSON.parse(f.text);
    data.engagements[0].notes = 'Changed during write'; f.text = JSON.stringify(data); window.__releaseFile(); });
  await expect(page.getByRole('dialog', { name: 'Resolve version conflict', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
  expect(await page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text).engagements[0].notes)).toBe('Changed during write');
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe('Slow browser edit');
});
async function makeConflict(page) {
  await start(page); await link(page);
  await page.evaluate(() => { const f = window.__memoryFiles.selected; const data = JSON.parse(f.text);
    data.engagements[0].notes = 'First external conflict'; f.text = JSON.stringify(data); });
  await editOwner(page, 'Browser conflict owner');
  const dialog = page.getByRole('dialog', { name: 'Resolve version conflict', exact: true });
  await expect(dialog).toBeVisible(); return dialog;
}
test('conflict resolution rechecks changed external content and backs up the latest file', async ({ page }) => {
  const dialog = await makeConflict(page); const downloads = []; page.on('download', d => downloads.push(d));
  await page.evaluate(() => { const f = window.__memoryFiles.selected; const data = JSON.parse(f.text);
    data.engagements[0].notes = 'Second external conflict'; f.text = JSON.stringify(data); });
  await dialog.getByRole('button', { name: 'Use browser copy', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Versions changed');
  expect(downloads).toHaveLength(0); expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Use browser copy', exact: true }).click();
  const fs = await import('node:fs/promises'); const backup = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
  expect(backup.engagements[0].notes).toBe('Second external conflict');
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text))).toEqual(await readStoredWorkspace(page));
});
test('choosing the file cannot discard browser edits made after the conflict preview', async ({ page }) => {
  let dialog = await makeConflict(page);
  await dialog.getByRole('button', { name: 'Resolve later', exact: true }).click();
  await editOwner(page, 'Later browser owner must be backed up'); const later = await readStoredWorkspace(page);
  await openSettings(page); await settings(page).getByRole('button', { name: 'Resolve version conflict', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Resolve version conflict', exact: true });
  await dialog.getByRole('button', { name: 'Use local file', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Versions changed');
  expect(await readStoredWorkspace(page)).toEqual(later);
  const download = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Use local file', exact: true }).click();
  const fs = await import('node:fs/promises'); const backup = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
  expect(backup).toEqual(later); await expect(dialog).toHaveCount(0);
  expect((await readStoredWorkspace(page)).engagements[0].notes).toBe('First external conflict');
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
});
test('duplicate file-link clicks run once and a pending activation cannot be dismissed', async ({ page }) => {
  await start(page); await page.evaluate(() => { window.__memoryFiles.selected.hold = true; });
  await openSettings(page); const button = settings(page).getByRole('button', { name: 'Create and link file', exact: true });
  await button.evaluate(element => { element.click(); element.click(); });
  await expect.poll(() => page.evaluate(() => window.__memoryFiles.selected.waiters.length)).toBe(1);
  await expect(settings(page).locator('[data-modal-close]')).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(settings(page)).toBeVisible();
  await page.evaluate(() => window.__releaseFile());
  await expect(settings(page).locator('[data-modal-close]')).toBeEnabled();
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
  await settings(page).getByRole('button', { name: 'Done', exact: true }).click();
});
test('opening an unchanged reviewed file succeeds without writing into that file', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { const f = window.__memoryFiles.selected; const data = JSON.parse(f.text);
    data.engagements[0].owner = 'Reviewed file owner'; f.text = JSON.stringify(data); });
  await openSettings(page); await settings(page).getByRole('button', { name: 'Open existing workbench file', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Open workbench file', exact: true });
  await confirm.getByRole('button', { name: 'Open and link', exact: true }).click(); await expect(confirm).toHaveCount(0);
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe('Reviewed file owner');
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(0);
});
test('cancelling a file preview leaves browser records and the selected file unchanged', async ({ page }) => {
  const before = await start(page); await openSettings(page);
  await settings(page).getByRole('button', { name: 'Open existing workbench file', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Open workbench file', exact: true });
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(confirm).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(0);
});
test('a damaged external file is not silently repaired or overwritten', async ({ page }) => {
  await start(page); await link(page); await page.evaluate(() => { window.__memoryFiles.selected.text = '{DO NOT REPLACE'; });
  await editOwner(page, 'Safe browser owner'); await openSettings(page);
  await expect(settings(page).locator('.persistence-status-card')).toHaveAttribute('data-status', 'error');
  await expect(settings(page)).toContainText('not a valid workbench file');
  expect(await page.evaluate(() => window.__memoryFiles.selected.text)).toBe('{DO NOT REPLACE');
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe('Safe browser owner');
});
test('a failed file write keeps the browser copy and reconnect saves the latest applied record', async ({ page }) => {
  await start(page); await link(page); await page.evaluate(() => { window.__memoryFiles.selected.fail = true; });
  await editOwner(page, 'Owner retained after write failure'); await openSettings(page);
  await expect(settings(page).locator('.persistence-status-card')).toHaveAttribute('data-status', 'error');
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe('Owner retained after write failure');
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
  await page.evaluate(() => { window.__memoryFiles.selected.fail = false; });
  await settings(page).getByRole('button', { name: 'Reconnect', exact: true }).click();
  await expect(settings(page).locator('.persistence-status-card')).toHaveAttribute('data-status', 'saved');
  expect(await page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text))).toEqual(await readStoredWorkspace(page));
});
test('cancelling the native picker does not change mode, records or the file', async ({ page }) => {
  const before = await start(page);
  await page.evaluate(() => { window.showSaveFilePicker = async () => { throw new DOMException('Synthetic cancel', 'AbortError'); }; });
  await openSettings(page); await settings(page).getByRole('button', { name: 'Create and link file', exact: true }).click();
  await expect(settings(page).locator('[data-modal-close]')).toBeEnabled();
  await expect(settings(page).locator('.persistence-status-card')).toHaveAttribute('data-status', 'saved');
  expect(await readStoredWorkspace(page)).toEqual(before);
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(0);
});
for (const [language, expected] of [['en', 'selected file has changed'], ['zh-Hans', '所选文件在核对后已变化'], ['zh-Hant', '所選文件在核對後已變化']]) {
  test(`stale file warning is readable at 480px in ${language}`, async ({ page }, info) => {
    const before = await start(page);
    await page.locator('.language-summary').click();
    await page.locator('.language-menu > button').nth({ 'zh-Hans': 0, 'zh-Hant': 1, en: 2 }[language]).click();
    await page.getByRole('button', { name: /^(Settings|设置|設置|設定)$/ }).click();
    await page.locator('.persistence-actions > button').last().click(); const dialog = page.getByRole('dialog');
    await page.evaluate(() => { const f = window.__memoryFiles.selected; const data = JSON.parse(f.text);
      data.engagements[0].owner = 'Externally changed'; f.text = JSON.stringify(data); });
    await page.setViewportSize({ width: 480, height: 640 });
    await dialog.locator('.modal-actions > button').last().click();
    await expect(dialog.getByRole('alert')).toContainText(expected);
    const bounds = await dialog.evaluate(e => ({ width: e.clientWidth, scroll: e.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
    await expect(dialog.locator('[data-modal-close]')).toBeEnabled();
    expect(await readStoredWorkspace(page)).toEqual(before);
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    await page.screenshot({ path: info.outputPath(`stale-file-${language}.png`) });
  });
}
test('a reviewed legacy file can be opened and saved without regenerating its company identities', async ({ page }) => {
  await start(page); const legacy = workspaceFixture(); legacy.version = 10; delete legacy.entities; delete legacy.engagements;
  await page.evaluate(text => { window.__memoryFiles.selected.text = text; }, JSON.stringify(legacy));
  await openSettings(page); await settings(page).getByRole('button', { name: 'Open existing workbench file', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Open workbench file', exact: true });
  await confirm.getByRole('button', { name: 'Open and link', exact: true }).click(); await expect(confirm).toHaveCount(0);
  const loaded = await readStoredWorkspace(page); expect(loaded.entities).toHaveLength(1);
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(0);
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const search = page.getByRole('dialog').getByRole('combobox'); await search.fill('Example Services 2026'); await search.press('Enter');
  await editOwner(page, 'Reviewed legacy owner');
  await expect.poll(() => page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text).version)).toBe(11);
  expect((await readStoredWorkspace(page)).entities.map(e => e.id)).toEqual(loaded.entities.map(e => e.id));
  expect(await page.evaluate(() => JSON.parse(window.__memoryFiles.selected.text))).toEqual(await readStoredWorkspace(page));
});
test('revoked file permission never bypasses the browser copy or silently overwrites a file', async ({ page }) => {
  await start(page); await link(page); await page.evaluate(() => { window.__memoryFiles.selected.permission = 'denied'; });
  await editOwner(page, 'Owner while file permission denied'); await openSettings(page);
  await expect(settings(page).locator('.persistence-status-card')).toHaveAttribute('data-status', 'reconnect_required');
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
  expect((await readStoredWorkspace(page)).engagements[0].owner).toBe('Owner while file permission denied');
  await settings(page).getByRole('button', { name: 'Reconnect', exact: true }).click();
  await expect(settings(page).locator('.persistence-status-card')).toHaveAttribute('data-status', 'reconnect_required');
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(1);
});
test('a delayed startup reconnect cannot reattach or load a file after an explicit disconnect', async ({ page }) => {
  const { createHash } = await import('node:crypto'); const { serializeStore } = await import('../src/dashboard/persistence.js');
  const browserData = canonicalStorePayload(normalizeStore(workspaceFixture())); const external = structuredClone(browserData);
  external.engagements[0].owner = 'Stale startup file owner';
  await installMemoryFiles(page, JSON.stringify(external), { startupLinked: true, pausePermission: true, workspace: browserData,
    lastDigest: createHash('sha256').update(serializeStore(browserData)).digest('hex') });
  await page.goto('./?view=detail'); await expect(page.locator('.audit-workbench')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__permissionWaiters.length)).toBe(1);
  await openSettings(page); await settings(page).locator('.persistence-mode-card').first().click();
  await expect(settings(page).locator('.persistence-mode-card').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(settings(page).locator('[data-modal-close]')).toBeEnabled();
  await page.evaluate(() => window.__releasePermissions());
  await expect.poll(() => page.evaluate(() => window.__permissionResumed)).toBe(1);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => window.__memoryFiles.selected.reads)).toBe(0);
  expect(await readStoredWorkspace(page)).toEqual(browserData);
  await expect(settings(page).locator('.persistence-mode-card').first()).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__memoryFiles.selected.writes.length)).toBe(0);
});
