import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStore, reconcileWorkbenchStore, canonicalStorePayload, moveWorkspaceItem } from '../src/dashboard/model.js';
import { operationBoundaryFixture } from './fixtures/operation-boundaries.js';
const fixture = () => normalizeStore(operationBoundaryFixture());
const edit = (s, list, id, update) => reconcileWorkbenchStore(s, { ...s, [list]: s[list].map(row => row.id === id ? update(row) : row) });
const job = (s, id = 'holding-annual') => s.engagements.find(e => e.id === id);
for (const [name, list, id, update] of [
  ['ordinary condition', 'projects', 'alpha-old', p => ({ ...p, workstreams: p.workstreams.map(w => ({ ...w,
    nodes: w.nodes.map(n => ({ ...n, conditions: n.conditions.map(c => ({ ...c, done: true })) })) })) })],
  ['ordinary item status', 'projects', 'alpha-old', p => ({ ...p, outstandingItems: p.outstandingItems.map(i => ({ ...i, status: 'resolved' })) })],
  ['group item deletion', 'groups', 'holding-annual', p => ({ ...p, outstandingItems: [] })],
  ['group node edit', 'groups', 'holding-annual', p => ({ ...p, nodes: p.nodes.map(n => ({ ...n, title: 'Reviewed stage' })) })],
]) test(`${name} preserves all annual components and current company relationships`, () => {
  const before = fixture(); const original = JSON.stringify(before); const after = edit(before, list, id, update);
  assert.deepEqual(job(after).consolidation.components, job(before).consolidation.components);
  assert.deepEqual(after.entities, before.entities);
  assert.deepEqual(after.engagements.filter(e => e.id !== id), before.engagements.filter(e => e.id !== id));
  assert.equal(JSON.stringify(before), original);
});
test('runtime view copies without actual changes do not rewrite any canonical data', () => {
  const before = fixture(); const after = reconcileWorkbenchStore(before, { ...before, projects: structuredClone(before.projects), groups: structuredClone(before.groups) });
  assert.deepEqual(canonicalStorePayload(after), canonicalStorePayload(before));
});
test('a tax edit through one annual view cannot be undone by another unchanged view', () => {
  const before = fixture(); const after = edit(before, 'projects', 'alpha-old', p => ({ ...p,
    taxDeadlines: p.taxDeadlines.map(d => ({ ...d, note: 'Only changed tax note' })) }));
  assert.equal(after.entities.find(e => e.id === 'holding-alpha').taxDeadlines[0].note, 'Only changed tax note');
  assert.deepEqual(after.engagements, before.engagements);
  assert.deepEqual(after.entities.filter(e => e.id !== 'holding-alpha'), before.entities.filter(e => e.id !== 'holding-alpha'));
});
test('readiness edit preserves frozen labels, unassigned slots and current master relationship', () => {
  const before = fixture(); const after = edit(before, 'groups', 'holding-annual', g => ({ ...g,
    members: g.members.map(m => m.id === 'part-alpha' ? { ...m, readinessConditions: m.readinessConditions.map(c => ({ ...c, done: true })) } : m) }));
  assert.equal(job(after).consolidation.components.length, 4);
  const expected = structuredClone(job(before).consolidation.components); expected[0].readinessConditions[0].done = true;
  assert.deepEqual(job(after).consolidation.components, expected); assert.deepEqual(after.entities, before.entities);
});
test('explicit legacy removal drops only the selected linked member, not hidden placeholders', () => {
  const before = fixture(); const after = edit(before, 'groups', 'holding-annual', g => ({ ...g, members: g.members.filter(m => m.id !== 'part-cedar') }));
  assert.deepEqual(job(after).consolidation.components, job(before).consolidation.components.filter(c => c.id !== 'part-cedar'));
  assert.equal(after.entities.find(e => e.id === 'holding-alpha').parentEntityId, 'new-current-parent');
});
test('legacy explicit detach changes only its current matching relationship and saved target scope', () => {
  const before = fixture(); const after = reconcileWorkbenchStore(before, moveWorkspaceItem(before, 'project', 'alpha-old', ''));
  assert.equal(after.entities.find(e => e.id === 'holding-alpha').parentEntityId, 'new-current-parent');
  assert.deepEqual(job(after).consolidation.components, job(before).consolidation.components.filter(c => c.id !== 'part-alpha'));
});
test('legacy edits preserve internal group titles omitted from the runtime view', () => {
  let before = fixture(); const group = job(before); group.internalName = 'Annual internal label';
  before = reconcileWorkbenchStore(before, { ...before, engagements: [...before.engagements] });
  const after = edit(before, 'groups', group.id, g => ({ ...g, owner: 'Changed only owner' }));
  assert.equal(job(after).internalName, 'Annual internal label');
  assert.deepEqual(job(after).consolidation, job(before).consolidation);
  assert.deepEqual(after.entities, before.entities);
});
test('view-local row changes preserve unrelated snapshots across repeated save and reload cycles', () => {
  let store = fixture(); const original = canonicalStorePayload(store);
  for (let n = 0; n < 25; n++) {
    store = edit(store, n % 2 ? 'groups' : 'projects', n % 2 ? 'holding-annual' : 'alpha-old', p => ({ ...p,
      outstandingItems: p.outstandingItems.map(i => ({ ...i, status: n % 3 ? 'resolved' : 'missing_document' })) }));
    store = normalizeStore(JSON.parse(JSON.stringify(canonicalStorePayload(store))));
    assert.deepEqual(store.entities, original.entities);
    assert.deepEqual(job(store).consolidation, job(original).consolidation);
    assert.deepEqual(job(store, 'alpha-old').workstreams, job(original, 'alpha-old').workstreams);
  }
});
test('runtime member ordering affects only linked member order and preserves hidden slots', () => {
  const before = fixture(); const after = edit(before, 'groups', 'holding-annual', g => ({ ...g, members: [...g.members].reverse() }));
  const components = job(after).consolidation.components;
  assert.deepEqual(components.map(c => c.id), ['part-cedar', 'part-beta', 'part-alpha', 'part-missing']);
  assert.deepEqual([...components].sort((a,b) => a.id.localeCompare(b.id)), [...job(before).consolidation.components].sort((a,b) => a.id.localeCompare(b.id)));
  assert.deepEqual(after.entities, before.entities);
});
test('a newly created legacy project and its explicitly assigned member survive the same transaction', () => {
  const before = fixture(); const fresh = { ...before.projects[0], id: 'new-runtime-project', entityId: undefined,
    entity: 'Fictional Added Company', name: 'Fictional Added Company', outstandingItems: [], taxDeadlines: [] };
  const after = reconcileWorkbenchStore(before, { ...before, projects: [...before.projects, fresh],
    groups: before.groups.map(g => ({ ...g, members: [...g.members, { id: 'new-runtime-member', kind: 'project',
      refId: fresh.id, role: 'Subsidiary', auditType: 'internal_team', readinessConditions: [] }] })) });
  const component = job(after).consolidation.components.find(c => c.id === 'new-runtime-member');
  assert.equal(component?.engagementId, fresh.id); assert.equal(job(after).consolidation.components.length, 5);
});
