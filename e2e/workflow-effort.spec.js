import { addOutstandingItem, openOutstandingPane } from './panel-helpers.js';
import { test, expect } from '@playwright/test';
import { annualSourceFixture } from '../tests/fixtures/annual-source.js';
import { openWorkbench, readStoredWorkspace } from './helpers.js';

test('same three-item task compares six vs four observed button actions and three vs one dialogs', async ({ browser, baseURL }, info) => {
  const fixture=annualSourceFixture(); const results=[];
  for(const continuous of [false,true]) {
    const context=await browser.newContext({baseURL,viewport:{width:1440,height:900},locale:'en-HK',timezoneId:'Asia/Hong_Kong'}); const page=await context.newPage();
    try {
      await openWorkbench(page,fixture.store); await openOutstandingPane(page); const before=await readStoredWorkspace(page);
      await page.evaluate(()=>{
        window.effort={buttonActions:0,dialogVisits:0}; const seen=new WeakSet();
        document.addEventListener('click',e=>{if(e.target.closest('button'))window.effort.buttonActions++;});
        new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
          if(!(node instanceof Element))return;
          const candidates=[...(node.matches('[role=dialog]')?[node]:[]),...node.querySelectorAll('[role=dialog]')];
          candidates.forEach(el=>{if(!seen.has(el)){seen.add(el);window.effort.dialogVisits++;}});
        }))).observe(document.body,{childList:true,subtree:true});
      });
      for(let index=0;index<3;index++) {
        if(!continuous||index===0)await addOutstandingItem(page);
        const form=page.getByRole('dialog'); await form.getByLabel('Outstanding item *').fill(`Fictional request ${index+1}`);
        await form.getByRole('button',{name:continuous&&index<2?'Save and add another':'Save outstanding item',exact:true}).click();
        if(!continuous||index===2)await expect(form).toHaveCount(0); else await expect(form.getByLabel('Outstanding item *')).toHaveValue('');
      }
      const observed=await page.evaluate(()=>window.effort); expect(observed).toEqual({buttonActions:continuous?4:6,dialogVisits:continuous?1:3});
      const after=await readStoredWorkspace(page); const old=before.engagements.find(e=>e.id===fixture.currentId); const current=after.engagements.find(e=>e.id===fixture.currentId);
      expect(current.outstandingItems.length).toBe(old.outstandingItems.length+3); expect(current.workstreams).toEqual(old.workstreams);
      results.push({continuous,...observed,titleEntries:3,humanTimeSeconds:null});
    } finally {await context.close();}
  }
  await info.attach('observed-operation-comparison',{body:JSON.stringify({startingPoint:'Target project and outstanding centre already open',results,excludes:'Navigation to project, reading, typing duration and human decision time'},null,2),contentType:'application/json'});
});
