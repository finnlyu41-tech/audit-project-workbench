import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { emptyStore, canonicalStorePayload, normalizeStore } from '../src/dashboard/model.js';
import { openWorkbench, readStoredWorkspace, workspaceFixture, makeCompany, seriousViolations } from './helpers.js';
const priority = page => page.locator('.home-priority-panel');
const categories = page => page.locator('.home-priority-filters');
const owners = page => page.getByLabel('Action list owner');
async function openHome(page, store = emptyStore()) {
  await page.clock.setFixedTime(new Date('2026-09-13T04:00:00Z'));
  await openWorkbench(page, store, { home: true });
  return readStoredWorkspace(page);
}
function quietFixture() {
  const store = workspaceFixture();
  const other = makeCompany(store, { entity: 'Other Fictional Services Limited' });
  other.owner = 'Blair Example'; store.projects.push(other); return store;
}
test('true empty home replaces zero filters with one keyboard-accessible disclosure without writing', async ({ page }) => {
  const before = await openHome(page);
  await expect(categories(page)).toBeHidden();
  await expect(owners(page)).toBeHidden();
  await expect(priority(page).locator('header > strong')).toHaveCount(0);
  await expect(priority(page).locator('.home-overview-empty')).toHaveText('Nothing needs priority attention');
  const toggle = page.getByRole('button', { name: 'Show filters', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(categories(page).getByRole('button')).toHaveCount(7);
  await expect(owners(page)).toBeVisible();
  const hide = page.getByRole('button', { name: 'Hide filters', exact: true });
  await expect(hide).toBeFocused(); await expect(hide).toHaveAttribute('aria-expanded', 'true');
  for (const id of (await hide.getAttribute('aria-controls')).split(' '))
    expect(await page.evaluate(id => Boolean(document.getElementById(id)), id)).toBe(true);
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  await page.keyboard.press('Space');
  await expect(categories(page)).toBeHidden(); await expect(toggle).toBeFocused();
  await expect(page.getByText('Saved filters and annual tools', { exact: true })).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('quiet active projects keep owner filtering available and clearing returns focus without edits', async ({ page }) => {
  const before = await openHome(page, quietFixture());
  await expect(page.locator('.home-project-row')).toHaveCount(2);
  await expect(categories(page)).toBeHidden();
  await page.getByRole('button', { name: 'Show filters', exact: true }).click();
  await owners(page).selectOption('Blair Example');
  await expect(page.locator('.home-project-row')).toHaveCount(1);
  await expect(page.locator('.home-project-row')).toContainText('Other Fictional Services Limited');
  await expect(categories(page)).toBeVisible();
  await expect(priority(page).locator('header > strong')).toHaveText('0');
  await expect(priority(page)).not.toContainText('Nothing needs priority attention');
  await expect(page.getByRole('button', { name: 'Hide filters', exact: true })).toHaveCount(0);
  await page.locator('.home-action-filters').getByRole('button', { name: 'Clear filters' }).click();
  await expect(categories(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show filters', exact: true })).toBeFocused();
  await expect(page.locator('.home-project-row')).toHaveCount(2);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('zero outstanding shortcut still reveals its applied filter and a reachable clear action', async ({ page }) => {
  const before = await openHome(page, quietFixture());
  await page.locator('.home-metric-grid > button').filter({ hasText: 'Outstanding items' }).click();
  await expect(priority(page)).toBeFocused();
  await expect(categories(page).getByRole('button', { name: /Outstanding items/ })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.home-action-filters').getByRole('button', { name: 'Clear filters' }).click();
  await expect(categories(page)).toBeHidden();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('existing priorities retain counts and filters even when owner or category returns no matches', async ({ page }) => {
  const store = quietFixture();
  store.projects[0].outstandingItems = [{ id: 'home-open', title: 'Fictional signed confirmation', status: 'missing_document', note: '', workstreamId: null }];
  const before = await openHome(page, store);
  await expect(categories(page)).toBeVisible(); await expect(owners(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show filters', exact: true })).toHaveCount(0);
  await expect(priority(page).locator('header > strong')).toHaveText('1');
  await categories(page).getByRole('button', { name: /Due today/ }).click();
  await expect(priority(page).locator('header > strong')).toHaveText('0');
  await expect(categories(page)).toBeVisible();
  await page.locator('.home-action-filters').getByRole('button', { name: 'Clear filters' }).click();
  await expect(owners(page)).toBeFocused();
  await expect(page.locator('.home-priority-list > button')).toHaveCount(1);
  await owners(page).selectOption('Blair Example');
  await expect(page.locator('.home-priority-list > button')).toHaveCount(0);
  await expect(categories(page)).toBeVisible();
  await page.locator('.home-action-filters').getByRole('button', { name: 'Clear filters' }).click();
  await expect(priority(page)).toContainText('Fictional signed confirmation');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('setup work is never mistaken for an empty priority list', async ({ page }) => {
  const store = workspaceFixture(); store.projects[0].workstreams = []; store.projects[0].dueDate = '';
  const before = await openHome(page, store);
  await expect(categories(page)).toBeVisible();
  await expect(priority(page).locator('header > strong')).toHaveText('1');
  await expect(priority(page)).toContainText('Complete engagement setup');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('saved filters can be applied from a collapsed empty home and retain the selected owner', async ({ page }) => {
  const before = await openHome(page, quietFixture());
  await page.getByRole('button', { name: 'Show filters', exact: true }).click();
  await owners(page).selectOption('Blair Example');
  await page.getByText('Saved filters and annual tools', { exact: true }).click();
  const saved = page.locator('.home-overview .saved-filter-control');
  await saved.locator('summary').click();
  await saved.getByLabel('Filter name').fill('Fictional quiet owner');
  await saved.getByRole('button', { name: 'Save current filters', exact: true }).click();
  await page.reload(); await expect(categories(page)).toBeHidden();
  await page.getByText('Saved filters and annual tools', { exact: true }).click();
  await saved.locator('summary').click();
  await saved.getByLabel('Choose saved filters').selectOption('Fictional quiet owner');
  await saved.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(owners(page)).toHaveValue('Blair Example');
  await expect(categories(page)).toBeVisible();
  await expect(page.locator('.home-project-row')).toHaveCount(1);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('archived-only workspaces stay quiet without exposing archived work as an active priority', async ({ page }) => {
  const store = canonicalStorePayload(normalizeStore(quietFixture()));
  store.entities.forEach(entity => { entity.archived = true; });
  store.engagements.forEach(engagement => { engagement.archived = true; });
  const before = await openHome(page, store);
  await expect(categories(page)).toBeHidden();
  await expect(page.locator('.home-project-row')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show filters', exact: true })).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
});

for (const [language, menuIndex, showLabel, hideLabel] of [
  ['zh-Hans', 0, '显示筛选', '收起筛选'],
  ['zh-Hant', 1, '顯示篩選', '收起篩選'],
]) {
  test(`empty priority disclosure remains readable at 800x560 in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 560 });
    const before = await openHome(page, quietFixture());
    await page.locator('.language-summary').click();
    await page.locator('.language-menu > button').nth(menuIndex).click();
    const toggle = page.getByRole('button', { name: showLabel, exact: true });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: hideLabel, exact: true })).toBeVisible();
    const geometry = await page.locator('.home-overview').evaluate(element => ({
      width: element.clientWidth, scroll: element.scrollWidth,
      page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
    }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
    expect(geometry.page).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(await readStoredWorkspace(page)).toEqual(before);
  });
}
