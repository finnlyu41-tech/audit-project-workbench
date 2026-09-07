import { expect } from '@playwright/test';

// Follow the actual responsive UI instead of assuming secondary panes are always docked.
export async function openOutstandingPane(page) {
  const trigger = page.locator('.outstanding-rail-toggle');
  if (await trigger.isVisible()) await trigger.click();
  await expect(page.locator('.outstanding-center')).toBeVisible();
}
export async function addOutstandingItem(page) {
  await openOutstandingPane(page);
  await page.getByRole('button', { name: 'Add outstanding item', exact: true }).click();
}
export async function openProjectNavigation(page) {
  if (!(await page.locator('.project-panel').isVisible())) await page.locator('.app-mark').click();
  await expect(page.locator('.project-panel')).toBeVisible();
}
export async function closeOutstandingPane(page) {
  const close=page.locator('.outstanding-shell-title > button');
  if(await close.isVisible()) await close.click();
}
