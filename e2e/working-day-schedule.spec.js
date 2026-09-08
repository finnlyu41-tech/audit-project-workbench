import fs from 'node:fs/promises';
import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWorkbench,readStoredWorkspace,seriousViolations } from './helpers.js';
import { scheduleWorkspace } from '../tests/fixtures/schedule-workspace.js';
import { projectPriorityFixture } from '../tests/fixtures/project-priority.js';
import { annualSourceFixture } from '../tests/fixtures/annual-source.js';
import { canonicalStorePayload,emptyStore,makeEntity } from '../src/dashboard/model.js';
const dialog=page=>page.getByRole('dialog');
const record=(store,id='schedule-current')=>store.engagements.find(e=>e.id===id);
const strip=({startDate,dueDate,updatedAt,...value})=>value;
async function openEditor(page,data=scheduleWorkspace()) {
 await openWorkbench(page,data); await page.locator('.app-rail-button[aria-label="Project schedule"]').click();
 await page.locator('[data-schedule-key="project:schedule-current"] .schedule-row-edit').click();
 await expect(dialog(page).getByRole('button',{name:'Manual dates',exact:true})).toHaveAttribute('aria-pressed','true');
}
async function estimate(page,start='2026-09-30',days='3') {
 await dialog(page).getByRole('button',{name:'Estimate working days',exact:true}).click();
 await dialog(page).getByLabel('Estimated start date',{exact:true}).fill(start);
 await dialog(page).getByRole('spinbutton',{name:'Estimated working days',exact:true}).fill(days);
}
// Shared names used by the continuation scenarios.
const start=openEditor, editor=dialog, job=record, withoutDates=strip;
const save=page=>dialog(page).getByRole('button',{name:'Save engagement schedule',exact:true}).click();
const preview=page=>dialog(page).locator('.working-day-preview');
test('workdays preview skips weekends and holidays, saves only the selected dates and survives reload',async({page})=>{
 await openEditor(page); const before=await readStoredWorkspace(page); await estimate(page);
 await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2026-10-05');
 expect(await readStoredWorkspace(page)).toEqual(before); await save(page); const after=await readStoredWorkspace(page);
 expect(record(after)).toMatchObject({startDate:'2026-09-30',dueDate:'2026-10-05'});
 expect(strip(record(after))).toEqual(strip(record(before))); expect(after.entities).toEqual(before.entities);
 expect(after.scheduleOrder).toEqual(before.scheduleOrder); expect(after.engagements.filter(e=>e.id!=='schedule-current')).toEqual(before.engagements.filter(e=>e.id!=='schedule-current'));
 await page.reload(); expect(await readStoredWorkspace(page)).toEqual(after);
});
test('holiday starts explicitly move to a working day and one-day work ends on that same day',async({page})=>{
 await openEditor(page); await estimate(page,'2026-04-03','1');
 await expect(dialog(page).locator('.working-day-shift')).toContainText('moved forward');
 await expect(preview(page).locator('dd time').first()).toHaveAttribute('datetime','2026-04-08');
 await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2026-04-08');
 await dialog(page).locator('.working-day-skipped summary').click();
 await expect(dialog(page).locator('.working-day-skipped li')).toHaveCount(5);
 await save(page); expect(record(await readStoredWorkspace(page))).toMatchObject({startDate:'2026-04-08',dueDate:'2026-04-08'});
});
test('six-day week counts normal Saturdays but still excludes Saturday public holidays',async({page})=>{
 await openEditor(page); await estimate(page,'2026-09-25','2');
 await dialog(page).getByRole('combobox',{name:'Working week',exact:true}).selectOption('six');
 await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2026-09-28');
 await dialog(page).getByLabel('Estimated start date',{exact:true}).fill('2026-09-30');
 await dialog(page).getByRole('spinbutton',{name:'Estimated working days',exact:true}).fill('3');
 await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2026-10-03');
 await save(page); expect(record(await readStoredWorkspace(page)).dueDate).toBe('2026-10-03');
});
test('workday calculation works offline and carries official holidays across the year boundary',async({page,context})=>{
 await openEditor(page); await context.setOffline(true); await estimate(page,'2026-12-31','2');
 await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2027-01-04');
 await save(page); expect(record(await readStoredWorkspace(page))).toMatchObject({startDate:'2026-12-31',dueDate:'2027-01-04'});
});
test('unknown-year coverage fails closed instead of saving a stale successful preview',async({page})=>{
  await start(page); const before=await readStoredWorkspace(page); await estimate(page,'2027-12-31','1');
  await expect(preview(page)).toBeVisible(); await editor(page).getByLabel('Estimated working days',{exact:true}).fill('2');
  await expect(preview(page)).toHaveCount(0); await expect(editor(page).locator('.working-day-warning')).toContainText('2025–2027');
  await save(page); await expect(editor(page)).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
  await editor(page).getByLabel('Estimated start date',{exact:true}).fill('2026-12-31');
  await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2027-01-04'); await save(page);
  expect(job(await readStoredWorkspace(page)).dueDate).toBe('2027-01-04');
});
test('invalid and fractional workdays cannot submit old dates and corrected input saves normally',async({page})=>{
  await start(page); const before=await readStoredWorkspace(page); await estimate(page,'2026-09-08','0');
  for (const days of ['0','-1','1.5','1001','']) {
    await editor(page).getByLabel('Estimated working days',{exact:true}).fill(days);
    await save(page); await expect(editor(page)).toBeVisible(); await expect(preview(page)).toHaveCount(0);
    expect(await readStoredWorkspace(page)).toEqual(before);
  }
  await editor(page).getByLabel('Estimated working days',{exact:true}).fill('1'); await save(page);
  expect(job(await readStoredWorkspace(page)).dueDate).toBe('2026-09-08');
});
test('switching to manual adopts the preview and still requires explicit saving',async({page})=>{
  await start(page); const before=await readStoredWorkspace(page); await estimate(page);
  await editor(page).getByRole('button',{name:'Manual dates',exact:true}).click();
  await expect(editor(page).getByLabel('Project start',{exact:true})).toHaveValue('2026-09-30');
  await expect(editor(page).getByLabel('Deadline',{exact:true})).toHaveValue('2026-10-05');
  expect(await readStoredWorkspace(page)).toEqual(before);
  await editor(page).getByLabel('Deadline',{exact:true}).fill('2026-10-06'); await save(page);
  expect(job(await readStoredWorkspace(page)).dueDate).toBe('2026-10-06');
});
test('missing calendar coverage cannot save old dates or a partial calculated result',async({page})=>{
 await openEditor(page); const before=await readStoredWorkspace(page); await estimate(page,'2027-12-31','2');
 await expect(dialog(page).locator('.working-day-warning')).toContainText('2025–2027');
 await expect(preview(page)).toHaveCount(0); await dialog(page).locator('form').dispatchEvent('submit');
 await expect(dialog(page).locator('.form-error')).toContainText('cannot be calculated reliably');
 expect(await readStoredWorkspace(page)).toEqual(before);
 await dialog(page).getByRole('spinbutton',{name:'Estimated working days',exact:true}).fill('1');
 await save(page); expect(record(await readStoredWorkspace(page))).toMatchObject({startDate:'2027-12-31',dueDate:'2027-12-31'});
});
test('invalid workday amounts fail at submission and a corrected estimate can save',async({page})=>{
 await openEditor(page); const before=await readStoredWorkspace(page); await estimate(page,'2026-09-30','0');
 await dialog(page).locator('form').dispatchEvent('submit');
 await expect(dialog(page).locator('.form-error')).toContainText('whole number'); expect(await readStoredWorkspace(page)).toEqual(before);
 await dialog(page).getByRole('spinbutton',{name:'Estimated working days',exact:true}).fill('3'); await save(page);
 expect(record(await readStoredWorkspace(page)).dueDate).toBe('2026-10-05');
});
test('cancelling an estimate protects its draft and never commits the preview',async({page})=>{
 await openEditor(page); const before=await readStoredWorkspace(page); await estimate(page);
 page.once('dialog',d=>d.dismiss()); await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(preview(page)).toBeVisible(); expect(await readStoredWorkspace(page)).toEqual(before);
 page.once('dialog',d=>d.accept()); await page.keyboard.press('Escape'); await expect(dialog(page)).toHaveCount(0);
 expect(await readStoredWorkspace(page)).toEqual(before);
});
test('switching back from an untouched estimate leaves the original manual dates and a clean form',async({page})=>{
 await openEditor(page); const before=await readStoredWorkspace(page); let prompts=0; page.on('dialog',async d=>{prompts++;await d.dismiss();});
 await dialog(page).getByRole('button',{name:'Estimate working days',exact:true}).click();
 await dialog(page).getByRole('button',{name:'Manual dates',exact:true}).click();
 await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click(); await expect(dialog(page)).toHaveCount(0);
 expect(prompts).toBe(0); expect(await readStoredWorkspace(page)).toEqual(before);
});
async function openPriorityProject(page,name='Normal') {
  await openWorkbench(page,projectPriorityFixture()); await page.getByRole('button',{name:'Quick open',exact:true}).click();
  const search=editor(page).getByRole('combobox'); await search.fill(`${name} Example 2026`); await search.press('Enter');
  await expect(editor(page)).toHaveCount(0);
}
test('new annual project accepts estimated workdates without changing the copied reporting source',async({page})=>{
  await openPriorityProject(page); const before=await readStoredWorkspace(page);
  await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click();
  await editor(page).getByRole('button',{name:'Create separate engagement',exact:true}).click();
  await estimate(page,'2027-02-05','3');
  await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2027-02-11');
  await editor(page).getByRole('button',{name:'Create annual engagement',exact:true}).click();
  const after=await readStoredWorkspace(page),added=after.engagements.find(e=>!before.engagements.some(old=>old.id===e.id));
  expect(added).toMatchObject({periodStart:'2027-01-01',periodEnd:'2027-12-31',startDate:'2027-02-05',dueDate:'2027-02-11'});
  expect(after.engagements.filter(e=>e.id!==added.id)).toEqual(before.engagements); expect(after.entities).toEqual(before.entities);
  expect(added).not.toHaveProperty('scheduleEstimate');
});
test('simple group estimates only its own work dates and preserves priority and consolidation',async({page})=>{
  await openPriorityProject(page,'Group'); const before=await readStoredWorkspace(page);
  await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click(); await estimate(page,'2026-04-02','3');
  await editor(page).getByRole('button',{name:'Save engagement',exact:true}).click();
  const after=await readStoredWorkspace(page); expect(job(after,'priority-group')).toMatchObject({startDate:'2026-04-02',dueDate:'2026-04-09',priority:'high'});
  expect(withoutDates(job(after,'priority-group'))).toEqual(withoutDates(job(before,'priority-group')));
  expect(after.engagements.filter(e=>e.id!=='priority-group')).toEqual(before.engagements.filter(e=>e.id!=='priority-group'));
});
test('valid calculation can switch to manual adjustment, including outside holiday coverage',async({page})=>{
 await openEditor(page); await estimate(page);
 await dialog(page).getByRole('button',{name:'Manual dates',exact:true}).click();
 await expect(dialog(page).getByLabel('Project start',{exact:true})).toHaveValue('2026-09-30');
 await expect(dialog(page).getByLabel('Deadline',{exact:true})).toHaveValue('2026-10-05');
 await dialog(page).getByLabel('Deadline',{exact:true}).fill('2028-01-03');
 await dialog(page).getByLabel('Project start',{exact:true}).fill('2028-01-02');
 await save(page); expect(record(await readStoredWorkspace(page))).toMatchObject({startDate:'2028-01-02',dueDate:'2028-01-03'});
});
test('a new DOI first-period project can estimate work dates without altering its 18-month report period',async({page})=>{
 const data=canonicalStorePayload(emptyStore()); data.entities.push(makeEntity({id:'workday-first',legalName:'Workday First Example Limited',incorporationDate:'2025-01-01'}));
 await openWorkbench(page,data); await page.getByRole('button',{name:'New annual engagement',exact:true}).click();
 await dialog(page).getByRole('combobox',{name:'Suggested first-period end',exact:true}).selectOption('2026-06-30');
 await dialog(page).getByRole('button',{name:'Blank engagement',exact:true}).click(); await estimate(page);
 await dialog(page).getByRole('button',{name:'Create annual engagement',exact:true}).click();
 const saved=await readStoredWorkspace(page); expect(saved.engagements).toHaveLength(1);
 expect(saved.engagements[0]).toMatchObject({periodStart:'2025-01-01',periodEnd:'2026-06-30',startDate:'2026-09-30',dueDate:'2026-10-05'});
 expect(saved.entities).toEqual(data.entities); expect(JSON.stringify(saved)).not.toContain('scheduleEstimate');
});
test('group workday editing changes only the selected group dates, not components or another year',async({page})=>{
 const f=annualSourceFixture(true); await openWorkbench(page,f.store);
 await page.getByRole('button',{name:'Project schedule',exact:true}).click();
 await page.locator(`[data-schedule-key="group:${f.currentId}"] .schedule-row-open`).click();
 const before=await readStoredWorkspace(page);
 await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click(); await estimate(page,'2026-04-02','3');
 await dialog(page).getByRole('button',{name:'Save engagement',exact:true}).click(); const after=await readStoredWorkspace(page);
 expect(record(after,f.currentId)).toMatchObject({startDate:'2026-04-02',dueDate:'2026-04-09'});
 expect(strip(record(after,f.currentId))).toEqual(strip(record(before,f.currentId)));
 expect(after.engagements.filter(e=>e.id!==f.currentId)).toEqual(before.engagements.filter(e=>e.id!==f.currentId));
 expect(after.entities).toEqual(before.entities);
});
test('calculation works offline without fetching calendars or transmitting project details',async({page,context})=>{
  await start(page); const requests=[]; page.on('request',request=>requests.push(request.url()));
  await context.setOffline(true);
  try { await estimate(page,'2026-12-31','2');
    await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2027-01-04'); await save(page);
    expect(job(await readStoredWorkspace(page)).dueDate).toBe('2027-01-04'); expect(requests).toEqual([]);
  } finally { await context.setOffline(false); }
});
test('saved estimates survive actual backup download and clean-context restoration as ordinary dates',async({page,browser})=>{
  await start(page); await estimate(page); await save(page); const expected=await readStoredWorkspace(page);
  await page.locator('summary[aria-label^="Backup"]').click(); const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup',exact:true}).click();
  const payload=await fs.readFile(await(await download).path(),'utf8'); expect(JSON.parse(payload)).toEqual(expected);
  const freshContext=await browser.newContext({locale:'en-HK',timezoneId:'Asia/Hong_Kong'});
  try { const fresh=await freshContext.newPage(); await fresh.goto(page.url());
    await fresh.locator('summary[aria-label^="Backup"]').click(); const chooser=fresh.waitForEvent('filechooser');
    await fresh.getByRole('button',{name:'Restore backup',exact:true}).click(); fresh.once('dialog',d=>d.accept());
    await(await chooser).setFiles({name:'fictional-working-days.json',mimeType:'application/json',buffer:Buffer.from(payload)});
    await expect.poll(()=>readStoredWorkspace(fresh)).toEqual(expected); await fresh.reload();
    expect(await readStoredWorkspace(fresh)).toEqual(expected);
    await fresh.getByRole('button',{name:'Project schedule',exact:true}).click();
    await fresh.locator('[data-schedule-key="project:schedule-current"] .schedule-row-edit').click();
    await expect(editor(fresh).getByRole('button',{name:'Manual dates',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(editor(fresh).getByLabel('Deadline',{exact:true})).toHaveValue('2026-10-05');
  } finally { await freshContext.close(); }
});
for (const [language,mode,startLabel,daysLabel] of [
  ['en','Estimate working days','Estimated start date','Estimated working days'],
  ['zh-Hans','按工作日估算','预计开始日','预计工作天数'],
  ['zh-Hant','按工作日估算','預計開始日','預計工作天數']]) {
  test(`working-day mode remains readable and operable at 480px in ${language}`,async({page},info)=>{
    await openWorkbench(page,scheduleWorkspace());
    await page.locator('.language-summary').click(); await page.locator('.language-menu > button').nth({'zh-Hans':0,'zh-Hant':1,en:2}[language]).click();
    await page.getByRole('button',{name:language==='en'?'Project schedule':language==='zh-Hans'?'项目排期':'項目排期',exact:true}).click();
    await page.locator('[data-schedule-key="project:schedule-current"] .schedule-row-edit').click();
    await page.setViewportSize({width:480,height:800});
    await editor(page).getByRole('button',{name:mode,exact:true}).click();
    await editor(page).getByLabel(startLabel,{exact:true}).fill('2026-04-02');
    await editor(page).getByLabel(daysLabel,{exact:true}).fill('3');
    await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2026-04-09');
    for (const field of await editor(page).locator('.working-day-inputs input,.working-day-inputs select').all())
      expect((await field.boundingBox()).height).toBeGreaterThanOrEqual(42);
    expect(await editor(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    await preview(page).scrollIntoViewIfNeeded(); await page.screenshot({path:info.outputPath(`working-days-${language}.png`)});
    expect(seriousViolations(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze())).toEqual([]);
    await editor(page).locator('button[type=submit]').click();
    expect(job(await readStoredWorkspace(page)).dueDate).toBe('2026-04-09');
  });
}
test('estimated dates and independent records survive an actual backup download and clean restore',async({page,browser})=>{
 await openEditor(page); await estimate(page); await save(page); const expected=await readStoredWorkspace(page);
 await page.locator('summary[aria-label^="Backup"]').click(); const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export backup',exact:true}).click();
 const payload=await fs.readFile(await(await download).path(),'utf8'); expect(JSON.parse(payload)).toEqual(expected);
 const context=await browser.newContext({locale:'en-HK',timezoneId:'Asia/Hong_Kong'});
 try {
  const fresh=await context.newPage(); await fresh.goto(page.url()); await fresh.locator('summary[aria-label^="Backup"]').click();
  const chooser=fresh.waitForEvent('filechooser'); await fresh.getByRole('button',{name:'Restore backup',exact:true}).click();
  fresh.once('dialog',d=>d.accept()); await(await chooser).setFiles({name:'fictional-workday.json',mimeType:'application/json',buffer:Buffer.from(payload)});
  await expect.poll(()=>readStoredWorkspace(fresh)).toEqual(expected); await fresh.reload(); expect(await readStoredWorkspace(fresh)).toEqual(expected);
 } finally {await context.close();}
});
for(const [language,method,scheduleName] of [['en','Estimate working days','Project schedule'],['zh-Hans','按工作日估算','项目排期'],['zh-Hant','按工作日估算','項目排期']]) {
 for(const width of [480,800]) test(`workday estimator is readable and accessible in ${language} at ${width}px`,async({page},info)=>{
  await openWorkbench(page,scheduleWorkspace()); await page.locator('.language-summary').click();
  await page.locator('.language-menu > button').nth({'zh-Hans':0,'zh-Hant':1,en:2}[language]).click();
  await page.getByRole('button',{name:scheduleName,exact:true}).click();
  await page.locator('[data-schedule-key="project:schedule-current"] .schedule-row-edit').click();
  await page.setViewportSize({width,height:720}); await dialog(page).getByRole('button',{name:method,exact:true}).click();
  await dialog(page).locator('.working-day-inputs input[type=date]').fill('2026-04-03');
  await dialog(page).locator('.working-day-inputs input[type=number]').fill('3');
  await expect(preview(page).locator('dd time').last()).toHaveAttribute('datetime','2026-04-10');
  expect(await dialog(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  for(const input of await dialog(page).locator('.working-day-inputs :is(input,select)').all())expect((await input.boundingBox()).height).toBeGreaterThanOrEqual(42);
  await preview(page).scrollIntoViewIfNeeded(); await page.screenshot({path:info.outputPath(`workday-${language}-${width}.png`)});
  expect(seriousViolations(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze())).toEqual([]);
 });
}
