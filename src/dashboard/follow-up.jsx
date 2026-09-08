import { outputFileName, splitMessage } from "./efficiency-export.js";
import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { useModalDraft } from './modal-draft.jsx';
import { followUpSources, followUpSourceLabel, buildFollowUpDraft, followUpPreviewIsCurrent } from './follow-up-model.js';

export function FollowUpComposer({ store, targetKind, targetId, onOpenItem, onClose, initialSelected = [], initialSourceId = "", onRememberLanguage = null }) {
  const { language, t } = useUiLanguage();
  const sources = followUpSources(store, targetKind, targetId);
  const [sourceId, setSourceId] = React.useState(initialSourceId || (initialSelected.length || targetKind === 'project' ? targetId : ''));
  const [outputLanguage, setOutputLanguage] = React.useState(() => {
    const initial = sources.find(s => s.id === (initialSourceId || targetId));
    return store.entities.find(e => e.id === initial?.entityId)?.followUpLanguage || language;
  });
  const [selected, setSelected] = React.useState(initialSelected);
  const [draft, setDraft] = React.useState(null);
  const [reviewed, setReviewed] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [genericFilename, setGenericFilename] = React.useState(true), [copiedParts, setCopiedParts] = React.useState([]);
  const textRef = React.useRef(null);
  const fallbackFocus = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!busy && fallbackFocus.current) { fallbackFocus.current = false; textRef.current?.focus(); textRef.current?.select(); }
  }, [busy, error]);
  const source = sources.find(item => item.id === sourceId);
  const manualChanges = draft && draft.text !== draft.generated && draft.text !== draft.exported ? draft.text : '';
  const { closeEditor, confirmTransition } = useModalDraft(manualChanges, onClose);
  React.useLayoutEffect(() => { if (draft) textRef.current?.focus(); }, [draft?.generated]);
  const current = followUpPreviewIsCurrent(draft, sources);
  const canExport = Boolean(draft?.text.trim() && current && reviewed && !busy);
  const changeSelection = (action) => confirmTransition(() => {
    action(); setCopiedParts([]); setDraft(null); setReviewed(false); setMessage(''); setError('');
  });
  const preview = () => confirmTransition(() => {
    const result = buildFollowUpDraft(source, selected, outputLanguage);
    if (result.error) { setError(t("请选择当前公司及至少一条未清事项。")); return; }
    setDraft({ ...result, sourceId, generated: result.text, exported: '' }); setReviewed(false); setMessage(''); setError('');
  });
  const output = async (mode) => {
    if (!canExport || !followUpPreviewIsCurrent(draft, followUpSources(store, targetKind, targetId))) return;
    const text = draft.text; const isCopy = mode !== 'download';
    const split = splitMessage(text), outputText = mode === 'subject' ? split.subject : mode === 'body' ? split.body : text; setBusy(true); setError(''); setMessage('');
    try {
      if (isCopy) {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(outputText);
      } else {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
        anchor.href = url; anchor.download = outputFileName({ purpose: 'apw-client-follow-up', company: store.entities.find(e => e.id === source.entityId)?.aliases?.[0] || source.companyName,
          periods: source.reportingPeriods, generic: genericFilename });
        document.body.append(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      if (isCopy) {
        const parts = mode === 'copy' ? ['subject', 'body'] : [...new Set([...copiedParts, mode])]; setCopiedParts(parts);
        if (parts.includes('subject') && parts.includes('body')) setDraft(previous => previous?.text === text ? { ...previous, exported: text } : previous);
      }
      setMessage(t(isCopy ? "草稿已复制，尚未发送。" : "已请求下载草稿，请确认文件已保存；尚未发送。"));
    } catch {
      setError(t(isCopy ? "无法自动复制。请选取下方文字手动复制，或下载文本草稿。" : "无法下载草稿，请保留此页面并手动复制。"));
      fallbackFocus.current = true;
    } finally { setBusy(false); }
  };
  return <div data-editor-guard className="workbench-form follow-up-composer">
    <p className="follow-up-boundary">{t("仅生成本地草稿，不会发送或上传。默认只包含公司、报告期间及勾选的事项标题，不含内部备注或税务编号。标题本身仍可能敏感，请逐项检查。")}</p>
    <label><span>{t("来源公司与年度项目")}</span><select value={sourceId} disabled={busy}
      onChange={event => changeSelection(() => {
        const next = sources.find(s => s.id === event.target.value); setSourceId(event.target.value); setSelected([]);
        setOutputLanguage(store.entities.find(e => e.id === next?.entityId)?.followUpLanguage || language);
      })}>
      <option value="">{t("请选择单一来源")}</option>{sources.map(item => <option key={item.id} value={item.id}>
        {followUpSourceLabel(item, language)}</option>)}</select></label>
    {source && <p className="follow-up-source" aria-label={t("完整来源")}>{followUpSourceLabel(source, language)}</p>}
    {!sources.length && <p role="status">{t("此范围没有可用于跟进草稿的未清事项。")}</p>}
    {source && <section className="follow-up-items" aria-label={t("选择跟进事项")}>
      <header><strong>{t("已选 {count} 项", { count: selected.filter(id => source.items.some(item => item.id === id)).length })}</strong>
        <button type="button" disabled={busy} className="button secondary" onClick={() => changeSelection(() => setSelected(source.items.map(item => item.id)))}>{t("选择本项目全部未清事项")}</button>
        <button type="button" disabled={busy} className="button secondary" onClick={() => changeSelection(() => setSelected([]))}>{t("清除选择")}</button></header>
      {source.items.map(item => <div className="follow-up-item" key={item.id}>
        <label><input type="checkbox" checked={selected.includes(item.id)} disabled={busy}
          onChange={() => changeSelection(() => setSelected(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id]))} />
          <span>{item.title}</span></label>
        <button type="button" className="button secondary" disabled={busy} aria-label={`${t("查看来源事项")}：${item.title}`}
          onClick={() => confirmTransition(() => onOpenItem(source.kind, source.id, item.id))}>{t("查看来源事项")}</button>
      </div>)}</section>}
    <label><span>{t("草稿语言")}</span><select value={outputLanguage} disabled={busy}
      onChange={event => changeSelection(() => setOutputLanguage(event.target.value))}>
      <option value="en">English</option><option value="zh-Hans">{t("简体中文")}</option><option value="zh-Hant">{t("繁体中文")}</option></select></label>
    {source && onRememberLanguage && <button type="button" className="button secondary" disabled={busy} onClick={() => {
      const entity = store.entities.find(e => e.id === source.entityId);
      const result = onRememberLanguage(source.entityId, outputLanguage, entity?.followUpLanguage);
      setMessage(t(result?.error ? '来源资料已变化，请重新检查。' : '已记住本公司的草稿语言；界面语言不变。'));
    }}>{t('记住本公司草稿语言')}</button>}
    <label className="check-option"><input type="checkbox" checked={genericFilename} onChange={event => setGenericFilename(event.target.checked)} />
      <span>{t('下载使用通用文件名，不包含客户名称')}</span></label>
    <button type="button" className="button secondary follow-up-preview-action" disabled={!source || !selected.length || busy} onClick={preview}>{t("生成预览")}</button>
    {draft && <section className="follow-up-preview" aria-label={t("外发预览")}>
      <p>{t("这是临时草稿，可修改文字；不会改写原事项。复制或下载前请确认公司、报告期间和全部内容。")}</p>
      {!current && <p role="alert">{t("来源资料已变化，旧预览不可输出。请重新选择并生成预览。")}</p>}
      <label><span>{t("跟进草稿（标题与正文）")}</span><textarea ref={textRef} rows="10" value={draft.text} disabled={busy}
        onChange={event => { setDraft(previous => ({ ...previous, text: event.target.value })); setReviewed(false); setCopiedParts([]); setMessage(''); setError(''); }} /></label>
      <label className="follow-up-review"><input type="checkbox" checked={reviewed} disabled={!current || busy}
        onChange={event => setReviewed(event.target.checked)} /><span>{t("我已检查来源及草稿内容，可复制或下载。")}</span></label>
    </section>}
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <footer className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={closeEditor}>{t("关闭")}</button>
      <button type="button" className="button primary" disabled={!canExport} onClick={() => output('copy')}>{t("复制草稿")}</button>
      <button type="button" className="button secondary" disabled={!canExport} onClick={() => output('subject')}>{t('复制标题')}</button>
      <button type="button" className="button secondary" disabled={!canExport} onClick={() => output('body')}>{t('复制正文')}</button>
      <button type="button" className="button secondary" disabled={!canExport} onClick={() => output('download')}>{t("下载文本草稿")}</button></footer>
  </div>;
}
