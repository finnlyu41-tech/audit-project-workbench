import test from 'node:test';
import assert from 'node:assert/strict';
import { outstandingCenterFixture } from './fixtures/outstanding-center.js';
import { followUpSources, buildFollowUpDraft, followUpPreviewIsCurrent } from '../src/dashboard/follow-up-model.js';
const rootId = 'overview-group';
const sourceId = 'overview-combined';
const load = () => {
  const store = outstandingCenterFixture();
  return { store, sources: followUpSources(store, 'group', rootId) };
};
test('group candidates follow annual snapshots and keep same-ID items in separate sources', () => {
  const { sources } = load();
  assert.deepEqual(sources.map(s => s.id).sort(), [rootId, sourceId].sort());
  assert.ok(sources.every(s => s.items.some(i => i.id === 'shared-item')));
  assert.equal(followUpSources(outstandingCenterFixture(), 'project', sourceId).length, 1);
});
test('generated output is a whitelist, excludes notes and other companies, and preserves user titles', () => {
  const {store, sources} = load(); const before = structuredClone(store);
  const source = sources.find(s => s.id === sourceId); const draft = buildFollowUpDraft(source, ['next-item']);
  assert.ok(draft.text.includes('Follow up on the final confirmation'));
  for (const value of ['NONINDEXEDCONFIDENTIALNOTE', 'Morgan Parent', 'Parent approval confirmation', 'Previously resolved', '2024'])
    assert.ok(!draft.text.includes(value), value);
  assert.ok(draft.text.includes('2025')); assert.ok(draft.text.includes('2026'));
  assert.deepEqual(store, before);
});
test('private fields are absent even from the source projection', () => {
  const {sources} = load(); const json = JSON.stringify(sources);
  assert.ok(!json.includes('NONINDEXEDCONFIDENTIALNOTE')); assert.ok(!json.includes('Morgan Parent'));
  assert.ok(!json.includes('workstreams')); assert.ok(!json.includes('taxDeadlines'));
});
for (const [name, mutate] of [
  ['archived source', s => { s.engagements.find(e=>e.id===sourceId).archived=true; }],
  ['archived source company', s => { const id=s.engagements.find(e=>e.id===sourceId).entityId; s.entities.find(e=>e.id===id).archived=true; }],
  ['removed annual link', s => { s.engagements.find(e=>e.id===rootId).consolidation.components=[]; }],
  ['mismatched company link', s => { s.engagements.find(e=>e.id===rootId).consolidation.components[0].entityId='wrong'; }],
]) test(`${name} cannot be used through a group`, () => {
  const {store}=load(); mutate(store); assert.ok(!followUpSources(store,'group',rootId).some(s=>s.id===sourceId));
});
test('empty, missing, cleared or ambiguous selected IDs are rejected', () => {
  const {sources}=load(); const source=sources.find(s=>s.id===sourceId);
  for (const ids of [[], ['absent'], ['cleared-item']]) assert.ok(buildFollowUpDraft(source,ids).error);
  assert.ok(buildFollowUpDraft({...source,items:[...source.items,source.items[0]]},['shared-item']).error);
  assert.ok(buildFollowUpDraft(null,['next-item']).error);
});
test('source changes invalidate a preview, while private-note-only changes do not leak or rewrite text', () => {
  const {store,sources}=load(); const source=sources.find(s=>s.id===sourceId);
  const draft={...buildFollowUpDraft(source,['next-item']),sourceId};
  assert.ok(followUpPreviewIsCurrent(draft,sources));
  const job=store.engagements.find(e=>e.id===sourceId); job.notes='Never export this';
  assert.ok(followUpPreviewIsCurrent(draft,followUpSources(store,'group',rootId)));
  job.outstandingItems.find(i=>i.id==='next-item').title='New user wording';
  assert.equal(followUpPreviewIsCurrent(draft,followUpSources(store,'group',rootId)),false);
});
for (const language of ['en','zh-Hans','zh-Hant']) test(`${language} only translates system wording`, () => {
  const {sources}=load(); const source=sources.find(s=>s.id===sourceId);
  source.items=[{id:'raw',title:'银行资料 <script>not executable</script> & original text'}];
  const draft=buildFollowUpDraft(source,['raw'],language);
  assert.ok(draft.text.includes(source.items[0].title)); assert.ok(draft.text.includes(source.companyName));
  assert.ok(!draft.text.includes('NONINDEXEDCONFIDENTIALNOTE'));
});
