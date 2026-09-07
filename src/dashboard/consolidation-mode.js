// Mode belongs to an annual engagement, never to the company master or visual filters.
export function consolidationIsSimple(value) {
  const c = value?.consolidation || value;
  return (c?.mode === 'simple' || value?.consolidationMode === 'simple')
    && c?.enabled !== false && value?.consolidationEnabled !== false;
}
export function withConsolidationMode(consolidation, mode) {
  if (!['full', 'simple'].includes(mode) || (consolidation != null
    && (typeof consolidation !== 'object' || Array.isArray(consolidation)))) throw new Error('Invalid consolidation mode');
  // A valid historical holding engagement may not yet have local consolidation settings.
  // Initialize only on an explicit mode change, without inferring scope or completion.
  const next = { ...(consolidation || { enabled: false, nodes: [], components: [] }) };
  if (mode === 'simple') { next.mode = 'simple'; next.enabled = true; }
  else delete next.mode;
  return next;
}
// Omit the default so old valid payloads are not rewritten just by opening the app.
export const simpleModeField = value => consolidationIsSimple(value) ? { mode: 'simple' } : {};
