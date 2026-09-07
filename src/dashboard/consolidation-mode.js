// Mode belongs to an annual engagement, never to the company master or visual filters.
export function consolidationIsSimple(value) {
  const c = value?.consolidation || value;
  return (c?.mode === 'simple' || value?.consolidationMode === 'simple')
    && c?.enabled !== false && value?.consolidationEnabled !== false;
}
export function withConsolidationMode(consolidation, mode) {
  if (!consolidation || !['full', 'simple'].includes(mode)) throw new Error('Invalid consolidation mode');
  const next = { ...consolidation };
  if (mode === 'simple') { next.mode = 'simple'; next.enabled = true; }
  else delete next.mode;
  return next;
}
// Omit the default so old valid payloads are not rewritten just by opening the app.
export const simpleModeField = value => consolidationIsSimple(value) ? { mode: 'simple' } : {};
