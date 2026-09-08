import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { outstandingIsOpen, nodeIsComplete } from './model.js';
import { countWorkingDays, dateOnly } from './working-days.js';
import { localIsoDate } from './efficiency-data.js';
import { EFFICIENCY_ERRORS } from './efficiency-batch.jsx';

export function nextActionOptions(record, statuses) {
  const nodes = [...(record.workstreams || []).flatMap(w => w.nodes.filter(n => !nodeIsComplete(n)).map(n => ({
    value: { kind: 'workflow', workstreamId: w.id, nodeId: n.id }, label: n.title }))),
    ...(record.consolidation?.nodes || []).filter(n => !nodeIsComplete(n)).map(n => ({ value: { kind: 'workflow', workstreamId: null, nodeId: n.id }, label: n.title }))];
  return [...nodes, ...(record.outstandingItems || []).filter(item => outstandingIsOpen(item, statuses)).map(item => ({
    value: { kind: 'outstanding', itemId: item.id }, label: item.title }))];
}
export function NextActionSettings({ record, statuses, onPatch, readOnly = false }) {
  const { t } = useUiLanguage(); const [open, setOpen] = React.useState(false), [value, setValue] = React.useState(''), [message, setMessage] = React.useState('');
  const baseline = React.useRef(record); const options = nextActionOptions(record, statuses);
  const pinned = record.nextAction && options.find(row => JSON.stringify(row.value) === JSON.stringify(record.nextAction));
  return <details className="efficiency-compact" open={open} onToggle={event => {
    const next = event.currentTarget.open; if (next && !open) { baseline.current = record; setValue(JSON.stringify(record.nextAction || null)); setMessage(''); } setOpen(next);
  }}><summary>{t('指定下一步')}{record.nextAction && !pinned ? ` · ${t('原指定项已完成或失效')}` : ''}</summary>
    {open && <><label><span>{t('从现有事项选择下一步')}</span><select disabled={readOnly} value={value || 'null'} onChange={event => setValue(event.target.value)}>
      <option value="null">{t('自动建议首个未完成节点')}</option>{record.nextAction && !pinned && <option value={JSON.stringify(record.nextAction)} disabled>{t('原指定项已完成或失效')}</option>}
      {options.map(row => <option key={JSON.stringify(row.value)} value={JSON.stringify(row.value)}>{t(row.value.kind === 'outstanding' ? '待清' : '节点')} · {row.label}</option>)}
    </select></label>
    <button type="button" className="button secondary" disabled={readOnly} onClick={() => {
      const nextAction = JSON.parse(value || 'null') || undefined;
      const result = onPatch({ nextAction }, baseline.current);
      setMessage(t(result?.error ? EFFICIENCY_ERRORS[result.error] || EFFICIENCY_ERRORS.changed : '下一步已应用，不改变任何完成状态。'));
      if (!result?.error) { baseline.current = result.store?.engagements.find(e => e.id === record.id) || { ...record, nextAction }; }
    }}>{t('保存下一步')}</button>{message && <p role="status">{message}</p>}</>}
  </details>;
}
export function RemainingWork({ record, onPatch, readOnly = false }) {
  const { t } = useUiLanguage(); const [open, setOpen] = React.useState(false), [days, setDays] = React.useState(''),
    [asOf, setAsOf] = React.useState(localIsoDate()), [message, setMessage] = React.useState(''); const baseline = React.useRef(record);
  const valid = /^\d+$/u.test(days) && Number(days) <= 1000 && dateOnly(asOf) && asOf <= localIsoDate();
  const week = record.schedulePlan?.workweek || 'mon-fri';
  const count = record.dueDate && asOf > record.dueDate ? { workdays: 0 } : countWorkingDays(asOf, record.dueDate, week);
  const gap = valid && !count.error ? Math.max(0, Number(days) - count.workdays) : null;
  return <details className="efficiency-compact" open={open} onToggle={event => {
    const next = event.currentTarget.open; if (next && !open) { baseline.current = record; setDays(record.remainingWork ? String(record.remainingWork.days) : '');
      setAsOf(record.remainingWork?.asOf || localIsoDate()); setMessage(''); } setOpen(next);
  }}><summary>{t('剩余工作与期限')}</summary>
    {open && <><div className="efficiency-grid"><label><span>{t('预计剩余工作天数（可选）')}</span><input disabled={readOnly} type="number" min="0" max="1000" step="1" value={days} onChange={event => setDays(event.target.value)} /></label>
      <label><span>{t('估计截至日期')}</span><input disabled={readOnly} type="date" max={localIsoDate()} value={asOf} onChange={event => setAsOf(event.target.value)} /></label></div>
    <p className="efficiency-note">{t('手工估计，不从进度百分比推算；不会改变排期或优先级。')}</p>
    {gap !== null ? <p role="status" className={gap ? 'efficiency-warning' : 'efficiency-note'}>{t('截至 {date}，期限内可用 {available} 个工作天；预计还需 {days} 天，缺口 {gap} 天。',
      { date: asOf, available: count.workdays, days, gap })}</p> : <p>{t('请填写有效估计及有假期覆盖的项目截止日后比较。')}</p>}
    <div className="efficiency-actions"><button type="button" className="button secondary" disabled={readOnly || !valid} onClick={() => {
      const remainingWork = { days: Number(days), asOf }; const result = onPatch({ remainingWork }, baseline.current);
      setMessage(t(result?.error ? EFFICIENCY_ERRORS[result.error] || EFFICIENCY_ERRORS.changed : '剩余工作估计已应用。'));
      if (!result?.error) baseline.current = result.store?.engagements.find(e => e.id === record.id) || { ...record, remainingWork };
    }}>{t('保存估计')}</button><button type="button" className="button secondary" disabled={readOnly || !record.remainingWork} onClick={() => {
      const result = onPatch({ remainingWork: undefined }, baseline.current);
      if (!result?.error) { setDays(''); baseline.current = result.store?.engagements.find(e => e.id === record.id) || { ...record, remainingWork: undefined }; }
      setMessage(t(result?.error ? EFFICIENCY_ERRORS.changed : '剩余工作估计已清除。'));
    }}>{t('清除估计')}</button></div>{message && <p role="status">{message}</p>}</>}
  </details>;
}
