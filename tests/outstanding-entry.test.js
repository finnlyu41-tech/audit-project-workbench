import test from 'node:test';
import assert from 'node:assert/strict';
import { annualSourceFixture } from './fixtures/annual-source.js';
import { holdingWorkspace } from './fixtures/holding-workspace.js';
import { newOutstandingValues, outstandingTargetSnapshot, prepareOutstandingSave } from '../src/dashboard/outstanding-entry-model.js';
function setup() {
  const { store, currentId } = annualSourceFixture();
  return { store, id: currentId, baseline: outstandingTargetSnapshot(store, 'project', currentId),
    values: { ...newOutstandingValues(store.outstandingStatuses), title: 'Fictional confirmation' } };
}
test('new outstanding entries reset private fields and closed state while retaining an explicit module', () => {
  const values = newOutstandingValues([{ id: 'done', closed: true }, { id: 'open', closed: false }], 'audit-module');
  assert.deepEqual(values, { title: '', note: '', status: 'open', workstreamId: 'audit-module' });
});
test('preparing an entry trims input, creates one identity and does not mutate source records', () => {
  const { store, baseline, values } = setup(); const before = structuredClone(store);
  const { item } = prepareOutstandingSave(store, baseline, { ...values, title: '  Follow up  ', note: ' Note ' });
  assert.ok(item.id); assert.equal(item.title, 'Follow up'); assert.equal(item.note, 'Note');
  assert.equal(item.workstreamId, null); assert.deepEqual(store, before);
});
for (const kind of ['missing', 'archived', 'entity-archived', 'different-company', 'different-period']) {
  test(`entry rejects ${kind} sources without saving or redirecting`, () => {
    const { store, id, baseline, values } = setup(); const current = structuredClone(store);
    const job = current.engagements.find((e) => e.id === id); const entity = current.entities.find((e) => e.id === job.entityId);
    if (kind === 'missing') current.engagements = current.engagements.filter((e) => e.id !== id);
    if (kind === 'archived') job.archived = true; if (kind === 'entity-archived') entity.archived = true;
    if (kind === 'different-company') job.entityId = 'not-the-selected-company';
    if (kind === 'different-period') job.reportingPeriods[0].periodEnd = '2030-12-31';
    assert.ok(prepareOutstandingSave(current, baseline, values).error);
  });
}
test('entry rejects blank titles, missing modules and missing statuses', () => {
  const { store, baseline, values } = setup();
  assert.equal(prepareOutstandingSave(store, baseline, { ...values, title: '  ' }).error, 'title');
  assert.equal(prepareOutstandingSave(store, baseline, { ...values, workstreamId: 'missing' }).error, 'module');
  assert.equal(prepareOutstandingSave(store, baseline, { ...values, status: 'missing' }).error, 'status');
});
test('group entries cannot be attached to company workstreams or a different source kind', () => {
  const store = holdingWorkspace(); const baseline = outstandingTargetSnapshot(store, 'group', 'holding-annual');
  const values = { ...newOutstandingValues(store.outstandingStatuses), title: 'Group query' };
  assert.ok(prepareOutstandingSave(store, baseline, values).item);
  assert.equal(prepareOutstandingSave(store, baseline, { ...values, workstreamId: 'audit' }).error, 'module');
  assert.equal(prepareOutstandingSave(store, { ...baseline, kind: 'project' }, values).error, 'source');
});
test('edits preserve changes to other fields but reject conflicting edits and deleted items', () => {
  const { store, id, baseline, values } = setup();
  const initial = { ...prepareOutstandingSave(store, baseline, values).item, note: 'Original note' };
  const job = store.engagements.find((e) => e.id === id);
  job.outstandingItems.push({ ...initial, note: 'New note from another editor' });
  const edited = prepareOutstandingSave(store, baseline, { ...initial, title: 'Changed title' }, initial);
  assert.equal(edited.item.note, 'New note from another editor'); assert.equal(edited.item.title, 'Changed title');
  assert.equal(prepareOutstandingSave(store, baseline, { ...initial, note: 'Conflicting note' }, initial).error, 'conflict');
  job.outstandingItems = job.outstandingItems.filter((e) => e.id !== initial.id);
  assert.equal(prepareOutstandingSave(store, baseline, initial, initial).error, 'missing');
});
