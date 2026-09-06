import { engagementReportingPeriods, outstandingIsOpen, reportingPeriodLabel } from './model.js';
import { toTraditional } from './traditional.js';

// Traverse only the selected annual snapshots. Project data and internal notes never leave this projection.
export function followUpSources(store, targetKind, targetId) {
  const jobs = new Map(store.engagements.map(e => [e.id, e]));
  const companies = new Map(store.entities.map(e => [e.id, e]));
  const result = []; const visited = new Set();
  function visit(id, expectedEntityId) {
    if (visited.has(id)) return; visited.add(id);
    const job = jobs.get(id); const company = companies.get(job?.entityId);
    if (!job || !company || job.archived || company.archived || (expectedEntityId && job.entityId !== expectedEntityId)) return;
    const kind = company.kind === 'holding_company' ? 'group' : 'project';
    if (id === targetId && targetKind !== kind) return;
    const items = (job.outstandingItems || []).filter(item => outstandingIsOpen(item, store.outstandingStatuses)
      && typeof item.title === 'string' && item.title.trim()).map(({ id: itemId, title }) => ({ id: itemId, title }));
    if (items.length) {
      const source = { id: job.id, entityId: company.id, kind, companyName: company.legalName,
        reportingPeriods: engagementReportingPeriods(job), items };
      result.push({ ...source, fingerprint: JSON.stringify(source) });
    }
    if (kind === 'group') for (const part of job.consolidation?.components || []) visit(part.engagementId, part.entityId);
  }
  visit(targetId);
  return result;
}
export function followUpSourceLabel(source, language = 'en') {
  return source ? `${source.companyName} · ${reportingPeriodLabel(source, language)}` : '';
}
export function buildFollowUpDraft(source, selectedIds, language = 'en') {
  if (!source) return { error: 'source' };
  const ids = new Set(selectedIds);
  if (!ids.size) return { error: 'empty' };
  if ([...ids].some(id => source.items.filter(item => item.id === id).length !== 1)) return { error: 'changed' };
  const items = source.items.filter(item => ids.has(item.id));
  const english = language === 'en';
  // Translate system wording only. Never translate the company name or user-entered titles.
  const system = text => language === 'zh-Hant' ? toTraditional(text) : text;
  const period = reportingPeriodLabel(source, language);
  const company = source.companyName.replace(/[\r\n]+/g, ' ');
  const subject = english ? `Subject: Information request — ${company} — ${period}`
    : `${system('主题：资料跟进')} — ${company} — ${period}`;
  const intro = english ? `Dear Client,\n\nFor ${company} (${period}), please provide or clarify the following items:`
    : `${system('您好：')}\n\n${system('关于')} ${company}（${period}），${system('请提供或说明以下事项：')}`;
  const closing = english ? 'Please let us know the expected availability of any outstanding information.\n\nThank you.'
    : system('如暂时无法提供，请告知预计可提供的时间。\n\n谢谢。');
  const text = `${subject}\n\n${intro}\n\n${items.map((item, index) => `${index + 1}. ${item.title}`).join('\n')}\n\n${closing}`;
  return { text, sourceFingerprint: source.fingerprint, selectedIds: [...ids], language, count: items.length };
}
export function followUpPreviewIsCurrent(draft, sources) {
  return Boolean(draft && sources.some(source => source.id === draft.sourceId && source.fingerprint === draft.sourceFingerprint));
}
