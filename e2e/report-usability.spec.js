import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { reportUsabilityFixture } from '../tests/fixtures/report-usability.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';

async function openReport(page, store = reportUsabilityFixture()) {
  await page.clock.setFixedTime(new Date('2026-09-06T04:00:00Z'));
  await openWorkbench(page, store);
  await page.getByRole('button', { name: 'Management reports', exact: true }).click();
  await expect(page.locator('.management-report')).toBeVisible();
}
const risks = (page, index) => page.locator('.management-risk-grid > article').nth(index);

test('report filters use aligned readable 42px fields', async ({ page }) => {
  await openReport(page);
  for (const control of await page.locator('.management-report-filters input, .management-report-filters select').all()) {
    expect((await control.boundingBox()).height).toBe(42);
  }
});
test('risk items beyond the first twenty can be opened from the report', async ({ page }) => {
  await openReport(page);
  await risks(page, 2).getByRole('button', { name: 'Show all risks', exact: true }).click();
  await expect(risks(page, 2).getByRole('button', { name: /Report outstanding 23/ })).toBeVisible();
});
test('report tax risk opens the exact deadline instead of only its company', async ({ page }) => {
  await openReport(page);
  await risks(page, 1).getByRole('button', { name: /Report tax 01/ }).click();
  await expect(page.getByRole('dialog', { name: 'Tax deadlines' })).toBeVisible();
  await expect(page.locator('.tax-deadline-row[data-focused="true"]')).toContainText('Report tax 01');
});
test('risk disclosure exposes complete counts without changing records and collapses after filter reset', async ({ page }) => {
  await openReport(page); const before = await readStoredWorkspace(page);
  const panel = risks(page, 2);
  await expect(panel.locator('.management-risk-entry:visible')).toHaveCount(20);
  await expect(panel.getByRole('status')).toContainText('20 of 24');
  await panel.getByRole('button', { name: 'Show all risks', exact: true }).click();
  await expect(panel.locator('.management-risk-entry:visible')).toHaveCount(24);
  const collapse = panel.getByRole('button', { name: 'Collapse risks', exact: true });
  await collapse.click(); await expect(panel.getByRole('button', { name: 'Show all risks', exact: true })).toBeFocused();
  await panel.getByRole('button', { name: 'Show all risks', exact: true }).click();
  await page.locator('.management-report-filters').getByRole('combobox', { name: 'Owner', exact: true }).selectOption('Alex Report Long Owner Name');
  await expect(panel.locator('.management-risk-entry:visible')).toHaveCount(20);
  await expect(panel.getByRole('status')).toContainText('20 of 23');
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await expect(page.locator('.management-report')).not.toContainText('PRIVATE_REPORT');
});

test('print mode includes risks after item twenty regardless of screen disclosure', async ({ page }) => {
  await openReport(page); const before = await readStoredWorkspace(page);
  await expect(risks(page, 2).locator('.management-risk-entry:visible')).toHaveCount(20);
  await page.emulateMedia({ media: 'print' });
  await expect(risks(page, 2).locator('.management-risk-entry:visible')).toHaveCount(24);
  await expect(risks(page, 1).locator('.management-risk-entry:visible')).toHaveCount(23);
  await expect(page.locator('.report-risk-controls:visible')).toHaveCount(0);
  await expect(page.locator('.print-report-scope')).toBeVisible();
  await page.setViewportSize({ width: 794, height: 1123 });
  const geometry = await page.locator('.management-report-table').evaluate((table) => ({
    width: table.clientWidth, scroll: table.scrollWidth, columns: table.querySelectorAll('thead th').length,
    right: table.getBoundingClientRect().right, last: table.querySelector('thead th:last-child').getBoundingClientRect().right,
  }));
  expect(geometry.columns).toBe(8); expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.last).toBeLessThanOrEqual(geometry.right + 1);
  await page.emulateMedia({ media: 'screen' });
  await expect(risks(page, 2).locator('.management-risk-entry:visible')).toHaveCount(20);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('report outstanding action focuses its exact source even when item IDs are shared', async ({ page }) => {
  await openReport(page); const before = await readStoredWorkspace(page);
  await risks(page, 2).getByRole('button', { name: 'Show all risks', exact: true }).click();
  await risks(page, 2).getByRole('button', { name: /Separate holding risk with shared ID/ }).click();
  const card = page.locator('.outstanding-item[data-revealed="true"]');
  await expect(card).toHaveCount(1); await expect(card).toBeFocused();
  await expect(card).toContainText('Separate holding risk');
  await expect(page.locator('.detail-title > p')).toContainText('Overview Holding Limited');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('late-list subsidiary risk opens the actual item and clears stale owner navigation', async ({ page }) => {
  await openReport(page); const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Open navigation filters' }).click();
  await page.getByRole('combobox', { name: 'Owner filter' }).selectOption('Alex Search');
  await risks(page, 2).getByRole('button', { name: 'Show all risks', exact: true }).click();
  await risks(page, 2).getByRole('button', { name: /Report outstanding 23/ }).click();
  const card = page.locator('.outstanding-item[data-revealed="true"]');
  await expect(card).toBeFocused(); await expect(card).toContainText('Report outstanding 23');
  await expect(page.getByRole('combobox', { name: 'Owner filter' })).toHaveValue('');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('archive report rows open read-only records without changing data', async ({ page }) => {
  await openReport(page); const before = await readStoredWorkspace(page);
  await page.getByRole('combobox', { name: 'Record status', exact: true }).selectOption('archived');
  await page.locator('.management-period-cell button').first().click();
  await expect(page.locator('.archive-banner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit annual engagement' })).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const width of [800, 1024, 1440, 1920]) {
  test(`report layout stays readable and keyboard-scrollable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 800 ? 560 : 900 });
    await openReport(page);
    const report = page.locator('.management-report');
    const layout = await report.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth,
      page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1); expect(layout.page).toBeLessThanOrEqual(layout.viewport + 1);
    for (const field of await report.locator('.management-report-filters input, .management-report-filters select').all()) {
      expect((await field.boundingBox()).height).toBe(42);
    }
    const scroll = report.locator('.management-table-scroll').first();
    await expect(scroll).toHaveAttribute('tabindex', '0'); await expect(scroll).toHaveAttribute('aria-label', /.+/);
    await scroll.focus(); await expect(scroll).toBeFocused();
    await scroll.press('ArrowRight');
    const dimensions = await scroll.evaluate((element) => ({ content: element.scrollWidth, width: element.clientWidth, left: element.scrollLeft }));
    if (dimensions.content > dimensions.width + 1) await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    const names = report.locator('.management-metric-strip article > span');
    for (const name of await names.all()) expect(await name.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const firstRisk = risks(page, 2).locator('.management-risk-entry').first();
    await firstRisk.focus(); await expect(firstRisk).toBeInViewport();
    expect(await firstRisk.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`report-${width}.png`) });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
  });
}
test('current holding report tables stay contained with shared item IDs and long values', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 760 });
  await openReport(page);
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'Quick open' }).getByRole('combobox');
  await search.fill('overview holding 2026'); await search.press('Enter');
  await page.getByRole('button', { name: 'Management reports', exact: true }).click();
  await page.getByRole('tab', { name: 'Current record', exact: true }).click();
  const report = page.locator('.management-report');
  await expect(report.locator('.record-risk-scroll').first().locator('tbody tr')).toHaveCount(24);
  await expect(report).not.toContainText('PRIVATE_REPORT');
  for (const scroll of await report.locator('.management-table-scroll').all()) {
    await scroll.focus(); await expect(scroll).toBeFocused();
    await expect(scroll).toHaveAttribute('aria-label', /.+/);
  }
  const bounds = await report.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
  expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
});
test('overdue risks beyond twenty are also expandable and included in print', async ({ page }) => {
  const store = reportUsabilityFixture();
  const base = store.engagements.find((item) => item.id === 'overview-combined');
  for (let index = 0; index < 22; index++) {
    store.entities.push({ ...structuredClone(store.entities[0]), id: `extra-${index}`, legalName: `Extra Fictional ${index} Limited`, taxDeadlines: [] });
    store.engagements.push({ ...structuredClone(base), id: `job-${index}`, entityId: `extra-${index}`, outstandingItems: [] });
  }
  await openReport(page, store);
  await expect(risks(page, 0).locator('.management-risk-entry:visible')).toHaveCount(20);
  await risks(page, 0).getByRole('button', { name: 'Show all risks', exact: true }).click();
  await expect(risks(page, 0).locator('.management-risk-entry:visible')).toHaveCount(24);
  await risks(page, 0).getByRole('button', { name: 'Collapse risks', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(risks(page, 0).locator('.management-risk-entry:visible')).toHaveCount(24);
});
