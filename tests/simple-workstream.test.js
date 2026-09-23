import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStore, makeProject, makeWorkstream, makeNode, normalizeStore, normalizeWorkstream,
  canonicalStorePayload, setBusinessMode, isValidStore, workstreamStats, projectStats, makeEngagement, makeOutstandingItem } from '../src/dashboard/model.js';
import { activeWorkstreamNodes, workstreamIsSimple, workstreamStatus, withWorkstreamNodes } from '../src/dashboard/workstream-mode.js';
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

test('switching modes preserves exact node IDs and checks, shared status and details', () => {
  const simple = fixture().projects[0].workstreams[0];
  const full = normalizeWorkstream({ ...simple, mode: 'full' });
  assert.equal(workstreamIsSimple(full), false);
  assert.deepEqual(full.nodes, simple.nodes);
  assert.equal(workstreamStats(full).complete, false);
  assert.equal(workstreamStats(full).completedConditions, 1);
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


test('global mode covers every active company and year, preserving archives, nodes and independent fields', () => {
  const source = fixture(), original = canonicalStorePayload(source);
  const annual = source.engagements[0];
  source.engagements.push({ ...structuredClone(annual), id: 'another-year', periodStart: '2025-01-01', periodEnd: '2025-12-31' });
  source.engagements.push({ ...structuredClone(annual), id: 'archived-year', archived: true });
  source.entities.push({ ...structuredClone(source.entities[0]), id: 'archived-company', archived: true });
  source.engagements.push({ ...structuredClone(annual), id: 'archived-company-year', entityId: 'archived-company' });
  const before = canonicalStorePayload(source);
  const simple = setBusinessMode(source);
  assert.equal(simple.businessMode, 'simple');
  assert.ok(simple.engagements.slice(0, 2).every(e => e.workstreams.every(workstreamIsSimple)));
  assert.deepEqual(simple.engagements.slice(2), before.engagements.slice(2));
  assert.deepEqual(simple.entities, before.entities);
  const pro = setBusinessMode(simple, 'pro');
  assert.ok(pro.engagements.slice(0, 2).every(e => e.workstreams.every(w => !workstreamIsSimple(w))));
  assert.deepEqual(pro.engagements[0].workstreams.map(w => w.nodes), original.engagements[0].workstreams.map(w => w.nodes));
  assert.deepEqual(pro.engagements[0].outstandingItems, original.engagements[0].outstandingItems);
  assert.deepEqual(setBusinessMode(pro), simple);
  const restored = normalizeStore(JSON.parse(JSON.stringify(canonicalStorePayload(pro))));
  assert.equal(restored.businessMode, 'pro');
  assert.deepEqual(canonicalStorePayload(restored), canonicalStorePayload(pro));
  assert.equal(isValidStore({ ...canonicalStorePayload(simple), businessMode: 'invalid' }), false);
});

test('global Simple applies to new annual modules without instantiating template nodes', () => {
  const store = setBusinessMode(fixture());
  const source = store.engagements[0];
  const next = makeEngagement({ entityId: source.entityId, periodStart: '2027-01-01', periodEnd: '2027-12-31' },
    { store, sourceMode: 'previous', sourceEngagement: source });
  assert.ok(next.workstreams.every(w => w.mode === 'simple' && w.nodes.length === 0 && w.simpleStatus === 'not_started'));
});

test('reported regression: manually completed Simple projects stay completed in Pro without checking any retained criterion', () => {
  const source = fixture();
  for (const engagement of source.engagements) for (const workstream of engagement.workstreams) {
    workstream.simpleStatus = 'completed';
    for (const node of workstream.nodes) for (const condition of node.conditions) condition.done = false;
  }
  const simple = setBusinessMode(source), before = canonicalStorePayload(simple);
  assert.equal(projectStats(simple.projects[0]).complete, true);
  const pro = setBusinessMode(simple, 'pro');
  assert.equal(projectStats(pro.projects[0]).complete, true, 'The Pro switch must not reopen a completed project');
  assert.equal(projectStats(pro.projects[0]).percentage, 100);
  assert.deepEqual(pro.engagements[0].workstreams.map(w => w.nodes), before.engagements[0].workstreams.map(w => w.nodes));
  assert.deepEqual(canonicalStorePayload(setBusinessMode(pro)), before);
});

test('all recorded module states and project percentages are invariant across both modes, reload and backup', () => {
  for (const status of ['not_started', 'in_progress', 'on_hold', 'completed']) {
    for (const checked of [false, true]) {
      const base = fixture();
      for (const w of base.engagements[0].workstreams) {
        w.simpleStatus = status;
        for (const n of w.nodes) for (const c of n.conditions) c.done = checked;
      }
      const simple = setBusinessMode(base), expected = canonicalStorePayload(simple);
      const pro = normalizeStore(JSON.parse(JSON.stringify(canonicalStorePayload(setBusinessMode(simple, 'pro')))));
      assert.equal(workstreamStatus(pro.projects[0].workstreams[0]), status);
      for (const key of ['complete', 'percentage', 'completedWorkstreams', 'started'])
        assert.equal(projectStats(pro.projects[0])[key], projectStats(simple.projects[0])[key], `${status}/${checked}/${key}`);
      assert.equal(buildRecordReport(pro, 'project', pro.projects[0].id).complete, status === 'completed');
      assert.equal(buildRecordReport(pro, 'project', pro.projects[0].id).workstreams[0].status,
        buildRecordReport(simple, 'project', simple.projects[0].id).workstreams[0].status);
      assert.deepEqual(canonicalStorePayload(setBusinessMode(pro)), expected);
      assert.equal(isValidStore(canonicalStorePayload(pro)), true);
    }
  }
});

test('a completed Pro checklist stays completed in Simple without creating a manual status or changing nodes', () => {
  const base = fixture();
  base.engagements[0].workstreams = [base.engagements[0].workstreams[1]];
  const pro = setBusinessMode(base, 'pro'), before = canonicalStorePayload(pro);
  assert.equal(projectStats(pro.projects[0]).complete, true);
  const simple = setBusinessMode(pro);
  assert.equal(workstreamStatus(simple.projects[0].workstreams[0]), 'completed');
  assert.equal(projectStats(simple.projects[0]).complete, true);
  assert.equal(Object.hasOwn(simple.engagements[0].workstreams[0], 'simpleStatus'), false);
  assert.deepEqual(canonicalStorePayload(setBusinessMode(simple, 'pro')), before);
  const module = simple.engagements[0].workstreams[0];
  module.nodes.push(makeNode({ title: 'Unconfigured stage', conditions: [] }));
  for (const mode of ['simple', 'pro']) {
    const next = setBusinessMode(simple, mode);
    assert.equal(projectStats(next.projects[0]).complete, false, 'An unconfigured stage is not complete');
    assert.equal(workstreamStatus(next.projects[0].workstreams[0]), 'in_progress');
  }
});

test('only an actual checklist change supersedes a manual outcome, not metadata, reordering or a no-op', () => {
  const original = { ...fixture().projects[0].workstreams[0], mode: 'full', simpleStatus: 'completed' };
  original.nodes.push(makeNode({ title: 'Another stage', conditions: ['First', 'Second'] }));
  const before = structuredClone(original);
  const renamed = structuredClone(original.nodes);
  renamed[0].title = 'Renamed stage'; renamed[0].conditions[0].label = 'Renamed criterion';
  assert.equal(withWorkstreamNodes(original, renamed).simpleStatus, 'completed');
  const reordered = structuredClone(original.nodes).reverse(); reordered[0].conditions.reverse();
  assert.equal(withWorkstreamNodes(original, reordered).simpleStatus, 'completed');
  assert.deepEqual(withWorkstreamNodes(original, original.nodes), original);
  for (const edit of [
    nodes => { nodes[0].conditions[0].done = !nodes[0].conditions[0].done; },
    nodes => { nodes.push(makeNode({ title: 'New work', conditions: ['New criterion'] })); },
    nodes => { nodes[0].conditions.push({ id: 'new-criterion', label: 'More work', done: false }); },
    nodes => { nodes.splice(0, 1); },
  ]) {
    const nodes = structuredClone(original.nodes); edit(nodes);
    const result = withWorkstreamNodes(original, nodes);
    assert.equal(Object.hasOwn(result, 'simpleStatus'), false);
    const { simpleStatus, nodes: oldNodes, ...metadata } = original;
    assert.deepEqual(result, { ...metadata, nodes });
    assert.equal(projectStats({ workstreams: [result] }).complete,
      projectStats({ workstreams: [{ ...result, mode: 'simple' }] }).complete);
  }
  assert.deepEqual(original, before);
});

test('a manually completed module skips unperformed next-step suggestions but does not clear outstanding items', () => {
  const source = fixture();
  const job = source.engagements[0];
  for (const w of job.workstreams) {
    w.simpleStatus = 'completed'; delete w.mode;
    for (const n of w.nodes) for (const c of n.conditions) c.done = false;
  }
  job.nextAction = { kind: 'workflow', workstreamId: job.workstreams[0].id, nodeId: job.workstreams[0].nodes[0].id };
  const before = JSON.stringify(source);
  assert.equal(nextEngagementAction(job, source.outstandingStatuses), null);
  assert.equal(JSON.stringify(source), before);
  job.nextAction = { kind: 'outstanding', itemId: job.outstandingItems[0].id };
  assert.equal(nextEngagementAction(job, source.outstandingStatuses).item.id, job.outstandingItems[0].id);
});


test('a new year never inherits a manual completion from either editing mode', () => {
  for (const mode of ['simple', 'pro']) {
    const store = setBusinessMode(fixture(), mode);
    const source = store.engagements[0];
    source.workstreams.forEach(w => { w.simpleStatus = 'completed'; });
    const before = JSON.stringify(store);
    const next = makeEngagement({ entityId: source.entityId, periodStart: '2027-01-01', periodEnd: '2027-12-31' },
      { store, sourceMode: 'previous', sourceEngagement: source });
    assert.equal(projectStats(next).complete, false);
    assert.ok(next.workstreams.every(w => w.simpleStatus !== 'completed'));
    assert.ok(next.workstreams.every(w => w.nodes.every(n => n.conditions.every(c => !c.done))));
    assert.equal(JSON.stringify(store), before);
  }
});
