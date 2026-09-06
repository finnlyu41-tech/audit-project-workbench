import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { reportingPeriodLabel, workstreamTypeLabel } from './model.js';
import { useModalDraft } from './modal-draft.jsx';
import { isComposingKey } from './editor-draft-state.js';
import { RequiredTextInput } from './required-text-input.jsx';
import { newOutstandingValues, outstandingTargetSnapshot, prepareOutstandingSave } from './outstanding-entry-model.js';

const ERRORS = {
  source: "目标公司或报告期间已变化，请保留草稿并重新选择来源。",
  readonly: "此公司或年度项目已归档，无法添加或修改待清事项。",
  title: "请填写内容，不能只输入空格。",
  status: "所选待清状态已不存在，请重新选择。",
  module: "所选业务模块已不存在，请重新选择。",
  missing: "此待清事项已被删除，无法保存。",
  conflict: "此事项已在别处更新，请保留草稿并重新打开。",
};
export function OutstandingEntry({ store, targetKind, targetId, initial, statuses, workstreams,
  defaultWorkstreamId, onSave, onClose }) {
  const { language, t } = useUiLanguage();
  const [baseline] = React.useState(() => outstandingTargetSnapshot(store, targetKind, targetId));
  const [session, setSession] = React.useState({ count: 0, module: defaultWorkstreamId || '', title: '' });
  const submit = (values, continueAdding) => {
    const result = prepareOutstandingSave(store, baseline, values, initial);
    if (result.error) return { error: t(ERRORS[result.error]) };
    onSave(result.item, { continueAdding: !initial && continueAdding });
    if (!initial && continueAdding) setSession((current) => ({ count: current.count + 1,
      module: values.workstreamId || '', title: result.item.title }));
    return result;
  };
  return <div className="outstanding-entry">
    <section className="outstanding-entry-source" aria-label={t("事项归属")}>
      <strong>{baseline?.companyName}</strong><span>{reportingPeriodLabel(baseline?.engagement || {}, language)}</span>
      <small>{t("仅更新此年度项目；不会改变流程完成状态。")}</small></section>
    {session.count > 0 && <div className="outstanding-entry-receipt" role="status" aria-live="polite">
      <strong>{t("本次已添加 {count} 项；上一项：{title}", { count: session.count, title: session.title })}</strong>
      <span>{t("已提交事项不会因取消下一项而删除；实际保存状态见备份菜单。")}</span></div>}
    <OutstandingForm key={session.count} initial={initial} statuses={statuses} workstreams={workstreams}
      defaultWorkstreamId={session.module} onSubmit={submit} onClose={onClose} />
  </div>;
}
function OutstandingForm({ initial, statuses, workstreams, defaultWorkstreamId, onSubmit, onClose }) {
  const { language, t } = useUiLanguage();
  const [values, setValues] = React.useState(() => initial ? { title: initial.title || '', note: initial.note || '',
    status: initial.status, workstreamId: initial.workstreamId || '' } : newOutstandingValues(statuses, defaultWorkstreamId));
  const [error, setError] = React.useState('');
  const form = React.useRef(null); const submitted = React.useRef(false); const composing = React.useRef(false);
  const { closeEditor } = useModalDraft(values, onClose);
  React.useLayoutEffect(() => {
    form.current?.querySelector('input')?.focus({ preventScroll: true });
    form.current?.closest('.workbench-modal-body')?.scrollTo({ top: 0 });
  }, []);
  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value })); setError('');
  };
  const submit = (event) => {
    event.preventDefault();
    if (submitted.current || composing.current || !values.title.trim()) return;
    submitted.current = true;
    const result = onSubmit(values, event.nativeEvent.submitter?.value === 'continue');
    if (result?.error) { submitted.current = false; setError(result.error); }
  };
  return <form ref={form} data-editor-guard className="workbench-form outstanding-entry-form" onSubmit={submit}
    onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
    onKeyDownCapture={(event) => { if (event.key === 'Enter' && (composing.current || isComposingKey(event))) event.preventDefault(); }}>
    <label><span>{t("待清事项 *")}</span><RequiredTextInput autoFocus aria-label={t("待清事项 *")}
      value={values.title} onChange={update('title')} placeholder={t("例如：尚欠银行月结单")} /></label>
    {workstreams.length > 0 && <label><span>{t("所属层级或业务模块")}</span><select value={values.workstreamId} onChange={update('workstreamId')}>
      <option value="">{t("项目级")}</option>{workstreams.map((workstream) => <option value={workstream.id} key={workstream.id}>
        {workstreamTypeLabel(workstream.type, language, workstream.customName)}</option>)}</select></label>}
    <label><span>{t("待清状态")}</span><select value={values.status} onChange={update('status')}>{statuses.map((status) =>
      <option value={status.id} key={status.id}>{status.label}</option>)}</select></label>
    <label><span>{t("说明")}</span><textarea rows="4" value={values.note} onChange={update('note')}
      placeholder={t("记录缺少内容、负责方或下一步跟进")} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={closeEditor}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存待清事项")}</button>
      {!initial && <button type="submit" name="afterSave" value="continue" className="button secondary"
        onClick={(event) => { if (event.detail > 1) event.preventDefault(); }}>{t("保存并继续新增")}</button>}
    </footer></form>;
}
