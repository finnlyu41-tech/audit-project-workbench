import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from './helpers.js';
import { toTraditional } from '../src/dashboard/traditional.js';

const cards = page => page.locator('.workstream-card');
const stageCount = card => card.locator('.workstream-card-stage-count');
const nextStage = card => card.locator('.workstream-card-next-stage');
const saved = page => readStoredWorkspace(page);

test('folded workstreams show the next stage and completed-stage counts without opening or writing', async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await saved(page);
  await expect(page.locator('.workflow-panel')).toHaveCount(0);
  await expect(stageCount(cards(page).nth(0))).toHaveText('0/2 stages completed');
  await expect(nextStage(cards(page).nth(0))).toHaveText('Next stage: Engagement setup');
  await expect(stageCount(cards(page).nth(1))).toHaveText('0/1 stages completed');
  await expect(nextStage(cards(page).nth(1))).toHaveText('Next stage: Tax computation');
  await expect(cards(page).locator('[aria-pressed=true]')).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
});

test('completing criteria advances the folded summary and survives reload without changing other work', async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await saved(page);
  const card = cards(page).first();
  await card.locator('button').click();
  await page.getByRole('tab', { name: /Engagement setup/ }).click();
  await page.getByRole('checkbox', { name: 'Scope confirmed', exact: true }).check();
  await expect(stageCount(card)).toHaveText('0/2 stages completed');
  await expect(nextStage(card)).toHaveText('Next stage: Engagement setup');
  await page.getByRole('checkbox', { name: 'Independence confirmed', exact: true }).check();
  await expect(stageCount(card)).toHaveText('1/2 stages completed');
  await expect(nextStage(card)).toHaveText('Next stage: Audit execution');
  await expect.poll(async () => (await saved(page)).engagements[0].workstreams[0].nodes[0].conditions.every(c => c.done)).toBe(true);
  const after = await saved(page);
  expect(after.entities).toEqual(before.entities);
  expect(after.engagements[0].workstreams[1]).toEqual(before.engagements[0].workstreams[1]);
  expect(after.engagements[0].outstandingItems).toEqual(before.engagements[0].outstandingItems);
  expect(after.engagements[0].reportingPeriods).toEqual(before.engagements[0].reportingPeriods);
  await card.locator('button').click();
  await expect(page.locator('.workflow-panel')).toHaveCount(0);
  await expect(nextStage(card)).toHaveText('Next stage: Audit execution');
  await page.reload();
  await expect(stageCount(cards(page).first())).toHaveText('1/2 stages completed');
  expect(await saved(page)).toEqual(after);
});

test('missing criteria remain unfinished even at 100 percent and outstanding stays independent', async ({ page }) => {
  const store = workspaceFixture();
  const [audit, tax] = store.projects[0].workstreams;
  audit.nodes[0].conditions.forEach(c => { c.done = true; });
  audit.nodes[1].conditions = [];
  tax.nodes[0].conditions.forEach(c => { c.done = true; });
  store.projects[0].outstandingItems = [{ id: 'separate-outstanding', title: 'Fictional document pending',
    status: 'missing_document', workstreamId: tax.id, note: '' }];
  await openWorkbench(page, store);
  const before = await saved(page);
  await expect(cards(page).first().getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await expect(stageCount(cards(page).first())).toHaveText('1/2 stages completed');
  await expect(nextStage(cards(page).first())).toHaveText('Next stage: Audit execution');
  await expect(cards(page).first()).not.toHaveAttribute('data-complete', 'true');
  await expect(stageCount(cards(page).nth(1))).toHaveText('1/1 stages completed');
  await expect(nextStage(cards(page).nth(1))).toHaveText('All stages completed');
  await expect(cards(page).nth(1).locator('.workstream-card-meta')).toContainText('1 open');
  expect(await saved(page)).toEqual(before);
});

test('empty modules offer an honest setup state without inventing a completed stage', async ({ page }) => {
  const store = workspaceFixture(); store.projects[0].workstreams[0].nodes = [];
  await openWorkbench(page, store);
  await expect(stageCount(cards(page).first())).toHaveText('Not started');
  await expect(nextStage(cards(page).first())).toHaveText('No stages added');
  await expect(cards(page).first()).not.toHaveAttribute('data-complete', 'true');
});

test('stage order changes the next-stage summary and module keyboard actions keep working', async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const card = cards(page).first();
  await card.locator('button').focus(); await page.keyboard.press('Enter');
  await expect(card.locator('button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: /Audit execution/ }).click();
  await page.getByRole('button', { name: 'Move stage up', exact: true }).click();
  await expect(nextStage(card)).toHaveText('Next stage: Audit execution');
  await card.locator('button').focus(); await page.keyboard.press('Space');
  await expect(page.locator('.workflow-panel')).toHaveCount(0);
  await page.keyboard.press('Alt+ArrowRight');
  await expect(nextStage(cards(page).nth(1))).toHaveText('Next stage: Audit execution');
  await expect(cards(page).nth(1).locator('button')).toBeFocused();
  await expect.poll(async () => (await saved(page)).engagements[0].workstreams.map(w => w.type))
    .toEqual(['tax_computation_filing', 'audit']);
  const beforeReload = await saved(page);
  await page.reload();
  await expect(nextStage(cards(page).nth(1))).toHaveText('Next stage: Audit execution');
  await expect(stageCount(cards(page).nth(1))).toHaveText('0/2 stages completed');
  expect(await saved(page)).toEqual(beforeReload);
});

for (const language of ['en', 'zh-Hans', 'zh-Hant']) {
  test(`long literal stage names and multi-period identities stay readable in ${language}`, async ({ page }) => {
    const store = workspaceFixture();
    const title = 'Example 银行 <review> — very long stage title with no silent translation';
    store.projects[0].entity = 'Example International Professional Services and Advisory Company Limited';
    store.projects[0].reportingPeriods = [
      { id: 'period-2025', periodStart: '2025-01-01', periodEnd: '2025-12-31' },
      { id: 'period-2026', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
    ];
    store.projects[0].workstreams[0].nodes[0].title = title;
    await openWorkbench(page, store);
    await page.evaluate(value => localStorage.setItem('audit-progress-workbench:language', value), language);
    await page.reload(); const before = await saved(page);
    const count = language === 'en' ? '0/2 stages completed' : language === 'zh-Hant' ? toTraditional('0/2 个阶段已完成') : '0/2 个阶段已完成';
    await expect(stageCount(cards(page).first())).toHaveText(count);
    await expect(nextStage(cards(page).first())).toHaveText(language === 'en' ? `Next stage: ${title}` : `下一阶段：${title}`.replace('下一阶段', language === 'zh-Hant' ? '下一階段' : '下一阶段'));
    await expect(page.locator('.detail-title > p')).toContainText('2025');
    await expect(page.locator('.detail-title > p')).toContainText('2026');
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await nextStage(cards(page).first()).evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth,
        page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(boxes.scroll).toBeLessThanOrEqual(boxes.width + 1);
      expect(boxes.page).toBeLessThanOrEqual(boxes.viewport + 1);
    }
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())).toEqual([]);
    expect(await saved(page)).toEqual(before);
  });
}

test('archived projects retain readable stage summaries and disabled completion controls', async ({ page }) => {
  const store = workspaceFixture(); store.projects[0].archived = true;
  await openWorkbench(page, store, { home: true }); const before = await saved(page);
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Quick open', exact: true });
  await picker.getByRole('combobox').fill('Example Services Limited');
  await picker.getByRole('option').filter({ hasText: 'Company master' }).click();
  await page.locator('.annual-project-open').click();
  await expect(page.locator('.archive-banner')).toBeVisible();
  await expect(stageCount(cards(page).first())).toHaveText('0/2 stages completed');
  await expect(nextStage(cards(page).first())).toHaveText('Next stage: Engagement setup');
  await expect(cards(page).first()).toHaveAttribute('draggable', 'false');
  await cards(page).first().locator('button').click();
  await page.getByRole('tab', { name: /Engagement setup/ }).click();
  await expect(page.getByRole('checkbox', { name: 'Scope confirmed', exact: true })).toBeDisabled();
  expect(await saved(page)).toEqual(before);
});
