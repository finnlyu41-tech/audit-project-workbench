import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalStorePayload, normalizeStore, groupProgress, isValidStore, makeEngagement,
  reconcileWorkbenchStore, navigationStatusCounts } from '../src/dashboard/model.js';
import { withConsolidationMode, consolidationIsSimple } from '../src/dashboard/consolidation-mode.js';
import { outstandingEntriesForScope } from '../src/dashboard/outstanding-scope.js';
import { holdingComponentRows } from '../src/dashboard/holding-components-model.js';
import { buildRecordReport } from '../src/dashboard/reporting.js';
import { groupUsabilityFixture } from './fixtures/group-usability.js';
const groupId='holding-annual';
const group=s=>s.engagements.find(e=>e.id===groupId);
const setMode=(s,mode)=>normalizeStore({...s,engagements:s.engagements.map(e=>e.id===groupId
  ? {...e,consolidation:withConsolidationMode(e.consolidation,mode)}:e)});
test('existing V11 keeps full semantics and does not acquire a new default field on load',()=>{
  const original=groupUsabilityFixture(); const s=normalizeStore(original);
  assert.equal(consolidationIsSimple(group(s)),false); assert.equal(groupProgress(s,groupId).ready,false);
  assert.deepEqual(canonicalStorePayload(s),original);
});
test('simple completion depends only on explicit local conditions; mode changes never mark any',()=>{
  const before=groupUsabilityFixture(); const s=setMode(before,'simple');
  assert.equal(groupProgress(s,groupId).ready,false); assert.equal(groupProgress(s,groupId).percentage,0);
  group(s).consolidation.nodes[0].conditions[0].done=true;
  assert.equal(groupProgress(s,groupId).percentage,50); assert.equal(groupProgress(s,groupId).ready,false);
  group(s).consolidation.nodes[0].conditions[1].done=true;
  assert.equal(groupProgress(s,groupId).percentage,100); assert.equal(groupProgress(s,groupId).ready,true);
  assert.deepEqual(group(s).consolidation.components,group(before).consolidation.components);
  assert.deepEqual(s.entities,before.entities); assert.deepEqual(s.engagements.slice(1),before.engagements.slice(1));
});
test('returning to full restores component requirements without replacing their snapshots',()=>{
  const before=groupUsabilityFixture(); let s=setMode(before,'simple');
  group(s).consolidation.nodes[0].conditions.forEach(c=>{c.done=true;});
  assert.equal(groupProgress(s,groupId).ready,true); s=setMode(s,'full');
  assert.equal(groupProgress(s,groupId).ready,false);
  assert.deepEqual(group(s).consolidation.components,group(before).consolidation.components);
  assert.equal(group(s).consolidation.nodes[0].conditions.every(c=>c.done),true);
});
test('simple mode round trips through the actual schema and serialized canonical backup',()=>{
  const s=setMode(groupUsabilityFixture(),'simple'); const payload=canonicalStorePayload(s);
  assert.equal(isValidStore(payload),true); assert.deepEqual(canonicalStorePayload(normalizeStore(JSON.parse(JSON.stringify(payload)))),payload);
  assert.equal(group(payload).consolidation.mode,'simple');
});
test('empty or archived simple projects are never automatically complete',()=>{
  const s=setMode(groupUsabilityFixture(),'simple'); group(s).consolidation.nodes=[];
  assert.equal(groupProgress(s,groupId).ready,false);
  group(s).archived=true; assert.equal(groupProgress(s,groupId).ready,false);
});
test('invalid consolidation modes are not silently interpreted',()=>{
  for(const mode of ['other',3,true,null]) {
    const s=groupUsabilityFixture(); group(s).consolidation.mode=mode; assert.equal(isValidStore(s),false);
  }
  assert.throws(()=>withConsolidationMode(group(groupUsabilityFixture()).consolidation,'other'));
});
test('archived and missing historical rows are distinguishable without mutating the annual scope',()=>{
  const s=groupUsabilityFixture(); const before=structuredClone(s); const rows=holdingComponentRows(s,group(s));
  assert.deepEqual(rows.filter(r=>r.historical).map(r=>r.component.id),['part-cedar','part-missing']);
  assert.deepEqual(rows.filter(r=>!r.historical).map(r=>r.component.id),['part-alpha','part-beta']); assert.deepEqual(s,before);
});
test('project, company, group and global scopes count only their real accessible items',()=>{
  const s=normalizeStore(groupUsabilityFixture()); const entries=(kind,id)=>outstandingEntriesForScope(s,kind,{id});
  assert.equal(entries('project','alpha-current').length,1); assert.equal(entries('entity','holding-alpha').length,2);
  assert.equal(entries('group',groupId).length,2); assert.equal(entries('workspace','workspace').length,3);
  assert.equal(entries('workspace','workspace').some(e=>e.item.title==='Archived request retained'),false);
  assert.equal(outstandingEntriesForScope(s,'project',{id:'cedar-annual'},true).length,1);
});
test('simple group list excludes descendant work but global access preserves it',()=>{
  const s=setMode(groupUsabilityFixture(),'simple');
  assert.equal(outstandingEntriesForScope(s,'group',{id:groupId}).length,1);
  assert.equal(outstandingEntriesForScope(s,'workspace',{id:'workspace'}).length,3);
});
test('quick changes and legacy-view workflow updates do not reset the annual mode',()=>{
  let s=setMode(groupUsabilityFixture(),'simple');
  for(let i=0;i<8;i++) {
    const candidate={...s,groups:s.groups.map(g=>g.id===groupId?{...g,owner:`Reviewer ${i}`} :g)};
    s=reconcileWorkbenchStore(s,candidate); assert.equal(consolidationIsSimple(group(s)),true);
  }
});
test('copying a simple annual workflow retains the mode but resets completed conditions',()=>{
  const s=setMode(groupUsabilityFixture(),'simple'); const source=group(s); source.consolidation.nodes[0].conditions.forEach(c=>{c.done=true;});
  const e=makeEngagement({entityId:source.entityId,periodStart:'2027-01-01',periodEnd:'2027-12-31'},
    {entity:s.entities[0],store:s,sourceMode:'previous',sourceEngagement:source,workstreamCategories:s.workstreamCategories});
  assert.equal(consolidationIsSimple(e),true); assert.equal(e.consolidation.nodes[0].conditions.some(c=>c.done),false);
});
test('record reports and navigation share the simple completion rule',()=>{
  const s=setMode(groupUsabilityFixture(),'simple'); group(s).consolidation.nodes[0].conditions.forEach(c=>{c.done=true;});
  const report=buildRecordReport(s,'group',groupId); assert.equal(report.complete,true); assert.equal(report.consolidationMode,'simple');
  assert.deepEqual(report.members,[]); assert.equal(navigationStatusCounts(s).completed,1);
});
test('a simple child contributes one ready unit to a full parent, not a contradictory zero-of-one',async()=>{
  const {makeEntity}=await import('../src/dashboard/model.js');
  let s=setMode(groupUsabilityFixture(),'simple'); const child=group(s);
  child.consolidation.nodes[0].conditions.forEach(c=>{c.done=true;});
  const parent=makeEntity({id:'outer-parent',legalName:'Fictional Outer Holdings',kind:'holding_company'});
  const job=makeEngagement({id:'outer-annual',entityId:parent.id,periodStart:'2026-01-01',periodEnd:'2026-12-31',consolidationEnabled:false},
    {entity:parent,store:s,sourceMode:'blank',workstreamCategories:s.workstreamCategories});
  job.consolidation.components=[{id:'simple-child',entityId:child.entityId,engagementId:child.id,readinessConditions:[]}];
  s=normalizeStore({...canonicalStorePayload(s),entities:[...s.entities,parent],engagements:[...s.engagements,job]});
  const stats=groupProgress(s,job.id); assert.equal(stats.ready,true);
  assert.equal(stats.readyCompanies,1); assert.equal(stats.totalCompanies,1);
});
test('reports never label mismatched or archived components ready just because boxes are ticked',()=>{
  const s=normalizeStore(groupUsabilityFixture());
  group(s).consolidation.components.forEach(p=>p.readinessConditions.forEach(c=>{c.done=true;}));
  const report=buildRecordReport(s,'group',groupId);
  assert.equal(report.members.find(m=>m.id==='alpha-old').ready,false);
  assert.equal(report.members.find(m=>m.id==='cedar-annual').ready,false);
});
test('an old valid holding record without consolidation config can explicitly start simple mode',()=>{
  const original=groupUsabilityFixture(); group(original).consolidation=null;
  assert.equal(isValidStore(original),true);
  const s=setMode(original,'simple');
  assert.equal(consolidationIsSimple(group(s)),true);
  assert.deepEqual(group(s).consolidation.nodes,[]); assert.deepEqual(group(s).consolidation.components,[]);
  assert.equal(groupProgress(s,groupId).ready,false);
  assert.deepEqual(s.entities,original.entities); assert.deepEqual(s.engagements.slice(1),original.engagements.slice(1));
  assert.equal(isValidStore(canonicalStorePayload(s)),true);
});
