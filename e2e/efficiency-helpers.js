import { expect } from '@playwright/test';
import { openWorkbench, readStoredWorkspace } from './helpers.js';
import { efficiencyWorkspace } from '../tests/fixtures/efficiency-workspace.js';
export const dialog = page => page.getByRole('dialog');
export async function openEfficiency(page, store = efficiencyWorkspace(), { home = false } = {}) {
  await page.clock.setFixedTime(new Date('2026-09-09T10:00:00+08:00'));
  await openWorkbench(page, store, { home });
  if (!home) await openRecord(page, 'EAL Alex');
}
export async function openRecord(page, query, company = false) {
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const search = dialog(page).getByRole('combobox'); await search.fill(query);
  if (company) await dialog(page).getByRole('option').filter({ hasText: 'Company master' }).click();
  else await search.press('Enter');
  await expect(dialog(page)).toHaveCount(0);
}
export async function scheduleDialog(page) {
  await page.locator('.app-rail-button[aria-label="Project schedule"]').click();
  await page.locator('.schedule-row-edit').first().click();
  return dialog(page);
}
export async function dismissChanged(page) {
  page.once('dialog', d => d.accept()); await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
}
export async function previewApply(page) {
  await dialog(page).getByRole('button', { name: 'Preview changes', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Confirm and apply', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
}
export const alpha = async page => (await readStoredWorkspace(page)).engagements.find(e => e.id === 'eff-alpha-year');
export const recordErrors = test => {
  const errors = new WeakMap();
  test.beforeEach(({ page }) => { const list = []; errors.set(page, list); page.on('pageerror', e => list.push(e.message)); });
  test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
};
