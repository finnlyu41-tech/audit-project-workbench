import { canonicalStorePayload, emptyStore, makeEntity, makeEngagement, makeNode, makeWorkstream, normalizeStore } from '../../src/dashboard/model.js';

// Fixed fictional records: creation order deliberately differs from priority order.
export function projectPriorityFixture() {
  const base = canonicalStorePayload(emptyStore());
  for (const [key, priority] of [['normal', 'normal'], ['low', 'low'], ['high', 'high'], ['urgent', 'urgent'], ['group', 'high']]) {
    const entity = makeEntity({ id: `priority-entity-${key}`, legalName: `${key[0].toUpperCase()+key.slice(1)} Example Limited`,
      kind: key === 'group' ? 'holding_company' : 'company' });
    const record = makeEngagement({ id: `priority-${key}`, entityId: entity.id, priority,
      periodStart: '2026-01-01', periodEnd: '2026-12-31', startDate: '2026-09-01', dueDate: '2027-12-01', owner: 'Example Reviewer' },
      { entity, store: base, sourceMode: 'blank', workstreamCategories: base.workstreamCategories });
    const node = makeNode({ title: 'Fictional work', conditions: ['Check evidence', 'Review work'] });
    if (key === 'group') record.consolidation = { mode: 'simple', enabled: true, nodes: [node], components: [] };
    else record.workstreams = [makeWorkstream({ type: 'audit', categoryId: 'audit' }, [node])];
    base.entities.push(entity); base.engagements.push(record); base.entityOrder.push(entity.id);
  }
  return canonicalStorePayload(normalizeStore(base));
}
