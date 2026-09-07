import fs from 'node:fs/promises';
import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench,readStoredWorkspace,seriousViolations } from './helpers.js';
import { scheduleWorkspace } from '../tests/fixtures/schedule-workspace.js';
import { canonicalStorePayload,emptyStore,makeEntity } from '../src/dashboard/model.js';
const errors=new WeakMap();
test.beforeEach(({page})=>{const list=[]; errors.set(page,list); page.on('pageerror',error=>list.push(error.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
const dialog=page=>page.getByRole('dialog');
const periodRows=page=>dialog(page).locator('.reporting-period-list > article');
function firstFixture() {const store=canonicalStorePayload(emptyStore()); store.entities.push(makeEntity({id:'first-company',
  legalName:'First Period Example Limited',incorporationDate:'2025-01-01',fiscalYearPreset:'calendar'})); return store;}
async function openFirst(page) {
  await openWorkbench(page,firstFixture()); await page.getByRole('button',{name:'New annual engagement',exact:true}).click();
  await expect(dialog(page)).toBeVisible();
}
async function choose18(page) { await periodRows(page).first().getByRole('combobox',{name:'Suggested first-period end'}).selectOption('2026-06-30'); }
async function createFirst(page) {
  await openFirst(page); await choose18(page); await dialog(page).getByRole('button',{name:'Blank engagement',exact:true}).click();
  await dialog(page).locator('.project-date-groups input[type=date]').nth(0).fill('2026-08-01');
  await dialog(page).locator('.project-date-groups input[type=date]').nth(1).fill('2026-10-31');
  await dialog(page).getByRole('button',{name:'Create annual engagement',exact:true}).click(); await expect(dialog(page)).toHaveCount(0);
}
async function schedule(page,store=scheduleWorkspace(12)) {
 await page.clock.setFixedTime(new Date('2026-09-07T12:00:00+08:00')); await openWorkbench(page,store);
 await page.locator('.app-rail-button[aria-label="Project schedule"]').click(); await expect(page.locator('.schedule-scroll')).toBeVisible();
}
for(const [width,height] of [[800,560],[1024,768],[1280,720],[1440,900],[1920,1080]]) {
 test(`schedule prioritizes the timeline at ${width}x${height}`,async({page},info)=>{
  await page.setViewportSize({width,height}); await schedule(page); const before=await readStoredWorkspace(page);
  await expect(page.locator('.project-panel')).toBeHidden(); await expect(page.locator('.schedule-filters')).toHaveCount(0);
  const scroll=await page.locator('.schedule-scroll').boundingBox(), fixed=await page.locator('.schedule-corner').boundingBox();
  expect(scroll.height).toBeGreaterThan(height*.62); expect(scroll.y).toBeLessThan(165);
  expect(scroll.width-fixed.width).toBeGreaterThan(scroll.width*.6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button',{name:'Expand project navigation',exact:true}).click();
  await expect(page.locator('.project-panel')).toBeVisible(); expect((await page.locator('.schedule-scroll').boundingBox()).width).toBeCloseTo(scroll.width,0);
  await page.getByRole('button',{name:'Collapse project navigation',exact:true}).click();
  await page.screenshot({path:info.outputPath(`schedule-${width}.png`)});
  expect(await readStoredWorkspace(page)).toEqual(before);
 });
}
test('folded schedule filters show their active state and can be cleared without losing rows or focus',async({page})=>{
 await schedule(page); const before=await readStoredWorkspace(page),count=await page.locator('.schedule-row-meta').count();
 const toggle=page.getByRole('button',{name:'Search and filter schedules',exact:true}); await toggle.click();
 await page.getByRole('searchbox',{name:'Find scheduled projects'}).fill('fictional-no-match');
 await expect(page.locator('.schedule-row-meta')).toHaveCount(0); await toggle.click();
 await expect(page.locator('.schedule-filters')).toHaveCount(0);
 await page.getByRole('button',{name:'Filters applied; clear',exact:true}).click();
 await expect(page.locator('.schedule-row-meta')).toHaveCount(count); await expect(toggle).toBeFocused();
 expect(await readStoredWorkspace(page)).toEqual(before);
});
test('an 18-month first reporting period saves exactly, separately from work dates',async({page})=>{
 await openFirst(page);
 await expect(periodRows(page).first().getByLabel('Reporting start date *',{exact:true})).toHaveValue('2025-01-01');
 await choose18(page); await expect(periodRows(page).first().getByLabel('Reporting end date *',{exact:true})).toHaveValue('2026-06-30');
 await expect(dialog(page).locator('.project-date-groups input[type=date]').first()).toHaveValue('');
 await dialog(page).getByRole('button',{name:'Blank engagement',exact:true}).click();
 await dialog(page).getByRole('button',{name:'Create annual engagement',exact:true}).click();
 const saved=await readStoredWorkspace(page); expect(saved.engagements).toHaveLength(1);
 expect(saved.engagements[0]).toMatchObject({periodPreset:'doi_year_end',periodStart:'2025-01-01',periodEnd:'2026-06-30',startDate:'',dueDate:''});
 await page.reload(); expect(await readStoredWorkspace(page)).toEqual(saved);
 await page.locator('.app-rail-button[aria-label="Project schedule"]').click();
 await expect(page.locator('.schedule-bar')).toHaveCount(0); await expect(page.locator('.schedule-missing')).toHaveCount(1);
});
test('next separate project follows an 18-month first period, not another January-to-December year',async({page})=>{
 await createFirst(page); const before=await readStoredWorkspace(page);
 await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click();
 await dialog(page).getByRole('button',{name:'Create separate engagement',exact:true}).click();
 await expect(periodRows(page).first().getByLabel('Reporting start date *',{exact:true})).toHaveValue('2026-07-01');
 await expect(periodRows(page).first().getByLabel('Reporting end date *',{exact:true})).toHaveValue('2027-06-30');
 await expect(dialog(page).locator('.project-date-groups input[type=date]').first()).toHaveValue('');
 await dialog(page).getByRole('button',{name:'Create annual engagement',exact:true}).click();
 const after=await readStoredWorkspace(page); expect(after.engagements).toHaveLength(2);
 expect(after.engagements.find(e=>e.id===before.engagements[0].id)).toEqual(before.engagements[0]);
 expect(after.engagements.find(e=>e.id!==before.engagements[0].id)).toMatchObject({periodStart:'2026-07-01',periodEnd:'2027-06-30'});
});
test('adding a reporting period in the same draft starts after the actual first-year end',async({page})=>{
 await openFirst(page); await choose18(page); const before=await readStoredWorkspace(page);
 await dialog(page).getByRole('button',{name:'Add reporting period',exact:true}).click();
 await expect(periodRows(page)).toHaveCount(2);
 await expect(periodRows(page).nth(1).getByLabel('Reporting start date *',{exact:true})).toHaveValue('2026-07-01');
 await expect(periodRows(page).nth(1).getByLabel('Reporting end date *',{exact:true})).toHaveValue('2027-06-30');
 page.once('dialog',d=>d.accept()); await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await readStoredWorkspace(page)).toEqual(before);
});
test('custom first-period end is not capped to the incorporation calendar year or claimed legally approved',async({page})=>{
 await openFirst(page); await choose18(page); await periodRows(page).first().getByLabel('Reporting end date *',{exact:true}).fill('2026-09-30');
 await expect(dialog(page).locator('.period-advisory')).toContainText('exceeds the 18-month suggestion');
 await dialog(page).getByRole('button',{name:'Blank engagement',exact:true}).click();
 await dialog(page).getByRole('button',{name:'Create annual engagement',exact:true}).click();
 expect((await readStoredWorkspace(page)).engagements[0].periodEnd).toBe('2026-09-30');
});
test('editing company DOI keeps already saved first-period and operational dates untouched',async({page})=>{
 await createFirst(page); const before=await readStoredWorkspace(page);
 await page.getByRole('button',{name:'Quick open',exact:true}).click();
 await dialog(page).getByRole('combobox').fill('First Period Example');
 await dialog(page).getByRole('option').filter({hasText:'Company master'}).click();
 await page.getByRole('button',{name:'Edit company master',exact:true}).click();
 await dialog(page).getByLabel(/Incorporation \/ commencement date/).fill('2024-12-15');
 await dialog(page).getByRole('combobox',{name:'Default financial year',exact:true}).selectOption('apr_mar');
 await dialog(page).locator('button[type=submit]').click();
 const after=await readStoredWorkspace(page); expect(after.entities[0].incorporationDate).toBe('2024-12-15');
 expect(after.engagements).toEqual(before.engagements); await page.reload(); expect((await readStoredWorkspace(page)).engagements).toEqual(before.engagements);
});
test('actual 18-month backup restores into a clean browser with priority and work dates intact',async({page,browser})=>{
 await createFirst(page); await page.getByRole('combobox',{name:'Project priority',exact:true}).selectOption('high');
 const expected=await readStoredWorkspace(page); await page.locator('summary[aria-label^="Backup"]').click();
 const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Export backup',exact:true}).click();
 const payload=await fs.readFile(await(await download).path(),'utf8'); expect(JSON.parse(payload)).toEqual(expected);
 const context=await browser.newContext({locale:'en-HK',timezoneId:'Asia/Hong_Kong'});
 try { const fresh=await context.newPage(); await fresh.goto(page.url()); await fresh.locator('summary[aria-label^="Backup"]').click();
  const chooser=fresh.waitForEvent('filechooser'); await fresh.getByRole('button',{name:'Restore backup',exact:true}).click(); fresh.once('dialog',d=>d.accept());
  await(await chooser).setFiles({name:'fictional-doi.json',mimeType:'application/json',buffer:Buffer.from(payload)});
  await expect.poll(()=>readStoredWorkspace(fresh)).toEqual(expected); await fresh.reload(); expect(await readStoredWorkspace(fresh)).toEqual(expected);
  await fresh.locator('.app-rail-button[aria-label="Project schedule"]').click();
  await expect(fresh.locator('.schedule-row-meta')).toContainText('2025'); await expect(fresh.locator('.schedule-row-meta')).toContainText('2026');
  await expect(fresh.locator('.schedule-bar')).toHaveCount(1);
 } finally { await context.close(); }
});
for(const [language,label] of [['en','Suggested first-period end'],['zh-Hans','首期结束日建议'],['zh-Hant','首期結束日建議']]) {
 test(`DOI first-period editing is readable and accessible in ${language}`,async({page},info)=>{
  await openWorkbench(page,firstFixture()); await page.locator('.language-summary').click();
  await page.locator('.language-menu > button').nth({'zh-Hans':0,'zh-Hant':1,en:2}[language]).click();
  await page.locator('.annual-project-list > header > button').click(); await page.setViewportSize({width:800,height:640});
  await dialog(page).getByRole('combobox',{name:label,exact:true}).selectOption('2026-06-30');
  expect(await dialog(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  for(const date of await dialog(page).locator(".period-builder-controls input[type=date]").all()) {
    expect((await date.boundingBox()).width).toBeGreaterThanOrEqual(160); expect((await date.boundingBox()).height).toBe(42);
  }
  const selector=dialog(page).getByRole('combobox',{name:label,exact:true}); await selector.scrollIntoViewIfNeeded();
  await expect(selector).toBeInViewport(); await page.screenshot({path:info.outputPath(`doi-${language}.png`)});
  expect(seriousViolations(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze())).toEqual([]);
 });
}
test('very distant work dates cannot freeze the page by generating millions of day ticks',async({page})=>{
 const input=scheduleWorkspace(); input.engagements[0].startDate='0001-01-01'; input.engagements[0].dueDate='9999-12-31';
 await schedule(page,input); const before=await readStoredWorkspace(page);
 await page.getByRole('button',{name:'Day',exact:true}).click();
 await expect(page.locator('.timeline-range-notice')).toBeVisible();
 expect(await page.locator('.schedule-weeks > span').count()).toBeLessThanOrEqual(601);
 await expect(page.locator('.schedule-row-meta')).toHaveCount(4); expect(await readStoredWorkspace(page)).toEqual(before);
});
test('work-date editor retains 18-month reporting scope and only applies work dates',async({page})=>{
 await createFirst(page); const before=await readStoredWorkspace(page);
 await page.locator('.app-rail-button[aria-label="Project schedule"]').click(); await page.locator('.schedule-row-edit').click();
 await dialog(page).locator('input[type=date]').nth(1).fill('2026-11-30');
 await dialog(page).getByRole('button',{name:'Save engagement schedule',exact:true}).click();
 const after=await readStoredWorkspace(page); expect(after.engagements[0].dueDate).toBe('2026-11-30');
 const strip=({dueDate,updatedAt,...e})=>e;
 expect(strip(after.engagements[0])).toEqual(strip(before.engagements[0])); expect(after.entities).toEqual(before.entities);
});
