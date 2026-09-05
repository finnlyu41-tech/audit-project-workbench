import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from './helpers.js';
async function openCompany(page, batch = false) {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole('button', { name: 'New company', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New company', exact: true });
  if (batch) await dialog.getByRole('button', { name: 'Holding company batch' }).click();
  return dialog;
}
test('space-only legal names show a linked error without changing the workspace', async ({ page }) => {
  const dialog = await openCompany(page); const before = await readStoredWorkspace(page);
  const name = dialog.locator('.form-grid input').first();
  await name.fill('　   ');
  await dialog.getByRole('button', { name: 'Create company', exact: true }).click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.locator('.field-validation')).toBeVisible(); await expect(name).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('a later batch row with metadata but no company name is not silently discarded', async ({ page }) => {
  const dialog = await openCompany(page, true); const before = await readStoredWorkspace(page);
  await dialog.getByLabel('Legal entity *', { exact: true }).fill('Fictional Entry Holdings');
  await dialog.getByLabel('Company name *').fill('Fictional First Member');
  await dialog.getByRole('button', { name: 'Add company', exact: true }).click();
  const second = dialog.locator('.group-batch-list > article').nth(1);
  await second.getByLabel('Entity type (optional)').fill('Partnership');
  await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
  await expect(dialog).toBeVisible(); await expect(second.locator('input').first()).toBeFocused();
  await expect(second.locator('.field-validation')).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('correcting a missing batch name saves every row once without touching existing engagements', async ({ page }) => {
  const dialog = await openCompany(page, true); const before = await readStoredWorkspace(page);
  await dialog.getByLabel('Legal entity *', { exact: true }).fill('Entry Example Holdings');
  await dialog.getByLabel('Company name *').fill('  First Entry Example  ');
  await dialog.getByRole('button', { name: 'Add company', exact: true }).click();
  const second = dialog.getByRole('group', { name: 'Member company 2', exact: true });
  const field = second.locator('input').first(); await field.fill('　');
  await second.getByLabel('Entity type (optional)').fill('Partnership');
  await second.getByLabel('Default financial year').selectOption('apr_mar');
  await second.getByLabel('Ownership role').fill('Associate');
  await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
  await expect(field).toHaveAttribute('aria-invalid', 'true'); await field.fill('Second Entry Example');
  await expect(second.locator('.field-validation')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Entry Example Holdings', exact: true })).toBeVisible();
  const after = await readStoredWorkspace(page); expect(after.entities).toHaveLength(before.entities.length + 3);
  const group = after.entities.find((item) => item.legalName === 'Entry Example Holdings');
  const children = after.entities.filter((item) => item.parentEntityId === group.id);
  expect(children.map((item) => item.legalName)).toEqual(['First Entry Example', 'Second Entry Example']);
  expect(children[1].entityType).toBe('Partnership'); expect(children[1].fiscalYearPreset).toBe('apr_mar');
  expect(children[1].relationshipRole).toBe('Associate'); expect(after.engagements).toEqual(before.engagements);
  expect(after.entities.filter((item) => before.entities.some((old) => old.id === item.id))).toEqual(before.entities);
});
test('adding and removing member rows keeps focus on the intended surviving entry', async ({ page }) => {
  const dialog = await openCompany(page, true); const before = await readStoredWorkspace(page);
  const rows = dialog.locator('.group-batch-list > article');
  await rows.first().getByLabel('Company name *').fill('First row');
  await dialog.getByRole('button', { name: 'Add company', exact: true }).click();
  await expect(rows.nth(1).getByLabel('Company name *')).toBeFocused();
  await rows.nth(1).getByLabel('Company name *').fill('Middle row');
  await dialog.getByRole('button', { name: 'Add company', exact: true }).click();
  await expect(rows.nth(2).getByLabel('Company name *')).toBeFocused();
  await rows.nth(2).getByLabel('Company name *').fill('Last row');
  await dialog.getByRole('button', { name: 'Remove company 2', exact: true }).click();
  await expect(rows.nth(1).getByLabel('Company name *')).toHaveValue('Last row');
  await expect(rows.nth(1).getByLabel('Company name *')).toBeFocused();
  await dialog.getByRole('button', { name: 'Remove company 2', exact: true }).click();
  await expect(rows.first().getByLabel('Company name *')).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Remove company 1', exact: true })).toBeDisabled();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('removing an unused invalid row allows only the remaining named member to be created', async ({ page }) => {
  const dialog = await openCompany(page, true); const before = await readStoredWorkspace(page);
  await dialog.getByLabel('Legal entity *').fill('Single Member Holdings');
  await dialog.getByLabel('Company name *').fill('Single Member Example');
  await dialog.getByRole('button', { name: 'Add company', exact: true }).click();
  await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
  await expect(dialog.locator('.field-validation')).toBeVisible();
  await dialog.getByRole('button', { name: 'Remove company 2', exact: true }).click();
  await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
  await expect(dialog).toBeHidden(); const after = await readStoredWorkspace(page);
  expect(after.entities).toHaveLength(before.entities.length + 2); expect(after.engagements).toEqual(before.engagements);
});
test('leaving batch mode requires permission before discarding entered member metadata', async ({ page }) => {
  const dialog = await openCompany(page, true); const before = await readStoredWorkspace(page);
  await dialog.getByLabel('Legal entity *').fill('Retain Parent Draft');
  const row = dialog.locator('.group-batch-list > article').first();
  await row.getByLabel('Entity type (optional)').fill('Partnership');
  page.once('dialog', async (prompt) => { expect(prompt.message()).toContain('member-company entries'); await prompt.dismiss(); });
  await dialog.getByRole('button', { name: 'Single company', exact: true }).click();
  await expect(row.getByLabel('Entity type (optional)')).toHaveValue('Partnership');
  await expect(dialog.getByRole('button', { name: 'Holding company batch' })).toHaveAttribute('aria-pressed', 'true');
  page.once('dialog', (prompt) => prompt.accept());
  await dialog.getByRole('button', { name: 'Single company', exact: true }).click();
  await expect(row).toHaveCount(0); await expect(dialog.getByLabel('Legal entity *')).toHaveValue('Retain Parent Draft');
  await dialog.getByRole('button', { name: 'Holding company batch' }).click();
  await expect(dialog.locator('.group-batch-list > article').first().getByLabel('Entity type (optional)')).toHaveValue('');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('switching empty modes back and forth does not create a false unsaved warning', async ({ page }) => {
  const dialog = await openCompany(page); let prompts = 0;
  page.on('dialog', async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog.getByRole('button', { name: 'Holding company batch' }).click();
  await dialog.getByRole('button', { name: 'Single company', exact: true }).click();
  await expect(dialog.locator('.modal-unsaved')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden(); expect(prompts).toBe(0);
});
test('a later invalid batch name is revealed even when its advanced section is collapsed', async ({ page }) => {
  const dialog = await openCompany(page, true); const before = await readStoredWorkspace(page);
  await dialog.getByLabel('Legal entity *').fill('Collapsed Example Holdings');
  await dialog.getByLabel('Company name *').fill('First visible example');
  await dialog.getByRole('button', { name: 'Add company', exact: true }).click();
  await dialog.locator('.advanced-section > summary').click();
  await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
  await expect(dialog.locator('.advanced-section')).toHaveAttribute('open');
  await expect(dialog.locator('.group-batch-list > article').nth(1).locator('input').first()).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('new companies remain visible instead of inheriting stale navigation search and owner filters', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.locator('.navigation-view-tabs button').nth(1).click();
  await page.getByRole('button', { name: 'Open navigation filters' }).click();
  await page.getByRole('combobox', { name: 'Owner filter', exact: true }).selectOption('Alex Chan');
  await page.locator('.navigation-search-row input').fill('Example');
  await page.getByRole('button', { name: 'New company', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New company', exact: true });
  await dialog.getByLabel('Legal entity *').fill('Fresh Entry No Engagement');
  await dialog.getByRole('button', { name: 'Create company', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fresh Entry No Engagement', exact: true })).toBeVisible();
  await expect(page.locator('.navigation-search-row input')).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Owner filter', exact: true })).toHaveValue('');
  await expect(page.locator('.navigation-view-tabs button').first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.project-detail')).toBeFocused();
  expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
});
test('cancelling an invalid batch keeps navigation filters and leaves all business records unchanged', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.locator('.navigation-search-row input').fill('Example');
  await page.getByRole('button', { name: 'New company', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New company', exact: true });
  await dialog.getByRole('button', { name: 'Holding company batch' }).click();
  await dialog.getByLabel('Legal entity *').fill('Cancelled Draft Holdings');
  await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
  page.once('dialog', (prompt) => prompt.dismiss()); await page.keyboard.press('Escape');
  await expect(dialog.getByLabel('Legal entity *')).toHaveValue('Cancelled Draft Holdings');
  page.once('dialog', (prompt) => prompt.accept());
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden(); await expect(page.locator('.navigation-search-row input')).toHaveValue('Example');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const width of [480, 800, 1440]) {
  test(`batch entry fields and actions are aligned and accessible at ${width}px`, async ({ page }, testInfo) => {
    const dialog = await openCompany(page, true);
    await dialog.getByLabel('Legal entity *').fill('Fictional Long Holding Name ' + 'LONGNAME'.repeat(8));
    await dialog.getByRole('button', { name: 'Add company', exact: true }).click();
    await page.setViewportSize({ width, height: 560 });
    await dialog.getByRole('button', { name: 'Create holding company and companies' }).click();
    await expect(dialog.locator('.field-validation').first()).toBeVisible();
    const body = await dialog.locator('.workbench-modal-body').evaluate((element) => ({ w: element.clientWidth, s: element.scrollWidth }));
    expect(body.s).toBeLessThanOrEqual(body.w + 1);
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    for (const row of await dialog.locator('.group-batch-list > article').all()) {
      const metrics = await row.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const fields = [...element.querySelectorAll('input,select')].map((field) => field.getBoundingClientRect());
        return { height: fields.map((field) => field.height), contained: fields.every((field) => field.left >= box.left && field.right <= box.right),
          sameColumnWidth: Math.max(...fields.map((field) => field.width)) - Math.min(...fields.map((field) => field.width)),
          removeHeight: element.querySelector('button').getBoundingClientRect().height };
      });
      expect(metrics.height).toEqual([42, 42, 42, 42]); expect(metrics.contained).toBe(true);
      expect(metrics.sameColumnWidth).toBeLessThanOrEqual(1); expect(metrics.removeHeight).toBe(36);
    }
    const save = dialog.getByRole('button', { name: 'Create holding company and companies' });
    await expect(save).toBeInViewport();
    expect(await save.evaluate((element) => { const r = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`batch-entry-${width}.png`) });
  });
}
test('editing an existing company rejects blank names and corrects only its master record', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.locator('.tree-entity-row').filter({ hasText: 'Example Services Limited' }).click();
  await page.getByRole('button', { name: 'Edit company master', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit company master', exact: true });
  const name = dialog.locator('.form-grid input').first(); await name.fill('   ');
  await dialog.getByRole('button', { name: 'Save company master', exact: true }).click();
  await expect(name).toHaveAttribute('aria-invalid', 'true'); expect(await readStoredWorkspace(page)).toEqual(before);
  await name.fill('Renamed Fictional Services');
  await dialog.getByRole('button', { name: 'Save company master', exact: true }).click();
  await expect(dialog).toBeHidden(); const after = await readStoredWorkspace(page);
  expect(after.entities[0].id).toBe(before.entities[0].id); expect(after.entities[0].legalName).toBe('Renamed Fictional Services');
  expect(after.engagements).toEqual(before.engagements);
});
test('company-name validation also protects the template-start draft without prematurely creating a company', async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Template library', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Use this template', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Start project from template', exact: true });
  await dialog.getByRole('button', { name: 'Create company and continue', exact: true }).click();
  const name = dialog.locator('.company-master-form input').first(); await name.fill('　');
  await dialog.getByRole('button', { name: 'Next: set up engagement', exact: true }).click();
  await expect(name).toHaveAttribute('aria-invalid', 'true'); expect(await readStoredWorkspace(page)).toEqual(before);
  await name.fill('Fictional Pending Template Company');
  await dialog.getByRole('button', { name: 'Next: set up engagement', exact: true }).click();
  await expect(dialog.locator('.annual-engagement-form')).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
  page.once('dialog', (prompt) => prompt.accept()); await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
