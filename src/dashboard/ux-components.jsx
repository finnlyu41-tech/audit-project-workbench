import React from "react";
import { ArrowRight, ChevronDown, Pencil, Save } from "lucide-react";
import { formatDate } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { nextEngagementAction, quickUpdateValues } from "./ux-model.js";

export function AdvancedSection({ title, hint, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return <details className="advanced-section" open={open}
    onToggle={(event) => setOpen(event.currentTarget.open)} onInvalidCapture={(event) => {
      event.currentTarget.open = true;
      setOpen(true);
    }}>
    <summary><span><strong>{title}</strong>{hint && <small>{hint}</small>}</span><ChevronDown aria-hidden="true" /></summary>
    <div className="advanced-section-body">{children}</div>
  </details>;
}

export function QuickUpdate({ engagement, readOnly = false, drafts, onSave, onContinue, showSummary = true }) {
  const { language, t } = useUiLanguage();
  const [editor, setEditor] = React.useState(() => drafts.get(engagement.id) || null);
  const [error, setError] = React.useState("");
  const [applied, setApplied] = React.useState(false);
  const trigger = React.useRef(null);
  const next = nextEngagementAction(engagement);
  const edit = () => {
    const values = quickUpdateValues(engagement);
    setEditor({ baseline: values, values: { ...values } });
    setApplied(false); setError("");
  };
  const update = (field) => (event) => {
    const nextEditor = { ...editor, values: { ...editor.values, [field]: event.target.value } };
    const dirty = Object.keys(nextEditor.values).some((key) => nextEditor.values[key] !== nextEditor.baseline[key]);
    if (dirty) drafts.set(engagement.id, nextEditor);
    else drafts.delete(engagement.id);
    setEditor(nextEditor); setError("");
  };
  const close = () => {
    drafts.delete(engagement.id);
    setEditor(null); setError("");
    window.requestAnimationFrame(() => trigger.current?.focus());
  };
  const submit = (event) => {
    event.preventDefault();
    const result = onSave(engagement.id, editor.baseline, editor.values);
    if (result?.error) {
      const messages = { readonly: "此项目已归档或不存在，无法保存。", conflict: "这些资料已在别处更新。请取消并重新打开，避免覆盖新内容。",
        date: "请填写有效日期。", range: "项目截止日不得早于开始日。" };
      setError(t(messages[result.error] || "无法保存更改，请重试。")); return;
    }
    close(); setApplied(true);
  };
  return <section className="quick-update-panel" data-density="compact" aria-label={t("快速更新")}>
    <header><h3>{t("快速更新")}</h3>
      {!editor && showSummary && <dl className="quick-update-summary">
        <div><dt>{t("负责人")}</dt><dd>{engagement.owner || t("未设置")}</dd></div>
        {(engagement.startDate || engagement.dueDate) && <div><dt>{t("项目排期")}</dt><dd>
          {engagement.startDate ? formatDate(engagement.startDate, language) : t("未设置开始日")} → {engagement.dueDate ? formatDate(engagement.dueDate, language) : t("未设置截止日")}</dd></div>}
      </dl>}
      {!readOnly && !editor && <button type="button" ref={trigger} className="button secondary" onClick={edit}>
        <Pencil aria-hidden="true" />{t("快速编辑")}</button>}</header>
    {editor && !readOnly ? <form className="quick-update-form" onSubmit={submit}>
      <div className="quick-update-fields">
        <label><span>{t("负责人")}</span><input autoFocus value={editor.values.owner} onChange={update("owner")} /></label>
        <label><span>{t("项目开始日")}</span><input type="date" value={editor.values.startDate}
          min="0001-01-01" max={editor.values.dueDate || "9999-12-31"} onChange={update("startDate")} /></label>
        <label><span>{t("项目截止日")}</span><input type="date" value={editor.values.dueDate}
          min={editor.values.startDate || "0001-01-01"} max="9999-12-31" onChange={update("dueDate")} /></label>
      </div>
      <label className="quick-update-notes"><span>{t("项目备注")}</span><textarea rows="3" value={editor.values.notes}
        onChange={update("notes")} placeholder={t("记录下一步、跟进情况或交接说明")} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer><small>{t("保存后生效；未保存草稿仅在本次会话保留。")}</small><div>
        <button type="button" className="button secondary" onClick={close}>{t("取消")}</button>
        <button type="submit" className="button primary"><Save aria-hidden="true" />{t("保存更新")}</button></div></footer>
    </form> : <>
      {engagement.notes && <details className="quick-note-disclosure"><summary>{t("项目备注")}</summary>
        <p className="quick-note-preview">{engagement.notes}</p></details>}
      {!readOnly && next && onContinue && <button type="button" className="next-action-link" onClick={() => onContinue(next)}>
        <span><small>{t("下一步")}</small><strong>{next.node?.title || t("为业务模块添加节点")}</strong></span>
        <ArrowRight aria-hidden="true" /></button>}
    </>}
    {applied && <p className="quick-update-feedback" role="status">{t("更新已应用；保存状态见备份菜单。")}</p>}
  </section>;
}
