import React from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUp, Copy, Pencil, Play, Plus, Settings2, Trash2, X } from "lucide-react";
import { GROUP_AUDIT_TYPES, GROUP_AUDIT_TYPE_KEYS, createDefaultWorkstreamCategories, dueTone, formatDate,
  nodeStatus, normalizeTemplateTags, outstandingIsOpen, projectStats, reportingPeriodLabel, uid, workstreamCategoryLabel, workstreamStats,
  workstreamTypeLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { handleTabListKeyDown, tabIndexFor } from "./a11y.js";
import { toTraditional } from "./traditional.js";

const DIALOG_FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const REPORTING_FRAMEWORK_PRESETS = [
  { key: "香港财务报告准则", aliases: ["HKFRS Accounting Standards"] },
  { key: "中小企财务报告框架及准则", aliases: ["SME-FRF and SME-FRS"] },
  { key: "国际财务报告会计准则", aliases: ["IFRS Accounting Standards"] },
  { key: "香港私人公司财务报告准则", aliases: ["HKFRS for Private Entities"] },
];

function reportingFrameworkPreset(value) {
  return REPORTING_FRAMEWORK_PRESETS.find((preset) => preset.key === value || toTraditional(preset.key) === value
    || preset.aliases.includes(value));
}

export function Modal({ title, onClose, children, wide = false, large = false }) {
  const { t } = useUiLanguage();
  const dialogRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  const returnFocusRef = React.useRef(typeof document === "undefined" ? null : document.activeElement);
  const titleId = React.useId();
  onCloseRef.current = onClose;
  React.useEffect(() => {
    const focusDialog = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      const preferred = dialog.querySelector("[data-dialog-initial-focus], input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])");
      const fallback = [...dialog.querySelectorAll(DIALOG_FOCUSABLE)].find((element) => !element.matches("[data-modal-close]"));
      (preferred || fallback || dialog).focus();
    });
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      window.removeEventListener("keydown", closeOnEscape);
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, []);

  const trapFocus = (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll(DIALOG_FOCUSABLE)]
      .filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) { event.preventDefault(); event.currentTarget.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <div className="workbench-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="workbench-modal" data-wide={wide || undefined} data-large={large || undefined}
      ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex="-1" onKeyDown={trapFocus}
      onMouseDown={(event) => event.stopPropagation()}>
      <header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button icon-only" onClick={onClose} data-modal-close
        aria-label={t("关闭")} data-tooltip={t("关闭")} data-tooltip-side="left"><X aria-hidden="true" /></button></header>
      <div className="workbench-modal-body">{children}</div>
    </section>
  </div>;
}
export function ProjectForm({ initial, onSubmit, onClose, submitLabel, allowWorkstreams = true,
  samples = [], workstreamCategories = createDefaultWorkstreamCategories(), selectedSampleIdsByCategory = {},
  initialWorkstreamSelections, groupOptions = null, initialMembership, onConvert, quickField = null,
  structureSelector = null }) {
  const { language, t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({
    name: initial?.name || "",
    entity: initial?.entity || "",
    reportingFramework: initial?.reportingFramework || "",
    period: initial?.period || "",
    periodStart: initial?.periodStart || "",
    periodEnd: initial?.periodEnd || "",
    startDate: initial?.startDate || "",
    dueDate: initial?.dueDate || "",
    owner: initial?.owner || "",
    notes: initial?.notes || "",
  }));
  const [membership, setMembership] = React.useState(() => ({
    groupId: initialMembership?.group?.id || "",
    role: initialMembership?.member?.role || "",
    auditType: initialMembership?.member?.auditType || "internal_team",
  }));
  const [frameworkChoice, setFrameworkChoice] = React.useState(() => reportingFrameworkPreset(initial?.reportingFramework)?.key
    || (initial?.reportingFramework ? "custom" : ""));
  const fullForm = !quickField;
  const showProfileFields = fullForm || quickField === "owner" || quickField === "framework";
  const showScheduleFields = fullForm || quickField === "schedule";
  const showGroupFields = Boolean(groupOptions && (fullForm || quickField === "group"));
  const makeSelection = (source) => {
    const requestedCategoryId = typeof source === "string" ? source : source?.categoryId;
    const category = workstreamCategories.find((item) => item.id === requestedCategoryId)
      || workstreamCategories.find((item) => item.id === "audit") || workstreamCategories[0];
    const type = category?.builtinType || "custom";
    const hasExplicitSample = typeof source === "object" && source !== null
      && Object.prototype.hasOwnProperty.call(source, "sampleId");
    return { categoryId: category?.id || "audit", type,
      customName: category?.name || (type === "custom" ? source?.customName || "" : ""),
      sampleId: hasExplicitSample ? source.sampleId || "" : selectedSampleIdsByCategory[category?.id]
        || samples.find((sample) => sample.categoryId === category?.id)?.id || "" };
  };
  const [selections, setSelections] = React.useState(() => (Array.isArray(initialWorkstreamSelections)
    ? initialWorkstreamSelections : [{ categoryId: "audit" }]).map(makeSelection));
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const toggleCategory = (category) => setSelections((current) => current.some((item) => item.categoryId === category.id)
    ? current.filter((item) => item.categoryId !== category.id)
    : [...current, makeSelection({ categoryId: category.id })]);
  const updateSelection = (index, patch) => setSelections((current) => current.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item));
  const changeFramework = (event) => {
    const next = event.target.value;
    setFrameworkChoice(next);
    setValues((current) => ({ ...current, reportingFramework: next === "custom"
      ? (frameworkChoice === "custom" ? current.reportingFramework : "") : next }));
  };
  return <form className="workbench-form" data-quick-field={quickField || undefined} onSubmit={(event) => {
    event.preventDefault();
    const validSelections = selections.filter((item) => item.type !== "custom" || item.customName.trim());
    const legalEntity = values.entity.trim();
    const projectName = values.name.trim() || legalEntity;
    if ((quickField || legalEntity) && projectName) {
      const cleanedValues = { ...values, name: projectName, entity: legalEntity };
      const submittedValues = allowWorkstreams ? { ...cleanedValues, workstreamSelections: validSelections } : cleanedValues;
      onSubmit(showGroupFields ? { ...submittedValues, groupAssignment: { ...membership, role: membership.role.trim() } }
        : submittedValues, true);
    }
  }}>
    {fullForm && initial && onConvert && <section className="structure-conversion"><div><span>{t("公司结构")}</span>
      <strong>{t("公司")}</strong><small>{t("可转换为控股公司；现有业务模块会保留以供以后恢复。")}</small></div>
      <button type="button" className="button secondary" onClick={onConvert}><ArrowRightLeft aria-hidden="true" />
        {t("转换为控股公司")}</button></section>}
    {fullForm && <div className="project-identity-row" data-single={!structureSelector || undefined}>
      <label><span>{t("法律实体 *")}</span><input autoFocus required value={values.entity} onChange={update("entity")}
        placeholder={t("公司完整名称")} /></label>{structureSelector}</div>}
    {showProfileFields && <div className="form-grid" data-columns={fullForm ? "2" : "1"}>
      {(fullForm || quickField === "framework") && <label><span>{t("财务报告准则／框架")}</span><select
        autoFocus={quickField === "framework"} aria-label={t("财务报告准则／框架")} value={frameworkChoice}
        onChange={changeFramework}><option value="">{t("未设置")}</option>
        {REPORTING_FRAMEWORK_PRESETS.map((preset) => <option value={preset.key} key={preset.key}>{t(preset.key)}</option>)}
        <option value="custom">{t("自定义框架…")}</option></select></label>}
      {(fullForm || quickField === "framework") && frameworkChoice === "custom" && <label>
        <span>{t("自定义框架 *")}</span><input required value={values.reportingFramework}
          onChange={update("reportingFramework")} placeholder={t("输入准则或框架名称")} /></label>}
      {(fullForm || quickField === "owner") && <label><span>{t("负责人")}</span><input autoFocus={quickField === "owner"}
        value={values.owner} onChange={update("owner")} placeholder={t("例如：项目经理或主审")}/></label>}
    </div>}
    {showScheduleFields && <div className="project-date-groups" data-single={!fullForm || undefined}>
      {fullForm && <fieldset><legend>{t("报告期间")}</legend><div><label><span>{t("开始日")}</span>
        <input type="date" value={values.periodStart} max={values.periodEnd || undefined}
          required={Boolean(values.periodEnd)} onChange={update("periodStart")} /></label>
        <label><span>{t("结束日")}</span><input type="date" value={values.periodEnd} min={values.periodStart || undefined}
          required={Boolean(values.periodStart)} onChange={update("periodEnd")} /></label></div></fieldset>}
      <fieldset><legend>{t("项目排期")}</legend><div><label><span>{t("开始日")}</span>
        <input autoFocus={quickField === "schedule"} aria-label={t("项目开始日")} type="date" value={values.startDate}
          max={values.dueDate || undefined} onChange={update("startDate")} /></label>
        <label><span>{t("截止日")}</span><input aria-label={t("项目截止日")} type="date" value={values.dueDate}
          min={values.startDate || undefined} onChange={update("dueDate")} /></label></div></fieldset>
    </div>}
    {fullForm && values.period && !values.periodStart && !values.periodEnd && <small className="form-help">
      {t("原有报告期间：{period}。请在适当时补充开始日和结束日。", { period: values.period })}</small>}
    {showGroupFields && <section className="project-group-assignment"><header><strong>{t("集团归属")}</strong>
      <span>{t("可在公司资料中直接加入、变更或移出集团。")}</span></header>
      <label><span>{t("所属集团")}</span><select autoFocus={quickField === "group"} value={membership.groupId}
        onChange={(event) => setMembership((current) => ({ ...current, groupId: event.target.value }))}>
        <option value="">{t("独立公司（不属于集团）")}</option>
        {groupOptions.map((group) => <option value={group.id} key={group.id} disabled={group.archived}>
          {group.name}{group.archived ? ` · ${t("已归档")}` : ""}</option>)}</select></label>
      {membership.groupId && <div className="form-grid"><label><span>{t("集团角色")}</span><input value={membership.role}
        onChange={(event) => setMembership((current) => ({ ...current, role: event.target.value }))}
        placeholder={t("例如：母公司、子公司或联营公司")} /></label>
        <label><span>{t("审计类别")}</span><select value={membership.auditType}
          onChange={(event) => setMembership((current) => ({ ...current, auditType: event.target.value }))}>
          {GROUP_AUDIT_TYPES.map((value) => <option value={value} key={value}>{t(GROUP_AUDIT_TYPE_KEYS[value])}</option>)}</select></label></div>}
      <small>{t("保存后，项目导航和集团汇总会立即更新。")}</small>
    </section>}
    {fullForm && allowWorkstreams && <section className="project-workstream-picker"><header><div>
      <strong>{t("选择业务模块")}</strong><span>{t("模块与起始范本在同一行设置；也可以暂不启用，建立公司后再添加。")}</span></div>
      <em>{selections.length ? t("已选择 {count} 个", { count: selections.length }) : t("暂不启用")}</em></header>
      <div className="workstream-option-list">{workstreamCategories.filter((category) => category.id !== "custom").map((category) => {
        const selectionIndex = selections.findIndex((item) => item.categoryId === category.id);
        const selection = selections[selectionIndex];
        const typeSamples = samples.filter((sample) => sample.categoryId === category.id);
        return <article className="workstream-option-row" data-selected={Boolean(selection) || undefined} key={category.id}>
          <label className="workstream-option-toggle"><input type="checkbox" checked={Boolean(selection)}
            onChange={() => toggleCategory(category)} /><span><strong>{workstreamCategoryLabel(category, language)}</strong>
              <small>{t(category.id === "audit" ? "默认启用，可取消" : "按需要启用")}</small></span></label>
          {selection ? <label className="workstream-option-template"><span>{t("起始范本")}</span><select
            aria-label={`${workstreamCategoryLabel(category, language)} · ${t("起始范本")}`} value={selection.sampleId}
            onChange={(event) => updateSelection(selectionIndex, { sampleId: event.target.value })}>
            <option value="">{t("空白流程")}</option>{typeSamples.map((sample) => <option value={sample.id} key={sample.id}>{sample.name}</option>)}</select></label>
            : <small className="workstream-option-hint">{t("启用后选择起始范本")}</small>}</article>;
      })}</div>
      {selections.map((selection, index) => {
        if (selection.categoryId !== "custom") return null;
        const typeSamples = samples.filter((sample) => sample.categoryId === "custom");
        return <article className="custom-workstream-row" key={`custom-${index}`}><label><span>{t("自定义模块名称 *")}</span>
          <input required value={selection.customName} onChange={(event) => updateSelection(index, { customName: event.target.value })}
            placeholder={t("例如：公司秘书服务")} /></label><label><span>{t("起始范本")}</span><select value={selection.sampleId}
              onChange={(event) => updateSelection(index, { sampleId: event.target.value })}><option value="">{t("空白流程")}</option>
              {typeSamples.map((sample) => <option value={sample.id} key={sample.id}>{sample.name}</option>)}</select></label>
          <button type="button" className="icon-only" aria-label={t("移除自定义模块")} data-tooltip={t("移除自定义模块")}
            onClick={() => setSelections((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X aria-hidden="true" /></button></article>;
      })}
      <button type="button" className="add-custom-workstream" onClick={() => setSelections((current) => [...current,
        makeSelection({ categoryId: "custom" })])}><Plus aria-hidden="true" />{t("添加自定义模块")}</button></section>}
    {fullForm && <label><span>{t("备注")}</span><textarea rows="3" value={values.notes} onChange={update("notes")}
      placeholder={t("可记录负责人、客户要求或其他背景")} /></label>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(submitLabel || "建立项目")}</button></footer>
  </form>;
}

export function WorkstreamForm({ initial, availableCategories = createDefaultWorkstreamCategories(), samples = [],
  selectedSampleIdsByCategory = {}, onSubmit, onRemove, onClose }) {
  const { language, t } = useUiLanguage();
  const initialCategory = availableCategories.find((category) => category.id === initial?.categoryId)
    || (initial ? { id: initial.categoryId || initial.type, builtinType: initial.type,
      name: initial.type === "custom" ? initial.customName : "" } : null);
  const categoryOptions = initialCategory && !availableCategories.some((category) => category.id === initialCategory.id)
    ? [initialCategory, ...availableCategories] : availableCategories;
  const firstCategory = initialCategory || categoryOptions[0] || { id: "custom", builtinType: "custom", name: "" };
  const firstType = firstCategory.builtinType || "custom";
  const [values, setValues] = React.useState(() => ({
    type: firstType,
    categoryId: firstCategory.id,
    customName: initial?.customName || (firstType === "custom" && firstCategory.id !== "custom" ? firstCategory.name : ""),
    sampleId: initial ? "" : (selectedSampleIdsByCategory[firstCategory.id]
      || samples.find((sample) => sample.categoryId === firstCategory.id)?.id || ""),
  }));
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const changeCategory = (event) => {
    const category = categoryOptions.find((item) => item.id === event.target.value) || firstCategory;
    const type = category.builtinType || "custom";
    setValues((current) => ({ ...current, type, categoryId: category.id,
      customName: category.name || (type === "custom" && category.id === "custom" ? "" : current.customName),
      sampleId: selectedSampleIdsByCategory[category.id]
        || samples.find((sample) => sample.categoryId === category.id)?.id || "" }));
  };
  const typeSamples = samples.filter((sample) => sample.categoryId === values.categoryId);
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    if (values.type !== "custom" || values.customName.trim()) onSubmit({ ...values, customName: values.customName.trim() });
  }}>
    <label><span>{t("模块类别")}</span><select value={values.categoryId} disabled={Boolean(initial)} onChange={changeCategory}>
      {categoryOptions.map((category) => <option value={category.id} key={category.id}>{workstreamCategoryLabel(category, language)}</option>)}
    </select></label>
    {values.type === "custom" && values.categoryId === "custom" && <label><span>{t("自定义模块名称 *")}</span><input autoFocus required value={values.customName}
      onChange={update("customName")} placeholder={t("例如：公司秘书服务")} /></label>}
    {!initial && <label><span>{t("业务范本")}</span><select value={values.sampleId} onChange={update("sampleId")}>
      <option value="">{t("空白流程")}</option>{typeSamples.map((sample) => <option value={sample.id} key={sample.id}>{sample.name}</option>)}</select></label>}
    <footer className="modal-actions">{onRemove && <button type="button" className="button danger-quiet" onClick={onRemove}>{t("移除模块")}</button>}
      <span className="modal-action-spacer" /><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(initial ? "保存模块" : "添加模块")}</button></footer>
  </form>;
}

export function WorkstreamCard({ workstream, selected, openItems = 0, onSelect, readOnly = false,
  dragging = false, dropPosition, onDragStart, onDragEnd, onDragOver, onDrop, onReorderKeyDown }) {
  const { language, t } = useUiLanguage();
  const stats = workstreamStats(workstream);
  const label = workstreamTypeLabel(workstream.type, language, workstream.customName);
  return <article className="workstream-card" data-selected={selected || undefined} data-complete={stats.complete || undefined}
    data-editable={!readOnly || undefined} data-dragging={dragging || undefined} data-drop-position={dropPosition}
    draggable={!readOnly} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop}>
    <button type="button" className="workstream-card-select" aria-pressed={selected} onClick={onSelect}
      aria-description={!readOnly ? t("按住模块卡片即可拖动排序；按 Alt 加方向键也可移动") : undefined}
      aria-keyshortcuts={!readOnly ? "Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown" : undefined}
      onKeyDown={onReorderKeyDown}>
    <span className="workstream-card-top"><ProgressBar value={stats.percentage} compact />
      <span><strong>{label}</strong></span></span>
    {openItems > 0 && <span className="workstream-card-meta"><small>{t("{count} 项未清", { count: openItems })}</small></span>}</button>
  </article>;
}

export function SampleLibrary({ samples, categoryLabel, selectedSampleId, onSelect, onCreate, onEdit, onDuplicate, onDelete, onUse,
  onManageCategories }) {
  const { language, t } = useUiLanguage();
  return <section className="sample-library">
    <header className="sample-library-header"><div><strong>{t("业务模块范本")}</strong>
      <span>{t("每个范本包含一组可编辑、排序和删除的节点。")}</span></div><div className="sample-library-actions">
      {onManageCategories && <button type="button" className="button secondary icon-only" aria-label={t("管理种类")}
        data-tooltip={t("管理种类")} onClick={onManageCategories}><Settings2 aria-hidden="true" /></button>}
      <button type="button" className="button primary" onClick={onCreate}><Plus aria-hidden="true" />{t("新建范本")}</button></div></header>
    {samples.length ? <div className="sample-library-list">{samples.map((sample) => {
      const conditions = sample.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
      const selected = sample.id === selectedSampleId;
      return <article className="sample-library-card" data-selected={selected || undefined} key={sample.id}>
        <button type="button" className="sample-library-select" onClick={() => onSelect(sample.id)}>
          <span className="sample-mark" aria-hidden="true">{language === "en" ? "T" : language === "zh-Hant" ? "範" : "范"}</span><span><strong>{sample.name}</strong>
            <small>{sample.description || t("没有说明")}</small>
            <em>{categoryLabel || workstreamTypeLabel(sample.workstreamType, language)} · {t("{nodes} 个节点 · {conditions} 项条件", { nodes: sample.nodes.length, conditions })}</em>
            {(sample.tags?.length > 0 || sample.versionNote) && <span className="sample-library-metadata">
              {sample.tags?.map((tag) => <i key={tag}>{tag}</i>)}{sample.versionNote && <small>{sample.versionNote}</small>}</span>}</span>
          {selected && <i>{t("当前使用")}</i>}
        </button>
        <footer><button type="button" className="icon-only" aria-label={t("使用此范本")} title={t("使用此范本")} data-tooltip={t("使用此范本")}
          data-tooltip-side="right" onClick={() => onUse(sample.id)}><Play aria-hidden="true" /></button>
          <button type="button" className="icon-only" aria-label={t("编辑范本")} title={t("编辑范本")} data-tooltip={t("编辑范本")}
            onClick={() => onEdit(sample.id)}><Pencil aria-hidden="true" /></button>
          <button type="button" className="icon-only" aria-label={t("复制范本")} title={t("复制范本")} data-tooltip={t("复制范本")}
            onClick={() => onDuplicate(sample.id)}><Copy aria-hidden="true" /></button>
          <button type="button" className="icon-only" aria-label={t("删除范本")} title={t("删除范本")} data-tooltip={t("删除范本")}
            data-tooltip-side="left" onClick={() => onDelete(sample.id)}><Trash2 aria-hidden="true" /></button></footer>
      </article>;
    })}</div> : <div className="sample-library-empty"><strong>{t("还没有范本")}</strong>
      <span>{t("建立第一个范本后，就能用它快速创建项目。")}</span>
      <button type="button" className="button primary" onClick={onCreate}>{t("新建范本")}</button></div>}
  </section>;
}

export function OutstandingStatusEditor({ statuses, usageCounts, onSave, onClose }) {
  const { t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(statuses)));
  const updateStatus = (statusId, updater) => setDraft((current) => current.map((status) =>
    status.id === statusId ? updater(status) : status));
  const moveStatus = (index, direction) => setDraft((current) => {
    const next = [...current];
    const target = index + direction;
    if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const removeStatus = (status) => {
    const usage = usageCounts[status.id] || 0;
    if (usage) {
      window.alert(t("此状态正在被 {count} 项待清事项使用。请先把这些事项改到其他状态。", { count: usage }));
      return;
    }
    setDraft((current) => current.filter((item) => item.id !== status.id));
  };
  return <form className="status-editor" onSubmit={(event) => {
    event.preventDefault();
    const cleaned = draft.map((status) => ({ ...status, label: status.label.trim() }));
    if (!cleaned.length) {
      window.alert(t("至少保留一个状态。"));
      return;
    }
    if (!cleaned.some((status) => status.closed)) {
      window.alert(t("至少要有一个状态标记为已清。"));
      return;
    }
    onSave(cleaned);
  }}>
    <p className="status-editor-help">{t("新增、改名、排序状态，并指定哪些状态代表事项已经清理。")}</p>
    <div className="status-editor-list">{draft.map((status, index) => <section className="status-editor-row" key={status.id}>
      <label className="status-color-field"><span>{t("状态颜色")}</span><input type="color" value={status.color || "#778078"}
        onChange={(event) => updateStatus(status.id, (current) => ({ ...current, color: event.target.value }))} /></label>
      <label className="status-name-field"><span>{t("状态名称 *")}</span><input required value={status.label}
        onChange={(event) => updateStatus(status.id, (current) => ({ ...current,
          builtinKey: undefined, label: event.target.value }))} /></label>
      <label className="status-closed-option"><input type="checkbox" checked={status.closed}
        onChange={(event) => updateStatus(status.id, (current) => ({ ...current, closed: event.target.checked }))} />
        <span>{t("视为已清")}</span></label>
      <small>{t("{count} 项使用中", { count: usageCounts[status.id] || 0 })}</small>
      <div className="status-row-actions"><button type="button" className="icon-only" disabled={index === 0}
        onClick={() => moveStatus(index, -1)} aria-label={t("上移状态")} data-tooltip={t("上移状态")} data-tooltip-side="left"><ArrowUp aria-hidden="true" /></button>
        <button type="button" className="icon-only" disabled={index === draft.length - 1}
          onClick={() => moveStatus(index, 1)} aria-label={t("下移状态")} data-tooltip={t("下移状态")} data-tooltip-side="left"><ArrowDown aria-hidden="true" /></button>
        <button type="button" className="icon-only" disabled={draft.length === 1} onClick={() => removeStatus(status)}
          aria-label={t("删除状态")} data-tooltip={t("删除状态")} data-tooltip-side="left"><Trash2 aria-hidden="true" /></button></div>
    </section>)}</div>
    <button type="button" className="status-add-button" onClick={() => setDraft((current) => [...current, {
      id: uid("outstanding-status"), label: "", closed: false, tone: "neutral", color: "#778078",
    }])}>{t("＋ 添加状态")}</button>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存状态")}</button></footer>
  </form>;
}

export function WorkstreamCategoryEditor({ categories, usageCounts, onSave, onClose }) {
  const { language, t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => categories.map((category) => ({ ...category,
    editorName: category.name || workstreamCategoryLabel(category, language), hadCustomName: Boolean(category.name) })));
  const updateCategory = (categoryId, name) => setDraft((current) => current.map((category) =>
    category.id === categoryId ? { ...category, editorName: name } : category));
  const moveCategory = (categoryId, direction) => setDraft((current) => {
    const next = [...current];
    const index = next.findIndex((category) => category.id === categoryId);
    const system = Boolean(next[index]?.builtinType);
    const peers = next.map((category, itemIndex) => ({ category, itemIndex }))
      .filter(({ category }) => Boolean(category.builtinType) === system).map(({ itemIndex }) => itemIndex);
    const position = peers.indexOf(index);
    const target = peers[position + direction];
    if (target !== undefined) [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const removeCategory = (category) => {
    const usage = usageCounts[category.id] || { templates: 0, workstreams: 0 };
    if (usage.templates || usage.workstreams) {
      window.alert(t("此种类正在被 {templates} 个范本及 {workstreams} 个业务模块使用。请先移转相关内容。",
        { templates: usage.templates, workstreams: usage.workstreams }));
      return;
    }
    if (draft.length <= 1) {
      window.alert(t("工作台至少要保留一个范本种类。"));
      return;
    }
    setDraft((current) => current.filter((item) => item.id !== category.id));
  };
  const renderCategories = (items) => items.map((category, index) => {
    const usage = usageCounts[category.id] || { templates: 0, workstreams: 0 };
    return <div className="category-editor-row" data-system={category.builtinType || undefined} key={category.id}>
      <input required value={category.editorName} aria-label={t("种类名称")}
        onChange={(event) => updateCategory(category.id, event.target.value)} />
      <small>{t("{templates} 个范本 · {workstreams} 个业务模块", usage)}</small>
      <div>{category.builtinType && <i>{t("系统")}</i>}
        <button type="button" className="icon-only" disabled={index === 0} onClick={() => moveCategory(category.id, -1)}
          aria-label={t("上移种类")} data-tooltip={t("上移种类")} data-tooltip-side="left"><ArrowUp aria-hidden="true" /></button>
        <button type="button" className="icon-only" disabled={index === items.length - 1} onClick={() => moveCategory(category.id, 1)}
          aria-label={t("下移种类")} data-tooltip={t("下移种类")} data-tooltip-side="left"><ArrowDown aria-hidden="true" /></button>
        <button type="button" className="icon-only" onClick={() => removeCategory(category)}
          aria-label={t("删除")} data-tooltip={t("删除")} data-tooltip-side="left"><Trash2 aria-hidden="true" /></button></div></div>;
  });
  return <form className="category-editor" onSubmit={(event) => {
    event.preventDefault();
    const cleaned = draft.map(({ editorName, hadCustomName, ...category }) => ({ ...category,
      name: category.builtinType && !hadCustomName
        && editorName.trim() === workstreamTypeLabel(category.builtinType, language) ? "" : editorName.trim() }));
    const names = cleaned.map((category) => workstreamCategoryLabel(category, language).toLocaleLowerCase());
    if (cleaned.some((category) => !workstreamCategoryLabel(category, language))) return;
    if (new Set(names).size !== names.length) {
      window.alert(t("种类名称不能重复。"));
      return;
    }
    onSave(cleaned);
  }}>
    <p className="category-editor-help">{t("所有范本种类都可以改名、排序及删除；使用中的种类需要先移转相关范本及业务模块。")}</p>
    <section className="category-editor-section"><header><strong>{t("系统种类")}</strong>
      <small>{t("系统种类保留内置模块类型；自定义名称会保持原文。")}</small></header>
      <div className="category-editor-list">{renderCategories(draft.filter((category) => category.builtinType))}</div></section>
    <section className="category-editor-section"><header><strong>{t("自定义种类")}</strong>
      <small>{t("可用于建立专属范本和业务模块。")}</small></header>
      <div className="category-editor-list">{renderCategories(draft.filter((category) => !category.builtinType))}</div>
      <button type="button" className="status-add-button" onClick={() => setDraft((current) => [...current,
        { id: uid("workstream-category"), name: "", editorName: "", hadCustomName: false }])}>{t("＋ 添加种类")}</button></section>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存种类")}</button></footer>
  </form>;
}

export function UserGuide() {
  const { t } = useUiLanguage();
  const sections = [
    { id: "start", title: "快速开始", summary: "先建立公司主档，再为每个报告期间建立独立的年度项目。", topics: [
      { title: "建立第一家公司主档", steps: ["在公司列表选择加号。", "填写法律实体并选择公司或控股公司。",
        "选择默认会计年度：自然年、4 月至次年 3 月，或自定义。", "需要时指定所属控股公司和长期适用的公司备注。",
        "选择“建立公司”；公司可以先不建立任何年度项目。"],
      result: "法律实体、当前控股层级、默认会计年度和税务期限会长期保存在公司主档。" },
      { title: "建立第一个年度项目", steps: ["打开公司概览并选择“新建年度项目”。", "自然年输入 2025 会生成 2025 年 1 月 1 日至 12 月 31 日；4 月制输入 2025 会生成 2025 年 4 月 1 日至 2026 年 3 月 31 日。",
        "检查完整报告期间，再设置准则、负责人、项目排期和起始业务模块。", "同一公司可以建立多个年度项目，但不能重复使用完全相同的报告期间。"],
      result: "FY2023、FY2024、FY2025 等项目各自保存模块、节点、待清事项和进度。" },
      { title: "认识三区工作台", steps: ["最左侧窄工具栏集中放置首页、项目排期、逾期提醒、范本库、使用指南、设置、备份和语言入口。", "左侧“项目导航”用于搜索、筛选和切换项目或控股公司。", "中间“项目工作区”或“控股公司工作区”用于处理模块、节点及合并工作。",
        "右侧“待清中心”用于持续追踪缺少文件、等待签署和其他阻塞事项。", "左右区域都可以收起，需要时再展开。"],
      result: "日常工作集中在中间视觉热区，导航和待清事项仍保持随手可用。" },
      { title: "识别图标和悬停说明", steps: ["常用的编辑、复制、归档、新增和面板开关以统一线性图标显示。",
        "把鼠标停在图标上，会显示该按钮的完整功能说明。", "使用键盘移动焦点到图标时，也会显示相同说明，并保留屏幕阅读器名称。"],
      result: "窄工具栏保持紧凑，同时不需要记住每个图标的含义。" },
    ] },
    { id: "projects", title: "公司与年度项目", summary: "一个公司主档可以承载多个互相独立的报告期间和委聘。", topics: [
      { title: "寻找公司和年度项目", steps: ["在公司列表的搜索框输入法律实体、年度、项目类型或负责人。", "使用“进行中”“已完成”“全部”及“归档”筛选所需记录。",
        "选择“公司”查看层级并打开主档；选择“项目”平铺搜索年度项目，点击项目类型进入工作区。", "公司列表可一键展开或收起全部公司，控股层级仍以加减号和层级线显示。"], result: "项目类型作为年度项目的主标识；年结、公司和负责人作为辅助信息。" },
      { title: "修改会计年度和报告期间", steps: ["在公司概览编辑默认会计年度；修改默认值不会改变已经建立的项目。", "在年度项目设置中修改报告开始日或结束日。",
        "手动改变自动生成的日期后，该项目会改为自定义期间；完整起止日期始终是权威数据。", "归档项目也参与重复期间检查。"], result: "短年度和非完整年度可以准确记录，不会被强制按整年处理。" },
      { title: "建立连续年度项目", steps: ["从公司概览选择“新建年度项目”；系统会建议现有最新期间之后的下一年度。", "默认可复制上一年度的流程结构，也可从范本或空白项目开始。",
        "复制只带入框架、模块、节点和条件结构；负责人、日期、完成状态和待清事项会清空。", "公司级税务期限不会复制到新年度项目。"], result: "同一家公司可以同时管理三个或更多年度的审计，而各年度状态不会串联。" },
      { title: "安排项目开始日和截止日", steps: ["打开年度项目设置，分别填写项目开始日和项目截止日；它们与报告期间是不同字段。",
        "选择最左侧窄工具栏的“项目排期”，按自定义顺序查看所有横向工期条。", "使用左侧状态筛选同步缩小排期范围；选择项目名称可返回详情，选择工期条可直接修改日期。",
        "拖动排期行左侧把手可调整显示顺序，键盘可按 Alt 加上下方向键移动；选择日历按钮或工期条可直接修改项目开始日和截止日，归档记录保持只读。",
        "在排期图上滚动鼠标滚轮可横向查看日期；选择“今天”会定位到红色虚线。", "红色工期条代表已逾期，日期不完整的项目会显示提醒。"], result: "工作台会像年度计划表一样集中呈现项目起止时间，同时保留每个项目的详细流程。" },
      { title: "查看逾期提醒", steps: ["左侧窄工具栏的铃铛会显示当前逾期数量；没有逾期时不显示数字。",
        "选择铃铛可查看逾期项目、控股公司和业务模块，并按逾期天数排序。", "选择任一提醒可直接打开来源记录；业务模块提醒会同时定位到对应模块。",
        "完成、修改截止日或归档记录后，提醒会自动清除。"], result: "逾期工作会集中显示，不需要逐一打开项目检查截止日期。" },
      { title: "拖动调整当前控股归属和层级", steps: ["按住公司或控股公司名称开始拖动。", "所有可接收的控股公司行会显示“可放入”；直接拖到所需层级并松开。",
        "拖到导航底部的“移到顶层”区域，即可移出当前控股公司。", "控股公司不能拖入自身或其下级控股公司，归档记录也不能拖动。"],
      result: "当前公司层级立即更新，但已经保存的历史年度组成部分不会被暗中改写。" },
      { title: "合并重复公司主档", steps: ["在公司概览选择“合并重复公司”。", "选择要并入的公司和要保留的公司，并检查年度项目和税务期限数量。",
        "如两家公司存在完全相同的报告期间，先处理冲突后才能合并。", "确认后年度项目和税务期限会移入保留的公司，系统不会只凭名称自动合并。"], result: "迁移后的相似名称记录由使用者确认，不会误合并不同法律实体。" },
      { title: "添加和设置业务模块", steps: ["建立年度项目时，可以从范本选择任意模块，也可以全部留空。", "需要账务服务时可启用内置“账务处理”模块；审计、税务及其他模块仍各自独立。",
        "年度项目建立后，可在工作区选择“添加业务模块”，设置类别和起始范本。", "选择模块卡片查看其节点；选择卡片右上角的“设置”可移除模块。"], result: "负责人和项目日期统一由年度项目管理，模块只保留流程与进度。" },
      { title: "移除业务模块", steps: ["选择业务模块卡片内的“设置”。", "选择“移除模块”并确认。",
        "原本属于该模块的待清事项会保留，并自动改为项目级事项；已关联的税务期限只会解除模块关联。"], result: "最后一个模块也可以移除；年度项目会保留为空项目，之后仍可重新添加模块。" },
      { title: "判断项目完成", steps: ["每个业务模块会显示已完成节点及自身进度。", "只有模块内所有节点的全部达成条件完成，该模块才算完成。",
        "只有项目内全部启用模块完成，项目才会进入“已完成”筛选。"], result: "项目导航显示完成模块数，不使用容易误导的混合百分比。" },
    ] },
    { id: "tax", title: "税务期限", summary: "把法定税务期限与内部项目排期分开管理。", topics: [
      { title: "建立税务期限", steps: ["打开公司，在资料摘要选择“税务期限”。", "选择“新增期限”，填写期限种类、课税年度、当前期限、负责人和提前提醒天数。",
        "预设种类不适用时选择“使用自定义种类”，直接输入期限名称。", "需要时关联税务业务模块，并记录税务局参考编号、来源或备注。"], result: "同一家公司可以同时追踪报税、缴税及其他自定义税务期限。" },
      { title: "查看期限提醒和排期", steps: ["税务期限默认提前三十天进入左侧铃铛的期限提醒；每项期限都可以调整提前天数。",
        "红色代表已逾期，橙色代表今天到期，琥珀色代表即将到期。", "项目排期会在公司工期条上以税务标记显示；同一天的多个期限会合并显示数量。"],
      result: "即使项目模块已经完成，未完成的税务期限仍会继续提醒。" },
      { title: "完成、改期和追溯", steps: ["期限办结后选择“标记为已完成”；不需要办理时可编辑为“不适用”。",
        "修改已保存的期限日期时必须填写改期原因，原期限和变更记录会继续保留。", "删除期限会同时删除其改期记录，因此系统会先要求确认。"],
      result: "税务期限不会自动勾选节点，也不会改变项目或税务模块进度。" },
      { title: "查看控股公司税务期限", steps: ["控股公司可记录自己的税务期限。", "在期限面板切换“本公司及下属公司”，可汇总各层级未归档公司的期限。",
        "选择来源图标可直接打开对应公司；全局提醒不会因控股公司汇总而重复计算。"], result: "控股公司税务安排可以集中查看，同时仍由各法律实体保留自己的期限记录。" },
      { title: "了解提醒与资料边界", steps: ["期限由使用者按税务通知或其他权威资料手动录入；工作台不会自动解释或计算法定期限。",
        "税务资料保存在当前选择的浏览器或本地文件中，关闭网页后不会在后台发送邮件、系统通知或其他提醒。", "归档公司会隐藏其期限提醒；恢复后未完成期限会重新进入计算。"],
      result: "期限台账用于安排和提醒，专业判断、核对及申报仍由负责人员完成。" },
    ] },
    { id: "stages", title: "节点与达成条件", summary: "横向节点负责表达流程，达成条件负责客观确认完成。", topics: [
      { title: "查看横向节点", steps: ["先选择一个业务模块或集团的“合并节点”页签。", "所有节点会横向排列；选择任一节点，其详情固定显示在下方。",
        "节点过多时可横向滚动，不会因为展开详情而把后续节点推到页面下方。"], result: "你可以一次掌握完整流程，并专注处理所选节点。" },
      { title: "添加、删除和排序节点", steps: ["在节点轨道上方选择“添加节点”，填写名称和说明。", "先选择一个节点，再使用旁边的“删除所选节点”。",
        "在节点详情右上方使用左右箭头调整顺序，或选择“编辑节点”修改内容。"], result: "结构操作集中在节点区域，不需要到不同位置寻找。" },
      { title: "管理达成条件", steps: ["选择节点后，在详情底部选择“添加完成条件”。", "条件应写成可客观核实的结果，例如文件已收到或复核已完成。",
        "使用“修改”或“删除”维护条件；勾选条件即可更新节点及模块进度。"], result: "只有节点内已有条件且全部勾选，节点才会视为完成。" },
    ] },
    { id: "outstanding", title: "待清中心", summary: "待清事项独立于流程进度，可随审计过程持续变化。", topics: [
      { title: "添加待清事项", steps: ["在右侧待清中心选择“添加待清”。", "填写事项、状态和说明，并选择它属于项目级还是指定业务模块。",
        "保存后，事项会立即出现在右侧清单；集团页面会汇总下级公司事项并保留来源。"], result: "待清事项不会改变节点或业务模块进度。" },
      { title: "更新和筛选待清事项", steps: ["使用“未清／已清／全部”切换找回已清或归档事项，再按层级、模块及具体状态缩小范围。", "直接在事项卡片内切换状态，或选择“编辑”修改内容和归属。",
        "选择“删除”移除不再需要的事项；选择事项来源名称可以跳转到对应项目或集团。"], result: "右侧清单可作为持续更新的阻塞事项工作队列。" },
      { title: "自定义状态和颜色", steps: ["选择“状态与颜色”。", "新增、改名或排序状态，选择颜色，并指定该状态是否代表已经清理。",
        "正在被历史记录使用的状态不会被误删；需要先把相关事项改到其他状态。"], result: "状态名称、顺序、颜色和未清计算会同时更新。" },
    ] },
    { id: "reports", title: "管理层报告", summary: "从当前工作台资料实时生成内部进度及风险报告。", topics: [
      { title: "查看项目组合报告", steps: ["选择左侧窄工具栏的“管理层报告”。", "使用状态、负责人、控股层级、项目日期、业务模块及期限紧急程度筛选范围。",
        "摘要会显示活跃公司、模块完成数、逾期项目、需关注税务期限及未清事项；明细和风险清单可打开来源记录。"],
      result: "管理层可以在一个紧凑页面查看当前工作组合及需要优先处理的事项。" },
      { title: "查看单一记录报告", steps: ["先在项目导航选择一家公司或控股公司，再打开管理层报告。", "切换到“当前记录”查看公司模块进度，或控股公司的层级成员、合并就绪及本级合并节点。",
        "报告会列出当前未清事项和未完成税务期限，但不会输出事项说明、税务备注或税务局参考编号。"],
      result: "内部报告保留管理所需重点，同时限制不必要的敏感资料。" },
      { title: "打印或保存为 PDF", steps: ["先确定报告范围和筛选条件，再选择“打印报告”。", "在 Chrome 或 Edge 的打印预览中检查页数和分页。",
        "选择打印机或“另存为 PDF”；导航、工具栏、筛选器和操作按钮会自动隐藏。"],
      result: "打印内容会保留筛选范围和生成时间，并使用适合管理层阅读的专用版式。" },
      { title: "理解报告边界", steps: ["报告完全由当前工作台资料实时计算，不另存一份重复统计结果。", "归档记录默认排除，需要时可通过状态筛选纳入。",
        "报告只用于内部进度管理，不构成审计结论、签署意见、税务判断或申报结果。"],
      result: "正式判断、批准、签署及申报仍由负责人员完成。" },
    ] },
    { id: "groups", title: "控股公司审计", summary: "当前公司层级与每个年度的合并范围分开保存。", topics: [
      { title: "建立控股公司和年度项目", steps: ["建立公司主档时选择“控股公司”，再通过公司主档或导航拖动加入下属公司。", "从控股公司概览建立所需年度项目，并设置完整报告期间、负责人和排期。",
        "选择本级是否需要独立合并流程；如只用于分类，可关闭本级合并流程。"], result: "控股公司可以同时有多个年度合并项目，也可以暂时只有公司主档。" },
      { title: "理解当前架构和历史快照", steps: ["公司主档记录当前控股归属；改变层级只影响以后建立的项目。", "建立控股公司年度项目时，系统把当时的直属成员保存为该年度组成部分快照。",
        "如当前架构与年度快照不同，组成部分页会显示新增和移出数量；只有明确选择同步才会更新。"], result: "重组不会破坏以前年度的集团范围和审计记录。" },
      { title: "指定组成部分的对应年度", steps: ["在控股公司年度项目打开“组成部分”。", "系统按完全相同的报告开始日和结束日尝试匹配下属公司的年度项目。",
        "找不到或找到多项时会标记“待指定”；从下拉菜单手动选择正确年度项目。", "即使公司主档后来删除，历史快照仍会保留当时名称。"], result: "三层控股架构的每一层都能明确关联正确年度，不会误用其他期间。" },
      { title: "设置公司合并就绪条件", steps: ["在成员设置选择本团队审计、其他审计师负责或无需法定审计／管理账。", "系统会带入相应的默认条件；你可以逐项修改、添加或删除。",
        "勾选完成条件后，公司合并就绪状态会即时更新。"], result: "合并就绪由明确条件决定，不会只凭进度百分比推断。" },
      { title: "查看组成部分", steps: ["在“组成部分”页签查看本年度保存的公司和中间控股公司。", "每行会显示对应年度项目、审计进度、合并就绪条件和待指定状态。",
        "选择箭头可直接打开来源年度项目。"], result: "集团团队可以快速定位尚未准备好或尚未正确匹配的组成部分。" },
      { title: "管理集团合并节点", steps: ["切换到“合并节点”页签。", "像项目模块一样添加、删除、排序节点并维护达成条件。",
        "如果集团只用于分类，本级不会显示独立合并节点，进度直接来自下级组成部分。"], result: "组成部分准备与本级合并工作保持清楚分离。" },
    ] },
    { id: "templates", title: "范本与种类", summary: "范本用于快速建立新流程，修改范本不会改动既有项目。", topics: [
      { title: "管理范本种类", steps: ["选择左侧窄工具栏的“范本库”，再选择“管理种类”。", "系统及自定义种类都可以改名、排序或删除。",
        "如种类仍有范本或业务模块在使用，系统会阻止删除并显示使用数量。"], result: "自定义种类会成为范本页签，也可直接用于建立同名业务模块。" },
      { title: "建立和使用多个范本", steps: ["先选择范本种类，再选择“新建范本”。", "填写范本名称、说明、节点和条件；同一种类可保存多个范本。",
        "选择一个范本作为当前使用，或选择“使用此范本”直接建立项目。"], result: "建立项目时可为每个业务模块单独选择范本或空白流程。" },
      { title: "编辑、复制和删除范本", steps: ["在范本卡片选择编辑图标修改模块名称、节点及达成条件，或选择复制图标建立独立副本。", "在编辑页可直接修改、排序或删除任一节点；选择删除图标可移除整个范本。",
        "系统范本也可以删除；删除最后一个范本后，新业务模块会从空白流程开始。范本改动只影响之后建立的项目。"], result: "既有项目保留自己的节点和完成状态。" },
      { title: "公司名称去敏和集团范本", steps: ["编辑业务范本时选择“公司去敏”，每行输入一个需要替换的完整公司名称。", "系统只替换完全匹配的名称；保存前仍应人工复核。",
        "集团范本独立保存合并节点及各审计类别的默认就绪条件。"], result: "公开或复用范本前，可降低残留客户名称的风险。" },
      { title: "导出和导入范本包", steps: ["在范本库选择“导出范本包”，勾选要分享的业务模块范本及控股公司范本。", "范本包只包含种类、节点、达成条件和就绪条件；不会包含公司、负责人、待清事项或税务资料。",
        "选择“导入范本包”后先检查范本数、节点数、标签和版本备注，再逐项决定另存副本、替换现有范本或跳过。", "同来源范本默认另存副本；只有明确选择目标范本时才会替换。"],
      result: "范本可以在电脑或团队之间携带，而既有项目不会因范本替换而改变。" },
    ] },
    { id: "archive", title: "归档与删除", summary: "公司主档和年度项目分别管理生命周期。", topics: [
      { title: "归档年度项目", steps: ["在年度项目标题区选择“归档”。", "项目会退出活跃导航和当前统计，并进入只读状态。",
        "在左侧选择“归档”可恢复项目；归档项目仍会阻止建立完全相同的报告期间。"], result: "历史年度得到保留，不会与当前年度混在一起。" },
      { title: "归档公司主档", steps: ["归档公司前先归档该公司所有活跃年度项目。", "如仍有未完成税务期限，系统会显示警告；确认后公司及其提醒会隐藏。",
        "恢复公司只恢复主档，不会自动恢复各年度项目。"], result: "公司和年度项目的归档范围保持清楚，不会一次误恢复整批历史工作。" },
      { title: "永久删除", steps: ["只有归档记录会显示“永久删除”。", "删除年度项目会清除其模块和待清事项，但保留公司主档。",
        "删除公司会同时删除其全部年度项目和公司级税务期限；下属公司会移到顶层，其他项目保存的历史快照不变。"], result: "系统会在不可撤销操作前明确显示实际删除范围。" },
    ] },
    { id: "data", title: "保存、备份与数据", summary: "浏览器自动保存是默认方式，也可以关联一个持续同步的本地文件。", topics: [
      { title: "选择保存模式", steps: ["选择左侧窄工具栏的“设置”，打开“保存位置”。", "浏览器自动保存适合在同一浏览器使用；关联本地文件会同时保留浏览器安全副本。",
        "备份图标右下角的状态点会显示已保存、正在保存、需要重新连接或保存失败。"], result: "正常保存完成后可以直接关闭页面，不会出现离开提示。" },
      { title: "关联或打开本地文件", steps: ["选择“新建并关联文件”，把当前工作台保存成 .apw.json 文件。", "如已有工作台文件，选择“打开现有工作台文件”，先核对资料数量和版本再确认替换。",
        "更换文件或断开关联都不会删除原本的本地文件。"], result: "本地文件会在每次修改后自动更新，并可作为普通 JSON 备份恢复。" },
      { title: "重新连接和处理冲突", steps: ["浏览器权限失效时选择“重新连接”；系统不会在页面加载时主动弹出权限请求。", "如浏览器副本和本地文件都被修改，选择“处理版本冲突”。",
        "决定使用哪个版本后，被替换的版本会先下载为恢复备份。"], result: "自动同步只会在来源明确后继续，不会静默覆盖两个不同版本。" },
      { title: "导出和恢复备份", steps: ["选择左侧窄工具栏的“备份”→“导出备份”，保存 JSON 文件。", "需要恢复时选择“恢复备份”并选取文件。",
        "恢复会替换当前资料；使用本地文件模式时也会更新关联文件，因此确认前应先导出当前备份。", "首次把 V1–V10 资料迁移到 V11 时，可从备份菜单下载迁移前恢复副本。"], result: "备份包含公司主档、所有年度项目、控股关系、税务期限及其改期记录、范本、状态和自定义种类。" },
      { title: "初始化工作台", steps: ["选择左侧窄工具栏的“备份”→“初始化工作台”。", "先使用提示区的按钮导出当前备份。",
        "阅读清除范围并勾选确认，再选择“确认初始化”。", "如已关联本地文件，初始化会先断开关联并保留该文件，再清理浏览器工作台。"],
      result: "初始化会恢复内置范本、种类和状态并保留界面语言；旧本地文件不会被覆盖。" },
      { title: "切换界面语言", steps: ["选择左侧窄工具栏的“语言”。", "选择简体中文、繁体中文或 English。",
        "系统区域、按钮和内置范本会切换；你输入的项目、范本和自定义名称会保持原文。"], result: "同一份数据可以用三种系统语言操作。" },
      { title: "理解本机数据和多人使用", steps: ["在线版不会把项目资料上传到服务器；资料保存在浏览器或你主动关联的本地文件。", "文件授权只保留在当前浏览器和电脑，换电脑时需要重新打开文件或恢复备份。",
        "本地文件不会自动提供多人同步；多人使用时仍应约定唯一主文件，避免同时编辑产生分支。"], result: "你可以清楚控制资料在哪里保存及如何转移。" },
    ] },
  ];
  const [activeId, setActiveId] = React.useState(sections[0].id);
  const active = sections.find((section) => section.id === activeId) || sections[0];
  return <div className="user-guide"><aside><header><strong>{t("功能目录")}</strong>
    <span>{t("按实际工作顺序查看每项操作。")}</span></header><nav aria-label={t("使用指南目录")}>{sections.map((section, index) =>
      <button type="button" aria-current={active.id === section.id ? "page" : undefined} key={section.id}
        onClick={() => setActiveId(section.id)}><span>{index + 1}</span><strong>{t(section.title)}</strong></button>)}</nav></aside>
    <article><header><span>{t("使用指南")}</span><h3>{t(active.title)}</h3><p>{t(active.summary)}</p></header>
      <div className="guide-topic-list">{active.topics.map((topic, index) => <section key={topic.title}>
        <span className="guide-topic-number">{index + 1}</span><div><h4>{t(topic.title)}</h4><ol>{topic.steps.map((step) =>
          <li key={step}>{t(step)}</li>)}</ol><p><strong>{t("完成后：")}</strong>{t(topic.result)}</p></div></section>)}</div>
      <footer><strong>{t("建议")}</strong><span>{t("首次使用时，先用没有客户资料的测试项目走完一次流程，再建立正式项目。")}</span></footer>
    </article></div>;
}

export function SampleEditor({ sample, categories = createDefaultWorkstreamCategories(), onSave, onClose, onReset, onRedact }) {
  const { language, t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(sample)));
  const [tags, setTags] = React.useState(() => (sample.tags || []).join(", "));
  const updateNode = (nodeId, updater) => setDraft((current) => ({ ...current,
    nodes: current.nodes.map((node) => node.id === nodeId ? updater(node) : node) }));
  const moveNode = (index, direction) => setDraft((current) => {
    const nodes = [...current.nodes];
    const target = index + direction;
    if (target >= 0 && target < nodes.length) [nodes[index], nodes[target]] = [nodes[target], nodes[index]];
    return { ...current, nodes };
  });
  const totalConditions = draft.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
  return <form className="sample-editor" onSubmit={(event) => {
    event.preventDefault();
    if (!draft.name.trim() || draft.nodes.some((node) => !node.title.trim())) return;
    onSave({ ...draft, builtinKey: undefined, name: draft.name.trim(), description: draft.description.trim(),
      tags: normalizeTemplateTags(tags), versionNote: draft.versionNote?.trim() || "",
      nodes: draft.nodes.map((node) => ({ ...node, title: node.title.trim(), description: node.description.trim(),
        conditions: node.conditions.map((condition) => ({ ...condition, label: condition.label.trim(), done: false }))
          .filter((condition) => condition.label) })) });
  }}>
    <div className="sample-editor-summary">
      <label><span>{t("范本名称 *")}</span><input autoFocus required value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
      <label><span>{t("范本种类 *")}</span><select required value={draft.categoryId || draft.workstreamType}
        onChange={(event) => { const category = categories.find((item) => item.id === event.target.value);
          if (category) setDraft((current) => ({ ...current, categoryId: category.id,
            workstreamType: category.builtinType || "custom" })); }}>
        {categories.map((category) => <option value={category.id} key={category.id}>{workstreamCategoryLabel(category, language)}</option>)}</select></label>
      <label><span>{t("说明")}</span><input value={draft.description}
        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
        placeholder={t("说明这个范本的适用范围")} /></label>
      <label><span>{t("标签")}</span><input value={tags} onChange={(event) => setTags(event.target.value)}
        placeholder={t("例如：年度审计，标准流程，香港")} /></label>
      <label><span>{t("版本备注")}</span><input maxLength="240" value={draft.versionNote || ""}
        onChange={(event) => setDraft((current) => ({ ...current, versionNote: event.target.value }))}
        placeholder={t("说明本次范本修改")} /></label>
      <small>{t("{nodes} 个节点 · {conditions} 项条件", { nodes: draft.nodes.length, conditions: totalConditions })}</small>
    </div>
    <div className="sample-editor-list">{draft.nodes.map((node, index) => <section className="sample-edit-node" key={node.id}>
      <header><span>{index + 1}</span><input required value={node.title} aria-label={t("节点 {index} 名称", { index: index + 1 })}
        onChange={(event) => updateNode(node.id, (current) => ({ ...current, title: event.target.value }))} />
        <div><button type="button" className="icon-only" disabled={index === 0} onClick={() => moveNode(index, -1)} title={t("上移节点")}
          aria-label={t("上移节点")} data-tooltip={t("上移节点")}><ArrowLeft aria-hidden="true" /></button>
          <button type="button" className="icon-only" disabled={index === draft.nodes.length - 1} onClick={() => moveNode(index, 1)} title={t("下移节点")}
            aria-label={t("下移节点")} data-tooltip={t("下移节点")}><ArrowRight aria-hidden="true" /></button>
          <button type="button" className="icon-only" aria-label={t("删除节点")} title={t("删除节点")} data-tooltip={t("删除节点")} data-tooltip-side="left"
            onClick={() => window.confirm(t("删除节点“{name}”？", { name: node.title || t("未命名") })) &&
              setDraft((current) => ({ ...current, nodes: current.nodes.filter((item) => item.id !== node.id) }))}><Trash2 aria-hidden="true" /></button></div></header>
      <input className="sample-node-description" value={node.description} aria-label={t("{name}说明", { name: node.title || t("节点 {index}", { index: index + 1 }) })}
        onChange={(event) => updateNode(node.id, (current) => ({ ...current, description: event.target.value }))}
        placeholder={t("节点说明")} />
      <div className="sample-condition-editor">{node.conditions.map((condition, conditionIndex) => <div key={condition.id}>
        <span>{conditionIndex + 1}</span><input value={condition.label} aria-label={t("{name}条件 {index}", {
          name: node.title || t("节点 {index}", { index: index + 1 }), index: conditionIndex + 1 })}
          onChange={(event) => updateNode(node.id, (current) => ({ ...current,
            conditions: current.conditions.map((item) => item.id === condition.id ? { ...item, label: event.target.value } : item) }))} />
        <button type="button" className="icon-only" title={t("删除条件")} onClick={() => updateNode(node.id, (current) => ({ ...current,
          conditions: current.conditions.filter((item) => item.id !== condition.id) }))} aria-label={t("删除条件")}
          data-tooltip={t("删除条件")} data-tooltip-side="left"><Trash2 aria-hidden="true" /></button></div>)}</div>
      <footer><button type="button" onClick={() => updateNode(node.id, (current) => ({ ...current,
        conditions: [...current.conditions, { id: uid("sample-condition"), label: "", done: false }] }))}>{t("＋ 添加条件")}</button></footer>
    </section>)}</div>
    <button type="button" className="sample-add-node" onClick={() => setDraft((current) => ({ ...current,
      nodes: [...current.nodes, { id: uid("sample-node"), title: "", description: "", conditions: [] }] }))}>
      <Plus aria-hidden="true" />{t("添加节点")}</button>
    <footer className="sample-editor-actions">{onReset
      ? <button type="button" className="button secondary" onClick={onReset}>{t("恢复基础范本")}</button> : <span />}
      {onRedact ? <button type="button" className="button secondary" onClick={() => onRedact(draft)}>{t("公司去敏")}</button> : <span />}
      <span /><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存范本")}</button></footer>
  </form>;
}

export function NodeForm({ initial, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [title, setTitle] = React.useState(initial?.title || "");
  const [description, setDescription] = React.useState(initial?.description || "");
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    if (title.trim()) onSubmit({ title: title.trim(), description: description.trim() });
  }}>
    <label><span>{t("节点名称 *")}</span><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)}
      placeholder={t("例如：税务计算")} /></label>
    <label><span>{t("说明")}</span><textarea rows="3" value={description}
      onChange={(event) => setDescription(event.target.value)} placeholder={t("说明这个节点的目标")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存节点")}</button></footer>
  </form>;
}

export function ProgressBar({ value, compact = false }) {
  const { t } = useUiLanguage();
  const percentage = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  return <div className="progress-track" data-compact={compact || undefined} role="progressbar"
    data-complete={percentage === 100 || undefined} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}
    aria-label={t("完成 {value}%", { value: percentage })} style={{ "--progress-angle": `${percentage * 3.6}deg` }}>
    <span aria-hidden="true">{percentage}%</span>
  </div>;
}

export function ProjectRow({ project, outstandingStatuses, selected, onSelect }) {
  const { language, t } = useUiLanguage();
  const stats = projectStats(project);
  const outstandingCount = (project.outstandingItems || []).filter((item) => outstandingIsOpen(item, outstandingStatuses)).length;
  return <button type="button" className="project-row" data-selected={selected || undefined} onClick={onSelect}>
    <div className="project-row-title"><strong>{project.entity || project.name}</strong>
      <span>{project.name !== project.entity ? project.name
        : reportingPeriodLabel(project, language) || t("尚未填写项目资料")}</span></div>
    <div className="project-row-progress"><span>{stats.completedWorkstreams}/{stats.workstreams}</span></div>
    <div className="project-row-next"><small>{t("业务模块")}</small>
      <span>{stats.complete ? t("全部完成") : t("{done}/{total} 个模块完成", { done: stats.completedWorkstreams, total: stats.workstreams })}</span>
      {outstandingCount > 0 && <em>{t("{count} 待清", { count: outstandingCount })}</em>}</div>
    <time data-tone={dueTone(project)}>{formatDate(project.dueDate, language)}</time>
  </button>;
}

export function NodeBoard({ nodes, readOnly = false, actions, label = "", title = "", description = "", percentage = null,
  revealRequest = null, onRevealHandled }) {
  const { t } = useUiLanguage();
  const currentNode = nodes.find((node) => !workstreamStats({ nodes: [node] }).complete);
  const [selectedId, setSelectedId] = React.useState(null);
  const boardRef = React.useRef(null);
  const detailRef = React.useRef(null);
  React.useEffect(() => {
    if (revealRequest) setSelectedId(nodes.some((node) => node.id === revealRequest.nodeId) ? revealRequest.nodeId : null);
  }, [revealRequest]);
  React.useEffect(() => {
    if (!revealRequest) return;
    const nodeId = nodes.some((node) => node.id === revealRequest.nodeId) ? revealRequest.nodeId : null;
    if (selectedId !== nodeId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = nodeId ? detailRef.current : boardRef.current;
      target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: "nearest", inline: "nearest" });
      onRevealHandled?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [revealRequest, selectedId, onRevealHandled]);
  const [draggingNodeId, setDraggingNodeId] = React.useState(null);
  const [nodeDropTarget, setNodeDropTarget] = React.useState(null);
  const [draggingConditionId, setDraggingConditionId] = React.useState(null);
  const [conditionDropTarget, setConditionDropTarget] = React.useState(null);
  const draggingNodeRef = React.useRef(null);
  const draggingConditionRef = React.useRef(null);
  React.useEffect(() => {
    if (selectedId && !nodes.some((node) => node.id === selectedId)) setSelectedId(null);
  }, [nodes, selectedId]);
  const selected = nodes.find((node) => node.id === selectedId) || null;
  const finishNodeDrag = () => {
    draggingNodeRef.current = null;
    setDraggingNodeId(null);
    setNodeDropTarget(null);
  };
  const beginNodeDrag = (event, nodeId) => {
    draggingNodeRef.current = nodeId;
    setDraggingNodeId(nodeId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-audit-workbench-node", nodeId);
    event.dataTransfer.setData("text/plain", nodeId);
  };
  const dragOverNode = (event, nodeId) => {
    const sourceId = draggingNodeRef.current;
    if (!sourceId || sourceId === nodeId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setNodeDropTarget({ id: nodeId, position: event.clientX < bounds.left + bounds.width / 2 ? "before" : "after" });
  };
  const dropNode = (event, nodeId) => {
    const sourceId = draggingNodeRef.current;
    if (!sourceId || sourceId === nodeId) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    actions.reorderNode(sourceId, nodeId, event.clientX < bounds.left + bounds.width / 2 ? "before" : "after");
    finishNodeDrag();
  };
  const reorderNodeWithKeyboard = (event, node, index) => {
    if (readOnly || !event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const target = nodes[index + (event.key === "ArrowLeft" ? -1 : 1)];
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    actions.reorderNode(node.id, target.id, event.key === "ArrowLeft" ? "before" : "after");
  };
  const finishConditionDrag = () => {
    draggingConditionRef.current = null;
    setDraggingConditionId(null);
    setConditionDropTarget(null);
  };
  const beginConditionDrag = (event, conditionId) => {
    draggingConditionRef.current = conditionId;
    setDraggingConditionId(conditionId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-audit-workbench-condition", conditionId);
    event.dataTransfer.setData("text/plain", conditionId);
  };
  const dragOverCondition = (event, conditionId) => {
    const sourceId = draggingConditionRef.current;
    if (!sourceId || sourceId === conditionId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setConditionDropTarget({ id: conditionId, position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" });
  };
  const dropCondition = (event, conditionId) => {
    const sourceId = draggingConditionRef.current;
    if (!sourceId || sourceId === conditionId || !selected) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    actions.reorderCondition(selected.id, sourceId, conditionId,
      event.clientY < bounds.top + bounds.height / 2 ? "before" : "after");
    finishConditionDrag();
  };
  const reorderConditionWithKeyboard = (event, condition, index) => {
    if (readOnly || !event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key) || !selected) return;
    const target = selected.conditions[index + (event.key === "ArrowUp" ? -1 : 1)];
    if (!target) return;
    event.preventDefault();
    actions.reorderCondition(selected.id, condition.id, target.id, event.key === "ArrowUp" ? "before" : "after");
  };
  return <div className="node-board" ref={boardRef} role="group" tabIndex="-1" aria-label={title || t("项目节点")} style={{ "--node-count": Math.max(nodes.length, 1) }}>
    <header className="node-board-toolbar"><div className="node-board-heading">{label && <span>{label}</span>}
      {title && <h3>{title}</h3>}{description && <p>{description}</p>}</div>
      {percentage !== null && <div className="workflow-panel-progress"><ProgressBar value={percentage} compact /></div>}
      {!readOnly && <div className="node-structure-actions"><button type="button" className="button secondary icon-only"
        aria-label={t("添加节点")} data-tooltip={t("添加节点")} onClick={actions.addNode}><Plus aria-hidden="true" /></button>
        <button type="button" className="button danger-quiet icon-only" disabled={!selected} aria-label={t("删除所选节点")}
          data-tooltip={t("删除所选节点")} data-tooltip-side="left"
          onClick={() => selected && actions.deleteNode(selected)}><Trash2 aria-hidden="true" /></button></div>}
    </header>
    {nodes.length ? <div className="node-track" role="tablist" aria-label={t("项目节点")} onKeyDown={handleTabListKeyDown}>{nodes.map((node, index) => {
      const status = nodeStatus(node); const done = node.conditions.filter((condition) => condition.done).length;
      return <button type="button" role="tab" aria-selected={selected?.id === node.id} aria-expanded={selected?.id === node.id}
        tabIndex={selected ? tabIndexFor(selected.id === node.id) : index === 0 ? 0 : -1} className="node-track-card" title={node.title}
        aria-description={!readOnly ? t("拖动调整节点顺序；Alt + 左右方向键也可移动") : undefined}
        data-status={status} data-current={currentNode?.id === node.id || undefined} data-dragging={draggingNodeId === node.id || undefined}
        data-drop-position={nodeDropTarget?.id === node.id ? nodeDropTarget.position : undefined} key={node.id}
        draggable={!readOnly} onDragStart={(event) => beginNodeDrag(event, node.id)} onDragEnd={finishNodeDrag}
        onDragOver={(event) => dragOverNode(event, node.id)} onDrop={(event) => dropNode(event, node.id)}
        onKeyDown={(event) => reorderNodeWithKeyboard(event, node, index)}
        onClick={() => setSelectedId((current) => current === node.id ? null : node.id)}>
        <span className="node-track-number">{index + 1}</span><span><strong>{node.title}</strong>
          <small>{done}/{node.conditions.length} {t("项条件")}</small></span><i>{t(status)}</i></button>;
    })}</div> : <div className="inline-empty"><strong>{t("还没有节点")}</strong>
      <span>{readOnly ? t("此记录没有保存节点。") : t("添加第一个节点后，即可设置完成条件。")}</span></div>}
    {selected && <section className="node-detail-panel" ref={detailRef} tabIndex="-1" aria-label={selected.title}><header><div><span>{t("节点详情")}</span><h4>{selected.title}</h4>
      {selected.description && <p>{selected.description}</p>}</div>{!readOnly && <div className="node-detail-actions">
        <button type="button" className="icon-only" disabled={nodes.indexOf(selected) === 0} onClick={() => actions.move(selected.id, -1)}
          aria-label={t("上移节点")} data-tooltip={t("上移节点")}><ArrowLeft aria-hidden="true" /></button>
        <button type="button" className="icon-only" disabled={nodes.indexOf(selected) === nodes.length - 1} onClick={() => actions.move(selected.id, 1)}
          aria-label={t("下移节点")} data-tooltip={t("下移节点")}><ArrowRight aria-hidden="true" /></button>
        <button type="button" className="icon-only" onClick={() => actions.editNode(selected)} aria-label={t("编辑节点")}
          data-tooltip={t("编辑节点")}><Pencil aria-hidden="true" /></button></div>}</header>
      {selected.conditions.length ? <div className="condition-list">{selected.conditions.map((condition, index) => <div className="condition-row"
        data-done={condition.done || undefined} data-dragging={draggingConditionId === condition.id || undefined}
        data-drop-position={conditionDropTarget?.id === condition.id ? conditionDropTarget.position : undefined}
        draggable={!readOnly} aria-description={!readOnly ? t("按住完成条件即可拖动排序；按 Alt 加上下方向键也可移动") : undefined}
        onDragStart={(event) => beginConditionDrag(event, condition.id)} onDragEnd={finishConditionDrag}
        onDragOver={(event) => dragOverCondition(event, condition.id)} onDrop={(event) => dropCondition(event, condition.id)}
        onKeyDown={(event) => reorderConditionWithKeyboard(event, condition, index)} key={condition.id}>
        <label><input type="checkbox" disabled={readOnly} aria-keyshortcuts={!readOnly ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
          checked={condition.done} onChange={() => actions.toggle(selected.id, condition.id)} /><span>{condition.label}</span></label>
        {!readOnly && <div className="condition-actions"><button type="button" className="icon-only"
          onClick={() => actions.editCondition(selected, condition)} aria-label={t("修改")} data-tooltip={t("修改")}>
          <Pencil aria-hidden="true" /></button><button type="button" className="icon-only"
            onClick={() => actions.deleteCondition(selected.id, condition.id)} aria-label={t("删除")}
            data-tooltip={t("删除")} data-tooltip-side="left"><Trash2 aria-hidden="true" /></button></div>}</div>)}</div>
        : <div className="condition-empty">{t("这个节点还没有完成条件。")}</div>}
      {!readOnly && <footer className="node-footer"><button type="button" className="add-condition" onClick={() => actions.addCondition(selected)}>{t("＋ 添加完成条件")}</button></footer>}
    </section>}
  </div>;
}

export function NodeCard({ node, index, total, isCurrent, actions, readOnly = false }) {
  const { t } = useUiLanguage();
  const status = nodeStatus(node);
  const completedConditions = node.conditions.filter((item) => item.done).length;
  const [expanded, setExpanded] = React.useState(() => isCurrent || status === "待设置条件");
  React.useEffect(() => {
    if (isCurrent) setExpanded(true);
  }, [isCurrent]);
  return <section className="node-card" data-status={status} data-current={isCurrent || undefined}>
    <header className="node-header">
      <button type="button" className="node-expand" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="node-index">{index + 1}</span>
        <span className="node-heading"><strong>{node.title}</strong>
          <small>{node.description || t("{done} / {total} 项条件", { done: completedConditions, total: node.conditions.length })}</small></span>
      </button>
      <div className="node-header-actions">
        <span className="node-condition-count" title={t("已达成条件 / 全部条件")}>{completedConditions} / {node.conditions.length}</span>
        {isCurrent && <span className="current-pill">{t("当前")}</span>}
        <span className="status-pill" data-status={status}>{t(status)}</span>
        {!readOnly && <><button type="button" className="text-button" disabled={index === 0} onClick={() => actions.move(-1)} aria-label={t("上移节点")}>↑</button>
          <button type="button" className="text-button" disabled={index === total - 1} onClick={() => actions.move(1)} aria-label={t("下移节点")}>↓</button>
          <button type="button" className="text-button" onClick={actions.editNode}>{t("编辑")}</button></>}</div>
    </header>
    {expanded && <div className="node-body">
      {node.conditions.length ? <div className="condition-list">{node.conditions.map((condition) =>
        <div className="condition-row" data-done={condition.done || undefined} key={condition.id}>
          <label><input type="checkbox" disabled={readOnly} checked={condition.done} onChange={() => actions.toggle(condition.id)} />
            <span>{condition.label}</span></label>
          {!readOnly && <div className="condition-actions"><button type="button" onClick={() => actions.editCondition(condition)}>{t("修改")}</button>
            <button type="button" onClick={() => actions.deleteCondition(condition.id)}>{t("删除")}</button></div>}
        </div>)}</div> : <div className="condition-empty">{t("这个节点还没有完成条件。")}</div>}
      {!readOnly && <footer className="node-footer"><button type="button" className="add-condition" onClick={actions.addCondition}>{t("＋ 添加完成条件")}</button>
        <button type="button" className="delete-link" onClick={actions.deleteNode}>{t("删除节点")}</button></footer>}
    </div>}
  </section>;
}
