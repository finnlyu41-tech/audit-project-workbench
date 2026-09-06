import { holdingWorkspace } from './holding-workspace.js';
import { canonicalStorePayload, makeEntity, makeEngagement, makeNode, makeTaxDeadline, normalizeStore } from '../../src/dashboard/model.js';

// Current company relationships deliberately differ from the saved annual scope.
export function operationBoundaryFixture() {
  const store = holdingWorkspace();
  const nextParent = makeEntity({ id: 'new-current-parent', legalName: 'New Current Holding', kind: 'holding_company' });
  store.entities.push(nextParent);
  store.entities.find(e => e.id === 'holding-alpha').parentEntityId = nextParent.id;
  const beta = store.entities.find(e => e.id === 'holding-beta');
  store.engagements.push(makeEngagement({ id: 'beta-current', entityId: beta.id,
    periodStart: '2026-01-01', periodEnd: '2026-12-31' }, { entity: beta, store, sourceMode: 'blank' }));
  const parent = store.engagements.find(e => e.id === 'holding-annual');
  parent.consolidation.nodes = [makeNode({ title: 'Consolidation review', conditions: ['Check eliminations'] })];
  parent.outstandingItems = [{ id: 'group-request', title: 'Parent approval pending', status: 'missing_document', note: 'Private parent note' }];
  const alpha = store.engagements.find(e => e.id === 'alpha-old');
  alpha.outstandingItems = [{ id: 'alpha-request', title: 'Component confirmation pending', status: 'missing_document', note: 'Private alpha note' }];
  const entity = store.entities.find(e => e.id === alpha.entityId);
  entity.taxDeadlines = [makeTaxDeadline({ id: 'alpha-tax', category: 'tax_payment', dueDate: '2026-12-01',
    linkedEngagementId: alpha.id, reference: 'FICTIONAL-REFERENCE' })];
  return canonicalStorePayload(normalizeStore(store));
}
