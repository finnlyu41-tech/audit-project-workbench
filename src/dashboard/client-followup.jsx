import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { useModalDraft } from './modal-draft.jsx';
import { followupSources, followupSnapshot, followupPeriod, buildFollowupText, downloadFollowupText } from './client-followup-model.js';

export function ClientFollowup({ store, sourceIds, initialSourceId, onClose, onOpenSource }) {
  const { language, t } = useUiLanguage();
  const [sourceId, setSourceId] = React.useState(initialSourceId || '');
  const [draftLanguage, setDraftLanguage] = React.useState(language);
  const [selected, setSelected] = React.useState([]); const [draft, setDraft] = React.useState(null);
  const [transferred, setTransferred] = React.useState(''); const [notice, setNotice] = React.useState('');
  const [busy, setBusy] = React.useState(false); const textRef = React.useRef(null);
  const requestedFocus = React.useRef(''); const outputPending = React.useRef(false);
  React.useLayoutEffect(() => {
    if (busy || !requestedFocus.current || !textRef.current) return;
    const select = requestedFocus.current === 'select'; requestedFocus.current = '';
    textRef.current.focus({ preventScroll: true });
    textRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (select) textRef.current.select();
  }, [busy, notice, draft?.signature]);
  const sources = followupSources(store, sourceIds); const source = sources.find((item) => item.id === sourceId);
  const snapshot = followupSnapshot(store, sourceId, selected);
  const valid = Boolean(draft && source && !snapshot.error && draft.signature === snapshot.signature && draft.language === draftLanguage);
  const fingerprint = draft ? JSON.stringify([draft.signature, draft.text]) : '';
  const { closeEditor, confirmTransition } = useModalDraft(Boolean(draft && fingerprint !== transferred), onClose);
  const reset = (action) => {
    if (draft && draft.text !== draft.original && !window.confirm(t("切换将清除当前手工修改的草稿，是否继续？"))) return;
    action(); setDraft(null); setTransferred(''); setNotice('');
  };
  const generate = (event) => {
    event.preventDefault(); if (draft || snapshot.error || !source) return;
    const text = buildFollowupText(snapshot, draftLanguage);
    requestedFocus.current = 'read';
    setDraft({ text, original: text, signature: snapshot.signature, language: draftLanguage }); setNotice(''); setTransferred('');
  };
  const output = async (kind) => {
    if (!valid || busy || outputPending.current) return;
    outputPending.current = true; setBusy(true); setNotice('');
    try {
      if (kind === 'copy') { if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable'); await navigator.clipboard.writeText(draft.text); }
      else downloadFollowupText(draft.text);
      setTransferred(fingerprint); setNotice(t(kind === 'copy' ? "草稿已复制；尚未发送。" : "已请求下载草稿；尚未发送，请检查下载文件。"));
    } catch {
      setNotice(t(kind === 'copy' ? "复制未完成，请手动复制选中的草稿或下载文本。" : "下载未完成，请保留此窗口并手动复制草稿。"));
      requestedFocus.current = 'select';
    } finally { outputPending.current = false; setBusy(false); }
  };
  return <form className="workbench-form client-followup" data-editor-guard onSubmit={generate}>
    <p className="followup-boundary">{t("每份草稿只包含一个公司和年度项目。仅使用明确勾选的事项标题，不包含内部备注、负责人、税务编号或审计结论。")}</p>
    <label><span>{t("来源公司与年度项目")}</span><select value={sourceId} disabled={busy}
      onChange={(event) => reset(() => { setSourceId(event.target.value); setSelected([]); })}>
      <option value="">{t("请选择单一来源")}</option>{sources.map((item) => <option key={item.id} value={item.id}>
        {item.company} · {followupPeriod(item, language)}</option>)}</select></label>
    {source && <div className="followup-source"><strong>{source.company}</strong><span>{followupPeriod(source, language)}</span></div>}
    <label><span>{t("草稿语言")}</span><select value={draftLanguage} disabled={busy}
      onChange={(event) => reset(() => setDraftLanguage(event.target.value))}>
      <option value="en">English</option><option value="zh-Hans">{t("简体中文")}</option><option value="zh-Hant">{t("繁體中文")}</option></select></label>
    <p className="followup-hint">{t("以下为所选来源的全部未清事项，不受列表搜索筛选影响。标题也可能包含内部资料，请逐项检查。")}</p>
    {source && <fieldset className="followup-items"><legend>{t("选择跟进事项")}</legend>
      <div className="followup-selection"><button type="button" disabled={busy || !source.items.length}
        onClick={() => reset(() => setSelected(source.items.map((item) => item.id)))}>{t("全选此来源的未清事项")}</button>
        <button type="button" disabled={busy || !selected.length} onClick={() => reset(() => setSelected([]))}>{t("清除选择")}</button>
        <span>{t("已选 {count} 项", { count: selected.length })}</span></div>
      {!source.items.length && <p>{t("此来源没有可跟进的未清事项。")}</p>}
      {source.items.map((item) => <div className="followup-item" key={item.id}>
        <label><input type="checkbox" checked={selected.includes(item.id)} disabled={busy}
          onChange={() => reset(() => setSelected((current) => current.includes(item.id)
            ? current.filter((id) => id !== item.id) : [...current, item.id]))} /><span>{item.title}</span></label>
        <button type="button" disabled={busy} aria-label={`${t("查看原事项")}：${item.title}`}
          onClick={() => confirmTransition(() => onOpenSource(source.kind, source.id, item.id))}>{t("查看原事项")}</button>
      </div>)}</fieldset>}
    {!source && <p role="status">{t("请选择未归档的公司和年度项目，不会自动混合集团内不同来源。")}</p>}
    {draft && <section className="followup-preview" aria-label={t("外发预览")}>
      <p>{t("请核对公司、报告期间和每一项内容。只生成草稿，不会自动发送或上传；关闭窗口后不保留草稿。")}</p>
      {!valid && <p className="form-error" role="alert">{t("来源或选择已变化，旧草稿不能输出。请重新选择并生成预览。")}</p>}
      <label><span>{t("跟进草稿（可修改）")}</span><textarea ref={textRef} rows="12" value={draft.text} disabled={busy}
        onChange={(event) => { setDraft((current) => ({ ...current, text: event.target.value })); setNotice(''); }} /></label>
    </section>}
    {notice && <p role="status" className="followup-notice">{notice}</p>}
    <footer className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={closeEditor}>{t("关闭")}</button>
      {!draft && <button type="submit" className="button primary" disabled={Boolean(snapshot.error) || !source || busy}>{t("生成跟进草稿")}</button>}
      {draft && <><button type="button" className="button primary" disabled={!valid || !draft.text.trim() || busy} onClick={() => output('copy')}>{t("复制草稿")}</button>
        <button type="button" className="button secondary" disabled={!valid || !draft.text.trim() || busy} onClick={() => output('download')}>{t("下载文本草稿")}</button></>}
    </footer>
  </form>;
}
