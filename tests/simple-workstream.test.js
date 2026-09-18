import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStore, makeProject, makeWorkstream, makeNode, normalizeStore, normalizeWorkstream,
  canonicalStorePayload, isValidStore, workstreamStats, projectStats, makeEngagement, makeOutstandingItem } from '../src/dashboard/model.js';
import { activeWorkstreamNodes, workstreamIsSimple } from '../src/dashboard/workstream-mode.js';
import { nextEngagementAction } from '../src/dashboard/ux-model.js';
import { buildRecordReport, buildPortfolioReport } from '../src/dashboard/reporting.js';
import { workspaceDifferences } from '../src/dashboard/efficiency-export.js';
import { annualSourcePreview } from '../src/dashboard/annual-source-model.js';

function fixture() {
  const base = emptyStore();
  const project = makeProject({ name: 'Example simple-mode test', entity: 'Example Simple Limited',
    periodStart: '2026-01-01', periodEnd: '2026-12-31', owner: 'Annual owner' }, false);
  const nodes = [makeNode({ title: 'Retained stage', conditions: ['Retained criterion'] })];
  const full = makeWorkstream({ type: 'audit' }, nodes);
  full.nodes[0].conditions[0].done = true;
  const simple = makeWorkstream({ type: 'bookkeeping', mode: 'simple', simpleStatus: 'in_progress',
    owner: 'Module owner', startDate: '2026-09-01', dueDate: '2026-09-30', notes: 'Literal <private> 备注' });
  // A converted module retains its old structure without using it for active progress.
  simple.nodes = structuredClone(full.nodes);
  project.workstreams = [simple, full];
  project.outstandingItems = [makeOutstandingItem({ title: 'Uncleared request', workstreamId: simple.id }, base.outstandingStatuses)];
  return normalizeStore({ ...base, version: 10, entities: undefined, engagements: undefined, projects: [project], groups: [] });
}

test('new simple workstreams do not instantiate template nodes or infer completion', () => {
  const workstream = makeWorkstream({ mode: 'simple', type: 'audit' }, [makeNode({ title: 'Template stage', conditions: ['Done'] })]);
  assert.deepEqual(workstream.nodes, []);
  assert.deepEqual(workstreamStats(workstream), { conditions: 0, completedConditions: 0, nodes: 0, completedNodes: 0,
    complete: false, started: false, percentage: 0 });
});

test('mixed progress counts simple modules once, ignoring retained nodes and avoiding invented partial progress', () => {
  const store = fixture(), project = store.projects[0], simple = project.workstreams[0];
  assert.equal(projectStats(project).completedWorkstreams, 1);
  assert.equal(projectStats(project).percentage, 50);
  assert.equal(workstreamStats(simple).percentage, 0);
  assert.equal(workstreamStats(simple).started, true);
  for (const simpleStatus of ['not_started', 'in_progress', 'on_hold']) {
    assert.equal(workstreamStats({ ...simple, simpleStatus }).complete, false);
  }
  const completed = { ...project, workstreams: project.workstreams.map(w => ({ ...w, simpleStatus: 'completed' })) };
  assert.equal(projectStats(completed).percentage, 100);
  assert.equal(projectStats(completed).complete, true);
  assert.deepEqual(completed.outstandingItems, project.outstandingItems);
});

test('switching modes preserves exact node IDs and checks, independent status and details', () => {
  const simple = fixture().projects[0].workstreams[0];
  const full = normalizeWorkstream({ ...simple, mode: 'full' });
  assert.equal(workstreamIsSimple(full), false);
  assert.deepEqual(full.nodes, simple.nodes);
  assert.equal(workstreamStats(full).complete, true);
  const back = normalizeWorkstream({ ...full, mode: 'simple' });
  assert.deepEqual(back, simple);
  assert.equal(workstreamStats(back).complete, false);
  assert.deepEqual(activeWorkstreamNodes(back), []);
});

test('canonical backup round trip preserves mode, literal notes, fields, old nodes and outstanding links', () => {
  const store = fixture(), payload = canonicalStorePayload(store);
  assert.equal(isValidStore(payload), true);
  const restored = normalizeStore(JSON.parse(JSON.stringify(payload)));
  assert.deepEqual(canonicalStorePayload(restored), payload);
  const report = buildRecordReport(restored, 'project', restored.projects[0].id);
  assert.equal(report.workstreams[0].mode, 'simple');
  assert.equal(report.workstreams[0].currentStage, null);
  assert.equal(report.workstreams[0].status, '进行中');
  assert.equal(report.workstreams[0].stats.nodes, 0);
  assert.equal(buildPortfolioReport(restored).rows[0].completedWorkstreams, 1);
});

test('invalid mode, status, dates and notes are rejected before normalization', () => {
  const payload = canonicalStorePayload(fixture());
  for (const patch of [{ mode: 'hidden' }, { simpleStatus: 'done' }, { notes: 123 }, { startDate: '2026-02-30' },
    { startDate: '2026-10-01', dueDate: '2026-09-01' }]) {
    const invalid = structuredClone(payload); Object.assign(invalid.engagements[0].workstreams[0], patch);
    assert.equal(isValidStore(invalid), false, JSON.stringify(patch));
  }
});

test('old full modules do not acquire optional mode or status fields just by opening', () => {
  const full = fixture().projects[0].workstreams[1];
  assert.equal(Object.hasOwn(normalizeWorkstream(full), 'mode'), false);
  assert.equal(Object.hasOwn(normalizeWorkstream(full), 'simpleStatus'), false);
  assert.equal(Object.hasOwn(normalizeWorkstream(full), 'notes'), false);
});

test('next action ignores retained and pinned nodes in simple mode, and skips completed simple modules', () => {
  const store = fixture(), job = store.engagements[0], simple = job.workstreams[0];
  const pinned = { ...job, nextAction: { kind: 'workflow', workstreamId: simple.id, nodeId: simple.nodes[0].id } };
  pinned.workstreams[0].nodes[0].conditions[0].done = false;
  assert.deepEqual(nextEngagementAction(pinned), { workstreamId: simple.id, node: null, simple: true });
  pinned.workstreams[0].simpleStatus = 'completed';
  assert.equal(nextEngagementAction(pinned), null);
  pinned.nextAction = { kind: 'outstanding', itemId: job.outstandingItems[0].id };
  assert.equal(nextEngagementAction(pinned, store.outstandingStatuses).item.id, job.outstandingItems[0].id);
});

test('new year retains simple mode but clears operational state, dates, owner and notes', () => {
  const store = fixture(), source = store.engagements[0];
  const next = makeEngagement({ entityId: source.entityId, periodStart: '2027-01-01', periodEnd: '2027-12-31' },
    { sourceMode: 'previous', sourceEngagement: source });
  const simple = next.workstreams[0];
  assert.equal(simple.mode, 'simple'); assert.equal(simple.simpleStatus, 'not_started');
  assert.equal(simple.owner, ''); assert.equal(simple.dueDate, ''); assert.equal(simple.startDate || '', '');
  assert.equal(simple.notes || '', ''); assert.deepEqual(simple.nodes, []);
  assert.equal(projectStats(next).complete, false);
  const preview = annualSourcePreview(store, source.entityId, { sourceMode: 'previous', sourceEngagementId: source.id });
  assert.equal(preview.nodes, 1);
  assert.equal(preview.conditions, 1);
});

test('backup comparison signals simple status changes without exposing notes', () => {
  const a = canonicalStorePayload(fixture()), b = structuredClone(a);
  b.engagements[0].workstreams[0].simpleStatus = 'completed';
  b.engagements[0].workstreams[0].notes = 'Private note';
  const changes = workspaceDifferences(a, b);
  assert.ok(changes.rows.some(r => r.field === 'workflow'));
  assert.equal(JSON.stringify(changes).includes('Private note'), false);
});
