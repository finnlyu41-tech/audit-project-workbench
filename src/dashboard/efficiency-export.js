import { engagementReportingPeriods, yearEndOrPeriodLabel, engagementTypesLabel } from './model.js';
let sequence = 0;
export function safeFilePart(value, max = 72) {
  const clean = String(value || '').normalize('NFKC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069\\/:*?"<>|]/gu, '-').replace(/\s+/gu, ' ').trim().replace(/^[. ]+|[. ]+$/gu, '');
  return Array.from(clean || 'record').slice(0, max).join('');
}
export function outputFileName({ purpose, company = '', periods = [], generic = true, extension = 'txt', now = new Date() }) {
  const stamp = now.toISOString().replace(/[:.]/gu, '-');
  const bytes = (value, max) => { let out = ''; for (const char of value) { if (new TextEncoder().encode(out + char).length > max) break; out += char; } return out; };
  const identity = generic ? [] : [bytes(safeFilePart(company), 64), bytes(safeFilePart(periods.map(p => `${p.periodStart}_${p.periodEnd}`).join('+'), 96), 64)];
  return [...identity, bytes(safeFilePart(purpose, 50), 40)].join('_') + '-' + stamp + '-' + String(++sequence) + '.' + extension.replace(/[^a-z0-9]/gi, '');
}
export function splitMessage(text) {
  const lines = String(text || '').split(/\r?\n/u);
  const subject = (lines.shift() || '').replace(/^(?:Subject\s*[:：]|主题\s*[:：]|主題\s*[:：])\s*/iu, '');
  return { subject, body: lines.join('\n').replace(/^\n+/u, '') };
}
// Protect spreadsheet import even when whitespace/control characters precede a
// formula trigger. Quoting CSV alone is NOT protection against formula execution.
export function spreadsheetCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const text = String(value ?? '').replace(/\u0000/gu, '');
  return /^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text) ? `'${text}` : text;
}
export function delimitedTable(matrix, delimiter = ',') {
  return matrix.map(row => row.map(value => `"${spreadsheetCell(value).replace(/"/gu, '""')}"`).join(delimiter)).join('\r\n');
}
export function reportTableMatrix(rows, language, t) {
  return [[t('公司／控股公司'), t('年结／报告期间'), t('项目类型'), t('负责人'), t('所属层级'), t('项目开始日'), t('项目截止日'),
    t('进度'), t('待清'), t('税务期限')], ...rows.map(row => [row.name, yearEndOrPeriodLabel(row, language) || row.periodLabel || '',
    engagementTypesLabel(row, language), row.owner || '', (row.hierarchy || []).map(item => item.name).join(' / '), row.startDate || '', row.dueDate || '',
    row.kind === 'project' ? `${row.completedWorkstreams}/${row.totalWorkstreams}` : `${row.progress}%`, row.openOutstanding, `${row.taxAttention}/${row.taxOpen}`])];
}
export function requestTextDownload(text, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  try { const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

// A read-only, allow-listed projection. Notes, reference numbers and audit
// narratives never appear in a difference preview. No merge inference is made.
export function workspaceDifferences(before, after, limit = 200) {
  try {
    before = typeof before === 'string' ? JSON.parse(before) : before;
    after = typeof after === 'string' ? JSON.parse(after) : after;
    if (before?.version !== 11 || after?.version !== 11 || !Array.isArray(before.entities) || !Array.isArray(after.entities)
      || !Array.isArray(before.engagements) || !Array.isArray(after.engagements)) return { unavailable: true, rows: [] };
    const rows = []; let total = 0;
    const push = row => { total += 1; if (rows.length < limit) rows.push(row); };
    for (const [collection, keys] of [['entities', ['legalName', 'entityType', 'incorporationDate', 'parentEntityId', 'archived']],
      ['engagements', ['owner', 'startDate', 'dueDate', 'archived', 'priority', 'reportingFramework']]]) {
      const left = new Map(before[collection].map(r => [r.id, r])); const right = new Map(after[collection].map(r => [r.id, r]));
      if (left.size !== before[collection].length || right.size !== after[collection].length || left.size + right.size > 10000) return { unavailable: true, rows: [] };
      const companies = new Map([...before.entities, ...after.entities].map(e => [e.id, e.legalName]));
      for (const id of new Set([...left.keys(), ...right.keys()])) {
        const a = left.get(id), b = right.get(id), r = b || a;
        const identity = { id, name: collection === 'entities' ? r.legalName : companies.get(r.entityId) || r.entityId,
          period: collection === 'engagements' ? engagementReportingPeriods(r).map(p => `${p.periodStart} → ${p.periodEnd}`).join(' · ') : '', collection };
        if (!a || !b) { push({ ...identity, field: a ? 'removed' : 'added', before: '', after: '' }); continue; }
        for (const key of keys) if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) push({ ...identity, field: key, before: a[key] ?? '', after: b[key] ?? '' });
        if (collection === 'engagements') {
          const periods = e => engagementReportingPeriods(e).map(p => `${p.periodStart} → ${p.periodEnd}`).join(' · ');
          if (periods(a) !== periods(b)) push({ ...identity, field: 'periods', before: periods(a), after: periods(b) });
          const aItems = new Map((a.outstandingItems || []).map(i => [i.id, i])), bItems = new Map((b.outstandingItems || []).map(i => [i.id, i]));
          const removed = [...aItems.keys()].filter(key => !bItems.has(key)).length, added = [...bItems.keys()].filter(key => !aItems.has(key)).length;
          const changed = [...aItems.keys()].filter(key => bItems.has(key) && JSON.stringify(aItems.get(key)) !== JSON.stringify(bItems.get(key))).length;
          if (removed || added || changed) push({ ...identity, field: 'outstanding', before: aItems.size, after: bItems.size, removed, added, changed });
          const workflow = e => (e.workstreams || []).flatMap(w => w.nodes || []).concat(e.consolidation?.nodes || []);
          if (JSON.stringify(workflow(a)) !== JSON.stringify(workflow(b))) push({ ...identity, field: 'workflow', before: '', after: '' });
          if (JSON.stringify(a.consolidation?.components) !== JSON.stringify(b.consolidation?.components)) push({ ...identity, field: 'components', before: a.consolidation?.components?.length || 0, after: b.consolidation?.components?.length || 0 });
          for (const key of ['schedulePlan', 'nextAction', 'remainingWork']) if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) push({ ...identity, field: key, before: '', after: '' });
        } else {
          if (JSON.stringify(a.taxDeadlines) !== JSON.stringify(b.taxDeadlines)) push({ ...identity, field: 'tax', before: a.taxDeadlines?.length || 0, after: b.taxDeadlines?.length || 0 });
          for (const key of ['aliases', 'followUpLanguage']) if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) push({ ...identity, field: key, before: '', after: '' });
        }
        if (a.notes !== b.notes) push({ ...identity, field: 'private-note', before: '', after: '' });
      }
    }
    for (const collection of ['samples', 'groupSamples', 'outstandingStatuses', 'workstreamCategories', 'scheduleOrder'])
      if (JSON.stringify(before[collection]) !== JSON.stringify(after[collection])) push({ id: collection, collection, name: '', period: '', field: collection, before: '', after: '' });
    return { rows, total, truncated: total > rows.length };
  } catch { return { unavailable: true, rows: [] }; }
}
