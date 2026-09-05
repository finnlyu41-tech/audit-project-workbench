import { companyOverviewFixture } from './company-overview.js';
import { makeTaxDeadline } from '../../src/dashboard/model.js';

// Synthetic risk records, never copied from a real browser workspace.
export function reportUsabilityFixture() {
  const store = companyOverviewFixture();
  const company = store.entities.find((item) => item.id === 'overview-company');
  company.legalName = 'Report Example International Advisory and Assurance Limited';
  const combined = store.engagements.find((item) => item.id === 'overview-combined');
  combined.workstreams[0].nodes[0].conditions[0].done = false;
  combined.owner = 'Alex Report Long Owner Name';
  combined.dueDate = '2026-08-30';
  combined.outstandingItems = Array.from({ length: 23 }, (_, index) => ({
    id: `risk-${index}`, title: `Report outstanding ${String(index + 1).padStart(2, '0')} ${'LongReference'.repeat(5)}`,
    status: 'missing_document', note: 'PRIVATE_REPORT_NOTE', workstreamId: null,
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
  }));
  company.taxDeadlines = Array.from({ length: 23 }, (_, index) => makeTaxDeadline({
    id: `report-tax-${index}`, category: 'custom', customName: `Report tax ${String(index + 1).padStart(2, '0')}`,
    dueDate: '2026-08-31', taxYear: '2025/26', owner: combined.owner,
    reference: 'PRIVATE_REPORT_REFERENCE', note: 'PRIVATE_REPORT_NOTE', linkedEngagementId: combined.id,
  }));
  const group = store.engagements.find((item) => item.id === 'overview-group');
  group.dueDate = '2026-08-29';
  group.outstandingItems = [{ ...combined.outstandingItems[0], title: 'Separate holding risk with shared ID' }];
  return store;
}
