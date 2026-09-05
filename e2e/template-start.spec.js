import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
import { templateStartFixture } from '../tests/fixtures/template-start.js';
const dialog = (page) => page.getByRole('dialog', { name: 'Start project from template', exact: true });
async function start(page, group = false) {
  await openWorkbench(page, templateStartFixture());
  await page.getByRole('button', { name: 'Template library', exact: true }).click();
  if (group) await page.getByRole('tab', { name: 'Holding company templates', exact: true }).click();
  const card = page.locator('.sample-library-card').filter({ hasText: group ? 'Chosen consolidation example' : 'Beta Compact Workflow' });
  await card.getByRole('button', { name: 'Use this template', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
}
test('use template opens a real company chooser without changing the default template', async ({ page }) => {
  await start(page);
  await expect(dialog(page)).toContainText('Beta Compact Workflow');
  await expect(dialog(page).getByRole('button', { name: 'Overview Example International Limited', exact: true })).toBeVisible();
  const store = await readStoredWorkspace(page);
  expect(store.selectedSampleIdsByCategory.audit).toBe('library-alpha');
});
test('nondefault holding template is retained in its compatible company chooser', async ({ page }) => {
  await start(page, true);
  await expect(dialog(page)).toContainText('Chosen consolidation example');
  await expect(dialog(page).getByRole('button', { name: 'Overview Holding Limited', exact: true })).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Overview Example International Limited', exact: true })).toHaveCount(0);
});

async function chooseCompany(page, group = false) {
  await dialog(page).getByRole('button', { name: group ? 'Overview Holding Limited' : 'Overview Example International Limited', exact: true }).click();
  await expect(dialog(page).locator('.annual-engagement-form')).toBeVisible();
  await dialog(page).getByLabel('Year', { exact: true }).fill('2030');
}
test('existing company receives exactly the clicked nondefault template without copying previous completion', async ({ page }) => {
  await start(page); const before = await readStoredWorkspace(page);
  await chooseCompany(page);
  await expect(dialog(page).getByRole('button', { name: 'Copy previous year' })).toHaveCount(0);
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  const after = await readStoredWorkspace(page);
  const added = after.engagements.find(e => !before.engagements.some(x => x.id === e.id));
  expect(added.entityId).toBe('overview-company');
  expect(added.workstreams).toHaveLength(1);
  expect(added.workstreams[0].nodes[0].title).toBe('Chosen nondefault procedure');
  expect(added.workstreams[0].nodes[0].conditions[0].done).toBe(false);
  expect(added.owner).toBe(''); expect(added.dueDate).toBe(''); expect(added.outstandingItems).toEqual([]);
  expect(after.engagements.filter(e => e.id !== added.id)).toEqual(before.engagements);
  expect(after.entities).toEqual(before.entities); expect(after.samples).toEqual(before.samples);
  expect(after.selectedSampleIdsByCategory).toEqual(before.selectedSampleIdsByCategory);
});
test('holding workflow uses the clicked consolidation template, not the global default', async ({ page }) => {
  await start(page, true); const before = await readStoredWorkspace(page); await chooseCompany(page, true);
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  const after = await readStoredWorkspace(page); const added = after.engagements.find(e => !before.engagements.some(x => x.id === e.id));
  expect(added.consolidation.nodes[0].title).toBe('Chosen consolidation procedure');
  expect(added.consolidation.nodes[0].conditions[0].done).toBe(false);
  expect(after.selectedGroupSampleId).toBe(before.selectedGroupSampleId);
});

async function draftCompany(page, name = 'New Atomic Example Limited') {
  await dialog(page).getByRole('button', { name: 'Create company and continue', exact: true }).click();
  await dialog(page).getByLabel('Legal entity *', { exact: true }).fill(name);
  await dialog(page).getByRole('button', { name: 'Next: set up engagement', exact: true }).click();
  await expect(dialog(page).locator('.annual-engagement-form')).toBeVisible();
}
test('new company stays a draft until the engagement is explicitly created', async ({ page }) => {
  await start(page); const before = await readStoredWorkspace(page);
  await draftCompany(page);
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  const after = await readStoredWorkspace(page);
  const company = after.entities.find(e => e.legalName === 'New Atomic Example Limited');
  expect(company).toBeTruthy(); expect(after.entities).toHaveLength(before.entities.length + 1);
  expect(after.engagements.filter(e => e.entityId === company.id)).toHaveLength(1);
  expect(after.engagements.find(e => e.entityId === company.id).workstreams[0].nodes[0].title).toBe('Chosen nondefault procedure');
});
test('cancel after new-company setup protects drafts and leaves no empty company behind', async ({ page }) => {
  await start(page); const before = await readStoredWorkspace(page); await draftCompany(page);
  page.once('dialog', prompt => prompt.dismiss());
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog(page)).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
  page.once('dialog', prompt => prompt.accept());
  await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Template library', exact: true })).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test('duplicate archived reporting periods are rejected without changing records', async ({ page }) => {
  await start(page); const before = await readStoredWorkspace(page); await chooseCompany(page);
  await dialog(page).getByLabel('Year', { exact: true }).fill('2024');
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('company search and cancel retain the library filters without saving anything', async ({ page }) => {
  await openWorkbench(page, templateStartFixture());
  await page.getByRole('button', { name: 'Template library', exact: true }).click();
  const library = page.getByRole('dialog', { name: 'Template library', exact: true });
  await library.getByRole('searchbox').fill('Beta');
  const before = await readStoredWorkspace(page);
  await library.getByRole('button', { name: 'Use this template', exact: true }).click();
  const search = dialog(page).getByRole('searchbox', { name: 'Find available companies' });
  await search.fill('ＯＶＥＲＶＩＥＷ INTERNATIONAL');
  await expect(dialog(page).locator('.template-start-companies button')).toHaveCount(1);
  await search.fill('not-found'); await expect(dialog(page).getByRole('status')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(library.getByRole('searchbox')).toHaveValue('Beta');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('new holding-company path is atomic and never creates an ordinary audit workstream', async ({ page }) => {
  await start(page, true); const before = await readStoredWorkspace(page); await draftCompany(page, 'New Holding Example');
  expect(await readStoredWorkspace(page)).toEqual(before);
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  const after = await readStoredWorkspace(page); const entity = after.entities.find(e => e.legalName === 'New Holding Example');
  expect(entity.kind).toBe('holding_company');
  const job = after.engagements.find(e => e.entityId === entity.id);
  expect(job.workstreams).toEqual([]); expect(job.consolidation.nodes[0].title).toBe('Chosen consolidation procedure');
});

for (const width of [480, 1024, 1440]) {
  test(`template start remains aligned and accessible at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 760 });
    await start(page);
    const search = dialog(page).getByRole('searchbox', { name: 'Find available companies' });
    await expect(search).toBeFocused(); expect((await search.boundingBox()).height).toBe(42);
    await page.screenshot({ path: testInfo.outputPath(`chooser-${width}.png`) });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    await draftCompany(page);
    const body = dialog(page).locator('.workbench-modal-body');
    const metrics = await body.evaluate(e => ({ width: e.clientWidth, scroll: e.scrollWidth }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
    await expect(dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true })).toBeInViewport();
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`review-${width}.png`) });
  });
}
test('changing the target company requires confirmation for a pending new-company draft', async ({ page }) => {
  await start(page); const before = await readStoredWorkspace(page); await draftCompany(page);
  page.once('dialog', prompt => prompt.dismiss());
  await dialog(page).getByRole('button', { name: 'Change company', exact: true }).click();
  await expect(dialog(page).locator('.annual-engagement-form')).toBeVisible();
  page.once('dialog', prompt => prompt.accept());
  await dialog(page).getByRole('button', { name: 'Change company', exact: true }).click();
  await expect(dialog(page).getByRole('searchbox', { name: 'Find available companies' })).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
