import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { projectPriorityFixture } from '../tests/fixtures/project-priority.js';
import { openWorkbench, readStoredWorkspace, seriousViolations } from './helpers.js';
import { openProjectNavigation } from './panel-helpers.js';
const job = (s, id='priority-normal') => s.engagements.find(e=>e.id===id);
const control = page => page.getByRole('region',{name:'Quick update',exact:true}).getByRole('combobox',{name:'Project priority',exact:true});
const omit = ({priority,updatedAt,...record}) => record;
async function go(page, name, archived=false) {
  await page.getByRole('button',{name:'Quick open',exact:true}).click(); const dialog=page.getByRole('dialog');
  if(archived) await dialog.getByRole('checkbox',{name:'Include archived records'}).check();
  const query=dialog.getByRole('combobox'); await query.fill(`${name} Example 2026`); await query.press('Enter');
  await expect(dialog).toHaveCount(0);
}
async function start(page, name='Normal', data=projectPriorityFixture()) { await openWorkbench(page,data); await go(page,name); }
test('direct priority setting updates only that annual project and survives reload',async({page})=>{
  await start(page); const before=await readStoredWorkspace(page); await control(page).selectOption('urgent');
  await expect(control(page)).toHaveValue('urgent'); const after=await readStoredWorkspace(page);
  expect(job(after).priority).toBe('urgent'); expect(omit(job(after))).toEqual(omit(job(before)));
  expect(after.entities).toEqual(before.entities); expect(after.scheduleOrder).toEqual(before.scheduleOrder);
  expect(after.engagements.slice(1)).toEqual(before.engagements.slice(1));
  await page.reload(); await go(page,'Normal'); await expect(control(page)).toHaveValue('urgent');
  await control(page).selectOption('normal'); expect(job(await readStoredWorkspace(page)).priority).toBeUndefined();
});
test('changing priority does not discard a quick-update draft and its save cannot reset priority',async({page})=>{
  await start(page); await page.getByRole('button',{name:'Quick edit',exact:true}).click();
  await page.locator('.quick-update-form').getByLabel('Project notes').fill('Fictional pending note');
  await control(page).selectOption('high'); await page.getByRole('button',{name:'Save updates',exact:true}).click();
  expect(job(await readStoredWorkspace(page))).toMatchObject({priority:'high',notes:'Fictional pending note'});
});
test('home and flat project list show urgent work first, with stable ties and working source links',async({page})=>{
  await start(page); const before=await readStoredWorkspace(page);
  await page.getByRole('button',{name:'Home',exact:true}).click();
  const ordered=page.locator('.home-project-row');
  expect(await ordered.evaluateAll(es=>es.map(e=>e.dataset.engagementId))).toEqual(
    ['priority-urgent','priority-high','priority-group','priority-normal','priority-low']);
  await page.getByRole('button',{name:/^Manual priority/}).click();
  await expect(page.locator('.home-priority-list > button')).toHaveCount(3);
  await page.locator('.home-priority-list > button').first().click(); await expect(control(page)).toHaveValue('urgent');
  await openProjectNavigation(page); await page.getByRole('tab',{name:'Projects',exact:true}).click();
  const list=page.locator('.flat-engagement-row');
  expect(await list.evaluateAll(es=>es.map(e=>e.dataset.engagementId))).toEqual(
    ['priority-urgent','priority-high','priority-group','priority-normal','priority-low']);
  await list.filter({hasText:'Low Example'}).click(); await expect(control(page)).toHaveValue('low');
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('annual editor cancel discards priority changes; saving preserves unrelated records',async({page})=>{
  await start(page); const before=await readStoredWorkspace(page);
  await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click();
  let dialog=page.getByRole('dialog'); await dialog.getByRole('combobox',{name:'Project priority',exact:true}).selectOption('low');
  page.once('dialog',d=>d.accept()); await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
  await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click(); dialog=page.getByRole('dialog');
  await dialog.getByRole('combobox',{name:'Project priority',exact:true}).selectOption('high');
  await dialog.getByRole('button',{name:'Save engagement',exact:true}).click(); await expect(control(page)).toHaveValue('high');
  const after=await readStoredWorkspace(page); expect(omit(job(after))).toEqual(omit(job(before)));
});
test('simple group priority never changes consolidation scope or completion',async({page})=>{
  await start(page,'Group'); const before=await readStoredWorkspace(page);
  const progress=await page.locator('.group-status-strip .progress-track').first().getAttribute('aria-valuenow');
  await control(page).selectOption('urgent');
  await expect(page.locator('[data-consolidation-mode]')).toHaveAttribute('data-consolidation-mode','simple');
  await expect(page.locator('.group-status-strip .progress-track').first()).toHaveAttribute('aria-valuenow',progress);
  const after=await readStoredWorkspace(page); expect(omit(job(after,'priority-group'))).toEqual(omit(job(before,'priority-group')));
  expect(after.engagements.slice(0,4)).toEqual(before.engagements.slice(0,4));
});
test('archived priority is visible but cannot be changed and stays out of active queues',async({page})=>{
  const data=projectPriorityFixture(); job(data,'priority-urgent').archived=true;
  await openWorkbench(page,data); await go(page,'Urgent',true); const before=await readStoredWorkspace(page); await expect(control(page)).toBeDisabled();
  await page.getByRole('button',{name:'Home',exact:true}).click();
  await expect(page.locator('.home-project-row[data-engagement-id="priority-urgent"]')).toHaveCount(0);
  await expect(page.locator('.home-priority-list [data-engagement-id="priority-urgent"]')).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for(const [language,label,level] of [['en','Project priority','Urgent'],['zh-Hans','项目优先级','紧急'],['zh-Hant','項目優先級','緊急']]) {
  test(`priority controls remain compact and accessible in ${language}`,async({page},info)=>{
    await start(page,'Group'); await page.locator('.language-summary').click();
    await page.locator('.language-menu > button').nth({'zh-Hans':0,'zh-Hant':1,en:2}[language]).click();
    await page.setViewportSize({width:800,height:640}); const picker=page.getByRole('combobox',{name:label,exact:true});
    await picker.selectOption('urgent'); await expect(picker).toHaveValue('urgent');
    expect(await page.locator('.quick-update-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    expect(await page.locator('.quick-update-panel').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(90);
    await page.screenshot({path:info.outputPath(`priority-${language}.png`)});
    expect(seriousViolations(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze())).toEqual([]);
  });
}
test('priority survives a real download and restore into a fresh browser context',async({page,browser})=>{
  await start(page); await control(page).selectOption('urgent'); const expected=await readStoredWorkspace(page);
  await page.locator('summary[aria-label^="Backup"]').click(); const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup',exact:true}).click();
  const payload=await fs.readFile(await(await download).path(),'utf8'); expect(JSON.parse(payload)).toEqual(expected);
  const context=await browser.newContext({locale:'en-HK',timezoneId:'Asia/Hong_Kong'});
  try {
    const fresh=await context.newPage(); await fresh.goto(page.url());
    await fresh.locator('summary[aria-label^="Backup"]').click(); const chooser=fresh.waitForEvent('filechooser');
    await fresh.getByRole('button',{name:'Restore backup',exact:true}).click(); fresh.once('dialog',d=>d.accept());
    await(await chooser).setFiles({name:'fictional-priority.json',mimeType:'application/json',buffer:Buffer.from(payload)});
    await expect.poll(()=>readStoredWorkspace(fresh)).toEqual(expected); await fresh.reload(); await go(fresh,'Normal');
    await expect(control(fresh)).toHaveValue('urgent'); expect(await readStoredWorkspace(fresh)).toEqual(expected);
  } finally { await context.close(); }
});
test('next annual project starts at normal, accepts an explicit level and leaves the old year intact',async({page})=>{
  await start(page,'Urgent'); const before=await readStoredWorkspace(page);
  await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Create separate engagement',exact:true}).click();
  const dialog=page.getByRole('dialog'); const picker=dialog.getByRole('combobox',{name:'Project priority',exact:true});
  await expect(picker).toHaveValue('normal'); await picker.selectOption('low');
  await dialog.getByRole('button',{name:'Create annual engagement',exact:true}).click();
  const after=await readStoredWorkspace(page); const added=after.engagements.filter(e=>!before.engagements.some(old=>old.id===e.id));
  expect(added).toHaveLength(1); expect(added[0].priority).toBe('low');
  expect(added[0].periodStart).toBe('2027-01-01'); expect(job(after,'priority-urgent')).toEqual(job(before,'priority-urgent'));
  expect(after.entities).toEqual(before.entities); await expect(control(page)).toHaveValue('low');
});
test('rapid narrow viewport changes cannot expand the compact priority toolbar into a large panel',async({page})=>{
  await start(page,'Group'); const before=await readStoredWorkspace(page);
  for(const width of [1440,800,1024,800,1280,800]) {
    await page.setViewportSize({width,height:640});
    await control(page).selectOption('urgent');
    const quick=page.getByRole('region',{name:'Quick update',exact:true});
    expect((await quick.boundingBox()).height).toBeLessThanOrEqual(90);
    expect(await quick.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  }
  const after=await readStoredWorkspace(page);
  expect(omit(job(after,'priority-group'))).toEqual(omit(job(before,'priority-group')));
});
test('narrow workspace does not depend on a timely media-query change notification',async({page})=>{
  await page.addInitScript(()=>{
    const native=window.matchMedia.bind(window);
    window.matchMedia=query=>{
      const media=native(query);
      if(!query.includes('1100px')&&!query.includes('1599px')) return media;
      return new Proxy(media,{get(target,key){
        if(key==='addEventListener'||key==='removeEventListener') return ()=>{};
        const value=Reflect.get(target,key,target); return typeof value==='function'?value.bind(target):value;
      }});
    };
  });
  await start(page,'Group'); const before=await readStoredWorkspace(page);
  await page.setViewportSize({width:800,height:640});
  await control(page).selectOption('urgent');
  await expect(page.locator('.project-panel')).toBeHidden();
  expect((await page.locator('.project-detail').boundingBox()).width).toBeGreaterThan(650);
  expect((await page.locator('.quick-update-panel').boundingBox()).height).toBeLessThanOrEqual(90);
  const after=await readStoredWorkspace(page);
  expect(omit(job(after,'priority-group'))).toEqual(omit(job(before,'priority-group')));
  await page.setViewportSize({width:1440,height:900});
  await expect(page.locator('.project-panel')).toBeVisible();
});
