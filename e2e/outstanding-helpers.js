import { expect } from '@playwright/test';

export async function openOutstandingFilters(page) {
  const toggle = page.locator('.outstanding-filter-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await expect(page.locator('.outstanding-tools-panel')).toBeVisible();
}
export async function openOutstandingMore(page) {
  const toggle = page.locator('.outstanding-more-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await expect(page.locator('.outstanding-more-actions')).toBeVisible();
}
export async function expandOutstandingItem(row) {
  const toggle = row.locator('.outstanding-item-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await expect(row.locator('.outstanding-item-details')).toBeVisible();
}
