import React from "react";
import { useModalDraft } from "./modal-draft.jsx";
import { RequiredTextInput } from "./required-text-input.jsx";
import { Ban, Check, ExternalLink, History, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { TAX_DEADLINE_CATEGORIES, TAX_DEADLINE_STATES, collectGroupTaxDeadlineEntries, formatDate,
  taxDeadlineCategoryLabel, taxDeadlineStateLabel, taxDeadlineSummary, taxDeadlineUrgency,
  workstreamTypeLabel, yearEndOrPeriodLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { handleTabListKeyDown, tabIndexFor } from "./a11y.js";

function urgencyLabel(urgency, t) {
  if (urgency.level === "overdue") return t("逾期 {count} 天", { count: urgency.daysOverdue });
  if (urgency.level === "due_today") return t("今天到期");
  if (urgency.level === "due_soon") return t("{count} 天后到期", { count: urgency.daysUntil });
  if (urgency.level === "upcoming") return t("{count} 天后到期", { count: urgency.daysUntil });
  return t("没有有效日期");
}

function sourceRecord(store, sourceType, sourceId) {
  if (sourceType === "entity") return store.entities?.find((item) => item.id === sourceId);
  return sourceType === "group" ? store.groups.find((item) => item.id === sourceId)
    : store.projects.find((item) => item.id === sourceId);
}

function directEntries(target, targetKind) {
  return (target?.taxDeadlines || []).map((deadline) => ({ deadline, sourceType: targetKind,
    sourceId: target.id, sourceName: targetKind === "entity" ? target.legalName
      : targetKind === "project" ? target.entity || target.name : target.name, depth: 0 }));
}

function collectEntityTaxEntries(store, entityId, visited = new Set(), depth = 0) {
  if (visited.has(entityId)) return [];
  const entity = store.entities?.find((item) => item.id === entityId);
  if (!entity) return [];
  const next = new Set(visited).add(entityId);
  const own = directEntries(entity, "entity").map((entry) => ({ ...entry, depth }));
  const children = (store.entities || []).filter((child) => child.parentEntityId === entityId && !child.archived)
    .flatMap((child) => collectEntityTaxEntries(store, child.id, next, depth + 1));
  return [...own, ...children];
}

export function TaxDeadlineSummaryButton({ deadlines = [], now = new Date(), onClick, compact = false }) {
  const { language, t } = useUiLanguage();
  const summary = taxDeadlineSummary(deadlines, now);
  const nextDate = summary.next ? formatDate(summary.next.dueDate, language) : t("没有未完成期限");
  return <button type="button" className="tax-deadline-summary-button" data-urgency={summary.urgency}
    data-compact={compact || undefined} onClick={onClick}
    aria-label={t("税务期限：{date}，{count} 项未完成", { date: nextDate, count: summary.openCount })}>
    <ReceiptText aria-hidden="true" /><span><strong>{nextDate}</strong>
      <small>{t("{count} 项未完成", { count: summary.openCount })}</small></span>
    {summary.attentionCount > 0 && <b>{summary.attentionCount}</b>}
  </button>;
}

function TaxDeadlineForm({ initial: initialValue, engagements = [], initialEngagementId = "", onSubmit, onDelete, onCancel }) {
  const { language, t } = useUiLanguage();
  const initial = React.useRef(initialValue).current;
  const [saveError, setSaveError] = React.useState("");
  const [values, setValues] = React.useState(() => ({
    category: initial?.category || "profits_tax_filing",
    customName: initial?.customName || "",
    taxYear: initial?.taxYear || "",
    owner: initial?.owner || "",
    dueDate: initial?.dueDate || "",
    reminderDays: initial?.reminderDays ?? 30,
    state: initial?.state || "open",
    linkedEngagementId: initial?.linkedEngagementId || initialEngagementId || "",
    linkedWorkstreamId: initial?.linkedWorkstreamId || "",
    reference: initial?.reference || "",
    note: initial?.note || "",
  }));
  const [revisionReason, setRevisionReason] = React.useState("");
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const dateChanged = Boolean(initial?.dueDate && values.dueDate && initial.dueDate !== values.dueDate);
  const { closeEditor, confirmTransition } = useModalDraft({ ...values,
    reminderDays: String(values.reminderDays), revisionReason: dateChanged ? revisionReason : "" }, onCancel);
  const describeError = (result) => {
    if (!result?.error) return;
    const messages = { source: "来源已归档或不存在，无法保存。", missing: "这项期限已不存在，请取消编辑后重新检查。",
      changed: "期限已在别处更新，请取消并重新编辑，避免覆盖新内容。", reason: "请填写改期原因。" };
    setSaveError(t(messages[result.error] || "未能保存期限，更改仍保留在此编辑器中。"));
  };
  const linkedEngagement = engagements.find((engagement) => engagement.id === values.linkedEngagementId);
  const workstreams = linkedEngagement?.workstreams || [];
  return <form data-editor-guard className="tax-deadline-form" onSubmit={(event) => {
    event.preventDefault();
    if (values.category === "custom" && !values.customName.trim()) return;
    if (dateChanged && !revisionReason.trim()) return;
    setSaveError("");
    const result = onSubmit({ ...values, reminderDays: Number(values.reminderDays),
      linkedEngagementId: values.linkedEngagementId || null,
      linkedWorkstreamId: values.linkedWorkstreamId || null }, revisionReason.trim(), initial);
    describeError(result);
  }}>
    <header><div><span>{t(initial ? "编辑税务期限" : "新增税务期限")}</span>
      <strong>{initial ? taxDeadlineCategoryLabel(initial, language) : t("建立一项合规期限")}</strong></div>
      <button type="button" className="text-button" onClick={closeEditor}>{t("取消")}</button></header>
    <div className="tax-deadline-form-grid">
      <div className="tax-deadline-category-control"><label><span>{t("期限种类 *")}</span>
        <select autoFocus value={values.category} onChange={update("category")}>
          {TAX_DEADLINE_CATEGORIES.map((category) => <option value={category} key={category}>
            {taxDeadlineCategoryLabel(category, language)}</option>)}</select></label>
        {values.category !== "custom" && <button type="button" className="text-button"
          onClick={() => setValues((current) => ({ ...current, category: "custom", customName: "" }))}>
          <Plus aria-hidden="true" />{t("使用自定义种类")}</button>}</div>
      {values.category === "custom" && <label><span>{t("自定义期限名称 *")}</span><RequiredTextInput aria-label={t("自定义期限名称 *")} value={values.customName}
        onChange={update("customName")} placeholder={t("例如：物业税报税")} /></label>}
      <label><span>{t("课税年度")}</span><input value={values.taxYear} onChange={update("taxYear")}
        placeholder={t("例如：2025/26")} /></label>
      <label><span>{t("当前期限 *")}</span><input required type="date" value={values.dueDate} onChange={update("dueDate")} /></label>
      <label><span>{t("负责人")}</span><input value={values.owner} onChange={update("owner")} /></label>
      <label><span>{t("提前提醒天数")}</span><input type="number" min="0" max="365" step="1"
        value={values.reminderDays} onChange={update("reminderDays")} /></label>
      <label><span>{t("状态")}</span><select value={values.state} onChange={update("state")}>
        {TAX_DEADLINE_STATES.map((state) => <option value={state} key={state}>{taxDeadlineStateLabel(state, language)}</option>)}</select></label>
      {engagements.length > 0 && <label><span>{t("关联年度项目")}</span><select value={values.linkedEngagementId}
        onChange={(event) => setValues((current) => ({ ...current, linkedEngagementId: event.target.value,
          linkedWorkstreamId: "" }))}><option value="">{t("不关联年度项目")}</option>
        {engagements.map((engagement) => <option value={engagement.id} key={engagement.id}>
          {yearEndOrPeriodLabel(engagement, language)}</option>)}</select></label>}
      {values.linkedEngagementId && workstreams.length > 0 && <label><span>{t("关联业务模块")}</span><select value={values.linkedWorkstreamId}
        onChange={update("linkedWorkstreamId")}><option value="">{t("不关联模块")}</option>
        {workstreams.map((workstream) => <option value={workstream.id} key={workstream.id}>
          {workstreamTypeLabel(workstream.type, language, workstream.customName)}</option>)}</select></label>}
      <label className="tax-deadline-wide-field"><span>{t("税务局参考编号／来源")}</span><input value={values.reference}
        onChange={update("reference")} placeholder={t("例如：报税表编号或延期批准日期")} /></label>
      <label className="tax-deadline-wide-field"><span>{t("备注")}</span><textarea rows="2" value={values.note}
        onChange={update("note")} placeholder={t("记录申报范围、付款期数或跟进信息")} /></label>
      {dateChanged && <label className="tax-deadline-wide-field revision-reason"><span>{t("改期原因 *")}</span>
        <RequiredTextInput autoFocus aria-label={t("改期原因 *")} value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)}
          placeholder={t("说明延期、通知更正或其他变更依据")} /></label>}
    </div>
    {initial?.originalDueDate && <div className="tax-deadline-origin"><span>{t("原期限")}</span>
      <time>{formatDate(initial.originalDueDate, language)}</time></div>}
    {initial?.revisions?.length > 0 && <section className="tax-deadline-history"><header><History aria-hidden="true" />
      <strong>{t("期限变更记录")}</strong></header>{[...initial.revisions].reverse().map((revision, index) => <div
        key={`${revision.changedAt}-${index}`}><span><time>{formatDate(revision.fromDueDate, language)}</time>
          <b aria-hidden="true">→</b><time>{formatDate(revision.toDueDate, language)}</time></span>
        <small>{revision.reason || t("没有填写原因")} · {formatDate(revision.changedAt?.slice(0, 10), language)}</small></div>)}</section>}
    {saveError && <p role="alert" className="form-error">{saveError}</p>}
    <footer className="modal-actions">{initial && onDelete && <button type="button" className="button danger-quiet"
      onClick={() => confirmTransition(() => describeError(onDelete(initial)))}><Trash2 aria-hidden="true" />{t("删除期限")}</button>}<span className="modal-action-spacer" />
      <button type="button" className="button secondary" onClick={closeEditor}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(initial ? "保存期限" : "新增期限")}</button></footer>
  </form>;
}

export function TaxDeadlineManager({ store, targetKind, targetId, focusDeadlineId, initialEditDeadlineId,
  initialEngagementId = "", readOnly = false, onSave, onDelete, onOpenSource }) {
  const { language, t } = useUiLanguage();
  const target = sourceRecord(store, targetKind, targetId);
  const holdingTarget = targetKind === "group" || (targetKind === "entity" && target?.kind === "holding_company");
  const [scope, setScope] = React.useState(() => holdingTarget ? "group" : "own");
  const [urgencyFilter, setUrgencyFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [editing, setEditing] = React.useState(() => !readOnly && initialEditDeadlineId !== undefined
    ? { sourceType: targetKind, sourceId: targetId, deadlineId: initialEditDeadlineId } : null);
  const focusRef = React.useRef(null);
  const managerRef = React.useRef(null);
  const pendingFocus = React.useRef(null);
  const [savedKey, setSavedKey] = React.useState("");
  const resetFilters = () => { setUrgencyFilter("all"); setCategoryFilter("all"); setOwnerFilter("all"); };
  const finishEditing = (deadlineId, saved = false) => {
    const key = deadlineId ? `${editing.sourceType}:${editing.sourceId}:${deadlineId}` : "";
    pendingFocus.current = { key, saved };
    if (saved) { resetFilters(); setSavedKey(key); }
    setEditing(null);
  };
  const ownEntries = React.useMemo(() => directEntries(target, targetKind), [target, targetKind]);
  const groupEntries = React.useMemo(() => targetKind === "entity" && holdingTarget
    ? collectEntityTaxEntries(store, targetId) : targetKind === "group"
      ? collectGroupTaxDeadlineEntries(store, targetId, new Set(), 0, readOnly) : ownEntries,
  [store, targetId, targetKind, holdingTarget, readOnly, ownEntries]);
  const rawEntries = holdingTarget && scope === "group" ? groupEntries : ownEntries;
  const entries = rawEntries.map((entry) => ({ ...entry, urgency: taxDeadlineUrgency(entry.deadline) }));
  const owners = [...new Set(rawEntries.map((entry) => entry.deadline.owner).filter(Boolean))].sort();
  const categories = [...new Set(rawEntries.map((entry) => entry.deadline.category))];
  const visible = entries.filter((entry) => {
    if (categoryFilter !== "all" && entry.deadline.category !== categoryFilter) return false;
    if (ownerFilter !== "all" && entry.deadline.owner !== ownerFilter) return false;
    if (urgencyFilter === "all") return true;
    if (urgencyFilter === "attention") return ["overdue", "due_today", "due_soon"].includes(entry.urgency.level);
    if (urgencyFilter === "completed" || urgencyFilter === "not_applicable") return entry.deadline.state === urgencyFilter;
    return entry.deadline.state === "open" && entry.urgency.level === urgencyFilter;
  }).sort((left, right) => {
    const rank = { overdue: 0, due_today: 1, due_soon: 2, upcoming: 3, inactive: 4 };
    return rank[left.urgency.level] - rank[right.urgency.level]
      || (left.deadline.dueDate || "9999-99-99").localeCompare(right.deadline.dueDate || "9999-99-99")
      || left.sourceName.localeCompare(right.sourceName);
  });
  const activeEdit = editing ? sourceRecord(store, editing.sourceType, editing.sourceId)?.taxDeadlines
    ?.find((deadline) => deadline.id === editing.deadlineId) || null : null;
  const editSource = editing ? sourceRecord(store, editing.sourceType, editing.sourceId) : null;
  const editEntityId = editing?.sourceType === "entity" ? editing.sourceId
    : store.engagements?.find((engagement) => engagement.id === editing?.sourceId)?.entityId;
  const engagements = (store.engagements || []).filter((engagement) => engagement.entityId === editEntityId);

  React.useEffect(() => {
    setScope(holdingTarget ? "group" : "own");
  }, [targetKind, targetId, holdingTarget]);

  React.useEffect(() => {
    if (!focusDeadlineId || !focusRef.current) return;
    focusRef.current.scrollIntoView({ block: "nearest" });
  }, [focusDeadlineId, visible.length]);

  React.useLayoutEffect(() => {
    if (editing || !pendingFocus.current) return;
    const request = pendingFocus.current;
    const frame = window.requestAnimationFrame(() => {
      const manager = managerRef.current;
      const row = [...(manager?.querySelectorAll("[data-tax-key]") || [])].find((entry) => entry.dataset.taxKey === request.key);
      const control = (request.saved ? row : row?.querySelector("[data-tax-edit]"))
        || manager?.querySelector("[data-tax-add]") || manager;
      control?.focus({ preventScroll: true }); control?.scrollIntoView({ block: "nearest", inline: "nearest" });
      pendingFocus.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing, rawEntries]);

  if (!target) return null;
  if (editing) return <TaxDeadlineForm key={`${editing.sourceType}-${editing.sourceId}-${editing.deadlineId || "new"}`}
    initial={activeEdit} engagements={engagements} initialEngagementId={initialEngagementId} onCancel={() => finishEditing(editing.deadlineId)}
    onSubmit={(values, reason, baseline) => {
      const result = onSave(editing.sourceType, editing.sourceId, baseline || (editing.deadlineId ? { id: editing.deadlineId } : null), values, reason);
      if (!result?.error) finishEditing(result?.deadline?.id || baseline?.id, true);
      return result;
    }}
    onDelete={activeEdit && !readOnly ? (baseline) => {
      if (!window.confirm(t("删除税务期限“{name}”？此操作会同时删除相关改期记录。",
        { name: taxDeadlineCategoryLabel(activeEdit, language) }))) return;
      const result = onDelete(editing.sourceType, editing.sourceId, activeEdit.id, baseline);
      if (!result?.error) finishEditing(null);
      return result;
    } : null} />;

  const summary = taxDeadlineSummary(rawEntries.map((entry) => entry.deadline));
  return <section className="tax-deadline-manager" ref={managerRef} tabIndex="-1" aria-label={t("税务期限")}>
    <header className="tax-deadline-manager-summary"><div><span><ReceiptText aria-hidden="true" /></span><div>
      <strong>{t("税务期限")}</strong><small>{t("{open} 项未完成 · {attention} 项需要关注",
        { open: summary.openCount, attention: summary.attentionCount })}</small></div></div>
      {!readOnly && <button type="button" className="button primary" data-tax-add onClick={() => setEditing({ sourceType: targetKind,
        sourceId: targetId, deadlineId: null })}><Plus aria-hidden="true" />{t("新增期限")}</button>}</header>
    {holdingTarget && <div className="tax-deadline-scope-tabs" role="tablist" aria-label={t("税务期限范围")}
      onKeyDown={handleTabListKeyDown}>
      <button type="button" role="tab" aria-selected={scope === "own"} tabIndex={tabIndexFor(scope === "own")}
        onClick={() => setScope("own")}>{t("本公司")}</button>
      <button type="button" role="tab" aria-selected={scope === "group"} tabIndex={tabIndexFor(scope === "group")}
        onClick={() => setScope("group")}>{t("本公司及下属公司")}</button></div>}
    <div className="tax-deadline-filters"><select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value)}
      aria-label={t("按紧急程度筛选")}><option value="all">{t("全部期限")}</option>
      <option value="attention">{t("需要关注")}</option><option value="overdue">{t("已逾期")}</option>
      <option value="due_today">{t("今天到期")}</option><option value="due_soon">{t("即将到期")}</option>
      <option value="upcoming">{t("尚未进入提醒期")}</option><option value="completed">{t("已完成")}</option>
      <option value="not_applicable">{t("不适用")}</option></select>
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label={t("按期限种类筛选")}>
        <option value="all">{t("全部种类")}</option>{categories.map((category) => <option value={category} key={category}>
          {taxDeadlineCategoryLabel(category, language)}</option>)}</select>
      <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} aria-label={t("按负责人筛选")}>
        <option value="all">{t("全部负责人")}</option>{owners.map((owner) => <option value={owner} key={owner}>{owner}</option>)}</select></div>
    {(urgencyFilter !== "all" || categoryFilter !== "all" || ownerFilter !== "all") &&
      <div className="tax-filter-reset"><button type="button" className="text-button" onClick={resetFilters}>{t("清除筛选")}</button></div>}
    {visible.length ? <div className="tax-deadline-list">{visible.map((entry) => {
      const deadline = entry.deadline;
      const source = sourceRecord(store, entry.sourceType, entry.sourceId);
      const sourceReadOnly = readOnly || Boolean(source?.archived);
      return <article className="tax-deadline-row" key={`${entry.sourceType}-${entry.sourceId}-${deadline.id}`}
        data-urgency={entry.urgency.level} data-tax-key={`${entry.sourceType}:${entry.sourceId}:${deadline.id}`} tabIndex="-1"
        data-focused={deadline.id === focusDeadlineId || savedKey === `${entry.sourceType}:${entry.sourceId}:${deadline.id}` || undefined}
        ref={deadline.id === focusDeadlineId ? focusRef : null}>
        <i><ReceiptText aria-hidden="true" /></i><div className="tax-deadline-row-copy"><header><strong>
          {taxDeadlineCategoryLabel(deadline, language)}</strong>{deadline.taxYear && <span>{deadline.taxYear}</span>}</header>
          <small>{scope === "group" ? `${entry.sourceName} · ` : ""}{deadline.owner || t("未设置负责人")}
            {deadline.reference ? ` · ${deadline.reference}` : ""}</small>{deadline.note && <p>{deadline.note}</p>}</div>
        <div className="tax-deadline-date"><time>{formatDate(deadline.dueDate, language)}</time>
          <span data-urgency={entry.urgency.level}>{deadline.state === "open"
            ? urgencyLabel(entry.urgency, t) : taxDeadlineStateLabel(deadline.state, language)}</span></div>
        <div className="tax-deadline-row-actions">{scope === "group" && (entry.sourceId !== targetId || entry.sourceType !== targetKind)
          && <button type="button" className="icon-only" aria-label={t("打开来源公司")} data-tooltip={t("打开来源公司")}
            onClick={() => onOpenSource(entry.sourceType, entry.sourceId, deadline.id)}><ExternalLink aria-hidden="true" /></button>}
          {!sourceReadOnly && deadline.state === "open" && <button type="button" className="icon-only" aria-label={t("标记为已完成")}
            data-tooltip={t("标记为已完成")} onClick={() => onSave(entry.sourceType, entry.sourceId, deadline,
              { ...deadline, state: "completed" }, "")}><Check aria-hidden="true" /></button>}
          {!sourceReadOnly && <button type="button" className="icon-only" aria-label={t("编辑税务期限")} data-tax-edit
            data-tooltip={t("编辑税务期限")} onClick={() => setEditing({ sourceType: entry.sourceType,
              sourceId: entry.sourceId, deadlineId: deadline.id })}><Pencil aria-hidden="true" /></button>}
        </div>
      </article>;
    })}</div> : <div className="tax-deadline-empty"><Ban aria-hidden="true" /><strong>{t("没有符合筛选的税务期限")}</strong>
      <span>{readOnly ? t("归档记录仅供查看。") : t("新增期限后，工作台会自动计算提醒状态。")}</span></div>}
  </section>;
}
