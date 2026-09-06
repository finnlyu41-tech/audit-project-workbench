import { engagementReportingPeriods, reportingPeriodLabel } from './model.js';

// Deliberately allowlist client-facing fields. Never spread an engagement or item into a draft.
export function followupSource(store, id) {
  const engagement = store.engagements.find((item) => item.id === id);
  const entity = store.entities.find((item) => item.id === engagement?.entityId);
  if (!engagement || !entity || engagement.archived || entity.archived) return null;
  const openStatuses = new Set(store.outstandingStatuses.filter((status) => !status.closed).map((status) => status.id));
  return { id: engagement.id, entityId: entity.id, company: entity.legalName,
    kind: entity.kind === 'holding_company' ? 'group' : 'project',
    reportingPeriods: engagementReportingPeriods(engagement).map(({ periodStart, periodEnd }) => ({ periodStart, periodEnd })),
    items: engagement.outstandingItems.filter((item) => openStatuses.has(item.status) && String(item.title || '').trim())
      .map(({ id, title, status }) => ({ id, title, status })) };
}
export function followupSources(store, sourceIds) {
  return [...new Set(sourceIds)].map((id) => followupSource(store, id)).filter(Boolean);
}
export function followupSnapshot(store, sourceId, selectedIds) {
  const source = followupSource(store, sourceId);
  if (!source) return { error: 'source' };
  if (!selectedIds.length) return { error: 'empty' };
  const selected = new Set(selectedIds); const items = source.items.filter((item) => selected.has(item.id));
  if (items.length !== selected.size || new Set(items.map((item) => item.id)).size !== items.length) return { error: 'changed' };
  const snapshot = { ...source, items };
  return { ...snapshot, signature: JSON.stringify(snapshot) };
}
export function followupPeriod(source, language) { return reportingPeriodLabel(source || {}, language); }
const COPY = {
  en: { subject: 'Subject: Outstanding information request', greeting: 'Dear client,',
    request: 'Please provide or clarify the following outstanding items for',
    close: 'Please let us know if an item has already been provided or needs clarification.\n\nThank you.' },
  'zh-Hans': { subject: '主题：待提供资料跟进', greeting: '您好：', request: '请协助提供或说明以下项目的待清事项：',
    close: '如相关资料已经提供，或事项需要进一步说明，请告知我们。\n\n谢谢。' },
  'zh-Hant': { subject: '主旨：待提供資料跟進', greeting: '您好：', request: '請協助提供或說明以下項目的待清事項：',
    close: '如相關資料已經提供，或事項需要進一步說明，請告知我們。\n\n謝謝。' },
};
export function buildFollowupText(snapshot, language = 'en') {
  if (!snapshot || snapshot.error || !snapshot.items?.length) throw new Error('invalid_followup');
  const copy = COPY[language]; if (!copy) throw new Error('invalid_language');
  const period = followupPeriod(snapshot, language); const company = String(snapshot.company);
  const subject = `${copy.subject} — ${company.replace(/[\r\n]+/g, ' ')} — ${period}`;
  const list = snapshot.items.map((item, index) => `${index + 1}. ${item.title}`).join('\n');
  return `${subject}\n\n${copy.greeting}\n\n${copy.request} ${company} (${period})\n\n${list}\n\n${copy.close}`;
}
export function downloadFollowupText(text, documentApi = globalThis.document, urlApi = globalThis.URL) {
  if (!text || !documentApi?.createElement || !urlApi?.createObjectURL) throw new Error('download_unavailable');
  const url = urlApi.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = documentApi.createElement('a'); anchor.href = url; anchor.download = 'apw-client-follow-up.txt';
  try { anchor.click(); } finally { urlApi.revokeObjectURL(url); }
}
