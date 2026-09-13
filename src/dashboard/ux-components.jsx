import { validQuickDraft } from "./local-productivity.js";
import { OwnerInput, useRecoverableDraft } from "./efficiency-controls.jsx";
import { NextActionSettings, RemainingWork } from "./efficiency-next.jsx";
import { ScheduleFields } from "./schedule-fields.jsx";
import { initialScheduleDraft, resolveScheduleDraft, SCHEDULE_ERRORS } from "./working-days.js";
import React from "react";
import { ProjectPrioritySelect } from "./project-priority.jsx";
import { projectPriority } from "./project-priority.js";
import { ArrowRight, ChevronDown, Pencil, Save } from "lucide-react";
import { formatDate } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { nextEngagementAction, quickUpdateValues, quickUpdateContext } from "./ux-model.js";
import { ProjectFocusSummary } from "./project-focus-summary.jsx";

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

export function QuickUpdate({ engagement, readOnly = false, drafts, onSave, onContinue, onPriorityChange, onPatch = null, store, showSummary = true }) {
  const { language, t } = useUiLanguage();
  const [editor, setEditor] = React.useState(() => drafts.get(engagement.id) || null);
  const [error, setError] = React.useState("");
  const [applied, setApplied] = React.useState(false);
  const trigger = React.useRef(null);
  const next = nextEngagementAction(engagement, store?.outstandingStatuses);
  const holding = store?.entities.some(e => e.id === engagement.entityId && e.kind === "holding_company");
  const edit = () => {
    const values = quickUpdateValues(engagement);
    setEditor({ baseline: values, values: { ...values }, baselineContext: quickUpdateContext(engagement), scheduleDraft: initialScheduleDraft(engagement),
      baselinePlan: engagement.schedulePlan });
    setApplied(false); setError("");
  };
  const update = (field) => (event) => {
    const nextEditor = { ...editor, values: { ...editor.values, [field]: event.target.value } };
    const dirty = Object.keys(nextEditor.values).some((key) => nextEditor.values[key] !== nextEditor.baseline[key]);
    if (dirty) drafts.set(engagement.id, nextEditor);
    else drafts.delete(engagement.id);
    setEditor(nextEditor); setError("");
  };
  const recovery = useRecoverableDraft(`quick:${engagement.id}`, engagement,
    editor || { baseline: quickUpdateValues(engagement), values: quickUpdateValues(engagement) }, data => {
      if (!validQuickDraft(data)) throw new Error('invalid draft');
      drafts.set(engagement.id, data); setEditor(data);
    }, { active: Boolean(editor) });
  const changeSchedule = draft => {
    const result = resolveScheduleDraft(draft, editor.values);
    const nextEditor = { ...editor, scheduleDraft: draft,
      values: result.error ? editor.values : { ...editor.values, startDate: result.startDate, dueDate: result.dueDate } };
    drafts.set(engagement.id, nextEditor); setEditor(nextEditor); setError('');
  };
  const close = () => {
    recovery.clear();
    drafts.delete(engagement.id);
    setEditor(null); setError("");
    window.requestAnimationFrame(() => trigger.current?.focus());
  };
  const submit = (event) => {
    event.preventDefault();
    const result = onSave(engagement.id, editor.baseline, editor.values, editor.scheduleDraft
      ? { draft: editor.scheduleDraft, baselineContext: editor.baselineContext, baselinePlan: editor.baselinePlan } : null);
    if (result?.error) {
      const messages = { readonly: "此项目已归档或不存在，无法保存。", conflict: "这些资料已在别处更新。请取消并重新打开，避免覆盖新内容。",
        date: "请填写有效日期。", range: "项目截止日不得早于开始日。" };
      setError(t(messages[result.error] || SCHEDULE_ERRORS[result.error] || "无法保存更改，请重试。")); return;
    }
    close(); setApplied(true);
  };
  return <section className="quick-update-panel" data-density="compact" data-project-focus={!showSummary || undefined} aria-label={t("快速更新")}>
    <header><h3>{t("快速更新")}</h3>
      {!editor && showSummary && <dl className="quick-update-summary">
        <div><dt>{t("负责人")}</dt><dd>{engagement.owner || t("未设置")}</dd></div>
        {(engagement.startDate || engagement.dueDate) && <div><dt>{t("项目排期")}</dt><dd>
          {engagement.startDate ? formatDate(engagement.startDate, language) : t("未设置开始日")} → {engagement.dueDate ? formatDate(engagement.dueDate, language) : t("未设置截止日")}</dd></div>}
      </dl>}
      {onPriorityChange && <ProjectPrioritySelect compact value={projectPriority(engagement)} disabled={readOnly}
        onChange={value => onPriorityChange(engagement.id, value, projectPriority(engagement))} />}
      {!readOnly && !editor && <button type="button" ref={trigger} className="button secondary" onClick={edit}>
        <Pencil aria-hidden="true" />{t("快速编辑")}</button>}</header>
    {!editor && !showSummary && <ProjectFocusSummary engagement={engagement} store={store} next={next}
      onContinue={onContinue} readOnly={readOnly} holding={holding} />}
    {!readOnly && recovery.panel}
    {editor && !readOnly ? <form className="quick-update-form" onSubmit={submit}>
      <div className="quick-update-fields">
        <label><span>{t("负责人")}</span><OwnerInput store={store} autoFocus value={editor.values.owner} onChange={update("owner")} /></label>
      </div>
      <div className="project-date-groups" data-single="true"><fieldset><legend>{t('项目排期')}</legend>
        <ScheduleFields draft={editor.scheduleDraft || initialScheduleDraft({ ...engagement, ...editor.values })} onDraftChange={changeSchedule}
          startDate={editor.values.startDate} dueDate={editor.values.dueDate} onChange={(startDate, dueDate) => {
            const nextEditor = { ...editor, values: { ...editor.values, startDate, dueDate },
              scheduleDraft: { ...(editor.scheduleDraft || initialScheduleDraft(engagement)), mode: editor.scheduleDraft?.direction === 'count' ? 'workdays' : 'manual', snapshot: null } };
            drafts.set(engagement.id, nextEditor); setEditor(nextEditor); setError('');
          }} />
      </fieldset></div>
      <label className="quick-update-notes"><span>{t("项目备注")}</span><textarea rows="3" value={editor.values.notes}
        onChange={update("notes")} placeholder={t("记录下一步、跟进情况或交接说明")} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer><small>{t("保存后生效；未提交草稿按本地草稿恢复设置处理。")}</small><div>
        <button type="button" className="button secondary" onClick={close}>{t("取消")}</button>
        <button type="submit" className="button primary"><Save aria-hidden="true" />{t("保存更新")}</button></div></footer>
    </form> : <>
      <div className="quick-secondary-actions">{engagement.notes && <details className="quick-note-disclosure"><summary>{t("项目备注")}</summary>
        <p className="quick-note-preview">{engagement.notes}</p></details>}
    {onPatch && <details className="efficiency-compact"><summary>{t('下一步与剩余工作设置')}</summary>
      <NextActionSettings record={engagement} statuses={store.outstandingStatuses} onPatch={onPatch} readOnly={readOnly} />
      <RemainingWork record={engagement} onPatch={onPatch} readOnly={readOnly} />
    </details>}
      </div>
      {showSummary && !readOnly && next && onContinue && (!holding || engagement.nextAction) && <button type="button" className="next-action-link" onClick={() => onContinue(next)}>
        <span><small>{t("下一步")}</small><strong>{next.item?.title || next.node?.title || t("为业务模块添加节点")}</strong></span>
        <ArrowRight aria-hidden="true" /></button>}
    </>}

    {applied && <p className="quick-update-feedback" role="status">{t("更新已应用；保存状态见备份菜单。")}</p>}
  </section>;
}
