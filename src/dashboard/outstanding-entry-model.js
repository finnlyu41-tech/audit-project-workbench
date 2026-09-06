import { engagementReportingPeriods, makeOutstandingItem } from './model.js';

const FIELDS = ['title', 'note', 'status', 'workstreamId'];
export function newOutstandingValues(statuses, workstreamId = '') {
  return { title: '', note: '', status: statuses.find((status) => !status.closed)?.id || statuses[0]?.id || '',
    workstreamId: workstreamId || '' };
}
export function outstandingTargetSnapshot(store, kind, id) {
  const engagement = store.engagements.find((item) => item.id === id);
  const entity = store.entities.find((item) => item.id === engagement?.entityId);
  if (!engagement || !entity) return null;
  return { id, entityId: entity.id, kind, companyName: entity.legalName,
    engagement, signature: JSON.stringify([entity.id, entity.kind, engagementReportingPeriods(engagement)]) };
}
// Validate the current canonical source before creating an item. No fallback to another year/module.
export function prepareOutstandingSave(store, baseline, values, initial = null) {
  if (!baseline) return { error: 'source' };
  const current = outstandingTargetSnapshot(store, baseline.kind, baseline.id);
  if (!current) return { error: 'source' };
  const entity = store.entities.find((item) => item.id === current.entityId);
  if (current.engagement.archived || entity.archived) return { error: 'readonly' };
  if (current.signature !== baseline.signature
    || (entity.kind === 'holding_company' ? 'group' : 'project') !== baseline.kind) return { error: 'source' };
  const cleaned = { title: String(values.title || '').trim(), note: String(values.note || '').trim(),
    status: values.status, workstreamId: values.workstreamId || null };
  if (!cleaned.title) return { error: 'title' };
  if (!store.outstandingStatuses.some((status) => status.id === cleaned.status)) return { error: 'status' };
  if (cleaned.workstreamId && (baseline.kind !== 'project'
    || !current.engagement.workstreams.some((item) => item.id === cleaned.workstreamId))) return { error: 'module' };
  if (!initial) return { item: makeOutstandingItem(cleaned, store.outstandingStatuses) };
  const existing = current.engagement.outstandingItems.find((item) => item.id === initial.id);
  if (!existing) return { error: 'missing' };
  const patch = {};
  for (const field of FIELDS) {
    const prior = initial[field] || null; const next = cleaned[field] || null;
    if (prior === next) continue;
    if ((existing[field] || null) !== prior && (existing[field] || null) !== next) return { error: 'conflict' };
    patch[field] = cleaned[field];
  }
  return { item: { ...existing, ...patch, updatedAt: new Date().toISOString() } };
}
