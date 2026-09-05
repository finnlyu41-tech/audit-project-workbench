import { workstreamCategoryLabel } from './model.js';
const normalized = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase();
export const templateSelectionKey = (kind, sample) => `${kind}:${sample.id}`;

// Search metadata only. Stage, criterion and source text stay out of the index.
export function templateExportRows(samples, groupSamples, categories, language = 'en', holdingCategoryName = 'Holding-company template') {
  return [...samples.map((sample) => ({ kind: 'workstream', sample,
    categoryName: workstreamCategoryLabel(categories.find((item) => item.id === sample.categoryId), language) })),
  ...groupSamples.map((sample) => ({ kind: 'holding_company', sample, categoryName: holdingCategoryName }))]
    .map((row) => ({ ...row, key: templateSelectionKey(row.kind, row.sample) }));
}
export function filterTemplateExportRows(rows, query = '') {
  const tokens = normalized(query).trim().split(/\s+/u).filter(Boolean);
  return rows.filter(({ sample, categoryName }) => {
    const text = normalized([sample.name, sample.description, categoryName, sample.versionNote, ...(sample.tags || [])].join(' '));
    return tokens.every((token) => text.includes(token));
  });
}
export function toggleTemplateSelection(selected, rows, checked) {
  const next = new Set(selected);
  for (const row of rows) { if (checked) next.add(row.key); else next.delete(row.key); }
  return next;
}
export function templateImportDecisions(preview) {
  return Object.fromEntries(preview.items.map((item) => [item.templateKey, { action: 'copy',
    targetId: item.matches[0]?.id || item.sameName[0]?.id || '', categoryId: item.suggestedCategoryId }]));
}

// Ignore inactive choices when measuring dirtiness, without altering submitted decisions.
export function templateImportDraft(decisions) {
  return Object.fromEntries(Object.entries(decisions).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, {
    action: value.action,
    ...(value.action === 'replace' ? { targetId: value.targetId } : {}),
    ...(value.action !== 'skip' ? { categoryId: value.categoryId } : {}),
  }]));
}
export function templateImportCounts(decisions) {
  return Object.values(decisions).reduce((counts, { action }) => {
    if (Object.hasOwn(counts, action)) counts[action] += 1;
    return counts;
  }, { copy: 0, replace: 0, skip: 0 });
}
