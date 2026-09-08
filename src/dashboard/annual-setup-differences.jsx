import React from 'react';
import { engagementReportingPeriods, engagementTypesLabel, workstreamTypeLabel } from './model.js';
import { useUiLanguage } from './i18n.jsx';
export function AnnualSetupDifferences({ source, values, entity, store }) {
  const { language, t } = useUiLanguage();
  const period = row => engagementReportingPeriods(row).map(p => `${p.periodStart} → ${p.periodEnd}`).join(' · ');
  const candidates = [
    ['报告期间', period(source), period(values)], ['负责人', source.owner || '—', values.owner || '—'],
    ['财务报告准则／框架', source.reportingFramework || '—', values.reportingFramework || '—'],
    ['项目类型', engagementTypesLabel(source, language), engagementTypesLabel(values, language)],
    ['项目排期', [source.startDate || '—', source.dueDate || '—'].join(' → '), [values.startDate || '—', values.dueDate || '—'].join(' → ')],
  ];
  const changes = candidates.filter(([, before, after]) => before !== after);
  const oldIds = new Set((source.consolidation?.components || []).map(c => c.entityId));
  const current = store.entities.filter(e => e.parentEntityId === entity.id); const newIds = new Set(current.map(e => e.id));
  const added = current.filter(e => !oldIds.has(e.id));
  const removed = (source.consolidation?.components || []).filter(c => !newIds.has(c.entityId));
  return <details className="efficiency-section"><summary>{t('查看与来源年度的设置差异')} · {changes.length + added.length + removed.length}</summary>
    <div className="efficiency-preview">{changes.map(([field, before, after]) => <article key={field}><strong>{t(field)}</strong><span>{before} → {after}</span></article>)}</div>
    <details><summary>{t('未变的结构')}</summary><p>{(source.workstreams || []).map(w => workstreamTypeLabel(w.type, language, w.customName)).join(' · ') || t('空白流程')}</p>
      <small>{t('流程结构会复制，完成状态会重置；不会沿用旧待清和税务期限。')}</small></details>
    {source.consolidation && <div><strong>{t('新年度按当前公司架构建立，旧年度范围保持不变。')}</strong>
      {added.map(e => <p key={e.id}>+ {e.legalName}</p>)}{removed.map(c => <p key={c.id}>− {store.entities.find(e => e.id === c.entityId)?.legalName || c.entitySnapshot?.legalName || t('已删除的公司')}</p>)}</div>}
  </details>;
}
