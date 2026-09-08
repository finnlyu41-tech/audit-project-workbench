import { canonicalStorePayload, emptyStore, makeEntity, makeEngagement, makeWorkstream, makeNode, makeOutstandingItem,
  makeTaxDeadline, normalizeStore } from '../../src/dashboard/model.js';

// Deliberately synthetic. Item ids repeat across sources to exercise isolation.
export function efficiencyWorkspace() {
  const base = canonicalStorePayload(emptyStore());
  const alpha = makeEntity({ id: 'eff-alpha', legalName: 'Efficiency Alpha Limited', aliases: ['EAL'], fiscalYearPreset: 'calendar' });
  const beta = makeEntity({ id: 'eff-beta', legalName: 'Efficiency Beta Limited', incorporationDate: '2025-01-01', fiscalYearPreset: 'calendar' });
  const make = (entity, id, start, end, owner) => makeEngagement({ id, entityId: entity.id, owner,
    periodStart: start, periodEnd: end, startDate: '2026-09-30', dueDate: '2026-10-05', reportingFramework: 'HKFRS Accounting Standards' },
    { entity, sourceMode: 'blank', workstreamCategories: base.workstreamCategories });
  const a = make(alpha, 'eff-alpha-year', '2025-01-01', '2025-12-31', 'Alex Example');
  const b = make(beta, 'eff-beta-year', '2025-01-01', '2026-06-30', 'Blair Example');
  const done = makeNode({ title: 'Completed planning', conditions: ['Planning checked'] }); done.id = 'eff-done'; done.conditions[0].done = true;
  const pending = makeNode({ title: 'Remaining audit work', conditions: ['Testing complete', 'Results reviewed'] }); pending.id = 'eff-pending';
  a.workstreams = [makeWorkstream({ type: 'audit', categoryId: 'audit' }, [])];
  a.workstreams[0].id = 'eff-audit'; a.workstreams[0].nodes = [done, pending];
  a.outstandingItems = ['Bank statement', 'Inventory schedule'].map((title, i) => makeOutstandingItem({ id: i ? 'second-item' : 'same-item', title,
    status: 'missing_document', workstreamId: 'eff-audit', note: 'PRIVATE-ITEM-NOTE' }, base.outstandingStatuses));
  b.outstandingItems = [makeOutstandingItem({ id: 'same-item', title: 'Different company request', status: 'missing_document' }, base.outstandingStatuses)];
  a.notes = 'PRIVATE-PROJECT-NOTE'; b.notes = 'PRIVATE-BETA-NOTE';
  alpha.taxDeadlines = [makeTaxDeadline({ id: 'eff-tax', category: 'tax_payment', taxYear: '2025/26', dueDate: '2026-11-30',
    linkedEngagementId: a.id, reference: 'PRIVATE-TAX-REFERENCE', note: 'PRIVATE-TAX-NOTE' })];
  return canonicalStorePayload(normalizeStore({ ...base, entities: [alpha, beta], engagements: [a, b],
    entityOrder: [alpha.id, beta.id], scheduleOrder: [`project:${a.id}`, `project:${b.id}`] }));
}
