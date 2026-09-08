import { canonicalStorePayload, normalizeStore, engagementReportingPeriods, engagementsForEntity, makeEngagement, makeOutstandingItem,
  makeNode, makeEntity, componentsForCurrentStructure, projectStats, groupProgress, outstandingIsOpen, suggestedReportingPeriod,
  yearEndOrPeriodLabel, engagementTypesLabel, uid, isValidStore } from './model.js';
import { calculateWorkingSchedule, countWorkingDays, shiftWorkingDate, followingWorkingDate, dateOnly, validWorkdays } from './working-days.js';
import { HK_CALENDAR_VERSION } from './hk-public-holidays.js';
import { validFollowUp, localIsoDate } from './efficiency-data.js';

export const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const workspaceFingerprint = store => JSON.stringify(canonicalStorePayload(store));
export function sourceFor(store, engagementId) {
  const engagement = store.engagements.find(row => row.id === engagementId);
  const entity = store.entities.find(row => row.id === engagement?.entityId);
  return engagement && entity ? { engagement, entity, readOnly: Boolean(entity.archived || engagement.archived) } : null;
}
const context = source => source ? JSON.stringify([source.entity.id, source.entity.archived, source.engagement.id,
  source.engagement.archived, engagementReportingPeriods(source.engagement)]) : '';
const fields = (row, keys) => Object.fromEntries(keys.map(key => [key, row?.[key]]));
const patchFields = (row, patch) => {
  const next = { ...row };
  for (const [key, value] of Object.entries(patch)) { if (value === undefined) delete next[key]; else next[key] = value; }
  return next;
};
export function makePatchTransaction(store, changes, title = '') {
  if (!changes.length || changes.length > 200) return { error: 'selection' };
  const seen = new Set(); const sources = new Map(); const operations = [];
  for (const change of changes) {
    const source = sourceFor(store, change.id);
    if (!source || source.readOnly) return { error: 'readonly' };
    const row = change.itemId ? source.engagement.outstandingItems.find(item => item.id === change.itemId) : source.engagement;
    const key = JSON.stringify([change.id, change.itemId || '']);
    if (!row || seen.has(key)) return { error: 'selection' };
    const keys = Object.keys(change.patch);
    const allowed = change.itemId ? ['status', 'followUp'] : ['startDate', 'dueDate', 'schedulePlan', 'remainingWork', 'nextAction', 'archived', 'outstandingItems'];
    if (!keys.length || keys.some(k => !allowed.includes(k))) return { error: 'selection' };
    seen.add(key); sources.set(change.id, { id: change.id, context: context(source), fingerprint: JSON.stringify(source.engagement) });
    operations.push({ id: change.id, itemId: change.itemId, before: fields(row, keys), after: change.patch });
  }
  return { transaction: { title, operations, sources: [...sources.values()],
    statuses: operations.some(op => op.itemId || Object.hasOwn(op.after, 'outstandingItems')) ? JSON.stringify(store.outstandingStatuses) : undefined } };
}
// Apply all operations to a new store or none. Undo compares only fields written
// by this transaction, retaining later edits to notes, owners and other records.
export function applyPatchTransaction(store, tx, undo = false) {
  if (!tx?.operations?.length || tx.operations.length > 200 || !Array.isArray(tx.sources)) return { error: 'selection' };
  if (tx.statuses !== undefined && tx.statuses !== JSON.stringify(store.outstandingStatuses)) return { error: 'changed' };
  for (const snapshot of tx.sources) {
    const source = sourceFor(store, snapshot.id);
    if (!source || source.readOnly || context(source) !== snapshot.context) return { error: 'readonly' };
    if (!undo && JSON.stringify(source.engagement) !== snapshot.fingerprint) return { error: 'changed' };
  }
  for (const op of tx.operations) {
    const source = sourceFor(store, op.id);
    const row = op.itemId ? source?.engagement.outstandingItems.find(item => item.id === op.itemId) : source?.engagement;
    const expected = undo ? op.after : op.before;
    if (!row || !equal(fields(row, Object.keys(expected)), expected)) return { error: 'changed' };
  }
  const now = new Date().toISOString();
  const next = { ...store, engagements: store.engagements.map(engagement => {
    const ops = tx.operations.filter(op => op.id === engagement.id); if (!ops.length) return engagement;
    let result = engagement;
    for (const op of ops) {
      const patch = undo ? op.before : op.after;
      result = op.itemId ? { ...result, outstandingItems: result.outstandingItems.map(item => item.id === op.itemId
        ? { ...patchFields(item, patch), updatedAt: now } : item) } : patchFields(result, patch);
    }
    return { ...result, updatedAt: now };
  }) };
  if (!isValidStore(next)) return { error: 'invalid' };
  return { store: normalizeStore(canonicalStorePayload(next)), transaction: tx };
}
export function prepareOutstandingStatus(store, engagementId, itemIds, status) {
  if (!store.outstandingStatuses.some(s => s.id === status)) return { error: 'status' };
  if (!Array.isArray(itemIds) || !itemIds.length || new Set(itemIds).size !== itemIds.length) return { error: 'selection' };
  return makePatchTransaction(store, itemIds.map(itemId => ({ id: engagementId, itemId, patch: { status } })), 'outstanding-status');
}
export function parseLines(text) {
  if (typeof text !== 'string' || text.length > 50000) return { error: 'size' };
  const lines = text.split(/\r?\n/u).map((title, i) => ({ title: title.trim(), line: i + 1 })).filter(row => row.title);
  if (!lines.length || lines.length > 100 || lines.some(row => row.title.length > 1000)) return { error: 'size' };
  const seen = new Set();
  return { lines: lines.map(row => { const duplicate = seen.has(row.title); seen.add(row.title); return { ...row, duplicate }; }) };
}
export function prepareOutstandingLines(store, engagementId, text, workstreamId = '', status) {
  const source = sourceFor(store, engagementId); if (!source || source.readOnly) return { error: 'readonly' };
  const parsed = parseLines(text); if (parsed.error) return parsed;
  if (workstreamId && !source.engagement.workstreams.some(w => w.id === workstreamId)) return { error: 'module' };
  if (!store.outstandingStatuses.some(s => s.id === status && !s.closed)) return { error: 'status' };
  const existing = new Set(source.engagement.outstandingItems.map(item => item.title));
  const items = parsed.lines.map(row => makeOutstandingItem({ title: row.title, workstreamId, status }, store.outstandingStatuses));
  return { ...makePatchTransaction(store, [{ id: engagementId, patch: { outstandingItems: [...source.engagement.outstandingItems, ...items] } }], 'outstanding-lines'),
    expected: workspaceFingerprint(store), count: items.length, lines: parsed.lines.map(row => ({ ...row, duplicate: row.duplicate || existing.has(row.title) })),
    candidate: { ...store, engagements: store.engagements.map(e => e.id === engagementId ? { ...e,
      outstandingItems: [...e.outstandingItems, ...items], updatedAt: new Date().toISOString() } : e) } };
}
export function applyPreparedCandidate(store, preview) {
  if (!preview || workspaceFingerprint(store) !== preview.expected) return { error: 'changed' };
  if (!isValidStore(preview.candidate)) return { error: 'invalid' };
  return { store: normalizeStore(canonicalStorePayload(preview.candidate)) };
}
export function scheduleCandidates(store) {
  return store.engagements.filter(e => {
    const source = sourceFor(store, e.id); if (!source || source.readOnly) return false;
    return !(source.entity.kind === 'holding_company' ? groupProgress(store, e.id).ready : projectStats(e).complete);
  });
}
export function prepareSchedules(store, selected, { action = 'shift', offset = 0, firstStart = '', workweek = 'mon-fri' } = {}) {
  if (!['shift', 'sequence'].includes(action)) return { error: 'selection' };
  if (!Array.isArray(selected) || !selected.length || selected.length > 100 || new Set(selected.map(e => e.id)).size !== selected.length)
    return { error: 'selection' };
  const allowed = new Set(scheduleCandidates(store).map(e => e.id));
  const changes = []; const rows = []; let cursor = firstStart;
  for (const item of selected) {
    if (!allowed.has(item.id)) return { error: 'readonly' };
    const source = sourceFor(store, item.id); const current = source.engagement;
    const counted = countWorkingDays(current.startDate, current.dueDate, workweek);
    const days = action === 'sequence' ? Number(item.days) : current.schedulePlan?.workdays ?? counted.workdays;
    if (!validWorkdays(days)) return { error: counted.error || 'duration', id: item.id };
    let start = cursor;
    if (action === 'shift') {
      const shifted = shiftWorkingDate(current.startDate, Number(offset), workweek);
      if (shifted.error) return { ...shifted, id: item.id };
      start = shifted.date;
    }
    const result = calculateWorkingSchedule(start, days, workweek);
    if (result.error) return { ...result, id: item.id };
    if (current.schedulePlan?.direction === 'backward' && result.dueDate > current.schedulePlan.targetDueDate) return { error: 'locked', id: item.id };
    const plan = current.schedulePlan?.direction === 'backward' ? { ...result.schedulePlan, direction: 'backward',
      targetDueDate: current.schedulePlan.targetDueDate, bufferDays: countWorkingDays(result.dueDate, current.schedulePlan.targetDueDate, workweek).workdays - 1 } : result.schedulePlan;
    const patch = { startDate: result.startDate, dueDate: result.dueDate, schedulePlan: plan };
    changes.push({ id: item.id, patch }); rows.push({ id: item.id, company: source.entity.legalName, period: current,
      before: { startDate: current.startDate, dueDate: current.dueDate }, after: patch, days });
    if (action === 'sequence' && selected.at(-1).id !== item.id) {
      const next = shiftWorkingDate(result.dueDate, 1, workweek); if (next.error) return next; cursor = next.date;
    }
  }
  return { ...makePatchTransaction(store, changes, 'schedule'), rows };
}
export function prepareFollowUp(store, engagementId, itemIds, sentDate, interval, workweek = 'mon-fri', today = localIsoDate()) {
  if (!dateOnly(sentDate) || sentDate > today || !validWorkdays(Number(interval))) return { error: 'date' };
  const source = sourceFor(store, engagementId);
  if (!source || source.readOnly || !itemIds.length || new Set(itemIds).size !== itemIds.length) return { error: 'selection' };
  if (itemIds.some(id => !source.engagement.outstandingItems.some(item => item.id === id && outstandingIsOpen(item, store.outstandingStatuses)))) return { error: 'changed' };
  const shifted = followingWorkingDate(sentDate, interval, workweek); if (shifted.error) return shifted;
  const followUp = { sentDate, dueDate: shifted.date, interval: Number(interval), workweek, calendarVersion: HK_CALENDAR_VERSION };
  if (!validFollowUp(followUp)) return { error: 'date' };
  return { ...makePatchTransaction(store, itemIds.map(itemId => ({ id: engagementId, itemId, patch: { followUp } })), 'follow-up'), dueDate: shifted.date };
}
export function followUpsDue(store, today = localIsoDate()) {
  return store.engagements.flatMap(e => {
    const source = sourceFor(store, e.id); if (!source || source.readOnly) return [];
    return e.outstandingItems.filter(item => item.followUp?.dueDate <= today && outstandingIsOpen(item, store.outstandingStatuses))
      .map(item => ({ ...source, item }));
  }).sort((a, b) => a.item.followUp.dueDate.localeCompare(b.item.followUp.dueDate));
}
export function parseOutline(text) {
  if (typeof text !== 'string' || text.length > 50000) return { error: 'size' };
  const rows = text.split(/\r?\n/u); const nodes = []; let total = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index]; if (!raw.trim()) continue;
    const condition = /^(?: {2}|\t)/u.test(raw), title = raw.trim().replace(/^[-*] /u, '');
    if (!title || title.length > 1000 || ++total > 200) return { error: 'size', line: index + 1 };
    if (/^ (?! )/u.test(raw) || (condition && !nodes.length)) return { error: 'outline', line: index + 1 };
    if (condition) nodes.at(-1).conditions.push(title); else nodes.push({ title, description: '', conditions: [] });
  }
  return nodes.length ? { nodes } : { error: 'outline' };
}
export const outlineNodes = parsed => parsed.nodes.map(row => makeNode(row));
export function nextAnnualRows(store, companyIds) {
  return companyIds.flatMap(id => { const entity = store.entities.find(e => e.id === id && !e.archived); if (!entity) return [];
    const source = engagementsForEntity(store, id)[0] || null;
    return [{ id, sourceId: source?.id || '', ...suggestedReportingPeriod(entity, store.engagements), owner: '' }]; });
}
export function prepareAnnualBatch(store, rows) {
  if (!rows?.length || rows.length > 100 || new Set(rows.map(r => r.id)).size !== rows.length) return { error: 'selection' };
  let candidate = { ...store, engagements: [...store.engagements], scheduleOrder: [...store.scheduleOrder] }; const created = [];
  try {
    for (const row of rows) {
      const entity = store.entities.find(e => e.id === row.id && !e.archived);
      const source = row.sourceId ? store.engagements.find(e => e.id === row.sourceId && e.entityId === row.id) : null;
      if (!entity || (row.sourceId && !source)) return { error: 'changed', id: row.id };
      const engagement = makeEngagement({ entityId: row.id, periodPreset: row.periodPreset || 'custom', periodStart: row.periodStart,
        periodEnd: row.periodEnd, owner: row.owner || '', reportingFramework: source?.reportingFramework || '' }, {
        entity, store: candidate, sourceMode: source ? 'previous' : 'blank', sourceEngagement: source,
        workstreamCategories: store.workstreamCategories, outstandingStatuses: store.outstandingStatuses });
      created.push(engagement); candidate.engagements.push(engagement);
      candidate.scheduleOrder.push(`${entity.kind === 'holding_company' ? 'group' : 'project'}:${engagement.id}`);
    }
    candidate.engagements = candidate.engagements.map(e => created.includes(e) && e.consolidation ? { ...e, consolidation: { ...e.consolidation,
      components: componentsForCurrentStructure(candidate, e.entityId, e.periodStart, e.periodEnd, undefined, e.reportingPeriods) } } : e);
    return { expected: workspaceFingerprint(store), candidate, created };
  } catch { return { error: 'period' }; }
}

export function componentCreationContext(store, groupId, componentId) {
  const source = sourceFor(store, groupId);
  const component = source?.engagement.consolidation?.components.find(c => c.id === componentId);
  const entity = store.entities.find(e => e.id === component?.entityId && !e.archived);
  if (!source || source.readOnly || source.entity.kind !== 'holding_company' || !component || !entity) return null;
  return { groupId, componentId, entityId: entity.id, baseline: JSON.stringify(source.engagement), entityFingerprint: JSON.stringify(entity),
    reportingPeriods: engagementReportingPeriods(source.engagement) };
}
export function componentContextCurrent(store, request) {
  const next = componentCreationContext(store, request?.groupId, request?.componentId);
  return Boolean(next && next.entityId === request.entityId && next.baseline === request.baseline && next.entityFingerprint === request.entityFingerprint);
}
export function linkCreatedComponent(store, request, engagementId) {
  if (!componentContextCurrent(store, request)) return { error: 'changed' };
  const source = sourceFor(store, engagementId), parent = sourceFor(store, request.groupId);
  if (!source || source.readOnly || source.entity.id !== request.entityId
    || !equal(engagementReportingPeriods(source.engagement).map(p => [p.periodStart, p.periodEnd]),
      engagementReportingPeriods(parent.engagement).map(p => [p.periodStart, p.periodEnd]))) return { error: 'period' };
  const candidate = { ...store, engagements: store.engagements.map(e => e.id !== request.groupId ? e : { ...e,
    updatedAt: new Date().toISOString(), consolidation: { ...e.consolidation, components: e.consolidation.components.map(c => c.id !== request.componentId ? c : {
      ...c, engagementId, periodSnapshot: { engagementId, periodStart: source.engagement.periodStart, periodEnd: source.engagement.periodEnd,
        reportingPeriods: engagementReportingPeriods(source.engagement), label: yearEndOrPeriodLabel(source.engagement, 'en') } }) } }) };
  if (!isValidStore(candidate)) return { error: 'invalid' };
  return { store: normalizeStore(canonicalStorePayload(candidate)) };
}
