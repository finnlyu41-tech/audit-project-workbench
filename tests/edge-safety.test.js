import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalStorePayload, emptyStore, groupProgress, isValidStore, mergeEntities, normalizeStore, taxDeadlineUrgency } from '../src/dashboard/model.js';
import { parseStartupPayload } from '../src/dashboard/workspace-startup.js';
import { holdingWorkspace } from './fixtures/holding-workspace.js';
import { mergeFixture, sourceOf, targetOf, readyGroupFixture } from './fixtures/edge-safety.js';

const malformed = [
  ['orphan engagement', s => { s.engagements[0].entityId = 'not-a-company'; }],
  ['duplicate entity ID', s => { s.entities[1].id = s.entities[0].id; }],
  ['duplicate annual ID', s => { s.engagements[1].id = s.engagements[0].id; }],
  ['wrong collection type', s => { s.engagements[0].workstreams = 'not-an-array'; }],
  ['null nested record', s => { s.engagements[0].consolidation.components[0] = null; }],
  ['duplicate criterion ID', s => { const a = s.engagements[1].workstreams[0].nodes[0].conditions; a.push({ ...a[0] }); }],
  ['string boolean', s => { s.engagements[1].workstreams[0].nodes[0].conditions[0].done = 'false'; }],
  ['impossible date', s => { s.engagements[1].reportingPeriods[0].periodEnd = '2025-02-30'; }],
];
for (const [name, corrupt] of malformed) test(`reject ${name} before normalization can rewrite the source`, () => {
  const store = holdingWorkspace(); corrupt(store); const raw = JSON.stringify(store);
  const parsed = parseStartupPayload(raw); assert.equal(parsed.error, 'invalid_data');
  assert.equal(parsed.raw, raw); assert.equal(parsed.store, undefined); assert.equal(isValidStore(store), false);
});
test('valid current data, deliberate missing historical components and empty stores still restore', () => {
  for (const s of [holdingWorkspace(), mergeFixture(), canonicalStorePayload(emptyStore())]) {
    const raw = JSON.stringify(s); const result = parseStartupPayload(raw);
    assert.equal(result.error, null); assert.deepEqual(canonicalStorePayload(result.store), s);
  }
});
test('wrong reporting year cannot make a fully checked group ready', () => {
  const s = readyGroupFixture(); const before = structuredClone(s);
  assert.equal(groupProgress(normalizeStore(s), 'holding-annual').ready, false);
  assert.deepEqual(s, before);
  s.engagements[0].consolidation.components[0].engagementId = 'alpha-current';
  assert.equal(groupProgress(normalizeStore(s), 'holding-annual').ready, true);
  s.engagements[0].consolidation.components[0].readinessConditions[0].done = false;
  assert.equal(groupProgress(normalizeStore(s), 'holding-annual').ready, false);
});
test('a wrong company link cannot satisfy consolidation readiness', () => {
  const s = readyGroupFixture(); const part = s.engagements[0].consolidation.components[0];
  part.engagementId = 'alpha-current'; part.entityId = 'holding-beta';
  assert.equal(groupProgress(normalizeStore(s), 'holding-annual').ready, false);
});
test('merge preserves source-only master fields and associated annual and tax data', () => {
  const s = mergeFixture(); const before = structuredClone(s); const next = mergeEntities(s, 'merge-source', 'merge-target');
  const merged = targetOf(next); assert.equal(merged.notes, sourceOf(s).notes);
  assert.equal(merged.incorporationDate, '2010-04-01'); assert.equal(merged.parentEntityId, 'merge-parent');
  assert.equal(merged.relationshipRole, 'Subsidiary'); assert.deepEqual(merged.taxDeadlines, sourceOf(s).taxDeadlines);
  assert.equal(next.engagements[0].entityId, 'merge-target'); assert.deepEqual(s, before);
});
for (const [label, change] of [
  ['conflicting notes', s => { targetOf(s).notes = 'Different target note'; }],
  ['conflicting incorporation dates', s => { targetOf(s).incorporationDate = '2012-01-01'; }],
  ['different kinds', s => { targetOf(s).kind = 'holding_company'; }],
  ['archived source', s => { sourceOf(s).archived = true; }],
  ['ancestor and descendant', s => { sourceOf(s).kind = 'holding_company'; targetOf(s).kind = 'holding_company'; targetOf(s).parentEntityId = 'merge-source'; }],
]) test(`unsafe merge rejects ${label} without modifying either record`, () => {
  const s = mergeFixture(); change(s); const before = structuredClone(s);
  assert.throws(() => mergeEntities(s, 'merge-source', 'merge-target')); assert.deepEqual(s, before);
});
test('all supported legacy versions with valid old records still migrate', () => {
  for (let version = 1; version <= 10; version++) {
    const raw = JSON.stringify({ version, projects: [{ id: 'legacy-project', name: 'Legacy example', entity: 'Legacy example',
      nodes: [{ id: 'legacy-node', title: 'Existing work', conditions: [{ id: 'legacy-condition', label: 'Done', done: true }] }] }], groups: [] });
    const result = parseStartupPayload(raw); assert.equal(result.error, null, `version ${version}`);
    assert.equal(result.store.entities[0].legalName, 'Legacy example');
    assert.equal(result.store.engagements[0].workstreams[0].nodes[0].conditions[0].done, true);
  }
});
test('nested collection fault matrix refuses all wrong types without changing input', () => {
  const paths = [['entities'], ['engagements'], ['samples'], ['groupSamples'], ['outstandingStatuses'],
    ['engagements', 1, 'workstreams'], ['engagements', 1, 'workstreams', 0, 'nodes'],
    ['engagements', 1, 'workstreams', 0, 'nodes', 0, 'conditions'], ['engagements', 0, 'consolidation', 'components']];
  for (const path of paths) for (const bad of [null, {}, 'wrong', 7, false]) {
    const s = holdingWorkspace(); let parent = s;
    for (const part of path.slice(0,-1)) parent = parent[part]; parent[path.at(-1)] = bad;
    const raw = JSON.stringify(s); assert.equal(parseStartupPayload(raw).error, 'invalid_data', `${path}: ${bad}`);
    assert.equal(JSON.stringify(s), raw);
  }
});
test('shared IDs in different annual namespaces remain valid; duplicate periods and module types do not', () => {
  const s = holdingWorkspace(); const a = s.engagements[1]; const b = s.engagements[2];
  a.outstandingItems = [{ id: 'same', title: 'First', status: 'missing_document', workstreamId: null }];
  b.outstandingItems = [{ id: 'same', title: 'Second', status: 'missing_document', workstreamId: null }];
  assert.equal(isValidStore(s), true);
  a.reportingPeriods.push({ ...a.reportingPeriods[0], id: 'another-period-id' }); assert.equal(isValidStore(s), false);
  a.reportingPeriods.pop(); a.workstreams.push({ ...a.workstreams[0], id: 'another-workstream-id' }); assert.equal(isValidStore(s), false);
});
test('tax urgency never rolls an impossible day into the following month', () => {
  const now = new Date('2026-03-01T12:00:00Z');
  assert.equal(taxDeadlineUrgency({ state: 'open', dueDate: '2026-02-30' }, now).level, 'inactive');
  assert.equal(taxDeadlineUrgency({ state: 'open', dueDate: '2026-03-01', reminderDays: 0 }, now).level, 'due_today');
  assert.equal(taxDeadlineUrgency({ state: 'open', dueDate: '2026-03-02', reminderDays: 0 }, now).level, 'upcoming');
});
test('actual day validation distinguishes leap years, reversed periods and string booleans', () => {
  for (const date of ['2028-02-29', '2000-02-29', '2026-12-31']) {
    const s = mergeFixture(); sourceOf(s).incorporationDate = date; assert.equal(isValidStore(s), true);
  }
  for (const date of ['2026-02-29', '1900-02-29', '2026-13-01', '2026-01-00']) {
    const s = mergeFixture(); sourceOf(s).incorporationDate = date; assert.equal(isValidStore(s), false);
  }
  const s = mergeFixture(); s.engagements[0].reportingPeriods[0].periodEnd = '2024-12-31'; assert.equal(isValidStore(s), false);
});
test('matching only the outer dates of different multi-period scopes never confers readiness', () => {
  const s = readyGroupFixture(); const parent = s.engagements[0]; const child = s.engagements[2];
  parent.reportingPeriods = [{ id: 'wide', periodStart: '2025-01-01', periodEnd: '2026-12-31' }];
  child.reportingPeriods = [{ id: 'first', periodStart: '2025-01-01', periodEnd: '2025-12-31' },
    { id: 'second', periodStart: '2026-01-01', periodEnd: '2026-12-31' }];
  parent.consolidation.components[0].engagementId = child.id;
  assert.equal(groupProgress(normalizeStore(s), parent.id).ready, false);
});
test('merge retains frozen historical labels, cleans live identity and preserves unrelated masters', () => {
  const s = mergeFixture(); const p = { ...s.engagements[0], id: 'parent-year', entityId: 'merge-parent',
    consolidation: { enabled: false, nodes: [], components: [{ id: 'source-part', entityId: 'merge-source', engagementId: 'merge-year',
      entitySnapshot: { id: 'merge-source', legalName: 'Original historical name' }, readinessConditions: [] }] } };
  s.engagements.push(p); const ready = canonicalStorePayload(normalizeStore(s));
  const after = mergeEntities(ready, 'merge-source', 'merge-target');
  assert.deepEqual(after.engagements[1].consolidation.components[0].entitySnapshot, ready.engagements[1].consolidation.components[0].entitySnapshot);
  assert.equal(after.engagements[1].consolidation.components[0].entityId, 'merge-target');
});
test('corrupt linked-file candidates are rejected before activation or writing', async () => {
  const { readStoreFromFileHandle } = await import('../src/dashboard/persistence.js');
  const bad = mergeFixture(); bad.engagements[0].workstreams = { title: 'Not an array' }; let writes = 0;
  const handle = { getFile: async () => ({ name: 'fictional-invalid.apw.json', text: async () => JSON.stringify(bad) }),
    createWritable: async () => { writes++; throw new Error('must not write'); } };
  await assert.rejects(readStoreFromFileHandle(handle, { isValidStore, normalizeStore }), error => error.code === 'invalid_file');
  assert.equal(writes, 0);
});
test('merge rejects a historical scope cycle even if current company parents no longer connect', () => {
  const s = mergeFixture(); sourceOf(s).kind = 'holding_company'; targetOf(s).kind = 'holding_company';
  s.engagements[0].consolidation = { enabled: false, nodes: [], components: [{ id: 'historic', entityId: 'merge-target', engagementId: null }] };
  assert.throws(() => mergeEntities(s, 'merge-source', 'merge-target'), error => error.code === 'relationship');
});
test('duplicate tax identifiers in a safe merge keep both records with unique IDs', () => {
  const s = mergeFixture(); targetOf(s).taxDeadlines = [{ ...sourceOf(s).taxDeadlines[0], note: 'Target original', linkedEngagementId: null }];
  const after = mergeEntities(s, 'merge-source', 'merge-target'); const taxes = targetOf(after).taxDeadlines;
  assert.equal(taxes.length, 2); assert.equal(new Set(taxes.map(d => d.id)).size, 2);
  assert.deepEqual(taxes.map(d => d.note), ['Target original', 'Tax note unchanged']);
  assert.equal(isValidStore(canonicalStorePayload(after)), true);
});
test('missing and incomplete reporting dates never count as a verified period match', async () => {
  const { engagementReportingPeriodsMatch } = await import('../src/dashboard/model.js');
  assert.equal(engagementReportingPeriodsMatch({}, {}), false);
  const partial = { periodStart: '2026-01-01', periodEnd: '' };
  assert.equal(engagementReportingPeriodsMatch(partial, partial), false);
});
test('boolean and object version values are not accepted as a legacy version number', () => {
  for (const version of [true, false, {}, []]) assert.equal(isValidStore({ version, projects: [] }), false);
});
test('tax save rejects dates that cannot survive the persisted workspace validator', async () => {
  const { prepareTaxDeadlineSave } = await import('../src/dashboard/tax-editor-state.js');
  const s = mergeFixture(); const before = structuredClone(s);
  for (const dueDate of ['10000-01-01', '2026-02-30', 'not-a-date', '']) {
    assert.equal(prepareTaxDeadlineSave(s, 'entity', 'merge-source', null, { category: 'tax_payment', dueDate }).error, 'date');
  }
  assert.deepEqual(s, before);
});
