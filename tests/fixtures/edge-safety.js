import { canonicalStorePayload, emptyStore, makeEntity, makeEngagement, makeNode, makeTaxDeadline, normalizeStore } from '../../src/dashboard/model.js';
import { holdingWorkspace } from './holding-workspace.js';

export function readyGroupFixture() {
  const store = holdingWorkspace(); const group = store.engagements.find(e => e.id === 'holding-annual');
  group.consolidation.components = group.consolidation.components.slice(0, 1);
  group.consolidation.nodes = [makeNode({ title: 'Final consolidation check', conditions: ['Explicit final review'] })];
  group.consolidation.nodes[0].conditions[0].done = true;
  group.consolidation.components[0].readinessConditions.forEach(c => { c.done = true; });
  return canonicalStorePayload(normalizeStore(store));
}
export function mergeFixture() {
  const store = canonicalStorePayload(emptyStore());
  const parent = makeEntity({ id: 'merge-parent', legalName: 'Fictional Parent', kind: 'holding_company' });
  const source = makeEntity({ id: 'merge-source', legalName: 'Fictional Twin Limited', parentEntityId: parent.id,
    relationshipRole: 'Subsidiary', notes: 'Source-only note\n原文保留', incorporationDate: '2010-04-01' });
  const target = makeEntity({ id: 'merge-target', legalName: source.legalName });
  const job = makeEngagement({ id: 'merge-year', entityId: source.id, periodStart: '2025-01-01', periodEnd: '2025-12-31' },
    { entity: source, store, sourceMode: 'blank' });
  source.taxDeadlines = [makeTaxDeadline({ id: 'merge-tax', dueDate: '2026-09-30', linkedEngagementId: job.id, note: 'Tax note unchanged' })];
  return canonicalStorePayload(normalizeStore({ ...store, entities: [parent, source, target], engagements: [job] }));
}
export const sourceOf = store => store.entities.find(e => e.id === 'merge-source');
export const targetOf = store => store.entities.find(e => e.id === 'merge-target');
