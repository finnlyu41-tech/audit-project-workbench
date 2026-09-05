import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { makeEngagement } from '../src/dashboard/model.js';
import { holdingWorkspace } from '../tests/fixtures/holding-workspace.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
const quick = (page) => page.getByRole('region', { name: 'Quick update', exact: true });
async function goGroup(page, year = 2026, archived = false) {
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  if (archived) await page.getByRole('dialog').getByRole('checkbox', { name: 'Include archived records' }).check();
  const search = page.getByRole('dialog').getByRole('combobox', { name: 'Find company or engagement' });
  await search.fill(`Example Consolidation ${year}`); await search.press('Enter');
  await expect(quick(page)).toHaveCount(1);
}
async function openGroup(page, store = holdingWorkspace(), archived = false) {
  await openWorkbench(page, store);
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  if (archived) await page.getByRole('dialog').getByRole('checkbox', { name: 'Include archived records' }).check();
  const search = page.getByRole('dialog').getByRole('combobox', { name: 'Find company or engagement' });
  await search.fill('Example Consolidation 2026'); await search.press('Enter');
  await expect(page.locator('.holding-components-panel')).toBeVisible();
}
test('holding quick update saves only the intended annual metadata', async ({ page }, testInfo) => {
  await openGroup(page); const before = await readStoredWorkspace(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('New Group Reviewer');
  await quick(page).locator('input[type=date]').first().fill('2026-09-01');
  await quick(page).locator('input[type=date]').last().fill('2026-12-10');
  await quick(page).getByLabel('Project notes').fill('Fictional group follow-up');
  await page.screenshot({ path: testInfo.outputPath('group-quick-edit.png') });
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await expect(quick(page)).toContainText('New Group Reviewer');
  const after = await readStoredWorkspace(page);
  const job = after.engagements.find((entry) => entry.id === 'holding-annual');
  expect(job.owner).toBe('New Group Reviewer'); expect(job.notes).toBe('Fictional group follow-up');
  expect(job.startDate).toBe('2026-09-01'); expect(job.dueDate).toBe('2026-12-10');
  expect(job.reportingPeriods).toEqual(before.engagements.find((entry) => entry.id === job.id).reportingPeriods);
  expect(after.entities).toEqual(before.entities);
  expect(job.consolidation).toEqual(before.engagements.find((entry) => entry.id === job.id).consolidation);
  expect(after.engagements.filter((entry) => entry.id !== job.id)).toEqual(before.engagements.filter((entry) => entry.id !== job.id));
  await page.getByRole('tab', { name: 'Holding company details' }).click();
  await expect(page.locator('.group-settings-panel')).toContainText('New Group Reviewer');
});
test('saving a different holding owner keeps the edited group visible with owner filters', async ({ page }) => {
  await openGroup(page);
  await page.getByRole('button', { name: 'Open navigation filters' }).click();
  await page.getByRole('combobox', { name: 'Owner filter', exact: true }).selectOption('Morgan Keeper');
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('Changed Group Owner');
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await expect(page.locator('.detail-title > p')).toContainText('Example Consolidation Holdings');
  await expect(quick(page)).toContainText('Changed Group Owner');
});
for (const width of [800, 1024, 1440]) {
  test(`holding quick update geometry at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await openGroup(page);
    await quick(page).getByRole('button', { name: 'Quick edit' }).click();
    await page.screenshot({ path: testInfo.outputPath(`group-quick-${width}.png`) });
    const result = await quick(page).evaluate((element) => {
      const fields = [...element.querySelectorAll('input')].map((field) => field.getBoundingClientRect());
      const box = element.getBoundingClientRect();
      return { width: element.clientWidth, scroll: element.scrollWidth,
        heights: fields.map((rect) => rect.height), contained: fields.every((rect) => rect.left >= box.left && rect.right <= box.right) };
    });
    expect(result.scroll).toBeLessThanOrEqual(result.width + 1);
    expect(result.heights).toEqual([42, 42, 42]); expect(result.contained).toBe(true);
  });
}
test('holding quick update is a single panel and never emits duplicate-key warnings', async ({ page }, testInfo) => {
  const warnings = [];
  page.on('console', (message) => { if (/same key|unique.*key/i.test(message.text())) warnings.push(message.text()); });
  await openGroup(page);
  await testInfo.attach('react-key-warnings', { body: JSON.stringify(warnings, null, 2), contentType: 'application/json' });
  await expect(quick(page)).toHaveCount(1);
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: 'Open navigation filters' }).click();
    await page.locator('.navigation-filter-toggle[aria-expanded=true]').click();
    await expect(quick(page)).toHaveCount(1);
  }
  expect(warnings).toEqual([]);
});
test('switching holding tabs preserves one editor and its unsaved draft', async ({ page }) => {
  await openGroup(page); const before = await readStoredWorkspace(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('Unsaved holding reviewer');
  await quick(page).getByLabel('Project notes').fill('Draft for this annual consolidation only');
  for (const tab of ['Consolidation stages', 'Holding company details', 'Component', 'Consolidation stages', 'Component']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(quick(page)).toHaveCount(1);
    await expect(quick(page).getByLabel('Owner', { exact: true })).toHaveValue('Unsaved holding reviewer');
    await expect(quick(page).getByLabel('Project notes')).toHaveValue('Draft for this annual consolidation only');
  }
  expect(await readStoredWorkspace(page)).toEqual(before);
  await quick(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(quick(page).getByRole('button', { name: 'Quick edit' })).toBeFocused();
  await expect(quick(page)).toHaveCount(1);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('component changes do not duplicate or reset the holding quick editor', async ({ page }) => {
  await openGroup(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Project notes').fill('Pending holding draft');
  await page.locator('[data-component-id=part-alpha]').getByRole('checkbox').check();
  await expect(quick(page)).toHaveCount(1);
  await expect(quick(page).getByLabel('Project notes')).toHaveValue('Pending holding draft');
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  const job = (await readStoredWorkspace(page)).engagements.find((item) => item.id === 'holding-annual');
  expect(job.notes).toBe('Pending holding draft');
  expect(job.consolidation.components[0].readinessConditions[0].done).toBe(true);
});
test('holding drafts stay isolated across years and reload', async ({ page }) => {
  const store = holdingWorkspace(); const entity = store.entities.find((item) => item.id === 'holding-parent');
  store.engagements.push(makeEngagement({ id: 'holding-next', entityId: entity.id,
    periodStart: '2027-01-01', periodEnd: '2027-12-31', owner: 'Next Year Reviewer', notes: 'Next year saved note' },
    { entity, store, sourceMode: 'blank', workstreamCategories: store.workstreamCategories }));
  await openGroup(page, store); const before = await readStoredWorkspace(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Project notes').fill('2026 draft only');
  await goGroup(page, 2027);
  await expect(quick(page)).toContainText('Next Year Reviewer');
  await expect(quick(page).getByRole('button', { name: 'Quick edit' })).toBeVisible();
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Project notes').fill('2027 draft only');
  await goGroup(page, 2026);
  await expect(quick(page).getByLabel('Project notes')).toHaveValue('2026 draft only');
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await goGroup(page, 2027);
  await expect(quick(page).getByLabel('Project notes')).toHaveValue('2027 draft only');
  await quick(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(quick(page)).toContainText('Next year saved note');
  const after = await readStoredWorkspace(page);
  expect(after.engagements.find((item) => item.id === 'holding-annual').notes).toBe('2026 draft only');
  expect(after.engagements.filter((item) => item.id !== 'holding-annual')).toEqual(before.engagements.filter((item) => item.id !== 'holding-annual'));
  await page.reload(); await goGroup(page, 2026);
  await expect(quick(page)).toHaveCount(1); await expect(quick(page)).toContainText('2026 draft only');
});
test('archived holding quick update has one read-only summary and cannot edit', async ({ page }) => {
  const store = holdingWorkspace(); store.engagements[0].archived = true;
  await openGroup(page, store, true); const before = await readStoredWorkspace(page);
  for (const tab of ['Holding company details', 'Consolidation stages', 'Component']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(quick(page)).toHaveCount(1);
    await expect(quick(page).getByRole('button', { name: 'Quick edit' })).toHaveCount(0);
  }
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('invalid holding dates preserve the draft and all saved consolidation state', async ({ page }) => {
  await openGroup(page); const before = await readStoredWorkspace(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).locator('input[type=date]').first().fill('2026-12-10');
  await quick(page).locator('input[type=date]').last().fill('2026-09-01');
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await expect(quick(page).getByRole('button', { name: 'Save updates' })).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await quick(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(quick(page)).toHaveCount(1);
});
test('the single holding quick editor remains accessible after tab changes', async ({ page }) => {
  await openGroup(page); await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await page.getByRole('tab', { name: 'Holding company details', exact: true }).click();
  await expect(quick(page)).toHaveCount(1);
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
});
test('a holding quick draft cannot overwrite the same field saved by the full editor', async ({ page }) => {
  await openGroup(page);
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Owner', { exact: true }).fill('Unsaved conflicting owner');
  await page.getByRole('button', { name: 'Edit annual engagement', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Owner', { exact: true }).fill('Saved in full editor');
  await dialog.getByRole('button', { name: 'Save engagement', exact: true }).click();
  await expect(dialog).toBeHidden(); const before = await readStoredWorkspace(page);
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await expect(quick(page).getByRole('alert')).toContainText('These fields changed elsewhere');
  await expect(quick(page).getByLabel('Owner', { exact: true })).toHaveValue('Unsaved conflicting owner');
  await expect(quick(page)).toHaveCount(1);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('notes-only holding saves retain still-applicable navigation filters', async ({ page }) => {
  await openGroup(page);
  await page.getByRole('button', { name: 'Open navigation filters' }).click();
  await page.getByRole('combobox', { name: 'Owner filter', exact: true }).selectOption('Morgan Keeper');
  await page.locator('.navigation-search-row input').fill('Consolidation');
  await quick(page).getByRole('button', { name: 'Quick edit' }).click();
  await quick(page).getByLabel('Project notes').fill('Only notes changed');
  await quick(page).getByRole('button', { name: 'Save updates' }).click();
  await expect(quick(page)).toHaveCount(1); await expect(quick(page)).toContainText('Only notes changed');
  await expect(page.getByRole('combobox', { name: 'Owner filter', exact: true })).toHaveValue('Morgan Keeper');
  await expect(page.locator('.navigation-search-row input')).toHaveValue('Consolidation');
});
