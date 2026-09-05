import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { annualSourceFixture } from '../tests/fixtures/annual-source.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
const dialog = (page) => page.getByRole('dialog', { name: /New annual engagement/ });
async function separate(page, fixture = annualSourceFixture()) {
  await openWorkbench(page, fixture.store);
  await page.getByRole('button', { name: 'Edit annual engagement', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create separate engagement', exact: true }).click();
  await expect(dialog(page)).toBeVisible(); return fixture;
}
test('separate engagement respects an explicit switch to blank instead of copying its original source', async ({ page }) => {
  await separate(page); const before = await readStoredWorkspace(page);
  await dialog(page).getByRole('button', { name: 'Blank engagement', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  const after = await readStoredWorkspace(page);
  expect(after.engagements[0].workstreams).toEqual([]);
  expect(after.engagements.slice(1)).toEqual(before.engagements);
});
test('separate engagement uses the newly selected source year including archived structures', async ({ page }) => {
  const fixture = await separate(page);
  await dialog(page).locator('.engagement-source > label select').selectOption(fixture.olderId);
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  const created = (await readStoredWorkspace(page)).engagements[0];
  expect(created.workstreams[0].nodes[0].title).toBe('Archived source structure');
  expect(created.workstreams[0].nodes[0].conditions[0].done).toBe(false);
});
test('separate engagement respects template mode without modifying the default or older projects', async ({ page }) => {
  await separate(page); const before = await readStoredWorkspace(page);
  await dialog(page).getByRole('button', { name: 'Create from templates', exact: true }).click();
  await expect(dialog(page).locator('.annual-source-summary')).toContainText('Explicit Annual Workflow');
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  const after = await readStoredWorkspace(page);
  expect(after.engagements[0].workstreams[0].nodes[0].title).toBe('Template-only structure');
  expect(after.engagements.slice(1)).toEqual(before.engagements);
  expect(after.selectedSampleIdsByCategory).toEqual(before.selectedSampleIdsByCategory);
});
test('source switches preserve entered dates and owner while cancel leaves all business data unchanged', async ({ page }) => {
  await separate(page); const before = await readStoredWorkspace(page);
  await dialog(page).getByLabel('Owner', { exact: true }).fill('New engagement owner');
  await dialog(page).getByLabel('Year', { exact: true }).fill('2028');
  await dialog(page).getByRole('button', { name: 'Blank engagement', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Copy previous year', exact: true }).click();
  await expect(dialog(page).getByLabel('Owner', { exact: true })).toHaveValue('New engagement owner');
  await expect(dialog(page).getByLabel('Year', { exact: true })).toHaveValue('2028');
  page.once('dialog', (prompt) => prompt.dismiss());
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog(page)).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
  page.once('dialog', (prompt) => prompt.accept());
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('IME confirmation does not prematurely add a custom engagement type or submit the form', async ({ page }) => {
  await separate(page); const before = await readStoredWorkspace(page);
  const field = dialog(page).getByLabel('Custom engagement type', { exact: true });
  await field.fill('专项复核');
  await field.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229 });
  await expect(field).toHaveValue('专项复核');
  await expect(dialog(page).locator('.engagement-custom-type-tags')).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
  await field.press('Enter'); await expect(field).toHaveValue('');
  await expect(dialog(page).locator('.engagement-custom-type-tags')).toContainText('专项复核');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('returning to the original source mode removes the irrelevant dirty warning', async ({ page }) => {
  await separate(page); const before = await readStoredWorkspace(page);
  await dialog(page).getByRole('button', { name: 'Blank engagement', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Copy previous year', exact: true }).click();
  await expect(dialog(page)).not.toHaveAttribute('data-dirty', 'true');
  let prompts = 0; page.on('dialog', async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0); expect(prompts).toBe(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const mode of ['blank', 'previous']) {
  test(`holding separate engagement follows its ${mode} selection without changing historical work`, async ({ page }) => {
    const fixture = annualSourceFixture(true);
    await openWorkbench(page, fixture.store);
    await page.getByRole('button', { name: 'Quick open', exact: true }).click();
    await page.getByRole('dialog').getByRole('combobox').fill('Global Holdings Current owner');
    await page.getByRole('dialog').getByRole('option').first().click();
    await page.getByRole('button', { name: 'Edit annual engagement', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create separate engagement', exact: true }).click();
    const before = await readStoredWorkspace(page);
    await dialog(page).getByLabel('Reporting start date *', { exact: true }).fill('2027-01-01');
    await dialog(page).getByLabel('Reporting end date *', { exact: true }).fill('2027-12-31');
    if (mode === 'blank') await dialog(page).getByRole('button', { name: 'Blank engagement', exact: true }).click();
    else await dialog(page).getByLabel('Source year', { exact: true }).selectOption(fixture.olderId);
    await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    const after = await readStoredWorkspace(page);
    expect(after.engagements[0].entityId).toBe(fixture.entityId);
    if (mode === 'blank') expect(after.engagements[0].consolidation.nodes).toEqual([]);
    else { expect(after.engagements[0].consolidation.nodes[0].title).toBe('Archived source structure');
      expect(after.engagements[0].consolidation.nodes[0].conditions[0].done).toBe(false); }
    expect(after.engagements.slice(1)).toEqual(before.engagements);
  });
}
test('new annual project clears navigation filters that would hide the newly assigned owner', async ({ page }) => {
  await openWorkbench(page, annualSourceFixture().store);
  await page.getByRole('button', { name: 'Open navigation filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Owner filter' }).selectOption('Current owner');
  await page.getByRole('button', { name: 'Edit annual engagement', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create separate engagement', exact: true }).click();
  await dialog(page).getByLabel('Owner', { exact: true }).fill('Different owner');
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Owner filter' })).toHaveValue('');
  await expect(page.locator('.project-detail')).toContainText('Different owner');
  await expect(page.locator('.project-detail')).toBeFocused();
});
test('duplicate archived periods still block creation after a mode switch', async ({ page }) => {
  await separate(page); const before = await readStoredWorkspace(page);
  await dialog(page).getByRole('button', { name: 'Blank engagement', exact: true }).click();
  await dialog(page).getByLabel('Year', { exact: true }).fill('2025');
  await dialog(page).getByRole('button', { name: 'Create annual engagement', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
  page.once('dialog', (prompt) => prompt.dismiss()); await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeVisible();
});
for (const width of [480, 800, 1440]) {
  test(`source choice and preview remain readable and aligned at ${width}px`, async ({ page }, testInfo) => {
    const fixture = annualSourceFixture();
    fixture.store.samples[0].name += ' VeryLongWorkflowName'.repeat(12);
    await separate(page, fixture);
    await page.setViewportSize({ width, height: 760 });
    const root = dialog(page);
    await root.getByRole('button', { name: 'Create from templates', exact: true }).click();
    await root.locator('.engagement-source .advanced-section > summary').click();
    const buttons = root.locator('.engagement-source .choice-tabs > button');
    expect(await buttons.evaluateAll((items) => items.every((item) => item.getBoundingClientRect().height >= 42))).toBe(true);
    await expect(root.locator('.annual-source-summary')).toContainText(fixture.store.samples[0].name);
    await root.locator('.annual-source-summary').scrollIntoViewIfNeeded();
    const measurements = await root.evaluate((element) => {
      const body = element.querySelector('.workbench-modal-body');
      return { width: body.clientWidth, scroll: body.scrollWidth,
        selects: [...element.querySelectorAll('.engagement-source select')].filter((field) => field.getClientRects().length)
          .map((field) => field.getBoundingClientRect().height) };
    });
    expect(measurements.scroll).toBeLessThanOrEqual(measurements.width + 1);
    expect(measurements.selects.every((height) => height === 42)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`annual-source-${width}.png`) });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  });
}
