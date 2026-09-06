import { openOutstandingFilters, openOutstandingMore, expandOutstandingItem } from './outstanding-helpers.js';
import fs from 'node:fs/promises';
import { STORAGE_KEY } from '../src/dashboard/model.js';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { annualSourceFixture } from '../tests/fixtures/annual-source.js';
import { holdingWorkspace } from '../tests/fixtures/holding-workspace.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
const modal = (page) => page.getByRole('dialog');
const title = (page) => modal(page).getByLabel('Outstanding item *');
const next = (page) => modal(page).getByRole('button', { name: 'Save and add another', exact: true });
const save = (page) => modal(page).getByRole('button', { name: 'Save outstanding item', exact: true });
const added = (after, before, id) => after.engagements.find((e) => e.id === id).outstandingItems
  .filter((item) => !before.engagements.find((e) => e.id === id).outstandingItems.some((old) => old.id === item.id));
function unchangedOutsideItems(after, before, id) {
  const omit = ({ outstandingItems, updatedAt, ...rest }) => rest;
  expect(after.entities).toEqual(before.entities);
  expect(after.engagements.filter((e) => e.id !== id)).toEqual(before.engagements.filter((e) => e.id !== id));
  expect(omit(after.engagements.find((e) => e.id === id))).toEqual(omit(before.engagements.find((e) => e.id === id)));
}
async function openNew(page, store = annualSourceFixture().store) {
  await openWorkbench(page, store);
  const before = await readStoredWorkspace(page);
  await page.getByRole('button', { name: 'Add outstanding item', exact: true }).click();
  return before;
}
test('three consecutive items use one editor and four button activations without altering other work', async ({ page }, info) => {
  const fixture = annualSourceFixture(); const before = await openNew(page, fixture.store);
  let clicks = 1;
  for (const [index, value] of ['Fictional bank confirmation', 'Fictional signed accounts', 'Fictional sales reconciliation'].entries()) {
    await title(page).fill(value); await (index < 2 ? next(page) : save(page)).click(); clicks++;
    if (index < 2) { await expect(title(page)).toHaveValue(''); await expect(title(page)).toBeFocused(); }
  }
  await expect(modal(page)).toHaveCount(0);
  const after = await readStoredWorkspace(page); expect(added(after, before, fixture.currentId)).toHaveLength(3);
  unchangedOutsideItems(after, before, fixture.currentId); expect(clicks).toBe(4);
  await expect(page.locator('.outstanding-item').filter({ hasText: 'Fictional sales reconciliation' })).toBeFocused();
  await info.attach('operation-count', { body: JSON.stringify({ clicks, titleEntries: 3, editorVisits: 1, humanTime: null }), contentType: 'application/json' });
  await page.reload(); expect((await readStoredWorkspace(page)).engagements).toEqual(after.engagements);
});
test('continuation clears title notes and closed status but retains the chosen module', async ({ page }) => {
  const fixture = annualSourceFixture(); const before = await openNew(page, fixture.store);
  const moduleId = fixture.store.engagements.find((e) => e.id === fixture.currentId).workstreams[0].id;
  await title(page).fill('First submitted item'); await modal(page).getByLabel('Description', { exact: true }).fill('Private note only for first item');
  await modal(page).getByLabel('Level or workstream').selectOption(moduleId);
  await modal(page).getByRole('combobox', { name: 'Outstanding status', exact: true }).selectOption('resolved'); await next(page).click();
  await expect(title(page)).toBeFocused(); await expect(title(page)).toHaveValue('');
  await expect(modal(page).getByLabel('Description', { exact: true })).toHaveValue('');
  await expect(modal(page).getByLabel('Level or workstream')).toHaveValue(moduleId);
  await expect(modal(page).getByRole('combobox', { name: 'Outstanding status', exact: true })).not.toHaveValue('resolved');
  await expect(modal(page).locator('.modal-unsaved')).toHaveCount(0);
  await expect(modal(page).locator('.outstanding-entry-receipt')).toContainText('First submitted item');
  await title(page).fill('Second submitted item'); await save(page).click();
  const after = await readStoredWorkspace(page); const items = added(after, before, fixture.currentId);
  expect(items).toHaveLength(2); expect(items[0]).toMatchObject({ status: 'resolved', note: 'Private note only for first item', workstreamId: moduleId });
  expect(items[1]).toMatchObject({ note: '', workstreamId: moduleId }); expect(items[1].status).not.toBe('resolved');
  unchangedOutsideItems(after, before, fixture.currentId);
});
test('cancelling an unfinished next item keeps submitted records and protects only the current draft', async ({ page }) => {
  const fixture = annualSourceFixture(); const before = await openNew(page, fixture.store);
  await title(page).fill('Submitted first'); await next(page).click();
  await title(page).fill('Unsubmitted second');
  page.once('dialog', (prompt) => prompt.dismiss());
  await modal(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(title(page)).toHaveValue('Unsubmitted second');
  page.once('dialog', (prompt) => prompt.accept());
  await modal(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  const after = await readStoredWorkspace(page); expect(added(after, before, fixture.currentId).map((i) => i.title)).toEqual(['Submitted first']);
  await expect(page.locator('.outstanding-item').filter({ hasText: 'Submitted first' })).toBeFocused();
  unchangedOutsideItems(after, before, fixture.currentId);
});
test('an empty continuation closes without a discard prompt and never deletes submitted items', async ({ page }) => {
  const before = await openNew(page); await title(page).fill('Saved only item'); await next(page).click();
  let prompts = 0; page.on('dialog', async (prompt) => { prompts++; await prompt.dismiss(); });
  await modal(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(modal(page)).toHaveCount(0); expect(prompts).toBe(0);
  expect(added(await readStoredWorkspace(page), before, before.engagements[0].id)).toHaveLength(1);
});
test('both save actions reject spaces and allow correction without changing other records', async ({ page }) => {
  const before = await openNew(page); await title(page).fill('   '); await next(page).click();
  await expect(title(page)).toBeFocused(); await expect(title(page)).toHaveAttribute('aria-invalid', 'true');
  expect(await readStoredWorkspace(page)).toEqual(before);
  await title(page).fill('Valid correction'); await next(page).click();
  await expect(title(page)).toHaveValue(''); await expect(modal(page).getByRole('alert')).toHaveCount(0);
});
test('double activation and duplicate submit events create only one item', async ({ page }) => {
  const before = await openNew(page); await title(page).fill('One explicit submission');
  await next(page).dblclick(); await expect(title(page)).toHaveValue('');
  expect(added(await readStoredWorkspace(page), before, before.engagements[0].id)).toHaveLength(1);
  await title(page).fill('Another explicit submission');
  await modal(page).locator('form').evaluate((form) => {
    const submitter = form.querySelector('[value=continue]');
    for (let n = 0; n < 2; n++) form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter }));
  });
  await expect(title(page)).toHaveValue('');
  expect(added(await readStoredWorkspace(page), before, before.engagements[0].id)).toHaveLength(2);
});
test('IME Enter does not submit and normal Enter keeps the original save-and-close behaviour', async ({ page }) => {
  const before = await openNew(page); await title(page).fill('银行确认');
  await title(page).dispatchEvent('compositionstart');
  await title(page).dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229 });
  expect(await readStoredWorkspace(page)).toEqual(before);
  await title(page).dispatchEvent('compositionend'); await title(page).press('Enter');
  await expect(modal(page)).toHaveCount(0);
  expect(added(await readStoredWorkspace(page), before, before.engagements[0].id)).toHaveLength(1);
});
test('group continuous entry changes only its own outstanding items and retains historical components', async ({ page }) => {
  const before = await openNew(page, holdingWorkspace());
  await title(page).fill('Group-only first'); await next(page).click();
  await title(page).fill('Group-only second'); await save(page).click();
  const after = await readStoredWorkspace(page); expect(added(after, before, 'holding-annual')).toHaveLength(2);
  unchangedOutsideItems(after, before, 'holding-annual');
});
for (const [language, label] of [['en', 'Save and add another'], ['zh-Hans', '保存并继续新增'], ['zh-Hant', '儲存並繼續新增']]) {
  test(`continuous entry is readable and keeps focus at 480px in ${language}`, async ({ page }, info) => {
    await openWorkbench(page, annualSourceFixture().store);
    await page.evaluate((value) => localStorage.setItem('audit-progress-workbench:language', value), language);
    await page.reload(); await page.locator('.outstanding-add').click();
    await page.setViewportSize({ width: 480, height: 640 });
    const dialog = modal(page); const field = dialog.locator('input[required]');
    const button = dialog.locator('button[value=continue]'); await expect(button).toHaveAccessibleName(label);
    await field.fill('Synthetic title — 客户资料'); await button.click();
    await expect(field).toBeFocused(); await expect(field).toHaveValue('');
    await expect(dialog.locator('.modal-unsaved')).toHaveCount(0);
    const geometry = await dialog.evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
    for (const input of await dialog.locator('input,select').all()) expect((await input.boundingBox()).height).toBe(42);
    await button.scrollIntoViewIfNeeded(); await expect(button).toBeInViewport({ ratio: 1 });
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    await page.screenshot({ path: info.outputPath(`continuous-${language}.png`) });
  });
}
test('editing an existing item has only the regular save action and does not create a new item', async ({ page }) => {
  await openNew(page); await title(page).fill('Existing item'); await save(page).click();
  const before = await readStoredWorkspace(page);
  await expandOutstandingItem(page.locator('.outstanding-item').filter({ hasText: 'Existing item' }));
  await page.locator('.outstanding-item').filter({ hasText: 'Existing item' }).getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(next(page)).toHaveCount(0); await title(page).fill('Edited item'); await save(page).click();
  const after = await readStoredWorkspace(page);
  expect(after.engagements[0].outstandingItems.length).toBe(before.engagements[0].outstandingItems.length);
});
test('failed browser saving remains visible and the applied item is still in a real memory backup', async ({ page }) => {
  const fixture=annualSourceFixture(); const before=await openNew(page,fixture.store);
  await page.evaluate((storageKey) => {
    const original=Storage.prototype.setItem;
    window.restoreSyntheticStorage=()=>{Storage.prototype.setItem=original;};
    Storage.prototype.setItem=function(key,value){
      if(key===storageKey) throw new DOMException('Synthetic quota','QuotaExceededError');
      return original.call(this,key,value);
    };
  }, STORAGE_KEY);
  await title(page).fill('Applied item pending browser save'); await next(page).click();
  await expect(modal(page).locator('.outstanding-entry-receipt')).toContainText('Applied item pending browser save');
  await modal(page).getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.locator('.persistence-safety-alert')).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
  const file=page.waitForEvent('download'); await page.locator('.persistence-safety-alert').getByRole('button',{name:'Export backup',exact:true}).click();
  const backup=JSON.parse(await fs.readFile(await (await file).path(),'utf8'));
  expect(added(backup,before,fixture.currentId)).toHaveLength(1);
  await page.evaluate(()=>window.restoreSyntheticStorage()); await page.locator('.persistence-safety-alert').getByRole('button',{name:/Retry sav/}).click();
  await expect(page.locator('.persistence-safety-alert')).toHaveCount(0);
  expect(added(await readStoredWorkspace(page),before,fixture.currentId)).toHaveLength(1);
});
