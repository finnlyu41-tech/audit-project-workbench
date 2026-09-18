import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { formatDate, workstreamTypeLabel } from './model.js';
import { WORKSTREAM_STATUSES, workstreamStatus, workstreamStatusLabel } from './workstream-mode.js';
import './simple-workstream.css';

export function SimpleWorkstream({ workstream, readOnly, onStatus, onEdit }) {
  const { language, t } = useUiLanguage();
  return <section className="simple-workstream" aria-label={t('简化业务模块')}>
    <header><div><small>{t('简化模式')}</small><h3>{workstreamTypeLabel(workstream.type, language, workstream.customName)}</h3></div>
      {!readOnly && <button className="button secondary" type="button" onClick={onEdit}>{t('编辑模块资料')}</button>}</header>
    <label className="simple-workstream-status"><span>{t('模块状态')}</span><select disabled={readOnly} value={workstreamStatus(workstream)}
      onChange={event => onStatus(event.target.value)}>{WORKSTREAM_STATUSES.map(simpleStatus => <option key={simpleStatus} value={simpleStatus}>
        {t(workstreamStatusLabel({ simpleStatus }))}</option>)}</select></label>
    <dl><div><dt>{t('负责人')}</dt><dd>{workstream.owner || t('未设置')}</dd></div>
      <div><dt>{t('开始日')}</dt><dd>{formatDate(workstream.startDate, language)}</dd></div>
      <div><dt>{t('截止日')}</dt><dd>{formatDate(workstream.dueDate, language)}</dd></div></dl>
    {workstream.notes && <div className="simple-workstream-notes"><strong>{t('备注')}</strong><p>{workstream.notes}</p></div>}
    <p className="muted">{t('直接管理整个模块的状态，不设节点或完成条件。')}</p>
  </section>;
}
