import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorkingSchedule as forward, calculateBackwardSchedule as backward, countWorkingDays, shiftWorkingDate,
  followingWorkingDate, initialScheduleDraft, resolveScheduleDraft, validSchedulePlan } from '../src/dashboard/working-days.js';
import { HK_PUBLIC_HOLIDAYS } from '../src/dashboard/hk-public-holidays.js';
import { makePatchTransaction, applyPatchTransaction, prepareOutstandingLines, prepareOutstandingStatus, applyPreparedCandidate,
  prepareSchedules, scheduleCandidates, prepareFollowUp, followUpsDue, parseOutline, outlineNodes, nextAnnualRows, prepareAnnualBatch,
  componentCreationContext, componentContextCurrent, linkCreatedComponent, workspaceFingerprint } from '../src/dashboard/efficiency-actions.js';
import { canonicalStorePayload, normalizeStore, reconcileWorkbenchStore, makeEngagement, isValidStore, mergeEntities } from '../src/dashboard/model.js';
import { nextEngagementAction, prepareQuickUpdate, quickUpdateValues, quickUpdateContext } from '../src/dashboard/ux-model.js';
import { quickOpenIndex, findQuickOpenRecords } from '../src/dashboard/quick-open-model.js';
import { scheduleRows, filterScheduleRows } from '../src/dashboard/schedule-view-model.js';
import { holdingComponentRows, filterHoldingComponents } from '../src/dashboard/holding-components-model.js';
import { efficiencyWorkspace } from './fixtures/efficiency-workspace.js';
import { holdingWorkspace } from './fixtures/holding-workspace.js';
const copy = structuredClone, aId = 'eff-alpha-year';
const canonical = canonicalStorePayload;
const noTime = value => JSON.parse(JSON.stringify(value, (k, v) => k === 'updatedAt' ? undefined : v));

for (const week of ['mon-fri', 'mon-sat']) test(`${week}: independently enumerated dates agree with forward, backward and buffer calculations`, () => {
  const holiday = new Set(HK_PUBLIC_HOLIDAYS), dates = [], working = [];
  for (let ms = Date.parse('2025-01-01T00:00Z'); ms <= Date.parse('2027-12-31T00:00Z'); ms += 86400000) {
    const d = new Date(ms), date = d.toISOString().slice(0, 10); dates.push(date);
    if (d.getUTCDay() !== 0 && (week === 'mon-sat' || d.getUTCDay() !== 6) && !holiday.has(date)) working.push(date);
  }
  for (const date of dates) for (const days of [1, 2, 5, 20]) {
    const after = working.filter(d => d >= date), f = forward(date, days, week);
    if (after.length < days) assert.equal(f.error, 'coverage');
    else { assert.equal(f.startDate, after[0]); assert.equal(f.dueDate, after[days - 1]); assert.equal(countWorkingDays(f.startDate, f.dueDate, week).workdays, days); }
    for (const buffer of [0, 2]) {
      const before = working.filter(d => d <= date).reverse(), b = backward(date, days, week, buffer);
      if (before.length < days + buffer) assert.equal(b.error, 'coverage');
      else { assert.equal(b.dueDate, before[buffer]); assert.equal(b.startDate, before[buffer + days - 1]); assert.equal(b.schedulePlan.targetDueDate, date); }
    }
  }
});
test('holiday/weekend sending dates count follow-up strictly after the send, without an extra day', () => {
  assert.equal(followingWorkingDate('2026-09-26', 1).date, '2026-09-28');
  assert.equal(followingWorkingDate('2026-09-30', 3).date, '2026-10-06');
  assert.equal(followingWorkingDate('2026-10-02', 1, 'mon-sat').date, '2026-10-03');
  assert.equal(followingWorkingDate('2027-12-31', 1).error, 'coverage');
  for (const days of [0, true, '1.5', '', [], 1001]) assert.equal(followingWorkingDate('2026-09-08', days).error, 'duration');
});
test('calendar counting, explicit six-day weeks and negative shifts keep original dates separate from reporting periods', () => {
  assert.equal(countWorkingDays('2026-10-02', '2026-10-05').workdays, 2);
  assert.equal(countWorkingDays('2026-10-02', '2026-10-05', 'mon-sat').workdays, 3);
  assert.equal(shiftWorkingDate('2026-10-02', -1).date, '2026-09-30');
  assert.equal(countWorkingDays('2026-10-03', '2026-10-04').workdays, 0);
  assert.equal(countWorkingDays('2026-12-30', '2028-01-01').error, 'coverage');
  const draft = { ...initialScheduleDraft({}), mode: 'workdays', direction: 'count' };
  assert.equal(resolveScheduleDraft(draft, { startDate: '2026-10-02', dueDate: '2026-10-05' }).schedulePlan, undefined);
});
test('optional metadata validates before normalization and survives backup and runtime-view round trips', () => {
  const s = efficiencyWorkspace(), result = backward('2026-10-09', 3, 'mon-sat', 2);
  Object.assign(s.engagements[0], { startDate: result.startDate, dueDate: result.dueDate, schedulePlan: result.schedulePlan,
    nextAction: { kind: 'outstanding', itemId: 'same-item' }, remainingWork: { days: 4, asOf: '2026-09-08' } });
  s.entities[0].followUpLanguage = 'zh-Hant';
  assert.equal(isValidStore(s), true);
  const normalized = normalizeStore(s); assert.deepEqual(canonical(normalized), s);
  const edited = reconcileWorkbenchStore(normalized, { ...normalized, projects: normalized.projects.map(p => p.id === aId ? { ...p, owner: 'Another Example' } : p) });
  assert.deepEqual(edited.engagements[0].schedulePlan, result.schedulePlan); assert.deepEqual(edited.engagements[0].nextAction, s.engagements[0].nextAction);
  for (const patch of [{ aliases: [''] }, { aliases: 1 }, { followUpLanguage: 'bad' }]) {
    const bad = copy(s); Object.assign(bad.entities[0], patch); assert.equal(isValidStore(bad), false);
  }
  for (const patch of [{ nextAction: { kind: 'guess' } }, { remainingWork: { days: -1, asOf: '2026-09-08' } },
    { schedulePlan: { ...result.schedulePlan, workweek: 'all' } }, { dueDate: '2026-10-12' }]) {
    const bad = copy(s); Object.assign(bad.engagements[0], patch); assert.equal(isValidStore(bad), false);
  }
});
test('single-source status batch preserves same-id items elsewhere, workflow, periods, tax and all company data', () => {
  const before = efficiencyWorkspace(), preview = prepareOutstandingStatus(before, aId, ['same-item', 'second-item'], 'resolved');
  const applied = applyPatchTransaction(before, preview.transaction); assert.ok(applied.store);
  assert.equal(applied.store.engagements[0].outstandingItems.every(i => i.status === 'resolved'), true);
  assert.deepEqual(applied.store.engagements[1], before.engagements[1]); assert.deepEqual(applied.store.entities, before.entities);
  assert.deepEqual(applied.store.engagements[0].workstreams, before.engagements[0].workstreams);
  assert.deepEqual(noTime(canonical(applyPatchTransaction(applied.store, preview.transaction, true).store)), noTime(before));
  assert.equal(prepareOutstandingStatus(before, aId, ['same-item', 'same-item'], 'resolved').error, 'selection');
});
test('batch previews are all-or-nothing and undo retains unrelated edits but refuses edits to its own fields', () => {
  const before = efficiencyWorkspace(), preview = prepareOutstandingStatus(before, aId, ['same-item', 'second-item'], 'resolved');
  const changed = copy(before); changed.engagements[0].owner = 'Changed externally';
  assert.equal(applyPatchTransaction(changed, preview.transaction).error, 'changed');
  const applied = canonical(applyPatchTransaction(before, preview.transaction).store);
  applied.engagements[0].notes = 'Preserve new note';
  const undone = applyPatchTransaction(applied, preview.transaction, true);
  assert.equal(undone.store.engagements[0].notes, 'Preserve new note');
  applied.engagements[0].outstandingItems[0].status = 'waiting_client';
  const snapshot = copy(applied); assert.equal(applyPatchTransaction(applied, preview.transaction, true).error, 'changed'); assert.deepEqual(applied, snapshot);
  const archived = copy(before); archived.entities[0].archived = true; assert.equal(applyPatchTransaction(archived, preview.transaction).error, 'readonly');
});
test('multiline preview ignores empty lines, flags exact duplicates and does not persist partial or stale submissions', () => {
  const before = efficiencyWorkspace();
  const p = prepareOutstandingLines(before, aId, ' Bank statement\n\nNew item\r\nNew item ', 'eff-audit', 'missing_document');
  assert.equal(p.count, 3); assert.deepEqual(p.lines.map(r => r.duplicate), [true, false, true]);
  assert.equal(before.engagements[0].outstandingItems.length, 2);
  const result = applyPreparedCandidate(before, p); assert.equal(result.store.engagements[0].outstandingItems.length, 5);
  assert.deepEqual(result.store.engagements[1], before.engagements[1]); assert.deepEqual(result.store.entities, before.entities);
  assert.equal(applyPreparedCandidate(result.store, p).error, 'changed');
  assert.equal(prepareOutstandingLines(before, aId, 'x', 'wrong', 'missing_document').error, 'module');
  assert.equal(prepareOutstandingLines(before, aId, 'x', '', 'resolved').error, 'status');
  assert.equal(prepareOutstandingLines(before, aId, Array(101).fill('x').join('\n'), '', 'missing_document').error, 'size');
});
test('selected schedule shift, ordered sequence and locked deadlines preserve all unrelated dates and support safe undo', () => {
  const before = efficiencyWorkspace();
  const shift = prepareSchedules(before, [{ id: aId }], { offset: 1 });
  assert.equal(shift.rows[0].after.startDate, '2026-10-02'); assert.equal(shift.rows[0].after.dueDate, '2026-10-06');
  const after = applyPatchTransaction(before, shift.transaction); assert.ok(after.store);
  assert.deepEqual(after.store.entities, before.entities); assert.deepEqual(after.store.engagements[1], before.engagements[1]);
  assert.deepEqual(after.store.engagements[0].reportingPeriods, before.engagements[0].reportingPeriods);
  const sequence = prepareSchedules(before, [{ id: aId, days: '2' }, { id: 'eff-beta-year', days: '3' }], { action: 'sequence', firstStart: '2026-09-30' });
  assert.equal(sequence.rows[0].after.dueDate, '2026-10-02'); assert.equal(sequence.rows[1].after.startDate, '2026-10-05');
  const locked = copy(before), calculated = backward('2026-10-05', 3);
  Object.assign(locked.engagements[0], { startDate: calculated.startDate, dueDate: calculated.dueDate, schedulePlan: calculated.schedulePlan });
  assert.equal(prepareSchedules(locked, [{ id: aId }], { offset: 1 }).error, 'locked');
  const six = copy(before), weekend = forward('2026-10-02', 3, 'mon-sat');
  Object.assign(six.engagements[0], { startDate: weekend.startDate, dueDate: weekend.dueDate, schedulePlan: weekend.schedulePlan });
  assert.equal(prepareSchedules(six, [{ id: aId }], { offset: 0, workweek: 'mon-fri' }).rows[0].days, 3);
});
test('manual and shared quick schedule paths remove stale plans, reject same-id wrong-period drafts, and preserve unrelated fields', () => {
  const before = efficiencyWorkspace(), result = forward('2026-09-30', 3);
  Object.assign(before.engagements[0], { schedulePlan: result.schedulePlan });
  const record = before.engagements[0], baseline = quickUpdateValues(record);
  const patch = prepareQuickUpdate(before, aId, baseline, { ...baseline, dueDate: '2026-10-09' });
  assert.deepEqual(patch.patch, { dueDate: '2026-10-09', schedulePlan: undefined });
  const request = { draft: initialScheduleDraft(record), baselinePlan: record.schedulePlan, baselineContext: quickUpdateContext(record) };
  const wrong = copy(before); wrong.engagements[0].reportingPeriods[0].periodEnd = '2025-11-30';
  assert.equal(prepareQuickUpdate(wrong, aId, baseline, { ...baseline, owner: 'New' }, request).error, 'conflict');
  const manual = { ...request, draft: { ...request.draft, mode: 'manual', snapshot: null } };
  assert.equal(prepareQuickUpdate(before, aId, baseline, baseline, manual).patch.schedulePlan, undefined);
});
test('follow-up is explicit, source-scoped, not in future and independent of completion', () => {
  const before = efficiencyWorkspace();
  const preview = prepareFollowUp(before, aId, ['same-item'], '2026-09-26', '1', 'mon-fri', '2026-09-27');
  assert.equal(preview.dueDate, '2026-09-28');
  const after = applyPatchTransaction(before, preview.transaction).store;
  assert.deepEqual(after.engagements[0].workstreams, before.engagements[0].workstreams);
  assert.deepEqual(after.engagements[1], before.engagements[1]); assert.equal(followUpsDue(after, '2026-09-27').length, 0);
  assert.equal(followUpsDue(after, '2026-09-28').length, 1);
  const closed = applyPatchTransaction(after, prepareOutstandingStatus(after, aId, ['same-item'], 'resolved').transaction).store;
  assert.equal(followUpsDue(closed, '2026-09-28').length, 0);
  assert.equal(prepareFollowUp(before, aId, ['same-item'], '2026-09-28', 3, 'mon-fri', '2026-09-27').error, 'date');
});
test('batch next annuals follow each actual period and reset status, plans, next actions, reminders and priority', () => {
  const before = efficiencyWorkspace(); before.engagements[0].priority = 'urgent';
  before.engagements[0].nextAction = { kind: 'outstanding', itemId: 'same-item' };
  const rows = nextAnnualRows(before, ['eff-alpha', 'eff-beta']);
  assert.deepEqual(rows.map(r => [r.periodStart, r.periodEnd]), [['2026-01-01', '2026-12-31'], ['2026-07-01', '2027-06-30']]);
  assert.equal(rows.every(r => r.owner === ''), true);
  const preview = prepareAnnualBatch(before, rows), after = applyPreparedCandidate(before, preview).store;
  assert.equal(after.engagements.length, 4); assert.deepEqual(after.entities, before.entities);
  for (const e of preview.created) { assert.equal(e.nextAction, undefined); assert.equal(e.remainingWork, undefined);
    assert.equal(e.schedulePlan, undefined); assert.equal(e.priority, undefined); assert.equal(e.startDate, ''); assert.deepEqual(e.outstandingItems, []);
    assert.equal(e.workstreams.flatMap(w => w.nodes).flatMap(n => n.conditions).every(c => c.done === false), true); }
  assert.deepEqual(after.engagements.slice(0, 2), before.engagements);
  const invalid = copy(rows); invalid[1].periodStart = '2025-01-01'; invalid[1].periodEnd = '2026-06-30';
  assert.equal(prepareAnnualBatch(before, invalid).error, 'period');
});
test('outline import is explicit appendable structure, bounds inputs, rejects orphan/ambiguous indentation and resets completion', () => {
  const parsed = parseOutline('Planning\n  Accept engagement\n\tConfirm scope\n\nFieldwork\n  Perform tests');
  assert.equal(parsed.nodes.length, 2); assert.deepEqual(parsed.nodes[0].conditions, ['Accept engagement', 'Confirm scope']);
  assert.equal(outlineNodes(parsed).flatMap(n => n.conditions).every(c => c.done === false), true);
  assert.equal(parseOutline('  Orphan').error, 'outline'); assert.equal(parseOutline('Node\n Single-space').error, 'outline');
  assert.equal(parseOutline(Array(201).fill('Node').join('\n')).error, 'size');
});
test('next action and alias search reuse canonical identity without changing output names or completed state', () => {
  const before = efficiencyWorkspace(), record = before.engagements[0];
  record.nextAction = { kind: 'outstanding', itemId: 'same-item' };
  assert.equal(nextEngagementAction(record, before.outstandingStatuses).item.title, 'Bank statement');
  record.outstandingItems[0].status = 'resolved';
  assert.equal(nextEngagementAction(record, before.outstandingStatuses).node.id, 'eff-pending');
  const hits = findQuickOpenRecords(quickOpenIndex(before), 'EAL').records;
  assert.ok(hits.some(r => r.id === aId)); assert.equal(hits.every(r => r.name === 'Efficiency Alpha Limited'), true);
  const schedules = filterScheduleRows(scheduleRows(normalizeStore(before), 'active'), { query: 'EAL' });
  assert.equal(schedules.length, 1); assert.equal(schedules[0].name, 'Efficiency Alpha Limited');
});
test('group missing-year creation preserves the frozen slot and only links after a fresh, exact-period explicit confirmation', () => {
  const before = holdingWorkspace(), request = componentCreationContext(before, 'holding-annual', 'part-beta'); assert.ok(request);
  const entity = before.entities.find(e => e.id === request.entityId);
  const created = makeEngagement({ entityId: entity.id, reportingPeriods: request.reportingPeriods }, { entity, store: before, sourceMode: 'blank' });
  const intermediate = canonical({ ...before, engagements: [...before.engagements, created] });
  assert.equal(componentContextCurrent(intermediate, request), true);
  const after = linkCreatedComponent(intermediate, request, created.id); assert.ok(after.store);
  const part = after.store.engagements.find(e => e.id === 'holding-annual').consolidation.components.find(c => c.id === 'part-beta');
  assert.equal(part.engagementId, created.id); assert.equal(part.readinessConditions[0].done, false);
  const original = before.engagements.find(e => e.id === 'holding-annual').consolidation.components;
  assert.deepEqual(after.store.engagements.find(e => e.id === 'holding-annual').consolidation.components.filter(c => c.id !== 'part-beta'), original.filter(c => c.id !== 'part-beta'));
  intermediate.engagements.find(e => e.id === 'holding-annual').owner = 'Changed';
  assert.equal(linkCreatedComponent(intermediate, request, created.id).error, 'changed');
});
test('holding not-ready filter explains saved conditions and does not hide archived or wrong-period blockers', () => {
  const before = holdingWorkspace(), parent = before.engagements.find(e => e.id === 'holding-annual');
  const rows = holdingComponentRows(before, parent); assert.equal(filterHoldingComponents(rows, '', 'notready').length, 4);
  assert.equal(rows.find(r => r.component.id === 'part-alpha').status, 'mismatch');
  assert.equal(rows.find(r => r.component.id === 'part-cedar').ready, false);
  assert.equal(rows.find(r => r.component.id === 'part-missing').ready, false);
});
test('status-definition changes invalidate a prior batch preview instead of silently using a default status', () => {
  const before = efficiencyWorkspace(), preview = prepareOutstandingStatus(before, aId, ['same-item'], 'resolved');
  const changed = copy(before); changed.outstandingStatuses = changed.outstandingStatuses.filter(s => s.id !== 'resolved');
  assert.equal(applyPatchTransaction(changed, preview.transaction).error, 'changed');
});
test('a plan introduced after an inline manual draft cannot be silently retained with incompatible edited dates', () => {
  const before = efficiencyWorkspace(), record = before.engagements[0], baseline = quickUpdateValues(record);
  const request = { draft: initialScheduleDraft(record), baselinePlan: undefined, baselineContext: quickUpdateContext(record) };
  record.schedulePlan = forward(record.startDate, 3).schedulePlan;
  assert.equal(prepareQuickUpdate(before, aId, baseline, { ...baseline, dueDate: '2026-10-09' }, request).error, 'conflict');
  const ownerOnly = prepareQuickUpdate(before, aId, baseline, { ...baseline, owner: 'Only owner' }, request);
  assert.deepEqual(ownerOnly.patch, { owner: 'Only owner' });
});
test('company merge unions optional aliases, retains explicit language and refuses conflicting preferences', () => {
  const before = efficiencyWorkspace(); before.entities[1].aliases = ['EBL']; before.entities[1].followUpLanguage = 'en';
  const merged = mergeEntities(before, 'eff-beta', 'eff-alpha');
  assert.deepEqual(merged.entities[0].aliases, ['EAL', 'EBL']); assert.equal(merged.entities[0].followUpLanguage, 'en');
  before.entities[0].followUpLanguage = 'zh-Hant'; assert.throws(() => mergeEntities(before, 'eff-beta', 'eff-alpha'));
});
