import { test, expect } from '@playwright/test';
import { openWorkbench, readStoredWorkspace } from './helpers.js';
import { groupUsabilityFixture } from '../tests/fixtures/group-usability.js';
import { openOutstandingPane, openProjectNavigation } from './panel-helpers.js';
async function openGroup(page) {
  await openWorkbench(page,groupUsabilityFixture());
  await page.getByRole('button',{name:'Quick open',exact:true}).click();
  const query=page.getByRole('dialog').getByRole('combobox'); await query.fill('Example Consolidation 2026'); await query.press('Enter');
  await expect(page.locator('.holding-components-panel')).toBeVisible();
}
for(const [width,height,minWidth] of [[800,560,650],[1024,768,850],[1280,720,880],[1440,900,1000],[1920,1080,1200]]) {
  test(`working content has usable width and starts in the first viewport at ${width}x${height}`,async({page},info)=>{
    await page.setViewportSize({width,height}); await openGroup(page); const before=await readStoredWorkspace(page);
    const main=await page.locator('.project-detail').boundingBox(); expect(main.width).toBeGreaterThanOrEqual(minWidth);
    expect(main.height).toBeGreaterThanOrEqual(height-24);
    const first=await page.locator('[data-component-id]').first().boundingBox(); expect(first.y).toBeLessThan(height-72);
    await expect(page.locator('.component-filters')).toHaveCount(0);
    expect(await page.locator('.component-identity strong').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
    expect((await page.locator('.component-assignment select').first().boundingBox()).height).toBe(42);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:info.outputPath(`workspace-${width}.png`)});
    if(width<1600) {
      await openOutstandingPane(page); expect((await page.locator('.project-detail').boundingBox()).width).toBeCloseTo(main.width,0);
      await page.getByRole('button',{name:'Collapse outstanding centre',exact:true}).click();
      expect((await page.locator('.project-detail').boundingBox()).width).toBeCloseTo(main.width,0);
    }
    expect(await readStoredWorkspace(page)).toEqual(before);
  });
}
test('narrow navigation is a temporary drawer and does not overwrite the wide-screen preference',async({page})=>{
  await page.setViewportSize({width:1440,height:900}); await openGroup(page);
  const before=await readStoredWorkspace(page), width=(await page.locator('.project-panel').boundingBox()).width;
  const preference=await page.evaluate(()=>localStorage.getItem('audit-progress-workbench:sidebar-collapsed'));
  await page.setViewportSize({width:1024,height:768}); await expect(page.locator('.project-panel')).toBeHidden();
  await expect(page.locator('.workbench-layout')).toHaveAttribute('data-navigation-overlay','true');
  const main=(await page.locator('.project-detail').boundingBox()).width;
  await openProjectNavigation(page); expect((await page.locator('.project-detail').boundingBox()).width).toBeCloseTo(main,0);
  await page.locator('.tree-entity-row').first().click(); await expect(page.locator('.project-panel')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('audit-progress-workbench:sidebar-collapsed'))).toBe(preference);
  await page.setViewportSize({width:1440,height:900}); await expect(page.locator('.project-panel')).toBeVisible();
  await expect.poll(async () => (await page.locator('.project-panel').boundingBox()).width).toBeCloseTo(width,0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('home opens the actual counted outstanding sources and never an instruction-only placeholder',async({page})=>{
  await openGroup(page); await page.getByRole('button',{name:'Home',exact:true}).click();
  await expect(page.locator('.outstanding-rail-toggle strong')).toHaveText('3');
  await openOutstandingPane(page); await expect(page.locator('.outstanding-item')).toHaveCount(3);
  await expect(page.locator('.outstanding-center')).toContainText('Current-year statement pending');
});
test('group filters are optional and clearing a folded filter reveals all active rows without changing the snapshot',async({page})=>{
  await openGroup(page); const before=await readStoredWorkspace(page);
  const toggle=page.getByRole('button',{name:'Search and filter components',exact:true});
  await toggle.click(); await page.getByRole('searchbox',{name:'Find components',exact:true}).fill('no such fictional company');
  await expect(page.locator('[data-component-id]')).toHaveCount(0); await toggle.click();
  await page.locator('.component-toolbar').getByRole('button',{name:/Filters active/}).click();
  await expect(page.locator('[data-component-id]')).toHaveCount(2);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
