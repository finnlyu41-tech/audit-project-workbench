import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalStorePayload, normalizeStore, isValidStore, homeOverviewData, makeEngagement,
  reconcileWorkbenchStore, convertProjectToGroup, convertGroupToProject, groupProgress } from '../src/dashboard/model.js';
import { projectPriority, priorityFields, withProjectPriority, prepareProjectPriority,
  compareProjectPriority, prioritizedActiveRecords } from '../src/dashboard/project-priority.js';
import { projectPriorityFixture } from './fixtures/project-priority.js';
import { priorityItemsFor, prepareQuickUpdate, quickUpdateValues } from '../src/dashboard/ux-model.js';
const fixture = () => normalizeStore(projectPriorityFixture());
const job = (store, id='priority-normal') => store.engagements.find(record => record.id===id);

test('missing priority is normal without rewriting existing V11 records', () => {
  const original=projectPriorityFixture(); assert.equal(projectPriority(job(original)),'normal');
  assert.equal(Object.hasOwn(job(original),'priority'),false);
  assert.deepEqual(canonicalStorePayload(normalizeStore(original)),original);
});
test('all supported levels survive normalization and a complete backup round trip', () => {
  const s=fixture(); for(const priority of ['urgent','high','normal','low']) {
    const next={...s,engagements:s.engagements.map(e=>e.id==='priority-normal'?withProjectPriority(e,priority):e)};
    const payload=canonicalStorePayload(next); assert.equal(isValidStore(payload),true);
    assert.deepEqual(canonicalStorePayload(normalizeStore(JSON.parse(JSON.stringify(payload)))),payload);
    assert.equal(projectPriority(job(payload)),priority);
  }
});
test('invalid priority enums cannot silently enter recovered workspaces', () => {
  for(const priority of [null,0,1,true,'medium','Urgent','',{},[]]) {
    const s=fixture(); job(s).priority=priority; assert.equal(isValidStore(canonicalWithoutNormalizing(s)),false);
    assert.throws(()=>withProjectPriority(job(s),priority));
  }
});
function canonicalWithoutNormalizing({projects,groups,...rest}) { return rest; }
test('priority updates change only the intended field, never dates, relationships or conditions', () => {
  const s=fixture(), before=structuredClone(s), record=job(s);
  assert.deepEqual(prepareProjectPriority(s,record.id,'urgent','normal'),{priority:'urgent',changed:true});
  const changed=withProjectPriority(record,'urgent'); const {priority,...unchanged}=changed;
  assert.deepEqual(unchanged,record); assert.deepEqual(s,before);
  assert.deepEqual(withProjectPriority(changed,'normal'),record);
});
test('archived, deleted and stale priority changes are rejected', () => {
  const s=fixture(); assert.equal(prepareProjectPriority(s,'missing','high').error,'readonly');
  assert.equal(prepareProjectPriority(s,'priority-high','low','normal').error,'conflict');
  assert.equal(prepareProjectPriority(s,'priority-normal','invalid').error,'invalid');
  job(s).archived=true; assert.equal(prepareProjectPriority(s,job(s).id,'high').error,'readonly');
  job(s).archived=false; s.entities[0].archived=true;
  assert.equal(prepareProjectPriority(s,job(s).id,'high').error,'readonly');
});
test('priority order is stable, uses due dates second and excludes completed and archived work', () => {
  const s=fixture(), data=homeOverviewData(s,new Date('2026-09-07T12:00:00Z'));
  const before=structuredClone(data.activeRecords);
  assert.deepEqual(prioritizedActiveRecords(data.activeRecords).map(r=>r.id),
    ['priority-urgent','priority-high','priority-group','priority-normal','priority-low']);
  assert.deepEqual(data.activeRecords,before);
  assert.equal(prioritizedActiveRecords(data.activeRecords,'Other owner').length,0);
  const records=structuredClone(data.records); records[3].complete=true; records[2].entity.archived=true;
  assert.deepEqual(prioritizedActiveRecords(records).map(r=>r.id),['priority-group','priority-normal','priority-low']);
});
test('priority comparison is numeric and missing values tie with normal', () => {
  assert.equal(compareProjectPriority({}, {priority:'normal'}),0);
  assert.ok(compareProjectPriority({priority:'urgent'},{priority:'high'})<0);
  assert.deepEqual(priorityFields({priority:'normal'}),{});
});
test('urgent/high work gets an actionable home entry without manufacturing a deadline', () => {
  const s=fixture(), data=homeOverviewData(s,new Date('2026-09-07T12:00:00Z'));
  const manual=priorityItemsFor(data,'manual'); assert.equal(manual.length,3);
  assert.equal(manual[0].record.id,'priority-urgent'); assert.equal(data.alerts.length,0);
  job(s).dueDate='2026-09-06'; const overdue=homeOverviewData(s,new Date('2026-09-07T12:00:00Z'));
  assert.equal(overdue.priorityItems[0].urgency,'overdue');
  job(s,'priority-urgent').archived=true;
  assert.equal(priorityItemsFor(homeOverviewData(s),'manual').some(e=>e.record.id==='priority-urgent'),false);
});
test('new annual engagements default to normal rather than inheriting last year urgency', () => {
  const s=fixture(), source=job(s,'priority-urgent'), entity=s.entities.find(e=>e.id===source.entityId);
  const options={entity,store:s,sourceMode:'previous',sourceEngagement:source,workstreamCategories:s.workstreamCategories};
  const values={entityId:entity.id,periodStart:'2028-01-01',periodEnd:'2028-12-31'};
  assert.equal(projectPriority(makeEngagement(values,options)),'normal');
  assert.equal(projectPriority(makeEngagement({...values,priority:'high'},options)),'high');
});
test('legacy view edits and company/holding conversions retain priority without altering siblings', () => {
  let s=fixture(), before=canonicalStorePayload(s);
  s=reconcileWorkbenchStore(s,{...s,projects:s.projects.map(p=>p.id==='priority-urgent'?{...p,owner:'Edited owner'}:p)});
  assert.equal(projectPriority(job(s,'priority-urgent')),'urgent');
  assert.deepEqual(s.engagements.filter(e=>e.id!=='priority-urgent'),before.engagements.filter(e=>e.id!=='priority-urgent'));
  s=reconcileWorkbenchStore(s,convertProjectToGroup(s,'priority-urgent'));
  assert.equal(projectPriority(job(s,'priority-urgent')),'urgent');
  s=reconcileWorkbenchStore(s,convertGroupToProject(s,'priority-urgent'));
  assert.equal(projectPriority(job(s,'priority-urgent')),'urgent');
});
test('a quick-update draft cannot overwrite a separately changed priority', () => {
  const s=fixture(), baseline=quickUpdateValues(job(s)); job(s).priority='high';
  const result=prepareQuickUpdate(s,'priority-normal',baseline,{...baseline,notes:'New note'});
  assert.deepEqual(result.patch,{notes:'New note'}); assert.equal(job(s).priority,'high');
  assert.deepEqual(prepareProjectPriority(s,'priority-normal','high','high'),{priority:'high',changed:false});
});
test('simple consolidation retains its own progress and historical scope regardless of priority', () => {
  const s=fixture(), old=structuredClone(job(s,'priority-group'));
  const progress=groupProgress(s,'priority-group'); job(s,'priority-group').priority='urgent';
  assert.deepEqual(groupProgress(s,'priority-group'),progress);
  assert.deepEqual(job(s,'priority-group').consolidation,old.consolidation);
});
test('within one priority level undated work is last even at the largest supported year', () => {
  const records=homeOverviewData(fixture()).activeRecords.slice(0,3).map((record,i)=>({...record,
    engagement:{...record.engagement,priority:'high',dueDate:['','9999-12-31','2027-01-01'][i]}}));
  assert.deepEqual(prioritizedActiveRecords(records).map(r=>r.id),[records[2].id,records[1].id,records[0].id]);
});
test('finishing a manually urgent project removes only its manual attention entry', () => {
  const s=fixture(), urgent=job(s,'priority-urgent');
  urgent.workstreams.forEach(w=>w.nodes.forEach(n=>n.conditions.forEach(c=>{c.done=true;})));
  const data=homeOverviewData(s,new Date('2026-09-07T12:00:00Z'));
  assert.equal(data.priorityItems.some(i=>i.category==='manual_priority' && i.record.id===urgent.id),false);
  assert.equal(projectPriority(urgent),'urgent'); assert.equal(data.completedRecords.some(r=>r.id===urgent.id),true);
});
