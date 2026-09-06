import { canonicalStorePayload, makeEngagement, makeEntity, makeNode, makeTaxDeadline, normalizeStore } from '../../src/dashboard/model.js';
import { holdingWorkspace } from './holding-workspace.js';

export function recoveryWorkspace() {
  const store = holdingWorkspace();
  const middle = makeEntity({ id: 'recovery-middle', legalName: 'Fictional Intermediate Holdings',
    kind: 'holding_company', parentEntityId: 'holding-parent', relationshipRole: 'Subsidiary' });
  const job = makeEngagement({ id: 'recovery-middle-annual', entityId: middle.id,
    periodStart: '2026-01-01', periodEnd: '2026-12-31' }, { entity: middle, store, sourceMode: 'blank' });
  job.consolidation.nodes = [makeNode({ title: 'Fictional consolidation stage', conditions: ['Reviewed', 'Pending'] })];
  job.consolidation.nodes[0].conditions[0].done = true;
  store.entities.push(middle); store.engagements.push(job);
  store.entities.find((item) => item.id === 'holding-beta').parentEntityId = middle.id;
  const current = store.engagements.find((item) => item.id === 'alpha-current');
  current.reportingPeriods = [{ id: 'recovery-2026', periodPreset: 'calendar', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
    { id: 'recovery-2027', periodPreset: 'calendar', periodStart: '2027-01-01', periodEnd: '2027-12-31' }];
  current.outstandingItems = [{ id: 'recovery-query', title: 'Fictional signed confirmation', status: 'missing_document', note: 'Internal fictional note — 原文', workstreamId: null }];
  const alpha = store.entities.find((item) => item.id === current.entityId);
  alpha.taxDeadlines = [makeTaxDeadline({ id: 'recovery-tax', category: 'custom', customName: 'Fictional deadline',
    dueDate: '2027-02-01', originalDueDate: '2027-01-15', revisions: [
      { id: 'recovery-revision', fromDueDate: '2027-01-15', toDueDate: '2027-02-01', reason: 'Fictional extension', changedAt: '2026-09-01T00:00:00Z' }] })];
  store.samples[0].versionNote = 'Fictional preserved version';
  store.scheduleOrder = ['group:holding-annual', `group:${job.id}`, 'project:alpha-current'];
  return canonicalStorePayload(normalizeStore(store));
}
