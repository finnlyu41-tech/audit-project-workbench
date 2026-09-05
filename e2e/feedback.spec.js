import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { canonicalStorePayload, normalizeStore } from '../src/dashboard/model.js';
import { createTemplatePackage } from '../src/dashboard/template-packages.js';
import { hierarchyFixture, openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from './helpers.js';
const notification = (page) => page.locator('.save-toast, .feedback-slot[data-feedback-active]');
async function copyTemplate(page) {
  await page.getByRole('button', { name: 'Template library', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Duplicate template', exact: true }).first().click();
}
async function editAfterCopy(page) {
  await openWorkbench(page, workspaceFixture());
  await copyTemplate(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Edit template', exact: true }).first().click();
  return page.getByRole('dialog', { name: 'Edit template', exact: true });
}
test('feedback never covers the editor action footer on a narrow viewport', async ({ page }, testInfo) => {
  const dialog = await editAfterCopy(page);
  await page.setViewportSize({ width: 480, height: 560 });
  await expect(notification(page)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('notification-narrow.png') });
  const notice = await notification(page).boundingBox();
  const footer = await dialog.locator('.sample-editor-actions').boundingBox();
  expect(notice.y + notice.height).toBeLessThanOrEqual(footer.y);
  await expect(dialog.locator('.feedback-slot[data-feedback-active]')).toBeVisible();
});
test('dismissing feedback does not close or save a dirty editor', async ({ page }) => {
  const dialog = await editAfterCopy(page); const before = await readStoredWorkspace(page);
  await dialog.getByLabel('Template name *', { exact: true }).fill('Unsaved fictional workflow');
  await dialog.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await expect(dialog).toBeVisible(); await expect(dialog).toHaveAttribute('data-dirty', 'true');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('identical consecutive messages restart their reading time instead of using an old timeout', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); await page.clock.install(); await copyTemplate(page);
  await page.mouse.move(2, 2);
  const first = await notification(page).locator('[data-feedback-sequence]').getAttribute('data-feedback-sequence');
  await page.clock.fastForward(6000);
  await page.getByRole('dialog').getByRole('button', { name: 'Duplicate template', exact: true }).first().click();
  const second = await notification(page).locator('[data-feedback-sequence]').getAttribute('data-feedback-sequence');
  expect(second).not.toBe(first);
  await page.clock.fastForward(3000); await expect(notification(page)).toBeVisible();
  await page.clock.fastForward(5100); await expect(notification(page)).toHaveCount(0);
});
test('hover and keyboard focus pause expiry until the user leaves the feedback', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); await page.clock.install(); await copyTemplate(page);
  await notification(page).hover(); await page.clock.fastForward(30000); await expect(notification(page)).toBeVisible();
  await notification(page).getByRole('button').focus(); await page.mouse.move(2, 2);
  await page.clock.fastForward(30000); await expect(notification(page).getByRole('button')).toBeFocused();
  await page.getByRole('dialog').getByRole('searchbox').focus();
  await page.clock.fastForward(8100); await expect(notification(page)).toHaveCount(0);
});
test('hidden-page events pause rather than consume reading time', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); await page.clock.install(); await copyTemplate(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(30000); await expect(notification(page)).toBeVisible();
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(8100); await expect(notification(page)).toHaveCount(0);
});
test('feedback moves into the active dialog and back without stealing workflow focus', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); await copyTemplate(page);
  await expect(notification(page)).toHaveCount(1);
  await expect(page.getByRole('dialog').locator('.feedback-copy')).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(notification(page)).toHaveAttribute('data-feedback-surface', 'workspace');
  await page.getByRole('button', { name: 'New company', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New company', exact: true });
  await expect(notification(page)).toHaveAttribute('data-feedback-surface', 'dialog');
  await expect(dialog.getByLabel('Legal entity *', { exact: true })).toBeFocused();
  await expect(dialog.locator('.feedback-copy')).toHaveAttribute('aria-live', 'polite');
  await expect(dialog.locator('.feedback-copy')).toHaveAttribute('aria-atomic', 'true');
});
test('keyboard dismissal restores the field and Escape still protects its unsaved draft', async ({ page }) => {
  const dialog = await editAfterCopy(page);
  const field = dialog.getByLabel('Template name *', { exact: true });
  await field.fill('Unsaved keyboard example');
  const dismiss = dialog.getByRole('button', { name: 'Dismiss notification', exact: true });
  await dismiss.focus(); await dismiss.press('Enter'); await expect(field).toBeFocused();
  page.once('dialog', (prompt) => prompt.dismiss()); await page.keyboard.press('Escape');
  await expect(field).toHaveValue('Unsaved keyboard example'); await expect(dialog).toHaveAttribute('data-dirty', 'true');
});
test('printing suppresses operation messages and their close buttons', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); await copyTemplate(page); await page.keyboard.press('Escape');
  await expect(notification(page)).toBeVisible();
  await page.emulateMedia({ media: 'print' }); await expect(notification(page)).toBeHidden();
  await page.emulateMedia({ media: 'screen' }); await expect(notification(page)).toBeVisible();
});
test('export feedback never blocks the next import confirmation', async ({ page }, testInfo) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  const pkg = createTemplatePackage(before, { sampleIds: [before.samples[0].id] });
  await page.getByRole('button', { name: 'Template library', exact: true }).click();
  await page.getByRole('button', { name: 'Export package', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected templates', exact: true }).click(); await download;
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Import package', exact: true }).click();
  await (await chooser).setFiles({ name: 'fictional-notification.apw-template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pkg)) });
  await page.setViewportSize({ width: 480, height: 560 });
  const dialog = page.getByRole('dialog', { name: 'Import package', exact: true });
  const button = dialog.getByRole('button', { name: 'Import templates', exact: true });
  await expect(button).toBeInViewport(); await expect(notification(page)).toBeVisible();
  expect(await button.evaluate((element) => { const box = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)); })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('export-then-import.png') });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('notification and editor controls retain accessible names and a contained tab cycle', async ({ page }) => {
  const dialog = await editAfterCopy(page);
  await expect(dialog.getByRole('status', { name: 'Operation notification' })).toBeVisible();
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  await dialog.getByRole('button', { name: 'Save template', exact: true }).focus();
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('status', { name: 'Operation notification' })).toBeFocused();
});
for (const width of [480, 800, 1440]) {
  test(`long operation details wrap without covering the editor at ${width}px`, async ({ page }, testInfo) => {
    const store = canonicalStorePayload(normalizeStore(hierarchyFixture()));
    const source = store.entities.find((entity) => entity.legalName === 'Standalone Company Limited');
    const target = store.entities.find((entity) => entity.legalName === 'Global Holdings');
    source.legalName = 'Fictional source ' + 'LongCompanyName'.repeat(15);
    target.legalName = 'Fictional target ' + 'LongHoldingName'.repeat(15);
    await openWorkbench(page, store);
    await page.locator('.tree-entity-row').filter({ hasText: 'Fictional source' })
      .dragTo(page.locator('.tree-entity-row[data-kind="holding_company"]').filter({ hasText: 'Fictional target' }));
    const saved = await readStoredWorkspace(page);
    expect(saved.entities.find((entity) => entity.id === source.id).parentEntityId).toBe(target.id);
    await page.getByRole('button', { name: 'New company', exact: true }).click();
    await page.setViewportSize({ width, height: 560 });
    const dialog = page.getByRole('dialog', { name: 'New company', exact: true });
    await expect(notification(page)).toContainText(source.legalName);
    await expect(notification(page)).toContainText(target.legalName);
    const metrics = await dialog.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth,
      noticeWidth: element.querySelector('.feedback-copy').clientWidth, noticeScroll: element.querySelector('.feedback-copy').scrollWidth }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
    expect(metrics.noticeScroll).toBeLessThanOrEqual(metrics.noticeWidth + 1);
    await dialog.getByRole('button', { name: 'Create company', exact: true }).scrollIntoViewIfNeeded();
    const notice = await notification(page).boundingBox(); const footer = await dialog.locator('.modal-actions').boundingBox();
    expect(notice.y + notice.height).toBeLessThanOrEqual(footer.y);
    await page.screenshot({ path: testInfo.outputPath(`long-feedback-${width}.png`) });
    await dialog.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await readStoredWorkspace(page)).toEqual(saved);
  });
}
