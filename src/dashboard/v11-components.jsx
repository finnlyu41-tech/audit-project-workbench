import { calendarDate } from "./workspace-validation.js";
import React from "react";
import { RequiredTextInput } from "./required-text-input.jsx";
import { batchCompanyEdited, prepareCompanyEntry } from "./company-entry-state.js";
import { useModalDraft } from "./modal-draft.jsx";
import { Archive, ArchiveRestore, Building, Building2, CalendarDays, CalendarPlus, ChevronRight, CircleAlert,
  Edit3, FolderTree, GitMerge, Plus, ReceiptText, Search, Settings2, Trash2, X } from "lucide-react";
import { ProgressBar } from "./components.jsx";
import { entityMergeProblem, engagementPeriodExists, engagementReportingPeriods, engagementReportingPeriodsMatch, engagementsForEntity, engagementTypeLabel,
  engagementTypeValues, engagementTypesLabel, fiscalPeriodForYear,
  fiscalPeriodShortLabel, fiscalPeriodFromIncorporation, formalReportingPeriodLabel, formatDate, groupProgress,
  outstandingIsOpen, outstandingStatusLabel, projectStats, suggestNextFiscalYear, taxDeadlineSummary,
  uid, workstreamCategoryLabel, yearEndOrPeriodLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { DateRangePicker } from "./date-range-picker.jsx";
import { filterHoldingComponents, holdingComponentRows } from "./holding-components-model.js";
import { companyAnnualRows, filterAnnualProjects } from "./company-overview-model.js";
import { AdvancedSection } from "./ux-components.jsx";
import { isComposingKey } from "./editor-draft-state.js";
import { resolveAnnualSource } from "./annual-source-model.js";
import { AnnualSourceSummary } from "./annual-source-summary.jsx";

const FRAMEWORKS = [
  "HKFRS Accounting Standards",
  "SME-FRF and SME-FRS",
  "IFRS Accounting Standards",
  "HKFRS for Private Entities",
];

const ENGAGEMENT_TYPES = [
  "Audit",
  "Bookkeeping",
  "Tax computation & filing",
  "Customer due diligence",
  "Quotation & collection",
  "Group consolidation",
];

function presetLabel(value, t) {
  return t({ calendar: "1 月 1 日 → 12 月 31 日", apr_mar: "4 月 1 日 → 次年 3 月 31 日",
    custom: "每个项目自定义日期", doi_year_end: "成立日（DOI）→ 年结日" }[value] || "每个项目自定义日期");
}

export function CompanyForm({ store, initial = null, onSubmit, onClose, creationKind = null, submitLabel = null }) {
  const { t } = useUiLanguage();
  const [creationMode, setCreationMode] = React.useState("single");
  const [values, setValues] = React.useState(() => ({
    legalName: initial?.legalName || "",
    entityType: initial?.entityType || "",
    incorporationDate: initial?.incorporationDate || "",
    kind: initial?.kind || creationKind || "company",
    parentEntityId: initial?.parentEntityId || "",
    relationshipRole: initial?.relationshipRole || "",
    fiscalYearPreset: initial?.fiscalYearPreset || "calendar",
    notes: initial?.notes || "",
  }));
  const batchBaselines = React.useRef(new Map());
  const batchFields = React.useRef(new Map());
  const pendingBatchFocus = React.useRef(null);
  const makeBatchDraft = (preset) => {
    const row = { id: uid("batch-entity"), legalName: "", entityType: "", fiscalYearPreset: preset, relationshipRole: "子公司" };
    batchBaselines.current.set(row.id, { ...row }); return row;
  };
  const [batchCompanies, setBatchCompanies] = React.useState(() => [makeBatchDraft("calendar")]);
  const initialBatchCompany = React.useRef(batchCompanies[0]);
  const batchHelpId = React.useId();
  const { closeEditor } = useModalDraft({ values, creationMode, batchCompanies }, onClose);
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const updateBatchCompany = (id, field) => (event) => setBatchCompanies((current) => current.map((company) =>
    company.id === id ? { ...company, [field]: event.target.value } : company));
  const addBatchCompany = () => {
    const row = makeBatchDraft(values.fiscalYearPreset);
    pendingBatchFocus.current = row.id;
    setBatchCompanies((current) => [...current, row]);
  };
  const removeBatchCompany = (id) => {
    if (batchCompanies.length === 1) return;
    const index = batchCompanies.findIndex((company) => company.id === id);
    if (index < 0) return;
    pendingBatchFocus.current = (batchCompanies[index + 1] || batchCompanies[index - 1])?.id;
    batchBaselines.current.delete(id);
    setBatchCompanies((current) => current.filter((company) => company.id !== id));
  };
  React.useLayoutEffect(() => {
    if (!pendingBatchFocus.current) return;
    const field = batchFields.current.get(pendingBatchFocus.current);
    pendingBatchFocus.current = null;
    // Complete row focus before the next interaction can choose another field.
    field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [batchCompanies]);
  const changeCreationMode = (next) => {
    if (next === creationMode) return;
    if (next === "single" && batchCompanies.some((row) => batchCompanyEdited(row, batchBaselines.current.get(row.id)))
      && !window.confirm(t("切换为单个公司会清除本次填写的集团成员。是否继续？"))) return;
    if (next === "single") {
      pendingBatchFocus.current = null; batchBaselines.current.clear();
      batchBaselines.current.set(initialBatchCompany.current.id, initialBatchCompany.current);
      setBatchCompanies([initialBatchCompany.current]);
    }
    setCreationMode(next); setValues((current) => ({ ...current, kind: next === "group" ? "holding_company" : "company" }));
  };
  const updateParent = (event) => setValues((current) => ({ ...current, parentEntityId: event.target.value,
    relationshipRole: event.target.value ? current.relationshipRole : "" }));
  const children = initial ? store.entities.filter((entity) => entity.parentEntityId === initial.id) : [];
  const parentOptions = store.entities.filter((entity) => entity.kind === "holding_company" && !entity.archived
    && entity.id !== initial?.id);
  return <form data-editor-guard className="workbench-form company-master-form" onSubmit={(event) => {
    event.preventDefault();
    const result = prepareCompanyEntry(values, batchCompanies, !initial && creationMode === "group");
    if (result.error) { event.currentTarget.reportValidity(); return; }
    onSubmit(result.values);
  }}>
    <div className="company-master-lead"><FolderTree aria-hidden="true" /><div><strong>{t(initial ? "编辑公司主档" : "建立公司主档")}</strong>
      <span>{t("公司主档保存长期资料；报告期间、项目排期和业务模块在年度项目中设置。")}</span></div></div>
    {!initial && !creationKind && <div className="company-creation-mode choice-tabs" role="group" aria-label={t("新建模式")}>
      <button type="button" data-active={creationMode === "single" || undefined} aria-pressed={creationMode === "single"}
        onClick={() => changeCreationMode("single")}>{t("单个公司")}</button>
      <button type="button" data-active={creationMode === "group" || undefined} aria-pressed={creationMode === "group"}
        onClick={() => changeCreationMode("group")}>{t("集团批量")}</button>
    </div>}
    <div className="form-grid" data-columns="2"><label><span>{t("法律实体 *")}</span>
      <RequiredTextInput autoFocus value={values.legalName} onChange={update("legalName")}
        placeholder={t(creationMode === "group" && !initial ? "集团完整名称" : "公司完整名称")} /></label>
      <label><span>{t("主体类型（可选）")}</span><input list="v11-entity-type-options" value={values.entityType}
        onChange={update("entityType")} placeholder={t("例如：有限公司、个人独资、合伙企业或直接输入")} />
        <datalist id="v11-entity-type-options">{["有限公司", "个人独资", "合伙企业", "个人"].map((type) =>
          <option key={type} value={t(type)} />)}</datalist></label>
      <label><span>{t("默认会计年度")}</span><select value={values.fiscalYearPreset} onChange={update("fiscalYearPreset")}>
        {["calendar", "apr_mar", "custom"].map((preset) => <option value={preset} key={preset}>{presetLabel(preset, t)}</option>)}</select></label>
      <label><span>{t("成立／开始日期（DOI，可选）")}</span><input type="date" min="0001-01-01" max="9999-12-31" value={values.incorporationDate}
        onChange={update("incorporationDate")} /></label>
    </div><small className="form-help">{t("用于首个项目的 DOI → 年结日期间。")}</small>
    <AdvancedSection key={creationMode} title={t("公司关系与备注")} hint={t("高级设置，不影响先建立公司。")}
      defaultOpen={Boolean(initial) || creationMode === "group"}>
      <div className="form-grid"><label className="span-two"><span>{t("所属控股公司")}</span><select value={values.parentEntityId} onChange={updateParent}>
        <option value="">{t("独立主体（不属于控股公司）")}</option>
        {parentOptions.map((entity) => <option key={entity.id} value={entity.id}>{entity.legalName}</option>)}</select></label>
      {values.parentEntityId && <label className="span-two"><span>{t("控股公司归属角色")}</span>
        <input value={values.relationshipRole} onChange={update("relationshipRole")}
          placeholder={t("例如：子公司、联营公司或中间控股公司")} /></label>}</div>
    {!creationKind && (!initial || creationMode === "single") && creationMode !== "group" && <label className="check-option company-holding-toggle"><input type="checkbox" role="switch"
      checked={values.kind === "holding_company"} onChange={(event) => setValues((current) => ({ ...current,
        kind: event.target.checked ? "holding_company" : "company" }))} />
      <span><strong>{t("启用控股公司架构")}</strong><small>{t("允许在此主体下建立公司层级和合并年度项目。")}</small></span></label>}
    {!initial && creationMode === "group" && <section className="group-batch-builder">
      <header><div><strong>{t("集团成员公司")} · {batchCompanies.length}</strong>
        <span id={batchHelpId}>{t("每行都需填写公司名称；不用的行请移除。所有成员都归属于上方集团。")}</span></div>
        <button type="button" className="button secondary" onClick={addBatchCompany}><Plus aria-hidden="true" />{t("添加公司")}</button></header>
      <div className="group-batch-list">{batchCompanies.map((company, index) => <article key={company.id}
        role="group" aria-labelledby={`batch-company-${company.id}`}>
        <header className="batch-company-heading"><strong id={`batch-company-${company.id}`}>{t("成员公司 {number}", { number: index + 1 })}</strong>
          <button type="button" className="icon-button danger icon-only" aria-label={t("移除公司 {number}", { number: index + 1 })}
            title={t("移除公司 {number}", { number: index + 1 })} disabled={batchCompanies.length === 1}
            onClick={() => removeBatchCompany(company.id)}><Trash2 aria-hidden="true" /></button></header>
        <label><span>{t("公司名称 *")}</span><RequiredTextInput value={company.legalName} aria-describedby={batchHelpId}
          ref={(element) => { if (element) batchFields.current.set(company.id, element); else batchFields.current.delete(company.id); }}
          onChange={updateBatchCompany(company.id, "legalName")} placeholder={t("公司完整名称")} /></label>
        <label><span>{t("主体类型（可选）")}</span><input list="v11-entity-type-options" value={company.entityType}
          onChange={updateBatchCompany(company.id, "entityType")} placeholder={t("可直接输入")} /></label>
        <label><span>{t("默认会计年度")}</span><select value={company.fiscalYearPreset}
          onChange={updateBatchCompany(company.id, "fiscalYearPreset")}>
          {["calendar", "apr_mar", "custom"].map((preset) => <option value={preset} key={preset}>{presetLabel(preset, t)}</option>)}</select></label>
        <label><span>{t("集团角色")}</span><input value={company.relationshipRole}
          onChange={updateBatchCompany(company.id, "relationshipRole")} placeholder={t("例如：子公司或联营公司")} /></label>
      </article>)}</div>
    </section>}
    {values.kind === "company" && children.length > 0 && <div className="inline-warning"><CircleAlert aria-hidden="true" />
      <span>{t("这家控股公司仍有 {count} 家直属成员。转换为普通公司前请先移动这些成员。", { count: children.length })}</span></div>}
    <label><span>{t("公司备注")}</span><textarea rows="3" value={values.notes} onChange={update("notes")}
      placeholder={t("记录长期适用、不会随年度项目改变的公司资料")} /></label>
    </AdvancedSection>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={closeEditor}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={values.kind === "company" && children.length > 0}>
        {submitLabel || t(initial ? "保存公司主档" : creationMode === "group" ? "建立集团及公司" : "建立公司")}</button></footer>
  </form>;
}

function initialSelections(categories, selectedIds) {
  return categories.filter((category) => category.id === "audit").map((category) => ({
    categoryId: category.id,
    type: category.builtinType || "custom",
    customName: category.name || "",
    sampleId: selectedIds[category.id] || "",
  }));
}

export function EngagementForm({ store, entity, initial = null, preferredSourceId = "", quickField = null,
  onCreateAnotherYear = null, onSubmit, onClose, templateStarter = null }) {
  const { language, t } = useUiLanguage();
  const existing = engagementsForEntity(store, entity.id);
  const firstInitialPeriod = engagementReportingPeriods(initial)[0] || initial || {};
  const suggestedYear = initial ? Number(firstInitialPeriod.periodStart?.slice(0, 4)) || new Date().getFullYear()
    : suggestNextFiscalYear(entity, store.engagements) || new Date().getFullYear();
  const initialPreset = firstInitialPeriod?.periodPreset || entity.fiscalYearPreset || "calendar";
  const generated = initial ? { periodStart: firstInitialPeriod.periodStart, periodEnd: firstInitialPeriod.periodEnd }
    : fiscalPeriodForYear(initialPreset, suggestedYear);
  const inheritedEngagementTypes = templateStarter?.engagementTypes || engagementTypeValues(initial || existing[0] || {
    engagementType: entity.kind === "holding_company" ? "Group consolidation" : "Audit",
  });
  const [values, setValues] = React.useState(() => ({
    internalName: initial?.internalName || "",
    engagementTypes: inheritedEngagementTypes,
    engagementType: inheritedEngagementTypes[0] || "",
    reportingPeriods: (initial ? engagementReportingPeriods(initial) : [{
      id: uid("reporting-period"), periodPreset: initialPreset,
      periodStart: generated.periodStart || "", periodEnd: generated.periodEnd || "",
    }]).map((period, index) => ({ ...period, id: period.id || uid("reporting-period"),
      baseYear: Number(period.periodStart?.slice(0, 4)) || suggestedYear + index })),
    reportingFramework: initial ? initial.reportingFramework || "" : existing[0]?.reportingFramework || "",
    owner: initial?.owner || "",
    startDate: initial?.startDate || "",
    dueDate: initial?.dueDate || "",
    notes: initial?.notes || "",
    consolidationEnabled: initial?.consolidation?.enabled !== false,
  }));
  const previousDefault = existing.find((engagement) => !initial || engagement.id !== initial.id) || null;
  const [sourceMode, setSourceMode] = React.useState(templateStarter ? "template" : previousDefault ? "previous" : "template");
  const [sourceEngagementId, setSourceEngagementId] = React.useState(preferredSourceId || previousDefault?.id || "");
  const [selections, setSelections] = React.useState(() => templateStarter?.selections || initialSelections(store.workstreamCategories,
    store.selectedSampleIdsByCategory));
  const [customEngagementType, setCustomEngagementType] = React.useState("");
  const [error, setError] = React.useState("");
  const { closeEditor, confirmTransition } = useModalDraft({ values, sourceMode, sourceEngagementId, selections, customEngagementType }, onClose);
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const updatePeriods = (updater) => setValues((current) => ({
    ...current,
    reportingPeriods: typeof updater === "function" ? updater(current.reportingPeriods) : updater,
  }));
  const changePreset = (id) => (event) => {
    const periodPreset = event.target.value;
    if (periodPreset === "doi_year_end") {
      const dates = fiscalPeriodFromIncorporation(entity);
      updatePeriods((periods) => periods.map((period) => period.id === id
        ? { ...period, periodPreset, periodStart: dates.periodStart, periodEnd: dates.periodEnd } : period));
      return;
    }
    updatePeriods((periods) => periods.map((period) => {
      if (period.id !== id) return period;
      const dates = fiscalPeriodForYear(periodPreset, period.baseYear);
      return { ...period, periodPreset,
        periodStart: periodPreset === "custom" ? period.periodStart : dates.periodStart,
        periodEnd: periodPreset === "custom" ? period.periodEnd : dates.periodEnd };
    }));
  };
  const changeYear = (id) => (event) => {
    const baseYear = Number(event.target.value);
    updatePeriods((periods) => periods.map((period) => {
      if (period.id !== id) return period;
      const dates = fiscalPeriodForYear(period.periodPreset, baseYear);
      return { ...period, baseYear,
        periodStart: dates.periodStart || period.periodStart, periodEnd: dates.periodEnd || period.periodEnd };
    }));
  };
  const changeDate = (id, field) => (event) => updatePeriods((periods) => periods.map((period) => {
    if (period.id !== id) return period;
    return { ...period, [field]: event.target.value,
      periodPreset: period.periodPreset === "doi_year_end" && field === "periodEnd"
        && period.periodStart === entity.incorporationDate ? "doi_year_end"
        : event.target.value === period[field] ? period.periodPreset : "custom" };
  }));
  const addReportingPeriod = () => {
    const nextPreset = entity.fiscalYearPreset || "calendar";
    const nextYear = suggestNextFiscalYear(entity, [
      ...store.engagements.filter((engagement) => engagement.id !== initial?.id),
      { entityId: entity.id, reportingPeriods: values.reportingPeriods },
    ]) || new Date().getFullYear();
    const dates = fiscalPeriodForYear(nextPreset, nextYear);
    updatePeriods((periods) => [...periods, {
      id: uid("reporting-period"), periodPreset: nextPreset, baseYear: nextYear,
      periodStart: dates.periodStart || "", periodEnd: dates.periodEnd || "",
    }]);
  };
  const removeReportingPeriod = (id) => updatePeriods((periods) => periods.length === 1
    ? periods : periods.filter((period) => period.id !== id));
  const toggleCategory = (category) => setSelections((current) => current.some((selection) => selection.categoryId === category.id)
    ? current.filter((selection) => selection.categoryId !== category.id)
    : [...current, { categoryId: category.id, type: category.builtinType || "custom", customName: category.name || "",
      sampleId: store.selectedSampleIdsByCategory[category.id] || "" }]);
  const engagementTypeKey = (value) => engagementTypeLabel(value, "en").trim().toLocaleLowerCase();
  const engagementTypeSelected = (type) => values.engagementTypes.some((value) =>
    engagementTypeKey(value) === engagementTypeKey(type));
  const toggleEngagementType = (type) => setValues((current) => {
    const selected = current.engagementTypes.some((value) => engagementTypeKey(value) === engagementTypeKey(type));
    const engagementTypes = selected ? current.engagementTypes.filter((value) => engagementTypeKey(value) !== engagementTypeKey(type))
      : [...current.engagementTypes, type];
    return { ...current, engagementTypes, engagementType: engagementTypes[0] || "" };
  });
  const customTypeExists = engagementTypeSelected(customEngagementType);
  const addCustomEngagementType = () => {
    const type = customEngagementType.trim();
    if (!type || customTypeExists) return;
    setValues((current) => {
      const engagementTypes = [...current.engagementTypes, type];
      return { ...current, engagementTypes, engagementType: engagementTypes[0] || "" };
    });
    setCustomEngagementType("");
  };
  const availableEngagementTypes = ENGAGEMENT_TYPES.filter((type) => entity.kind === "holding_company"
    || type !== "Group consolidation");
  const customSelectedTypes = values.engagementTypes.filter((type) => !availableEngagementTypes.some((preset) =>
    engagementTypeKey(preset) === engagementTypeKey(type)));
  const source = existing.find((engagement) => engagement.id === sourceEngagementId) || null;
  const submit = (event) => {
    event.preventDefault(); setError("");
    if (!initial && !templateStarter) {
      try { resolveAnnualSource(store, entity.id, { sourceMode, sourceEngagementId }, selections); }
      catch {
        event.currentTarget.querySelector(".engagement-source")?.focus(); return; }
    }
    const reportingPeriods = values.reportingPeriods.map(({ baseYear, ...period }) => period);
    if (!quickField) {
      if (!values.engagementTypes.length) {
        setError(t("请至少选择一个项目类型。")); return;
      }
      if (reportingPeriods.some((period) => !period.periodStart || !period.periodEnd)) {
        setError(t("请填写每个报告期间的完整日期。")); return;
      }
      if (reportingPeriods.some((period) => period.periodEnd < period.periodStart)) {
        setError(t("报告结束日不得早于开始日。")); return;
      }
      if (reportingPeriods.some(period => !calendarDate(period.periodStart) || !calendarDate(period.periodEnd))) {
        setError(t("请填写有效日期。")); return;
      }
      const keys = reportingPeriods.map((period) => `${period.periodStart}|${period.periodEnd}`);
      if (new Set(keys).size !== keys.length) {
        setError(t("同一项目不能重复添加相同报告期间。")); return;
      }
      if (reportingPeriods.some((period) => engagementPeriodExists(store, entity.id,
        period.periodStart, period.periodEnd, initial?.id || ""))) {
        setError(t("这家公司已经有相同报告期间的项目，包括归档项目。")); return;
      }
    }
    if ((!quickField || quickField === "schedule") && [values.startDate, values.dueDate].some(date => date && !calendarDate(date))) {
      setError(t("请填写有效日期。")); return;
    }
    if (values.startDate && values.dueDate && values.dueDate < values.startDate) {
      setError(t("项目截止日不得早于开始日。")); return;
    }
    const sortedPeriods = engagementReportingPeriods({ reportingPeriods });
    const result = onSubmit({ ...values, engagementType: values.engagementTypes[0] || "", entityId: entity.id, reportingPeriods: sortedPeriods,
      periodStart: sortedPeriods[0]?.periodStart || initial?.periodStart || "",
      periodEnd: sortedPeriods.at(-1)?.periodEnd || initial?.periodEnd || "",
      periodPreset: sortedPeriods.length === 1 ? sortedPeriods[0].periodPreset : "custom",
      workstreamSelections: selections },
    { sourceMode, sourceEngagementId, sourceEngagement: sourceMode === "previous" ? source : null });
    if (result?.error) setError(result.error);
  };
  if (quickField === "schedule") return <form data-editor-guard className="workbench-form" data-quick-field="schedule" onSubmit={submit}>
    <div className="engagement-company-lock"><i>{entity.kind === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
      <span><small>{t("年度项目")}</small><strong>{entity.legalName} · {yearEndOrPeriodLabel(initial, language)}</strong></span></div>
    <div className="project-date-groups" data-single="true"><fieldset><legend>{t("项目排期")}</legend>
      <DateRangePicker autoFocus startDate={values.startDate} dueDate={values.dueDate}
        onChange={(startDate, dueDate) => setValues((current) => ({ ...current, startDate, dueDate }))} />
    </fieldset></div>
    {error && <div className="form-error" role="alert"><CircleAlert aria-hidden="true" />{error}</div>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={closeEditor}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存项目排期")}</button></footer>
  </form>;
  if (["owner", "framework"].includes(quickField)) {
    const field = quickField === "owner" ? "owner" : "reportingFramework";
    const label = quickField === "owner" ? "负责人" : "财务报告准则／框架";
    return <form data-editor-guard className="workbench-form engagement-quick-form" data-quick-field={quickField} onSubmit={submit}>
      <div className="engagement-company-lock"><i>{entity.kind === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
        <span><small>{t("年度项目")}</small><strong>{entity.legalName} · {yearEndOrPeriodLabel(initial, language)}</strong></span></div>
      <label><span>{t(label)}</span>{quickField === "framework" ? <><input autoFocus list="v11-quick-framework-options"
        value={values[field]} onChange={update(field)} placeholder={t("选择常用框架或直接输入")} />
        <datalist id="v11-quick-framework-options">{FRAMEWORKS.map((framework) => <option key={framework} value={framework} />)}</datalist></>
        : <input autoFocus value={values[field]} onChange={update(field)} placeholder={t("例如：项目经理或主审")} />}</label>
      {error && <div className="form-error" role="alert"><CircleAlert aria-hidden="true" />{error}</div>}
      <footer className="modal-actions"><button type="button" className="button secondary" onClick={closeEditor}>{t("取消")}</button>
        <button type="submit" className="button primary">{t("保存")}</button></footer>
    </form>;
  }
  return <form data-editor-guard className="workbench-form annual-engagement-form" onSubmit={submit}>
    <div className="engagement-company-lock"><i>{entity.kind === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
      <span><small>{t("法律实体")}</small><strong>{entity.legalName}</strong></span></div>
    <section className="period-builder"><header><div><strong>{t("报告期间")} · {values.reportingPeriods.length}</strong>
      <span>{t("一个项目可包含多个报告年度，共用负责人、排期、模块和进度。")}</span></div>
      <div className="period-builder-actions"><button type="button" className="period-create-another" onClick={addReportingPeriod}>
        <Plus aria-hidden="true" />{t("添加报告年度")}</button>
        {initial && onCreateAnotherYear && <button type="button" className="period-create-another" onClick={() => confirmTransition(onCreateAnotherYear)}>
          <CalendarPlus aria-hidden="true" />{t("另建独立项目")}</button>}</div></header>
      <div className="reporting-period-list">{values.reportingPeriods.map((period, index) => <article key={period.id}>
        <div className="reporting-period-heading"><span>{t("报告期间 {number}", { number: index + 1 })}</span>
          <button type="button" className="icon-button danger" disabled={values.reportingPeriods.length === 1}
            aria-label={t("移除报告期间 {number}", { number: index + 1 })}
            onClick={() => removeReportingPeriod(period.id)}><Trash2 aria-hidden="true" /></button></div>
        <div className="period-builder-controls"><label><span>{t("期间方式")}</span>
          <select value={period.periodPreset} onChange={changePreset(period.id)}>
            {["calendar", "apr_mar", ...(entity.incorporationDate || period.periodPreset === "doi_year_end" ? ["doi_year_end"] : []), "custom"]
              .map((preset) => <option value={preset} key={preset}>{presetLabel(preset, t)}</option>)}</select></label>
          {!["custom", "doi_year_end"].includes(period.periodPreset) && <label><span>{t(period.periodPreset === "apr_mar" ? "起始年度" : "年度")}</span>
            <input type="number" min="1900" max="2200" value={period.baseYear} onChange={changeYear(period.id)} /></label>}
          <label><span>{t("报告开始日 *")}</span><input type="date" required value={period.periodStart}
            max={period.periodEnd || undefined} onChange={changeDate(period.id, "periodStart")} /></label>
          <label><span>{t("报告结束日 *")}</span><input type="date" required value={period.periodEnd}
            min={period.periodStart || undefined} onChange={changeDate(period.id, "periodEnd")} /></label></div>
        {period.periodStart && period.periodEnd && <div className="period-preview"><CalendarPlus aria-hidden="true" />
          <strong>{yearEndOrPeriodLabel(period, language)}</strong>
          <span>{formatDate(period.periodStart, language)} → {formatDate(period.periodEnd, language)}</span></div>}
      </article>)}</div>
      {!initial && <em>{t("公司默认：{preset}", { preset: presetLabel(entity.fiscalYearPreset, t) })}</em>}
    </section>
    {!initial && !templateStarter && <section className="engagement-source" tabIndex="-1" aria-label={t("起始方式")}><header><strong>{t("起始方式")}</strong>
      <span>{t("选择本次项目的起始方式，以下摘要会随选择更新。")}</span></header>
      <div className="choice-tabs" role="group" aria-label={t("起始方式")}>{previousDefault && <button type="button" aria-pressed={sourceMode === "previous"} data-active={sourceMode === "previous" || undefined}
        onClick={() => { setSourceMode("previous"); setError(""); }}>{t("复制上一年度")}</button>}
        <button type="button" aria-pressed={sourceMode === "template"} data-active={sourceMode === "template" || undefined} onClick={() => { setSourceMode("template"); setError(""); }}>{t("从范本建立")}</button>
        <button type="button" aria-pressed={sourceMode === "blank"} data-active={sourceMode === "blank" || undefined} onClick={() => { setSourceMode("blank"); setError(""); }}>{t("空白项目")}</button></div>
      {sourceMode === "previous" && <label><span>{t("来源年度")}</span><select aria-label={t("来源年度")} value={sourceEngagementId}
        onChange={(event) => { setSourceEngagementId(event.target.value); setError(""); }}>{existing.map((engagement) => <option key={engagement.id} value={engagement.id}>
          {yearEndOrPeriodLabel(engagement, language)}{engagement.archived ? ` · ${t("已归档")}` : ""}</option>)}</select></label>}
      {sourceMode === "template" && entity.kind === "company" && <AdvancedSection title={t("业务模块与范本")}
        hint={t("已选择 {count} 个", { count: selections.length })}><div className="annual-template-picker">
        {store.workstreamCategories.filter((category) => category.id !== "custom").map((category) => {
          const selected = selections.find((selection) => selection.categoryId === category.id);
          const templates = store.samples.filter((sample) => sample.categoryId === category.id);
          return <div key={category.id} data-selected={Boolean(selected) || undefined}><label><input type="checkbox" checked={Boolean(selected)}
            onChange={() => toggleCategory(category)} /><span>{workstreamCategoryLabel(category, language)}</span></label>
            {selected && <select aria-label={`${workstreamCategoryLabel(category, language)} · ${t("起始范本")}`}
              value={selected.sampleId} onChange={(event) => setSelections((current) => current.map((item) => item.categoryId === category.id
                ? { ...item, sampleId: event.target.value } : item))}><option value="">{t("空白流程")}</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>}</div>;
        })}</div></AdvancedSection>}
      <AnnualSourceSummary store={store} entityId={entity.id} options={{ sourceMode, sourceEngagementId }} selections={selections} />
    </section>}
    <fieldset className="engagement-type-selector"><legend>{t("项目类型")} <span>{t("可多选")}</span></legend>
      <div className="engagement-type-options">{availableEngagementTypes.map((type) => <label key={type}
        data-selected={engagementTypeSelected(type) || undefined}><input type="checkbox" checked={engagementTypeSelected(type)}
          onChange={() => toggleEngagementType(type)} /><span>{engagementTypeLabel(type, language)}</span></label>)}</div>
      <div className="engagement-custom-type"><label htmlFor="v11-custom-engagement-type">{t("自定义项目类型")}</label>
        <div><input id="v11-custom-engagement-type" value={customEngagementType}
          onChange={(event) => setCustomEngagementType(event.target.value)} placeholder={t("输入自定义类型")}
          onKeyDown={(event) => { if (event.key === "Enter" && !isComposingKey(event)) { event.preventDefault(); addCustomEngagementType(); } }} />
          <button type="button" className="button secondary" disabled={!customEngagementType.trim() || customTypeExists}
            onClick={addCustomEngagementType}><Plus aria-hidden="true" />{t("添加类型")}</button></div></div>
      {customSelectedTypes.length > 0 && <div className="engagement-custom-type-tags">{customSelectedTypes.map((type) => <span key={type}>
        <strong>{type}</strong><button type="button" aria-label={t("移除项目类型“{name}”", { name: type })}
          onClick={() => toggleEngagementType(type)}><X aria-hidden="true" /></button></span>)}</div>}
      <small className="form-help">{t("可同时选择多个预设类型，也可以添加自定义类型。")}</small>
    </fieldset>
    <div className="form-grid" data-columns="1"><label><span>{t("负责人")}</span>
      <input value={values.owner} onChange={update("owner")} placeholder={t("例如：项目经理或主审")} /></label></div>
    <div className="project-date-groups" data-single="true"><fieldset><legend>{t("项目排期")}</legend>
      <DateRangePicker startDate={values.startDate} dueDate={values.dueDate}
        onChange={(startDate, dueDate) => setValues((current) => ({ ...current, startDate, dueDate }))} />
    </fieldset></div>
    <AdvancedSection title={t("框架与高级设置")} hint={t("已有配置会保留；展开后可修改。")}
      defaultOpen={Boolean(initial?.reportingFramework) || entity.kind === "holding_company"}>
      <label><span>{t("财务报告准则／框架")}</span><input list="v11-framework-options" value={values.reportingFramework}
        onChange={update("reportingFramework")} placeholder={t("选择常用框架或直接输入")} />
        <datalist id="v11-framework-options">{FRAMEWORKS.map((framework) => <option key={framework} value={framework} />)}</datalist></label>
    {entity.kind === "holding_company" && <label className="check-option"><input type="checkbox" checked={values.consolidationEnabled}
      onChange={(event) => setValues((current) => ({ ...current, consolidationEnabled: event.target.checked }))} />
      <span><strong>{t("本级需要独立合并流程")}</strong><small>{t("关闭后，本级只汇总组成部分。")}</small></span></label>}
    </AdvancedSection>
    {error && <div className="form-error" role="alert"><CircleAlert aria-hidden="true" />{error}</div>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={closeEditor}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(initial ? "保存项目" : "建立年度项目")}</button></footer>
  </form>;
}

export function EntityOverview({ store, entity, onEdit, onNewEngagement, onOpenEngagement, onEditEngagement,
  onTax, onArchive, onRestore, onDelete, onMerge, onOpenOutstanding }) {
  const { language, t } = useUiLanguage();
  const engagements = engagementsForEntity(store, entity.id);
  const [annualQuery, setAnnualQuery] = React.useState("");
  const [annualScope, setAnnualScope] = React.useState("all");
  const annualSearchRef = React.useRef(null);
  const annualRows = React.useMemo(() => companyAnnualRows(store, entity, language), [store, entity, language]);
  const visibleAnnual = filterAnnualProjects(annualRows, annualQuery, annualScope);
  const clearAnnualFilters = () => { setAnnualQuery(""); setAnnualScope("all"); annualSearchRef.current?.focus(); };
  const active = engagements.filter((engagement) => !engagement.archived);
  const latestEngagement = active[0] || engagements[0] || null;
  const latestPeriodLabel = formalReportingPeriodLabel(latestEngagement, language);
  const parent = store.entities.find((item) => item.id === entity.parentEntityId);
  const children = store.entities.filter((item) => item.parentEntityId === entity.id);
  const taxSummary = taxDeadlineSummary(entity.taxDeadlines || []);
  const openOutstanding = engagements.flatMap((engagement) => (engagement.outstandingItems || [])
    .filter((item) => outstandingIsOpen(item, store.outstandingStatuses))
    .map((item) => ({ engagement, item }))).sort((left, right) =>
    (right.item.createdAt || "").localeCompare(left.item.createdAt || ""));
  return <section className="entity-overview">
    {entity.archived && <div className="archive-banner"><strong>{t("已归档，只读")}</strong><span>{t("归档记录不能编辑；恢复后才可继续更新。")}</span></div>}
    <header className="entity-overview-header"><div className="entity-overview-title"><i>{entity.kind === "holding_company"
      ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i><div><span>{t("公司主档")}</span>
      <h2>{entity.legalName}</h2><p>{entity.entityType || t("主体类型未设置")}{entity.kind === "holding_company"
        ? ` · ${t("控股公司架构")}` : ""}</p></div></div>
      <div className="entity-overview-actions">{!entity.archived && <button type="button" className="button primary" onClick={onNewEngagement}>
        <Plus aria-hidden="true" />{t("新建项目")}</button>}{!entity.archived && <button type="button" className="icon-only" onClick={onEdit}
          aria-label={t("编辑公司主档")} data-tooltip={t("编辑公司主档")}><Edit3 aria-hidden="true" /></button>}
        {entity.archived ? <><button type="button" className="icon-only" onClick={onRestore} aria-label={t("恢复公司")}
          data-tooltip={t("恢复公司")}><ArchiveRestore aria-hidden="true" /></button>
          <button type="button" className="icon-only danger-quiet" onClick={onDelete} aria-label={t("永久删除公司")}
            data-tooltip={t("永久删除公司")}><Trash2 aria-hidden="true" /></button></>
          : <button type="button" className="icon-only" onClick={onArchive} aria-label={t("归档公司")}
            data-tooltip={t("归档公司")}><Archive aria-hidden="true" /></button>}</div></header>
    <div className="entity-facts"><button type="button" disabled={entity.archived && !latestEngagement}
      onClick={() => latestEngagement ? (entity.archived || latestEngagement.archived ? onOpenEngagement(latestEngagement) : onEditEngagement(latestEngagement)) : onNewEngagement()}
      aria-label={`${t("最新年结／报告期间")}：${latestPeriodLabel}`} title={latestPeriodLabel}>
      <span>{t("最新年结／报告期间")}</span><strong>{latestPeriodLabel}</strong><CalendarDays aria-hidden="true" /></button>
      <button type="button" disabled={entity.archived} onClick={onEdit}><span>{t("所属控股公司")}</span>
        <strong>{parent?.legalName || t("独立公司")}</strong><Settings2 aria-hidden="true" /></button>
      <button type="button" onClick={onTax} data-urgency={taxSummary.urgency}><span>{t("税务期限")}</span>
        <strong>{taxSummary.next ? `${formatDate(taxSummary.next.dueDate, language)} · ${taxSummary.openCount}` : t("没有未完成期限")}</strong>
        <ReceiptText aria-hidden="true" /></button><div><span>{t("年度项目")}</span><strong>{engagements.length}</strong></div></div>
    <section className="annual-project-list"><header><div><h3>{t("历年项目")}</h3>
      <p>{t("一个项目可包含多个报告年度，并共用模块、负责人、排期、待清事项和进度。")}</p></div>
      {!entity.archived && <button type="button" className="button secondary" onClick={onNewEngagement}><CalendarPlus aria-hidden="true" />{t("新建年度项目")}</button>}</header>
      {engagements.length > 0 && <div className="annual-filters">
        <label><span>{t("查找历年项目")}</span><span className="annual-search-control"><Search aria-hidden="true" />
          <input ref={annualSearchRef} type="search" value={annualQuery} onChange={(event) => setAnnualQuery(event.target.value)}
            aria-label={t("查找历年项目")} placeholder={t("报告年度、项目类型或负责人")} /></span></label>
        <span className="annual-result-count" role="status">{t("显示 {visible} / {total} 个项目", { visible: visibleAnnual.length, total: annualRows.length })}</span>
        <div className="annual-filter-options" role="group" aria-label={t("历年项目筛选")}>
          {[["all", "全部项目"], ["unarchived", "未归档"], ["archived", "已归档"]].map(([value, label]) =>
            <button type="button" key={value} aria-pressed={annualScope === value} onClick={() => setAnnualScope(value)}>
              <span>{t(label)}</span><strong>{filterAnnualProjects(annualRows, annualQuery, value).length}</strong></button>)}
          {(annualQuery || annualScope !== "all") && <button type="button" onClick={clearAnnualFilters}>{t("清除筛选")}</button>}
        </div>
      </div>}
      {engagements.length ? visibleAnnual.length ? <div className="annual-project-rows">{visibleAnnual.map(({ engagement, percentage, archived }) =>
        <article key={engagement.id} data-engagement-id={engagement.id} data-archived={archived || undefined}>
          <button type="button" className="annual-project-open" onClick={() => onOpenEngagement(engagement)}>
            <span className="annual-period"><strong>{yearEndOrPeriodLabel(engagement, language)}</strong>
              <small>{engagementTypesLabel(engagement, language) || t("项目类型未设置")}</small>
              <small>{engagementReportingPeriods(engagement).map((period) =>
                `${formatDate(period.periodStart, language)} → ${formatDate(period.periodEnd, language)}`).join(" · ")}</small>
              {archived && <small className="annual-archive-label">{t("已归档，只读")}</small>}</span>
            <span className="annual-owner"><small>{t("负责人")}</small><strong>{engagement.owner || t("未设置")}</strong></span>
            <span className="annual-schedule"><small>{t("项目排期")}</small><strong>
              <span>{engagement.startDate ? formatDate(engagement.startDate, language) : t("未设置开始日")}</span>
              <span aria-hidden="true"> → </span><span>{engagement.dueDate ? formatDate(engagement.dueDate, language) : t("未设置截止日")}</span>
            </strong></span>
            <span className="annual-progress"><ProgressBar value={percentage} compact /></span>
            <ChevronRight aria-hidden="true" /></button>
          {!archived && <button type="button" className="icon-only" onClick={() => onEditEngagement(engagement)}
            aria-label={t("编辑年度项目")} data-tooltip={t("编辑年度项目")} data-tooltip-side="left"><Settings2 aria-hidden="true" /></button>}
        </article>)}</div> : <div className="annual-filter-empty"><strong>{t("没有符合筛选的历年项目")}</strong>
          <span>{t("清除筛选查看其他年度；搜索不会改变项目资料。")}</span>
          <button type="button" className="button secondary" onClick={clearAnnualFilters}>{t("清除筛选")}</button></div>
        : <div className="entity-empty-projects"><CalendarPlus aria-hidden="true" /><strong>{t("这家公司还没有年度项目")}</strong>
          <span>{t("先建立公司主档，再按需要加入 FY2023、FY2024、FY2025 等项目。")}</span>
          {!entity.archived && <button type="button" className="button primary" onClick={onNewEngagement}>{t("建立第一个项目")}</button>}</div>}
    </section>
    <section className="entity-outstanding-summary"><header><div><h3>{t("历年待清事项")}</h3>
      <p>{t("每项均标注来源年度；进入对应项目后处理。")}</p></div><strong>{openOutstanding.length}</strong></header>
      {openOutstanding.length ? <div>{openOutstanding.map(({ engagement, item }) => <button type="button" key={`${engagement.id}:${item.id}`}
        onClick={() => onOpenOutstanding ? onOpenOutstanding(engagement, item) : onOpenEngagement(engagement)}><span><strong>{item.title}</strong><small>{yearEndOrPeriodLabel(engagement, language)}
          </small>{(entity.archived || engagement.archived) && <small>{t("已归档，只读")}</small>}</span>
        <em>{outstandingStatusLabel(item.status, store.outstandingStatuses, language)}</em><ChevronRight aria-hidden="true" /></button>)}</div>
        : <p className="entity-children-empty">{t("所有年度项目目前都没有未清事项。")}</p>}
    </section>
    {entity.kind === "holding_company" && <section className="entity-children"><header><div><h3>{t("当前控股架构")}</h3>
      <p>{t("架构变化只影响以后建立的项目；历史年度范围保持冻结。")}</p></div></header>
      {children.length ? <div>{children.map((child) => <button type="button" key={child.id} onClick={() => onOpenEngagement(null, child)}>
        <i>{child.kind === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
        <span><strong>{child.legalName}</strong><small>{child.relationshipRole || t("未设置集团角色")}</small></span><ChevronRight aria-hidden="true" /></button>)}</div>
        : <p className="entity-children-empty">{t("目前没有直属成员；可编辑公司主档或在导航中拖动公司来调整层级。")}</p>}
    </section>}
    {!entity.archived && <footer className="entity-overview-footer"><button type="button" className="button secondary" onClick={onMerge}><GitMerge aria-hidden="true" />
      {t("合并重复公司")}</button><span>{t("合并前会预览项目、税务期限和期间冲突，不会按名称自动处理。")}</span></footer>}
  </section>;
}

export const ENTITY_MERGE_ERRORS = {
  selection: "请选择两个不同的公司主档。", missing: "公司主档已不存在，请重新选择。",
  archived: "归档公司不能参与合并；请先核对并恢复公司主档。",
  kind: "普通公司和控股公司不能直接合并；请先核对主体种类。",
  relationship: "这两家公司存在当前或历史控股关系，不能合并为同一主体。",
  metadata: "长期资料存在冲突，请先核对主体类型、成立日期、会计年度、备注及控股归属；合并尚未执行。",
  periods: "两家公司有相同报告期间。请先修改或归档并删除重复项目后再合并。",
};

export function MergeEntitiesForm({ store, initialEntityId, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const normalizedName = (name) => String(name || "").trim().toLocaleLowerCase();
  const duplicateSets = [...new Map(store.entities.map((entity) => [normalizedName(entity.legalName),
    store.entities.filter((candidate) => normalizedName(candidate.legalName) === normalizedName(entity.legalName))])).values()]
    .filter((entities) => entities.length > 1);
  const defaultSet = duplicateSets.find((entities) => entities.some((entity) => entity.id === initialEntityId)) || duplicateSets[0] || [];
  const [sourceId, setSourceId] = React.useState(defaultSet.find((entity) => entity.id !== initialEntityId)?.id || defaultSet[1]?.id || "");
  const [targetId, setTargetId] = React.useState(defaultSet.find((entity) => entity.id === initialEntityId)?.id || defaultSet[0]?.id || "");
  const [saveError, setSaveError] = React.useState("");
  const problem = entityMergeProblem(store, sourceId, targetId);
  const source = store.entities.find((entity) => entity.id === sourceId);
  const target = store.entities.find((entity) => entity.id === targetId);
  const sourceProjects = source ? engagementsForEntity(store, source.id) : [];
  const targetProjects = target ? engagementsForEntity(store, target.id) : [];
  const conflicts = sourceProjects.filter((project) => targetProjects.some((candidate) =>
    engagementReportingPeriods(project).some((period) => engagementReportingPeriods(candidate).some((candidatePeriod) =>
      candidatePeriod.periodStart === period.periodStart && candidatePeriod.periodEnd === period.periodEnd))));
  return <form className="workbench-form merge-entities-form" onSubmit={(event) => { event.preventDefault();
    if (!problem) { const result = onSubmit(source.id, target.id); if (result?.error) setSaveError(result.error); } }}>
    <div className="company-master-lead"><GitMerge aria-hidden="true" /><div><strong>{t("合并重复公司")}</strong>
      <span>{t("选择要并入的公司和保留的公司；系统不会自动按名称合并。")}</span></div></div>
    {!duplicateSets.length ? <div className="inline-warning"><CircleAlert aria-hidden="true" />{t("没有找到同名的重复公司。")}</div>
      : <><div className="form-grid" data-columns="2"><label><span>{t("并入这家公司")}</span><select value={sourceId} onChange={(event) => { setSourceId(event.target.value); setSaveError(""); }}>
        {store.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.legalName} · {engagementsForEntity(store, entity.id).length}</option>)}</select></label>
        <label><span>{t("保留这家公司")}</span><select value={targetId} onChange={(event) => { setTargetId(event.target.value); setSaveError(""); }}>
          {store.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.legalName} · {engagementsForEntity(store, entity.id).length}</option>)}</select></label></div>
        <div className="merge-preview"><div><span>{t("将移动的年度项目")}</span><strong>{sourceProjects.length}</strong></div>
          <div><span>{t("将合并的税务期限")}</span><strong>{source?.taxDeadlines.length || 0}</strong></div>
          <div data-danger={conflicts.length > 0 || undefined}><span>{t("相同期间冲突")}</span><strong>{conflicts.length}</strong></div></div>
        {problem && <div className="form-error" role="alert"><CircleAlert aria-hidden="true" />
          {t(ENTITY_MERGE_ERRORS[problem])}</div>}
        <p className="form-help">{t("来源独有的主档资料会保留；有冲突时不会删除来源公司。")}</p></>}
    {saveError && <p className="form-error" role="alert">{saveError}</p>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={Boolean(problem)}>{t("确认合并")}</button></footer>
  </form>;
}

export function HoldingComponentsPanel({ store, engagement, readOnly = false, onOpen, onUpdate, onSync }) {
  const { language, t } = useUiLanguage();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const queryRef = React.useRef(null);
  const rows = React.useMemo(() => holdingComponentRows(store, engagement), [store, engagement]);
  const searched = filterHoldingComponents(rows, query);
  const visible = filterHoldingComponents(searched, "", status);
  const currentChildren = store.entities.filter((item) => item.parentEntityId === engagement.entityId);
  const snapshotIds = new Set(rows.map((row) => row.component.entityId));
  const currentIds = new Set(currentChildren.map((child) => child.id));
  const added = currentChildren.filter((child) => !snapshotIds.has(child.id));
  const removed = rows.filter((row) => !currentIds.has(row.component.entityId));
  const labels = { all: "全部组成部分", unassigned: "待指定项目", mismatch: "期间不匹配" };
  const clear = () => { setQuery(""); setStatus("all"); queryRef.current?.focus(); };
  const assign = (id, patch) => {
    // A newly assigned owner/period must not make the edited row vanish under old filters.
    setQuery(""); setStatus("all"); onUpdate(id, patch);
  };
  return <section className="holding-components-panel" aria-label={t("本年度组成部分")}>
    <header><div><h3>{t("本年度组成部分")}</h3><p>{t("范围按建立项目时的架构保存；每家公司必须指定同一报告期间的年度项目。")}</p>
      <p>{t("本年度要求：{period}", { period: yearEndOrPeriodLabel(engagement, language) })}</p></div>
      {!readOnly && <button type="button" className="button secondary" onClick={onSync}><FolderTree aria-hidden="true" />
        {added.length || removed.length ? t("同步当前架构 · +{added}/−{removed}", { added: added.length, removed: removed.length }) : t("检查当前架构")}</button>}</header>
    {(added.length > 0 || removed.length > 0) && <div className="structure-difference"><CircleAlert aria-hidden="true" />
      <span>{t("当前架构与本年度范围不同：新增 {added} 家，移出 {removed} 家。历史范围不会自动改变。", {
        added: added.length, removed: removed.length })}</span></div>}
    {rows.length > 0 && <div className="component-filters">
      <label className="component-search"><span>{t("查找组成部分")}</span><span><Search aria-hidden="true" />
        <input ref={queryRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          aria-label={t("查找组成部分")} placeholder={t("公司名称、角色或负责人")} /></span></label>
      <div className="component-filter-options" role="group" aria-label={t("按项目匹配情况筛选")}>{Object.entries(labels).map(([value, label]) =>
        <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>
          {t(label)}<strong>{filterHoldingComponents(searched, "", value).length}</strong></button>)}</div>
      <span className="component-result-count" role="status">{t("显示 {shown} / {total} 家", { shown: visible.length, total: rows.length })}</span>
      {(query || status !== "all") && <button type="button" className="button secondary" onClick={clear}>{t("清除筛选")}</button>}
      <small>{t(readOnly ? "归档记录仅供查看。" : "指定项目或勾选条件会立即应用；搜索和筛选不会改变年度范围。")}</small>
    </div>}
    {visible.length > 0 ? <div className="holding-component-rows">{visible.map((row) => <HoldingComponentRow key={row.component.id}
      row={row} store={store} readOnly={readOnly} onOpen={onOpen} onAssign={assign} onUpdate={onUpdate} />)}</div>
      : rows.length ? <div className="component-filter-empty"><strong>{t("没有符合筛选的组成部分")}</strong>
        <span>{t("清除筛选即可查看本年度完整范围。")}</span><button type="button" className="button secondary" onClick={clear}>{t("清除筛选")}</button></div>
        : <div className="entity-empty-projects"><FolderTree aria-hidden="true" /><strong>{t("本年度尚未保存组成部分")}</strong>
          <span>{t("同步当前架构后，系统会按完整报告期间尝试匹配下属公司的项目。")}</span></div>}
  </section>;
}

function HoldingComponentRow({ row, store, readOnly, onOpen, onAssign, onUpdate }) {
  const { language, t } = useUiLanguage(); const hintId = React.useId();
  const { component, entity, target, candidates, matches, status, done, total } = row;
  const name = row.name || t("已删除的公司");
  const percentage = !target ? 0 : entity.kind === "holding_company" ? groupProgress(store, target.id).percentage
    : projectStats(store.projects.find((item) => item.id === target.id) || { workstreams: [] }).percentage;
  return <article data-component-id={component.id} data-match={status} data-unresolved={status === "unassigned" || undefined} aria-label={name}>
    <div className="component-identity"><i>{(entity?.kind || component.entitySnapshot?.kind) === "holding_company"
      ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
      <span><strong>{name}</strong><small>{component.role || t("未设置集团角色")}
        {!entity ? ` · ${t("历史快照")}` : row.archived ? ` · ${t("关联来源已归档")}` : ""}</small>
        {target?.owner && <small>{t("负责人")}：{target.owner}</small>}</span></div>
    <label className="component-assignment"><span>{t("对应年度项目")}</span>
      <select disabled={readOnly || !entity} value={target?.id || ""} aria-label={t("{name}的对应年度项目", { name })}
        aria-describedby={hintId} onChange={(event) => {
          const selected = candidates.find((candidate) => candidate.id === event.target.value);
          onAssign(component.id, { engagementId: selected?.id || null,
            periodSnapshot: selected ? { engagementId: selected.id, periodStart: selected.periodStart, periodEnd: selected.periodEnd,
              reportingPeriods: engagementReportingPeriods(selected), label: fiscalPeriodShortLabel(selected, "en") }
              : { engagementId: "", periodStart: "", periodEnd: "", label: "" } });
        }}>
        <option value="">{matches.length > 1 ? t("多项匹配，待指定") : t("待指定")}</option>
        {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>
          {yearEndOrPeriodLabel(candidate, language)}{matches.includes(candidate) ? ` · ${t("期间匹配")}` : ""}
          {candidate.archived || entity?.archived ? ` · ${t("已归档，只读")}` : ""}</option>)}
      </select></label>
    <div className="component-progress"><span>{t("审计进度")}</span><ProgressBar value={percentage} compact /></div>
    <div className="component-readiness"><span>{t("合并就绪")}</span><strong>{done}/{total}</strong>
      {!total && <small>{t("未设置条件")}</small>}</div>
    {target && <button type="button" className="icon-only component-open" onClick={() => onOpen(entity.kind === "holding_company" ? "group" : "project", target.id)}
      aria-label={t("打开 {name} 的年度项目", { name })} data-tooltip={t("打开年度项目")} data-tooltip-side="left"><ChevronRight aria-hidden="true" /></button>}
    <div className="component-period-message" id={hintId}>
      {status !== "matched" && <CircleAlert aria-hidden="true" />}
      <span>{t(!entity ? "公司已不存在；保留历史范围，不自动重新指定。" : status === "unassigned"
        ? "尚未指定年度项目。" : status === "mismatch" ? "所选报告期间与本年度完整范围不一致。" : "报告期间匹配；就绪条件仍需单独确认。")}
        {target && <small>{t("已选期间：{period}", { period: yearEndOrPeriodLabel(target, language) })}</small>}</span>
    </div>
    {total > 0 && <div className="component-readiness-checks" role="group" aria-label={t("{name}的就绪条件", { name })}>
      {component.readinessConditions.map((condition) => <label key={condition.id}>
        <input type="checkbox" disabled={readOnly} checked={condition.done} onChange={(event) => onUpdate(component.id, {
          readinessConditions: component.readinessConditions.map((item) => item.id === condition.id ? { ...item, done: event.target.checked } : item),
        })} /><span>{condition.label}</span></label>)}
    </div>}
  </article>;
}
