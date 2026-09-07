import { test, expect } from '@playwright/test';
import { groupUsabilityFixture } from '../tests/fixtures/group-usability.js';
import { openWorkbench, readStoredWorkspace } from './helpers.js';
const shell = page => page.locator('.outstanding-center-shell');
const rows = page => shell(page).locator('.outstanding-item');
async function openRecord(page, text) {
  await page.getByRole('button', { name: 'Quick open', exact: true }).click();
  const search = page.getByRole('dialog').getByRole('combobox'); await search.fill(text); await search.press('Enter');
}
async function start(page) {
  await openWorkbench(page, groupUsabilityFixture()); await openRecord(page, 'Example Consolidation 2026');
  await expect(page.locator('.group-status-strip')).toBeVisible();
}
async function collapse(page) {
  if (await shell(page).getByRole('button', { name: 'Collapse outstanding centre', exact: true }).count()) {
    await shell(page).getByRole('button', { name: 'Collapse outstanding centre', exact: true }).click();
  }
}
test('daily group scope hides historical rows without removing the saved components', async ({ page }) => {
  await start(page); const before = await readStoredWorkspace(page);
  await expect(page.locator('[data-component-id]')).toHaveCount(2);
  await page.getByRole('button', { name: /Show historical components/ }).click();
  await expect(page.locator('[data-component-id]')).toHaveCount(4);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('the project badge and reopened list count the same source, not the portfolio', async ({ page }) => {
  await start(page); await openRecord(page, 'Alpha 2026'); await collapse(page);
  await expect(shell(page).locator('.outstanding-rail-toggle strong')).toHaveText('1');
  await shell(page).getByRole('button', { name: 'Expand outstanding centre', exact: true }).click();
  await expect(rows(page)).toHaveCount(1); await expect(rows(page)).toContainText('Current-year statement pending');
});
test('schedule badge opens the same cross-company item set it counts', async ({ page }) => {
  await start(page); await page.locator('.app-rail-button[aria-label="Project schedule"]').click(); await collapse(page);
  await expect(shell(page).locator('.outstanding-rail-toggle strong')).toHaveText('3');
  await shell(page).getByRole('button', { name: 'Expand outstanding centre', exact: true }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(shell(page)).toContainText('Group figures pending');
  await expect(shell(page)).toContainText('Current-year statement pending');
});
test('group summary uses the same centered progress primitive as all other views', async ({ page }) => {
  await start(page);
  const ring = page.locator('.group-status-strip .progress-track').first();
  const geometry = await ring.evaluate(e => { const r=e.getBoundingClientRect(); const s=e.querySelector('span').getBoundingClientRect();
    return { display:getComputedStyle(e).display, dx:Math.abs(r.x+r.width/2-s.x-s.width/2), dy:Math.abs(r.y+r.height/2-s.y-s.height/2) }; });
  expect(geometry.display).toBe('grid'); expect(geometry.dx).toBeLessThanOrEqual(1); expect(geometry.dy).toBeLessThanOrEqual(1);
});
test('closed quick update is compact and preserves full notes behind a disclosure', async ({ page }, info) => {
  const data = groupUsabilityFixture(); data.engagements[0].notes = 'Fictional long note '.repeat(80);
  await openWorkbench(page, data); await openRecord(page, 'Example Consolidation 2026');
  const quick = page.getByRole('region', { name: 'Quick update', exact: true });
  const box = await quick.boundingBox(); expect(box.height).toBeLessThanOrEqual(120);
  await quick.locator('.quick-note-disclosure summary').click();
  await expect(quick.locator('.quick-note-preview')).toHaveText(data.engagements[0].notes.trim());
  await page.screenshot({ path: info.outputPath('compact-quick-update.png') });
});
const mode = page => page.locator('.group-mode-bar select');
const ownJob = s => s.engagements.find(e=>e.id==='holding-annual');
async function simpleMode(page, accept=true) {
  page.once('dialog', d=>accept ? d.accept() : d.dismiss()); await mode(page).selectOption('simple');
}
test('simple mode needs confirmation and never deletes the original historical scope', async ({ page }) => {
  await start(page); const before=await readStoredWorkspace(page);
  await simpleMode(page,false); await expect(mode(page)).toHaveValue('full'); expect(await readStoredWorkspace(page)).toEqual(before);
  await simpleMode(page); await expect(mode(page)).toHaveValue('simple');
  await expect(page.getByRole('tab',{name:'Components',exact:true})).toHaveCount(0);
  await expect(page.locator('.holding-components-panel')).toHaveCount(0);
  await expect(page.locator('.node-board')).toBeVisible();
  const after=await readStoredWorkspace(page);
  expect(ownJob(after).consolidation.components).toEqual(ownJob(before).consolidation.components);
  expect(ownJob(after).consolidation.nodes).toEqual(ownJob(before).consolidation.nodes);
  expect(after.entities).toEqual(before.entities); expect(after.engagements.slice(1)).toEqual(before.engagements.slice(1));
});
test('finishing only the local workflow completes a simple group and survives reload', async ({ page }) => {
  await start(page); await simpleMode(page);
  const before=await readStoredWorkspace(page);
  await page.locator('.node-board .node-track-card').first().click();
  const checks=page.locator('.node-board input[type=checkbox]');
  await expect(checks).toHaveCount(2); await checks.nth(0).check();
  await expect(page.locator('.group-status-strip .progress-track')).toHaveAttribute('aria-valuenow','50');
  await checks.nth(1).check(); await expect(page.locator('.group-status-strip .progress-track')).toHaveAttribute('aria-valuenow','100');
  await expect(page.getByRole('tab',{name:/^Completed/})).toContainText('1');
  expect(ownJob(await readStoredWorkspace(page)).consolidation.components).toEqual(ownJob(before).consolidation.components);
  await page.reload(); await openRecord(page,'Example Consolidation 2026');
  await expect(mode(page)).toHaveValue('simple'); await expect(page.locator('.group-status-strip .progress-track')).toHaveAttribute('aria-valuenow','100');
  await mode(page).selectOption('full'); await page.getByRole('button',{name:/Show historical components/}).click();
  await expect(page.locator('[data-component-id]')).toHaveCount(4);
  await expect(page.getByRole('tab',{name:/^Completed/})).toContainText('0');
});
test('company overview badge shows actual annual items with working source navigation',async({page})=>{
  await start(page); await openRecord(page,'Alpha Example International');
  await page.locator('.tree-entity-row').filter({hasText:'Alpha Example International'}).click(); await collapse(page);
  await expect(shell(page).locator('.outstanding-rail-toggle strong')).toHaveText('2');
  await shell(page).getByRole('button',{name:'Expand outstanding centre',exact:true}).click(); await expect(rows(page)).toHaveCount(2);
  const before=await readStoredWorkspace(page); const item=rows(page).filter({hasText:'Current-year statement pending'});
  await item.locator('.outstanding-item-toggle').click(); await item.getByRole('button',{name:'View source item',exact:true}).click();
  await expect(page.locator('.detail-title > p')).toContainText('2026'); await expect(rows(page)).toHaveCount(1);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('simple group badge counts its own items and full mode adds the available component items',async({page})=>{
  await start(page); await simpleMode(page); await collapse(page);
  await expect(shell(page).locator('.outstanding-rail-toggle strong')).toHaveText('1');
  await shell(page).getByRole('button',{name:'Expand outstanding centre',exact:true}).click();
  await expect(rows(page)).toHaveCount(1); await expect(rows(page)).toContainText('Group figures pending');
  await mode(page).selectOption('full'); await expect(rows(page)).toHaveCount(2);
});
test('revealed archived history remains read-only and does not count as a ready component',async({page})=>{
  await start(page); const before=await readStoredWorkspace(page);
  await page.getByRole('button',{name:/Show historical components/}).click();
  const archived=page.locator('[data-component-id=part-cedar]');
  await expect(archived.getByRole('combobox')).toBeDisabled(); await expect(archived.getByRole('checkbox')).toBeDisabled();
  await archived.getByRole('button').click(); await expect(page.locator('.archive-banner')).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test('editing annual metadata keeps simple mode and the compact quick draft survives tab switches',async({page})=>{
  await start(page); await simpleMode(page);
  const quick=page.getByRole('region',{name:'Quick update',exact:true});
  await quick.getByRole('button',{name:'Quick edit'}).click(); await quick.getByLabel('Owner',{exact:true}).fill('Draft Group Reviewer');
  await page.getByRole('tab',{name:'Holding company details',exact:true}).click();
  await page.getByRole('tab',{name:'Consolidation stages',exact:true}).click();
  await expect(quick.getByLabel('Owner',{exact:true})).toHaveValue('Draft Group Reviewer');
  await quick.getByRole('button',{name:'Save updates',exact:true}).click();
  await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click();
  const dialog=page.getByRole('dialog'); await dialog.getByLabel('Owner',{exact:true}).fill('Final Group Reviewer');
  await dialog.getByRole('button',{name:'Save engagement',exact:true}).click();
  await expect(mode(page)).toHaveValue('simple'); expect(ownJob(await readStoredWorkspace(page)).owner).toBe('Final Group Reviewer');
});
for(const language of ['en','zh-Hans','zh-Hant']) test(`simple workflow, compact editing and real outstanding content at narrow widths in ${language}`,async({page},info)=>{
  await start(page); await simpleMode(page); await page.locator('.language-summary').click();
  await page.locator('.language-menu > button').nth({'zh-Hans':0,'zh-Hant':1,en:2}[language]).click();
  await page.setViewportSize({width:800,height:640});
  await expect(page.locator('[data-consolidation-mode=simple]')).toBeVisible();
  const details=page.locator('.workspace-detail-inner[data-consolidation-mode]');
  expect(await details.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  await expect(page.locator('.holding-components-panel')).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`simple-${language}.png`)});
  const open=shell(page).locator('.outstanding-rail-toggle'); if(await open.count()) await open.click();
  await expect(rows(page)).toHaveCount(1);
  expect(await shell(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
});
test('simple mode and retained historical scope survive an actual backup restore in a clean context',async({page,browser})=>{
  const fs=await import('node:fs/promises'); await start(page); await simpleMode(page);
  const expected=await readStoredWorkspace(page);
  await page.locator('summary[aria-label^="Backup"]').click(); const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup',exact:true}).click();
  const payload=await fs.readFile(await(await download).path(),'utf8'); expect(JSON.parse(payload)).toEqual(expected);
  const context=await browser.newContext({locale:'en-HK',timezoneId:'Asia/Hong_Kong'});
  try {
    const fresh=await context.newPage();
    await fresh.addInitScript(()=>localStorage.setItem('audit-progress-workbench:language','en'));
    await fresh.goto(page.url());
    await fresh.locator('summary[aria-label^="Backup"]').click(); const chooser=fresh.waitForEvent('filechooser');
    await fresh.getByRole('button',{name:'Restore backup',exact:true}).click(); fresh.once('dialog',d=>d.accept());
    await(await chooser).setFiles({name:'fictional-simple.json',mimeType:'application/json',buffer:Buffer.from(payload)});
    await expect.poll(()=>readStoredWorkspace(fresh)).toEqual(expected); await fresh.reload();
    await openRecord(fresh,'Example Consolidation 2026'); await expect(mode(fresh)).toHaveValue('simple');
    await expect(fresh.locator('.holding-components-panel')).toHaveCount(0);
    expect(await readStoredWorkspace(fresh)).toEqual(expected);
  } finally { await context.close(); }
});
test('simple mode explicitly initializes an old holding annual with no consolidation config without crashing',async({page})=>{
  const input=groupUsabilityFixture(); input.engagements[0].consolidation=null;
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await openWorkbench(page,input); await openRecord(page,'Example Consolidation 2026');
  const before=await readStoredWorkspace(page);
  page.once('dialog',d=>d.accept()); await page.getByRole('combobox',{name:'Consolidation mode',exact:true}).selectOption('simple');
  await expect(page.locator('[data-consolidation-mode]')).toHaveAttribute('data-consolidation-mode','simple');
  await expect(page.locator('.node-board .inline-empty')).toBeVisible();
  const after=await readStoredWorkspace(page); expect(after.engagements[0].consolidation.mode).toBe('simple');
  expect(after.engagements[0].consolidation.nodes).toEqual([]); expect(after.engagements[0].consolidation.components).toEqual([]);
  expect(after.entities).toEqual(before.entities); expect(after.engagements.slice(1)).toEqual(before.engagements.slice(1));
  await page.reload(); await openRecord(page,'Example Consolidation 2026');
  await expect(page.getByRole('combobox',{name:'Consolidation mode',exact:true})).toHaveValue('simple'); expect(errors).toEqual([]);
});
test('annual editor can explicitly enable simple mode for a historical record with no consolidation settings',async({page})=>{
  const input=groupUsabilityFixture(); input.engagements[0].consolidation=null;
  await openWorkbench(page,input); await openRecord(page,'Example Consolidation 2026');
  const before=await readStoredWorkspace(page);
  await page.getByRole('button',{name:'Edit annual engagement',exact:true}).click();
  const dialog=page.getByRole('dialog'); await dialog.getByRole('combobox',{name:'Consolidation mode',exact:true}).selectOption('simple');
  await dialog.getByRole('button',{name:'Save engagement',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Consolidation mode',exact:true})).toHaveValue('simple');
  const after=await readStoredWorkspace(page);
  expect(after.engagements[0].consolidation).toMatchObject({mode:'simple',enabled:true,nodes:[],components:[]});
  expect(after.entities).toEqual(before.entities); expect(after.engagements.slice(1)).toEqual(before.engagements.slice(1));
});
