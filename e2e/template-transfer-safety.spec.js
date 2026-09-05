import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { templateLibraryFixture } from '../tests/fixtures/template-library.js';
import { createTemplatePackage } from '../src/dashboard/template-packages.js';
import { normalizeStore } from '../src/dashboard/model.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
const exportDialog = (page) => page.getByRole('dialog', { name: 'Export package', exact: true });
const importDialog = (page) => page.getByRole('dialog', { name: 'Import package', exact: true });
async function openLibrary(page) {
  await openWorkbench(page, templateLibraryFixture());
  await page.getByRole('button', { name: 'Template library', exact: true }).click();
}
async function openExport(page) { await openLibrary(page); await page.getByRole('button', { name: 'Export package', exact: true }).click(); }
async function openImport(page, change = (pkg) => pkg) {
  await openLibrary(page);
  const pkg = change(createTemplatePackage(normalizeStore(templateLibraryFixture()), {
    sampleIds: ['library-alpha', 'library-beta'], groupSampleIds: ['library-group'],
  }));
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import package', exact: true }).click();
  await (await chooser).setFiles({ name: 'fictional-transfer.apw-template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pkg)) });
  await expect(importDialog(page)).toBeVisible(); return pkg;
}
test('export long template names are readable at 480px', async ({ page }) => {
  await openExport(page); await page.setViewportSize({ width: 480, height: 560 });
  const clipped = await exportDialog(page).locator('.template-export-choice strong').evaluateAll((elements) =>
    elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent));
  expect(clipped).toEqual([]);
});
test('modified import decisions refuse accidental Escape without losing the package', async ({ page }) => {
  await openImport(page); const before = await readStoredWorkspace(page);
  await importDialog(page).locator('.template-import-row').first().getByLabel('Import action').selectOption('skip');
  page.once('dialog', (prompt) => prompt.dismiss());
  await page.keyboard.press('Escape');
  await expect(importDialog(page)).toBeVisible();
  await expect(importDialog(page).locator('.template-import-row').first().getByLabel('Import action')).toHaveValue('skip');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('package panels use the modal body rather than a second inner scrolling list', async ({ page }) => {
  await openImport(page); await page.setViewportSize({ width: 480, height: 560 });
  const overflow = await importDialog(page).locator('.template-import-list').evaluate((element) => getComputedStyle(element).overflowY);
  expect(overflow).toBe('visible');
});
test('export search retains hidden selections and the downloaded package matches the explicit selection', async ({ page }) => {
  await openExport(page); const before = await readStoredWorkspace(page); const dialog = exportDialog(page);
  const query = dialog.getByRole('searchbox', { name: 'Find templates to export' });
  await query.fill('ｂｅｔａ ２０２５'); await expect(dialog.locator('.template-export-choice')).toHaveCount(1);
  await expect(dialog.locator('.template-export-count')).toContainText('1 selected templates are hidden');
  await dialog.getByRole('button', { name: 'Select matching templates', exact: true }).click();
  await expect(dialog.getByRole('checkbox')).toBeChecked();
  await expect(dialog.locator('.template-export-count strong')).toHaveText('2 selected');
  await query.fill('no-match-phrase'); await expect(dialog.locator('.template-export-choice')).toHaveCount(0);
  await expect(dialog.locator('.template-export-count')).toContainText('2 selected templates are hidden');
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export selected templates', exact: true }).click();
  const pkg = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
  expect(pkg.templates).toHaveLength(2);
  expect(pkg.templates.map((item) => item.name).sort()).toEqual(before.samples.filter((item) => ['library-alpha', 'library-beta'].includes(item.id)).map((item) => item.name).sort());
  for (const key of ['entities', 'engagements', 'taxDeadlines', 'outstandingItems']) expect(pkg).not.toHaveProperty(key);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('matching deselection is separate from global clearing and search Enter never exports', async ({ page }) => {
  await openExport(page); const dialog = exportDialog(page); const before = await readStoredWorkspace(page);
  const downloads = []; page.on('download', (download) => downloads.push(download));
  await dialog.getByRole('button', { name: 'Select all templates', exact: true }).click();
  await dialog.getByRole('searchbox').fill('beta'); await dialog.getByRole('searchbox').press('Enter');
  await expect(dialog).toBeVisible(); expect(downloads).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Deselect matching templates', exact: true }).click();
  await expect(dialog.locator('.template-export-count strong')).toHaveText('3 selected');
  await dialog.getByRole('button', { name: 'Clear all selections', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Export selected templates' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const exit of ['header', 'cancel', 'backdrop']) {
  test(`import ${exit} exit protects changed choices and confirmed discard never imports`, async ({ page }) => {
    await openImport(page); const before = await readStoredWorkspace(page); const dialog = importDialog(page);
    await dialog.locator('.template-import-row').first().getByLabel('Import action').selectOption('replace');
    const close = async () => exit === 'backdrop' ? page.locator('.workbench-modal-backdrop').click({ position: { x: 2, y: 2 } })
      : dialog.getByRole('button', { name: exit === 'header' ? 'Close' : 'Cancel', exact: true }).click();
    page.once('dialog', (prompt) => prompt.dismiss()); await close();
    await expect(dialog).toBeVisible(); await expect(dialog).toHaveAttribute('data-dirty', 'true');
    page.once('dialog', (prompt) => prompt.accept()); await close();
    await expect(page.getByRole('dialog', { name: 'Template library', exact: true })).toBeVisible();
    expect(await readStoredWorkspace(page)).toEqual(before);
  });
}
test('reverting import choices removes the discard prompt even after changing an inactive target', async ({ page }) => {
  await openImport(page); const dialog = importDialog(page); const first = dialog.locator('.template-import-row').first();
  await first.getByLabel('Import action').selectOption('replace');
  await first.getByLabel('Template to replace').selectOption('library-beta');
  await first.getByLabel('Import action').selectOption('copy');
  await expect(dialog).not.toHaveAttribute('data-dirty');
  const prompts = []; page.on('dialog', async (prompt) => { prompts.push(prompt.type()); await prompt.dismiss(); });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden(); expect(prompts).toEqual([]);
});
test('an incomplete replacement stays open with its draft and has no partial write', async ({ page }) => {
  await openImport(page); const dialog = importDialog(page); const before = await readStoredWorkspace(page);
  const first = dialog.locator('.template-import-row').first(); await first.getByLabel('Import action').selectOption('replace');
  await first.getByLabel('Template to replace').selectOption('');
  await dialog.getByRole('button', { name: 'Import templates', exact: true }).click();
  await expect(first.getByLabel('Template to replace')).toBeFocused();
  await expect(dialog).toHaveAttribute('data-dirty', 'true'); expect(await readStoredWorkspace(page)).toEqual(before);
});
test('explicit copy replace and skip choices apply once without changing existing engagement work', async ({ page }) => {
  await openImport(page, (pkg) => { pkg.templates[0].nodes[0].title = 'Updated fictional workflow'; return pkg; });
  const before = await readStoredWorkspace(page); const dialog = importDialog(page);
  await dialog.locator('.template-import-row').first().getByLabel('Import action').selectOption('replace');
  await dialog.locator('.template-import-row').last().getByLabel('Import action').selectOption('skip');
  await expect(dialog.locator('.template-import-decision-summary')).toHaveText('Copy 1 · Replace 1 · Skip 1');
  const prompts = []; page.on('dialog', async (prompt) => { prompts.push(prompt.message()); await prompt.dismiss(); });
  await dialog.getByRole('button', { name: 'Import templates', exact: true }).click();
  await expect(dialog).toBeHidden(); expect(prompts).toEqual([]);
  const after = await readStoredWorkspace(page);
  expect(after.samples).toHaveLength(before.samples.length + 1);
  expect(after.samples.find((item) => item.id === 'library-alpha').nodes[0].title).toBe('Updated fictional workflow');
  expect(after.groupSamples).toEqual(before.groupSamples);
  expect(after.entities).toEqual(before.entities); expect(after.engagements).toEqual(before.engagements);
});
test('skipping every incoming template disables import without applying anything', async ({ page }) => {
  await openImport(page); const before = await readStoredWorkspace(page); const dialog = importDialog(page);
  for (const select of await dialog.getByLabel('Import action').all()) await select.selectOption('skip');
  await expect(dialog.getByRole('button', { name: 'Import templates', exact: true })).toBeDisabled();
  await expect(dialog.locator('.template-import-decision-summary')).toHaveText('Copy 0 · Replace 0 · Skip 3');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const width of [480, 800, 1440]) {
  test(`transfer panels fit at ${width}px with one scroll area and reachable actions`, async ({ page }, testInfo) => {
    await openExport(page); await page.setViewportSize({ width, height: 560 });
    let dialog = exportDialog(page);
    await expect(dialog.getByRole('searchbox')).toBeVisible();
    expect((await dialog.getByRole('searchbox').boundingBox()).height).toBe(42);
    let metrics = await dialog.locator('.workbench-modal-body').evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
    const choice = dialog.locator('.template-export-choice').first();
    const checkbox = await choice.locator('input').boundingBox();
    const title = await choice.locator('strong').boundingBox();
    expect(Math.abs(checkbox.y - title.y - 2)).toBeLessThanOrEqual(1);
    const button = dialog.getByRole('button', { name: 'Export selected templates' });
    await expect(button).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`export-${width}.png`) });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    const pkg = createTemplatePackage(normalizeStore(templateLibraryFixture()), { sampleIds: ['library-alpha', 'library-beta'], groupSampleIds: ['library-group'] });
    const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Import package', exact: true }).click();
    await (await chooser).setFiles({ name: 'fictional.apw-template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pkg)) });
    dialog = importDialog(page); await dialog.locator('.template-import-row').first().getByLabel('Import action').selectOption('replace');
    for (const field of await dialog.locator('select').all()) expect((await field.boundingBox()).height).toBe(42);
    metrics = await dialog.locator('.workbench-modal-body').evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
    await expect(dialog.getByRole('button', { name: 'Import templates', exact: true })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`import-${width}.png`) });
    const lastField = dialog.getByLabel('Import action').last(); await lastField.focus();
    const fieldBox = await lastField.boundingBox(); const footer = await dialog.locator('.modal-actions').boundingBox();
    expect(fieldBox.y + fieldBox.height).toBeLessThanOrEqual(footer.y + 1);
  });
}
test('package export and import remain accessible with long selected replacement names', async ({ page }) => {
  await openExport(page);
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  await exportDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  const pkg = createTemplatePackage(normalizeStore(templateLibraryFixture()), { sampleIds: ['library-alpha'] });
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Import package', exact: true }).click();
  await (await chooser).setFiles({ name: 'fictional.apw-template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pkg)) });
  await importDialog(page).getByLabel('Import action').selectOption('replace');
  await expect(importDialog(page).locator('.template-replace-target')).toContainText('Alpha Annual Assurance');
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
});
