import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { useModalDraft, ModalDraftContext } from './modal-draft.jsx';
import { savedFilters, saveFilter, deleteFilter, draftRecoveryEnabled, setDraftRecoveryEnabled,
  readLocalDraft, writeLocalDraft, deleteLocalDraft, LOCAL_PRODUCTIVITY_EVENT, LOCAL_DRAFTS_KEY } from './local-productivity.js';
import { parseOutline, outlineNodes } from './efficiency-actions.js';
import { workspaceDifferences } from './efficiency-export.js';

export function OwnerInput({ store, ...props }) {
  const id = React.useId();
  const owners = [...new Set((store?.engagements || []).map(e => e.owner).filter(Boolean))].sort();
  return <><input {...props} list={id} /><datalist id={id}>{owners.map(owner => <option key={owner} value={owner} />)}</datalist></>;
}
export function SavedFilters({ scope, values, onApply, validate = () => true }) {
  const { t } = useUiLanguage(); const [name, setName] = React.useState(''), [chosen, setChosen] = React.useState('');
  const [rows, setRows] = React.useState(() => savedFilters(scope)); const [message, setMessage] = React.useState('');
  React.useEffect(() => {
    const refresh = () => { setRows(savedFilters(scope)); setChosen(''); };
    window.addEventListener(LOCAL_PRODUCTIVITY_EVENT, refresh); return () => window.removeEventListener(LOCAL_PRODUCTIVITY_EVENT, refresh);
  }, [scope]);
  const action = fn => { try { fn(); setRows(savedFilters(scope)); setMessage(''); } catch { setMessage(t('无法保存此本地偏好；当前工作资料不受影响。')); } };
  return <details className="efficiency-compact saved-filter-control"><summary>{t('常用筛选')}</summary>
    <div className="efficiency-actions"><select aria-label={t('选择已保存筛选')} value={chosen} onChange={event => setChosen(event.target.value)}>
      <option value="">{t('选择已保存筛选')}</option>{rows.map(row => <option key={row.name} value={row.name}>{row.name}</option>)}</select>
      <button type="button" className="button secondary" disabled={!chosen} onClick={() => {
        const row = rows.find(r => r.name === chosen);
        if (!row || !validate(row.values)) { setMessage(t('筛选引用已失效，请重新选择条件后保存。')); return; }
        onApply(row.values); setMessage(t('已套用筛选，可用原重置按钮清除。'));
      }}>{t('套用筛选')}</button>
      <button type="button" className="button secondary" disabled={!chosen} onClick={() => action(() => { deleteFilter(scope, chosen); setChosen(''); })}>{t('删除筛选')}</button>
    </div><div className="efficiency-actions"><input aria-label={t('筛选名称')} maxLength="80" value={name} onChange={event => setName(event.target.value)} />
      <button type="button" className="button secondary" disabled={!name.trim()} onClick={() => action(() => {
        saveFilter(scope, name, values); setChosen(name.trim()); setName('');
      })}>{t('保存当前筛选')}</button></div>
    <p className="efficiency-note">{t('只保存筛选条件，不复制记录；恢复或切换工作台后清除。')}</p>
    {message && <p role="status">{message}</p>}
  </details>;
}

export function LocalDraftSettings() {
  const { t } = useUiLanguage(); const [enabled, setEnabled] = React.useState(draftRecoveryEnabled), [error, setError] = React.useState('');
  return <section className="persistence-section"><header><strong>{t('临时草稿恢复')}</strong></header>
    <label className="check-option"><input type="checkbox" checked={enabled} onChange={event => {
      try { setDraftRecoveryEnabled(event.target.checked); setEnabled(event.target.checked); setError(''); }
      catch { setError(t('无法保存此本地偏好；当前工作资料不受影响。')); }
    }} /><span>{t('在本浏览器保留未提交草稿，最多 7 天')}</span></label>
    <p className="efficiency-note">{t('默认关闭。草稿可能含客户内容，不加密、不上传、不包含在工作台备份中；恢复备份或切换工作台会清除草稿。')}</p>
    <button type="button" className="button secondary" onClick={() => {
      try { localStorage.removeItem(LOCAL_DRAFTS_KEY); window.dispatchEvent(new Event(LOCAL_PRODUCTIVITY_EVENT)); setError(t('本地临时草稿已清除。')); }
      catch { setError(t('无法清除本地草稿，请保留当前内容并检查浏览器存储。')); }
    }}>{t('清除本地草稿')}</button>{error && <p role="status">{error}</p>}
  </section>;
}
export function useRecoverableDraft(key, baseline, data, onRestore, { active = true } = {}) {
  const { t } = useUiLanguage(); const context = React.useContext(ModalDraftContext);
  const [enabled, setEnabled] = React.useState(draftRecoveryEnabled);
  const baselineSignature = React.useRef(JSON.stringify(baseline)).current;
  const initialSignature = React.useRef(JSON.stringify(data)).current;
  const [pending, setPending] = React.useState(() => draftRecoveryEnabled() ? readLocalDraft(key, baselineSignature) : null);
  const [message, setMessage] = React.useState(''); const timer = React.useRef(null); const suppressed = React.useRef(false);
  const signature = JSON.stringify(data); const dataRef = React.useRef(data); dataRef.current = data;
  const clear = React.useCallback(() => {
    suppressed.current = true; window.clearTimeout(timer.current);
    try { deleteLocalDraft(key); setPending(null); setMessage(''); } catch { setMessage(t('无法清除本地草稿，请保留当前内容并检查浏览器存储。')); }
  }, [key, t]);
  React.useEffect(() => context?.registerDiscard?.(key, clear), [context, key, clear]);
  React.useEffect(() => {
    const refresh = () => { suppressed.current = true; window.clearTimeout(timer.current); setPending(null); setEnabled(draftRecoveryEnabled()); };
    window.addEventListener(LOCAL_PRODUCTIVITY_EVENT, refresh); return () => window.removeEventListener(LOCAL_PRODUCTIVITY_EVENT, refresh);
  }, []);
  // A new edit can start a new draft after an explicit discard; closing an
  // inline editor never serializes its refreshed, already-saved fallback values.
  React.useEffect(() => { if (active) suppressed.current = false; }, [signature, active]);
  React.useEffect(() => {
    if (!enabled || pending || !active || suppressed.current) return;
    if (signature === initialSignature) { try { deleteLocalDraft(key); } catch { /* Optional. */ } return; }
    timer.current = window.setTimeout(() => {
      try { writeLocalDraft(key, baselineSignature, dataRef.current); setMessage(t('临时草稿已在本浏览器保留；尚未提交。')); }
      catch { setMessage(t('临时草稿保存失败；请保留此窗口并手动复制内容。')); }
    }, 350);
    return () => window.clearTimeout(timer.current);
  }, [key, baselineSignature, enabled, pending, signature, initialSignature, active, t]);
  const panel = enabled && (pending || message) ? <section className="local-draft-offer" aria-label={t('临时草稿恢复')}>
    {pending ? <><strong>{t(pending.stale ? '原记录已变化，旧草稿不能直接恢复。' : '找到未提交草稿，是否继续编辑？')}</strong>
      <div className="efficiency-actions">{!pending.stale && <button type="button" className="button secondary" onClick={() => {
        try { onRestore(structuredClone(pending.data)); setPending(null); suppressed.current = false; }
        catch { setPending(previous => ({ ...previous, stale: true })); setMessage(t('草稿结构无法恢复，请查看原文并手动核对。')); }
      }}>{t('恢复到表单')}</button>}<button type="button" className="button secondary" onClick={clear}>{t('丢弃此草稿')}</button></div>
      {pending.stale && <details><summary>{t('查看旧草稿原文')}</summary><textarea readOnly aria-label={t('旧草稿原文')} rows="6" value={JSON.stringify(pending.data, null, 2)} /></details>}</>
      : <p role="status">{message}</p>}
  </section> : null;
  return { panel, clear };
}

export function OutlineImporter({ onAppend }) {
  const { t } = useUiLanguage(); const [text, setText] = React.useState(''), [preview, setPreview] = React.useState(null);
  useModalDraft(text, null); const field = React.useRef(null);
  React.useLayoutEffect(() => {
    const form = field.current?.closest('form');
    const guard = event => { if (!text.trim()) return; event.preventDefault(); event.stopPropagation();
      field.current.closest('details').open = true; field.current.focus(); field.current.reportValidity(); };
    if (field.current) field.current.setCustomValidity(text.trim() ? t('请先把大纲追加到范本草稿，或清空大纲后保存。') : '');
    form?.addEventListener('submit', guard, true); return () => form?.removeEventListener('submit', guard, true);
  }, [text, t]);
  return <details className="efficiency-section"><summary>{t('粘贴流程大纲')}</summary>
    <p className="efficiency-note">{t('每个不缩进行为节点；两个空格或一个 Tab 开头的行为其完成条件。只追加到本次范本草稿，不改现有项目。')}</p>
    <textarea ref={field} rows="6" aria-label={t('流程大纲')} value={text} onChange={event => { setText(event.target.value); setPreview(null); }} />
    <button type="button" className="button secondary" onClick={() => setPreview(parseOutline(text))}>{t('预览大纲')}</button>
    {preview?.error ? <p role="alert">{t('大纲格式无效或超过限制，请检查第 {line} 行。', { line: preview.line || 1 })}</p> : preview && <div className="efficiency-preview">
      {preview.nodes.map((row, index) => <article key={index}><strong>{row.title}</strong>{row.conditions.map((c, i) => <small key={i}>— {c}</small>)}</article>)}
      <button type="button" className="button primary" onClick={() => { onAppend(outlineNodes(preview)); setPreview(null); setText(''); }}>{t('追加到范本草稿')}</button>
    </div>}
  </details>;
}
const DIFF_LABELS = { added: '新增记录', removed: '移除记录', legalName: '法律实体', entityType: '主体类型（可选）',
  incorporationDate: '成立／开始日期（DOI，可选）', parentEntityId: '所属控股公司', archived: '归档', owner: '负责人',
  startDate: '项目开始日', dueDate: '项目截止日', priority: '项目优先级', reportingFramework: '财务报告准则／框架', periods: '报告期间',
  outstanding: '待清事项', workflow: '流程内容或完成状态变化', components: '组成部分', tax: '税务期限', 'private-note': '内部备注变化（内容不显示）',
  schedulePlan: '排期估计变化', nextAction: '下一步变化', remainingWork: '剩余工作估计变化', aliases: '搜索别名变化',
  followUpLanguage: '客户草稿语言变化', samples: '业务范本', groupSamples: '集团范本', outstandingStatuses: '待清状态',
  workstreamCategories: '模块类别', scheduleOrder: '排期顺序' };
export function WorkspaceDifferences({ before, after, defaultOpen = false }) {
  const { t } = useUiLanguage(); const [open, setOpen] = React.useState(defaultOpen);
  const diff = React.useMemo(() => open ? workspaceDifferences(before, after) : null, [open, before, after]);
  return <details className="efficiency-section" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{t('比较具体记录差异')}</summary>
    {diff && (diff.unavailable ? <p>{t('此格式无法逐项比较，请保留原始副本；不会自动合并。')}</p> : <>
      <p>{t('发现 {count} 项差异；仅比较，不修改资料。', { count: diff.total })}</p>
      <div className="efficiency-preview">{diff.rows.map((row, index) => <article key={index}>
        <strong>{row.name} {row.period}</strong><span>{t(DIFF_LABELS[row.field] || '内容变化')}：{String(row.before)} → {String(row.after)}</span>
        {row.field === 'outstanding' && <small>{t('新增 {added}、删除 {removed}、修改 {changed} 条。', row)}</small>}
      </article>)}</div>{diff.truncated && <p>{t('差异较多，仅显示前 200 项。')}</p>}
      <small>{t('内部备注、税务编号及审计叙述不显示；数量相同不代表内容相同。')}</small>
    </>)}
  </details>;
}
