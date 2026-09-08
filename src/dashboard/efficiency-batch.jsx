import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { useModalDraft } from './modal-draft.jsx';
import { engagementsForEntity, engagementReportingPeriods, yearEndOrPeriodLabel, outstandingStatusLabel, workstreamTypeLabel } from './model.js';
import { prepareSchedules, scheduleCandidates, prepareOutstandingLines, prepareOutstandingStatus, prepareFollowUp,
  nextAnnualRows, prepareAnnualBatch, sourceFor } from './efficiency-actions.js';
import { countWorkingDays } from './working-days.js';
import { localIsoDate } from './efficiency-data.js';
import { OwnerInput } from './efficiency-controls.jsx';

export const EFFICIENCY_ERRORS = {
  changed: '原资料在预览后已变化，请重新预览；未写入任何更改。',
  readonly: '所选记录已归档、完成或不存在，请重新选择。',
  selection: '请选择有效记录；一次最多 100 条。',
  duration: '工作天数须为 1 至 1000 的整数。',
  coverage: '日期超出香港官方假期覆盖范围（2025—2027），未计算或改写日期。',
  start: '请填写有效日期。', range: '项目截止日不得早于开始日。',
  week: '请选择有效的工作周。', locked: '计算结果超过已锁定的最迟完成日期，不能自动后移。',
  period: '报告期间无效或与已有项目重复，请逐行检查。',
  size: '请粘贴 1 至 100 条事项，每条不超过 1000 字。',
  status: '请选择有效的未清状态。', module: '所选业务模块已不存在。',
  date: '请填写有效的已发送日期和工作日间隔，不可记录未来发送。',
  invalid: '资料校验未通过，未应用任何更改。',
};
function Workweek({ value, onChange }) { const { t } = useUiLanguage(); return <label><span>{t('工作周')}</span>
  <select value={value} onChange={event => onChange(event.target.value)}><option value="mon-fri">{t('周一至周五')}</option>
  <option value="mon-sat">{t('周一至周六')}</option></select></label>; }
function ErrorMessage({ error }) { const { t } = useUiLanguage(); return error ? <p role="alert" className="form-error">
  {t(EFFICIENCY_ERRORS[error] || EFFICIENCY_ERRORS.invalid)}</p> : null; }
function Footer({ onClose, onPreview, preview, onCommit, valid = true }) { const { t } = useUiLanguage(); return <footer className="modal-actions">
  <button type="button" className="button secondary" onClick={onClose}>{t('取消')}</button>
  <button type="button" className="button secondary" disabled={!valid} onClick={onPreview}>{t('预览更改')}</button>
  <button type="button" className="button primary" disabled={!preview || preview.error} onClick={onCommit}>{t('确认应用')}</button>
</footer>; }
function useBatch(draft, onClose, onCommit) {
  const [preview, setPreview] = React.useState(null), [error, setError] = React.useState('');
  const { closeEditor } = useModalDraft(draft, onClose);
  const committing = React.useRef(false);
  const invalidate = () => { setPreview(null); setError(''); };
  const show = result => { setPreview(result); setError(result.error || ''); };
  const commit = () => {
    if (!preview || preview.error || committing.current) return;
    committing.current = true;
    try { const result = onCommit(preview); if (result?.error) { setError(result.error); committing.current = false; } }
    catch { setError('invalid'); committing.current = false; }
  };
  return { preview, error, invalidate, show, commit, closeEditor };
}
export function ScheduleBatchForm({ store, onClose, onCommit }) {
  const { language, t } = useUiLanguage();
  const [selected, setSelected] = React.useState([]), [action, setAction] = React.useState('shift'),
    [offset, setOffset] = React.useState('1'), [firstStart, setFirstStart] = React.useState(''), [workweek, setWorkweek] = React.useState('mon-fri');
  const batch = useBatch({ selected, action, offset, firstStart, workweek }, onClose, onCommit);
  const candidates = scheduleCandidates(store);
  const change = fn => { fn(); batch.invalidate(); };
  const reorder = (id, delta) => change(() => setSelected(rows => {
    const next = [...rows], index = next.findIndex(r => r.id === id), target = index + delta;
    if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
    return next;
  }));
  return <div className="workbench-form efficiency-batch" data-editor-guard>
    <p className="form-help">{t('只调整明确选择的活跃项目工作日期；不改报告期间、税务期限或完成状态。')}</p>
    <div className="efficiency-grid"><label><span>{t('批量排期方式')}</span><select value={action} onChange={event => change(() => setAction(event.target.value))}>
      <option value="shift">{t('整体移动，保留工作天数')}</option><option value="sequence">{t('按选定顺序依次执行')}</option></select></label>
      <Workweek value={workweek} onChange={value => change(() => setWorkweek(value))} />
      {action === 'shift' ? <label><span>{t('移动工作天数（负数为提前）')}</span><input type="number" min="-1000" max="1000" step="1" value={offset}
        onChange={event => change(() => setOffset(event.target.value))} /></label> : <label><span>{t('第一个项目开始日')}</span>
        <input type="date" min="2025-01-01" max="2027-12-31" value={firstStart} onChange={event => change(() => setFirstStart(event.target.value))} /></label>}
    </div><fieldset className="efficiency-section"><legend>{t('选择需要调整的项目')}</legend>
      {candidates.map(record => { const source = sourceFor(store, record.id); return <label className="check-option" key={record.id}>
        <input type="checkbox" checked={selected.some(r => r.id === record.id)} onChange={event => change(() => setSelected(rows => event.target.checked
          ? [...rows, { id: record.id, days: String(record.schedulePlan?.workdays || countWorkingDays(record.startDate, record.dueDate, workweek).workdays || 1) }]
          : rows.filter(r => r.id !== record.id)))} /><span>{source.entity.legalName} · {yearEndOrPeriodLabel(record, language)}</span></label>; })}
      {!candidates.length && <p>{t('没有可调整的活跃项目。')}</p>}
    </fieldset>
    {action === 'sequence' && selected.length > 0 && <section className="efficiency-preview" aria-label={t('执行顺序')}>
      {selected.map((row, index) => { const source = sourceFor(store, row.id); return <article key={row.id}><strong>{index + 1}. {source?.entity.legalName} · {yearEndOrPeriodLabel(source?.engagement, language)}</strong>
        <div className="efficiency-actions"><label><span>{t('预计工作天数')}</span><input type="number" min="1" max="1000" step="1" value={row.days}
          onChange={event => change(() => setSelected(rows => rows.map(r => r.id === row.id ? { ...r, days: event.target.value } : r)))} /></label>
          <button type="button" className="button secondary" disabled={index === 0} onClick={() => reorder(row.id, -1)}>{t('上移')}</button>
          <button type="button" className="button secondary" disabled={index === selected.length - 1} onClick={() => reorder(row.id, 1)}>{t('下移')}</button></div></article>; })}
    </section>}
    {batch.preview?.rows && <section className="efficiency-preview" aria-label={t('排期变更预览')}>
      {batch.preview.rows.map(row => <article key={row.id}><strong>{row.company} · {yearEndOrPeriodLabel(row.period, language)}</strong>
        <span>{row.before.startDate || '—'} → {row.before.dueDate || '—'}</span><strong>{row.after.startDate} → {row.after.dueDate}</strong>
        <small>{t('{count} 个工作天', { count: row.days })}</small></article>)}
    </section>}
    <ErrorMessage error={batch.error} /><Footer {...batch} onClose={batch.closeEditor} onPreview={() => batch.show(prepareSchedules(store, selected,
      { action, offset: offset === '' ? NaN : Number(offset), firstStart, workweek }))} onCommit={batch.commit} valid={selected.length > 0} />
  </div>;
}
export function OutstandingLinesForm({ store, engagementId, defaultWorkstreamId = '', onClose, onCommit }) {
  const { language, t } = useUiLanguage(); const source = sourceFor(store, engagementId);
  const [text, setText] = React.useState(''), [moduleId, setModuleId] = React.useState(defaultWorkstreamId || ''),
    [status, setStatus] = React.useState(store.outstandingStatuses.find(s => !s.closed)?.id || '');
  const batch = useBatch({ text, moduleId, status }, onClose, onCommit);
  if (!source || source.readOnly) return <ErrorMessage error="readonly" />;
  return <div className="workbench-form efficiency-batch" data-editor-guard>
    <strong>{source.entity.legalName} · {yearEndOrPeriodLabel(source.engagement, language)}</strong>
    <p>{t('每行一条，空行忽略；只写入以上公司与年度。重复标题会提示，但不会自动合并。')}</p>
    <label><span>{t('多行待清事项')}</span><textarea autoFocus rows="8" maxLength="50000" value={text}
      onChange={event => { setText(event.target.value); batch.invalidate(); }} /></label>
    <div className="efficiency-grid"><label><span>{t('业务模块')}</span><select value={moduleId} onChange={event => { setModuleId(event.target.value); batch.invalidate(); }}>
      <option value="">{t('项目级')}</option>{source.engagement.workstreams.map(w => <option key={w.id} value={w.id}>{workstreamTypeLabel(w.type, language, w.customName)}</option>)}</select></label>
      <label><span>{t('初始待清状态')}</span><select value={status} onChange={event => { setStatus(event.target.value); batch.invalidate(); }}>
        {store.outstandingStatuses.filter(s => !s.closed).map(s => <option key={s.id} value={s.id}>{outstandingStatusLabel(s.id, store.outstandingStatuses, language)}</option>)}</select></label></div>
    {batch.preview?.lines && <div className="efficiency-preview" aria-label={t('待清新增预览')}><strong>{t('将新增 {count} 条事项', { count: batch.preview.count })}</strong>
      {batch.preview.lines.map((r, i) => <article key={i}>{r.title}{r.duplicate && <small>{t('存在同名事项，请检查是否仍需新增。')}</small>}</article>)}</div>}
    <ErrorMessage error={batch.error} /><Footer {...batch} onClose={batch.closeEditor} onPreview={() => batch.show(prepareOutstandingLines(store, engagementId, text, moduleId, status))}
      onCommit={batch.commit} valid={Boolean(text.trim())} />
  </div>;
}
export function OutstandingBulkForm({ store, engagementId, itemIds, mode = 'status', onClose, onCommit }) {
  const { language, t } = useUiLanguage(); const source = sourceFor(store, engagementId);
  const [status, setStatus] = React.useState(store.outstandingStatuses[0]?.id || ''), [sent, setSent] = React.useState(localIsoDate()),
    [interval, setInterval] = React.useState('3'), [workweek, setWorkweek] = React.useState('mon-fri');
  const batch = useBatch({ status, sent, interval, workweek, itemIds }, onClose, onCommit);
  if (!source || source.readOnly) return <ErrorMessage error="readonly" />;
  const items = source.engagement.outstandingItems.filter(i => itemIds.includes(i.id));
  return <div className="workbench-form efficiency-batch" data-editor-guard>
    <strong>{source.entity.legalName} · {yearEndOrPeriodLabel(source.engagement, language)}</strong>
    <div className="efficiency-preview">{items.map(item => <article key={item.id}><strong>{item.title}</strong>
      <span>{outstandingStatusLabel(item.status, store.outstandingStatuses, language)}</span></article>)}</div>
    {mode === 'status' ? <label><span>{t('统一改为')}</span><select value={status} onChange={event => { setStatus(event.target.value); batch.invalidate(); }}>
      {store.outstandingStatuses.map(s => <option value={s.id} key={s.id}>{outstandingStatusLabel(s.id, store.outstandingStatuses, language)}</option>)}</select></label>
      : <><p>{t('仅在你确实发送后记录。复制或下载草稿不等于发送；此操作不会发送邮件。')}</p>
        <div className="efficiency-grid"><label><span>{t('实际已发送日期')}</span><input type="date" min="2025-01-01" max={localIsoDate()} value={sent}
          onChange={event => { setSent(event.target.value); batch.invalidate(); }} /></label>
          <label><span>{t('多少个工作日后跟进')}</span><input type="number" min="1" max="1000" step="1" value={interval}
            onChange={event => { setInterval(event.target.value); batch.invalidate(); }} /></label>
          <Workweek value={workweek} onChange={value => { setWorkweek(value); batch.invalidate(); }} /></div></>}
    {batch.preview && !batch.preview.error && <div className="efficiency-preview" role="status">
      {mode === 'status' ? t('将更新 {count} 条事项的状态，不改变审计进度。', { count: items.length })
        : t('已发送日期：{sent}；下次跟进：{due}。', { sent, due: batch.preview.dueDate })}</div>}
    <ErrorMessage error={batch.error} /><Footer {...batch} onClose={batch.closeEditor} onPreview={() => batch.show(mode === 'status'
      ? prepareOutstandingStatus(store, engagementId, itemIds, status) : prepareFollowUp(store, engagementId, itemIds, sent, interval, workweek))}
      onCommit={batch.commit} valid={items.length === itemIds.length && items.length > 0} />
  </div>;
}
export function AnnualBatchForm({ store, onClose, onCommit }) {
  const { language, t } = useUiLanguage(); const [rows, setRows] = React.useState([]);
  const batch = useBatch(rows, onClose, onCommit); const selected = new Set(rows.map(r => r.id));
  const update = (id, patch) => { setRows(values => values.map(r => r.id === id ? { ...r, ...patch } : r)); batch.invalidate(); };
  return <div className="workbench-form efficiency-batch" data-editor-guard>
    <p>{t('每家公司按自己的实际报告结束日建议下一期间。只复制结构；工期、待清和完成勾选重新开始。')}</p>
    <fieldset className="efficiency-section"><legend>{t('选择需要建立新年度的公司')}</legend>
      {store.entities.filter(e => !e.archived).map(entity => <label className="check-option" key={entity.id}>
        <input type="checkbox" checked={selected.has(entity.id)} onChange={event => { setRows(current => event.target.checked
          ? [...current, ...nextAnnualRows(store, [entity.id])] : current.filter(r => r.id !== entity.id)); batch.invalidate(); }} /><span>{entity.legalName}</span></label>)}
    </fieldset><div className="efficiency-preview">{rows.map(row => { const entity = store.entities.find(e => e.id === row.id);
      const previous = store.engagements.find(e => e.id === row.sourceId); return <article key={row.id}><strong>{entity.legalName}</strong>
        <div className="efficiency-grid"><label><span>{t('来源年度')}</span><select value={row.sourceId} onChange={event => update(row.id, { sourceId: event.target.value })}>
          <option value="">{t('空白项目')}</option>{engagementsForEntity(store, row.id).map(e => <option key={e.id} value={e.id}>{yearEndOrPeriodLabel(e, language)}</option>)}</select></label>
          <label><span>{t('报告开始日 *')}</span><input type="date" value={row.periodStart} onChange={event => update(row.id, { periodStart: event.target.value, periodPreset: 'custom' })} /></label>
          <label><span>{t('报告结束日 *')}</span><input type="date" value={row.periodEnd} onChange={event => update(row.id, { periodEnd: event.target.value, periodPreset: 'custom' })} /></label>
          <label><span>{t('负责人')}</span><OwnerInput store={store} value={row.owner} onChange={event => update(row.id, { owner: event.target.value })} /></label></div>
          {previous?.owner && <button type="button" className="button secondary" onClick={() => update(row.id, { owner: previous.owner })}>
            {t('沿用上年负责人')} · {previous.owner}</button>}
        <small>{t('框架沿用所选来源；新年度默认普通优先级，不带入旧执行日期。')}</small>
      </article>; })}</div>
    {batch.preview?.created && <div className="efficiency-preview" aria-label={t('新年度预览')}>
      <strong>{t('将建立 {count} 个年度项目', { count: batch.preview.created.length })}</strong>
      {batch.preview.created.map(e => <article key={e.id}><strong>{store.entities.find(c => c.id === e.entityId)?.legalName}</strong>
        <span>{engagementReportingPeriods(e).map(p => `${p.periodStart} → ${p.periodEnd}`).join(' · ')}</span>
        <small>{e.owner || t('未设置负责人')} · {e.reportingFramework || t('未设置框架')}</small></article>)}
    </div>}<ErrorMessage error={batch.error} /><Footer {...batch} onClose={batch.closeEditor}
      onPreview={() => batch.show(prepareAnnualBatch(store, rows))} onCommit={batch.commit} valid={rows.length > 0} />
  </div>;
}
