import { collectGroupOutstandingEntries } from './model.js';
import { outstandingEntryKey } from './outstanding-center-model.js';

// Both the collapsed badge and opened list must use this exact source set.
export function outstandingEntriesForScope(store, kind, target, includeArchived = false) {
  const entryFor = job => {
    const entity = store.entities.find(e => e.id === job.entityId);
    if (!entity || (!includeArchived && (entity.archived || job.archived))) return [];
    return (job.outstandingItems || []).map(item => ({ item, sourceId: job.id,
      sourceType: entity.kind === 'holding_company' ? 'group' : 'project',
      sourceName: entity.legalName, depth: 0 }));
  };
  let entries;
  if (kind === 'group') entries = collectGroupOutstandingEntries(store, target.id, new Set(), 0, includeArchived);
  else if (kind === 'project') {
    const job = store.engagements.find(e => e.id === target.id);
    entries = job ? entryFor(job) : [];
  } else entries = store.engagements.filter(e => kind !== 'entity' || e.entityId === target.id).flatMap(entryFor);
  const seen = new Set();
  return entries.filter(entry => {
    const key = outstandingEntryKey(entry);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
