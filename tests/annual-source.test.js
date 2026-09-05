import test from 'node:test';
import assert from 'node:assert/strict';
import { annualSourceFixture } from './fixtures/annual-source.js';
import { annualSourcePreview, buildAnnualEngagement, resolveAnnualSource } from '../src/dashboard/annual-source-model.js';
const values = { periodStart: '2027-01-01', periodEnd: '2027-12-31', engagementTypes: ['Audit'], owner: '', startDate: '', dueDate: '', notes: '' };
const errorCode = (code) => (error) => error.code === code;
test('blank ignores a stale shortcut source and leaves existing records unchanged', () => {
  const { store, entityId, currentId } = annualSourceFixture(); const before = JSON.stringify(store);
  const { engagement } = buildAnnualEngagement(store, entityId, values, { sourceMode: 'blank', sourceEngagementId: currentId });
  assert.deepEqual(engagement.workstreams, []); assert.equal(engagement.consolidation, null);
  assert.equal(JSON.stringify(store), before);
});
test('copy resolves the selected archived year and resets operational conditions', () => {
  const { store, entityId, olderId } = annualSourceFixture(); const before = JSON.stringify(store);
  const { engagement } = buildAnnualEngagement(store, entityId, values, { sourceMode: 'previous', sourceEngagementId: olderId });
  assert.equal(engagement.workstreams[0].nodes[0].title, 'Archived source structure');
  assert.equal(engagement.workstreams[0].nodes[0].conditions[0].done, false);
  assert.equal(engagement.workstreams[0].owner, ''); assert.equal(engagement.workstreams[0].dueDate, '');
  assert.equal(engagement.notes, ''); assert.equal(engagement.owner, ''); assert.deepEqual(engagement.outstandingItems, []);
  assert.equal(JSON.stringify(store), before);
});
test('template mode never copies an irrelevant previous structure or changes global defaults', () => {
  const { store, entityId, currentId } = annualSourceFixture(); const before = JSON.stringify(store);
  const selections = [{ categoryId: 'audit', type: 'audit', sampleId: 'annual-source-template' }];
  const { engagement } = buildAnnualEngagement(store, entityId, { ...values, workstreamSelections: selections },
    { sourceMode: 'template', sourceEngagementId: currentId });
  assert.equal(engagement.workstreams[0].nodes[0].title, 'Template-only structure');
  assert.equal(JSON.stringify(store), before);
});
test('missing or foreign previous sources cannot fall back to the newest year', () => {
  const { store, entityId, olderId } = annualSourceFixture();
  assert.throws(() => resolveAnnualSource(store, entityId, { sourceMode: 'previous', sourceEngagementId: 'missing' }), errorCode('source_unavailable'));
  store.engagements.find((item) => item.id === olderId).entityId = 'another-company';
  assert.throws(() => resolveAnnualSource(store, entityId, { sourceMode: 'previous', sourceEngagementId: olderId }), errorCode('source_unavailable'));
});
test('current store contents override stale source objects', () => {
  const { store, entityId, olderId } = annualSourceFixture();
  const stale = structuredClone(store.engagements.find((item) => item.id === olderId));
  stale.workstreams[0].nodes[0].title = 'Obsolete structure';
  const resolved = resolveAnnualSource(store, entityId, { sourceMode: 'previous', sourceEngagement: stale });
  assert.equal(resolved.sourceEngagement.workstreams[0].nodes[0].title, 'Archived source structure');
});
test('archived or missing target companies cannot receive annual projects', () => {
  const { store, entityId } = annualSourceFixture();
  assert.throws(() => buildAnnualEngagement(store, 'missing', values, { sourceMode: 'blank' }), errorCode('company_unavailable'));
  store.entities.find((item) => item.id === entityId).archived = true;
  assert.throws(() => buildAnnualEngagement(store, entityId, values, { sourceMode: 'blank' }), errorCode('company_unavailable'));
});
test('invalid template IDs or categories fail instead of using a default template', () => {
  const { store, entityId } = annualSourceFixture();
  for (const selection of [{ categoryId: 'audit', sampleId: 'missing' }, { categoryId: 'missing', sampleId: '' }]) {
    assert.throws(() => resolveAnnualSource(store, entityId, { sourceMode: 'template' }, [selection]), errorCode('template_unavailable'));
  }
  assert.doesNotThrow(() => resolveAnnualSource(store, entityId, { sourceMode: 'blank' }, [{ categoryId: 'missing' }]));
});
test('holding blank and archived-copy paths produce only the chosen own workflow', () => {
  const { store, entityId, olderId } = annualSourceFixture(true); const before = JSON.stringify(store);
  const blank = buildAnnualEngagement(store, entityId, values, { sourceMode: 'blank', sourceEngagementId: olderId }).engagement;
  assert.deepEqual(blank.workstreams, []); assert.deepEqual(blank.consolidation.nodes, []);
  const copied = buildAnnualEngagement(store, entityId, values, { sourceMode: 'previous', sourceEngagementId: olderId }).engagement;
  assert.equal(copied.consolidation.nodes[0].title, 'Archived source structure');
  assert.equal(copied.consolidation.nodes[0].conditions[0].done, false);
  assert.equal(JSON.stringify(store), before);
});
test('source preview counts agree with the created workflow and never count completed work', () => {
  for (const holding of [false, true]) {
    const { store, entityId, olderId } = annualSourceFixture(holding);
    for (const sourceMode of ['previous', 'template', 'blank']) {
      const options = { sourceMode, sourceEngagementId: olderId };
      const selections = [{ categoryId: 'audit', type: 'audit', sampleId: 'annual-source-template' }];
      const preview = annualSourcePreview(store, entityId, options, selections);
      const record = buildAnnualEngagement(store, entityId, { ...values, workstreamSelections: selections }, options).engagement;
      const nodes = [...record.workstreams.flatMap((item) => item.nodes), ...(record.consolidation?.nodes || [])];
      assert.equal(preview.modules, record.workstreams.length); assert.equal(preview.nodes, nodes.length);
      assert.equal(preview.conditions, nodes.reduce((count, node) => count + node.conditions.length, 0));
    }
  }
});
test('existing archived report periods stay reserved and create no partial records', () => {
  const { store, entityId } = annualSourceFixture(); const before = JSON.stringify(store);
  assert.throws(() => buildAnnualEngagement(store, entityId, { ...values, periodStart: '2025-01-01', periodEnd: '2025-12-31' }, { sourceMode: 'blank' }), /already exists/);
  assert.equal(JSON.stringify(store), before);
});
test('an explicitly empty workflow or group library remains empty without inventing templates', () => {
  const { store, entityId } = annualSourceFixture(true);
  store.groupSamples = []; store.selectedGroupSampleId = null;
  const result = buildAnnualEngagement(store, entityId, { ...values, workstreamSelections: [] }, { sourceMode: 'template' });
  assert.deepEqual(result.engagement.workstreams, []); assert.deepEqual(result.engagement.consolidation.nodes, []);
});
test('invalid starting methods are rejected before creating records', () => {
  const { store, entityId } = annualSourceFixture();
  assert.throws(() => buildAnnualEngagement(store, entityId, values, { sourceMode: 'unknown' }), errorCode('source_unavailable'));
});
