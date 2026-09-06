import { outstandingCenterFixture } from './outstanding-center.js';

// Fictional data with conspicuous internal sentinels and shared IDs across sources.
export function clientFollowupFixture() {
  const store = outstandingCenterFixture();
  const source = store.engagements.find((item) => item.id === 'overview-combined');
  const parent = store.engagements.find((item) => item.id === 'overview-group');
  source.notes = 'INTERNAL_ENGAGEMENT_NOTE'; source.owner = 'INTERNAL_OWNER';
  source.reportingFramework = 'INTERNAL_FRAMEWORK';
  source.outstandingItems = [
    { id: 'shared-item', title: 'Please provide the signed accounts — 请提供签署账目', status: 'missing_document', note: 'PRIVATE_ITEM_NOTE', workstreamId: null },
    { id: 'second-item', title: 'Please clarify the bank reconciliation', status: 'internal_followup', note: 'PRIVATE_SECOND_NOTE', workstreamId: null },
    { id: 'cleared-item', title: 'CLOSED_ITEM_MUST_NOT_APPEAR', status: 'resolved', note: '', workstreamId: null },
  ];
  source.outstandingItems[1].status = store.outstandingStatuses.find((status) => !status.closed).id;
  parent.outstandingItems = [{ id: 'shared-item', title: 'PARENT_ONLY_REQUEST', status: source.outstandingItems[1].status, note: 'PARENT_PRIVATE_NOTE', workstreamId: null }];
  const entity = store.entities.find((item) => item.id === source.entityId);
  entity.taxDeadlines = [{ id: 'private-tax', dueDate: '2030-12-31', reference: 'PRIVATE_TAX_REFERENCE', note: 'PRIVATE_TAX_NOTE' }];
  return { store, sourceId: source.id, groupId: parent.id, selectedIds: ['shared-item', 'second-item'] };
}
