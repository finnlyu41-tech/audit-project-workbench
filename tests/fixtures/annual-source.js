import { canonicalStorePayload, makeBlankSample, makeNode, normalizeStore } from '../../src/dashboard/model.js';
import { workspaceFixture, hierarchyFixture } from '../../e2e/helpers.js';

// Fictional companies and deliberately distinct workflow structures.
export function annualSourceFixture(holding = false) {
  const store = canonicalStorePayload(normalizeStore(holding ? hierarchyFixture() : workspaceFixture()));
  const entity = store.entities.find((item) => holding ? item.legalName === 'Global Holdings' : item.kind === 'company');
  const current = store.engagements.find((item) => item.entityId === entity.id);
  if (holding) { current.reportingPeriods = [{ id: 'holding-current-period', periodPreset: 'calendar', periodStart: '2026-01-01', periodEnd: '2026-12-31' }];
    current.periodStart = '2026-01-01'; current.periodEnd = '2026-12-31'; }
  current.owner = 'Current owner'; current.notes = 'DO NOT COPY OPERATIONAL NOTES';
  const older = structuredClone(current); older.id = 'annual-source-older'; older.archived = true;
  older.reportingPeriods = [{ id: 'annual-source-period', periodPreset: 'calendar', periodStart: '2025-01-01', periodEnd: '2025-12-31' }];
  older.periodStart = '2025-01-01'; older.periodEnd = '2025-12-31';
  const node = makeNode({ title: 'Archived source structure', conditions: ['Archived source criterion'] });
  node.conditions[0].done = true;
  if (holding) { older.consolidation.nodes = [node]; current.consolidation.nodes = [makeNode({ title: 'Current holding structure', conditions: ['Current holding criterion'] })]; }
  else { older.workstreams = [structuredClone(current.workstreams[0])]; older.workstreams[0].nodes = [node]; }
  store.engagements.push(older);
  store.samples = [{ ...makeBlankSample('en', 'audit', 'audit'), id: 'annual-source-template',
    name: 'Explicit Annual Workflow', nodes: [makeNode({ title: 'Template-only structure', conditions: ['Template-only criterion'] })] }, ...store.samples];
  store.selectedSampleIdsByCategory.audit = 'annual-source-template';
  return { store, entityId: entity.id, currentId: current.id, olderId: older.id };
}
