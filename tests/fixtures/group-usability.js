import { canonicalStorePayload, normalizeStore, makeOutstandingItem, makeNode } from '../../src/dashboard/model.js';
import { holdingWorkspace } from './holding-workspace.js';

// Entirely fictional; never reproduce names from a user's screenshot.
export function groupUsabilityFixture() {
  const store = holdingWorkspace();
  const job = id => store.engagements.find(item => item.id === id);
  job('holding-annual').consolidation.nodes = [makeNode({ title: 'Consolidation checks',
    conditions: ['Eliminations reviewed', 'Consolidated figures reviewed'] })];
  job('holding-annual').outstandingItems = [makeOutstandingItem({ title: 'Group figures pending' })];
  job('alpha-old').outstandingItems = [makeOutstandingItem({ title: 'Prior-year confirmation pending' })];
  job('alpha-current').outstandingItems = [makeOutstandingItem({ title: 'Current-year statement pending' })];
  job('cedar-annual').outstandingItems = [makeOutstandingItem({ title: 'Archived request retained' })];
  return canonicalStorePayload(normalizeStore(store));
}
