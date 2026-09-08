import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { engagementsForEntity, yearEndOrPeriodLabel, taxDeadlineCategoryLabel } from './model.js';
export function ArchiveBlockers({ store, entityId, onOpen, onTax, onClose }) {
  const { language, t } = useUiLanguage(); const entity = store.entities.find(e => e.id === entityId);
  if (!entity) return <p role="alert">{t('公司来源已不存在，保留历史范围。')}</p>;
  const active = engagementsForEntity(store, entityId).filter(e => !e.archived);
  const tax = entity.taxDeadlines.filter(d => d.state === 'open');
  return <div className="workbench-form"><strong>{entity.legalName}</strong>
    <p>{t('以下年度仍未归档。可逐项处理；此清单不会自动归档公司、清除待清或关闭税务提醒。')}</p>
    <div className="efficiency-preview">{active.map(e => <article key={e.id}><strong>{yearEndOrPeriodLabel(e, language)}</strong>
      <button type="button" className="button secondary" onClick={() => onOpen(entity.kind === 'holding_company' ? 'group' : 'project', e.id)}>{t('打开并检查该年度')}</button></article>)}</div>
    {tax.length > 0 && <section className="efficiency-warning"><strong>{t('未结束的税务期限')}</strong>
      {tax.map(d => <p key={d.id}>{taxDeadlineCategoryLabel(d, language)} · {d.taxYear} · {d.dueDate}</p>)}
      <button type="button" className="button secondary" onClick={onTax}>{t('查看公司税务期限')}</button>
      <p>{t('只归档年度项目并保留公司活跃，可以继续保留公司的税务提醒。')}</p>
    </section>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t('关闭')}</button></footer>
  </div>;
}
