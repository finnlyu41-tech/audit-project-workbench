import React from "react";
import { Archive, ArchiveRestore, Building, Building2, CalendarDays, CalendarPlus, ChevronRight, CircleAlert,
  Edit3, FolderTree, GitMerge, Plus, ReceiptText, Settings2, Trash2 } from "lucide-react";
import { ProgressBar } from "./components.jsx";
import { engagementPeriodExists, engagementsForEntity, fiscalPeriodForYear, fiscalPeriodShortLabel,
  fiscalPeriodFromIncorporation, formalReportingPeriodLabel, formatDate, groupProgress, inferPeriodPreset,
  outstandingIsOpen, outstandingStatusLabel, projectStats, suggestNextFiscalYear, taxDeadlineSummary,
  workstreamCategoryLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

const FRAMEWORKS = [
  "HKFRS Accounting Standards",
  "SME-FRF and SME-FRS",
  "IFRS Accounting Standards",
  "HKFRS for Private Entities",
];

function presetLabel(value, t) {
  return t({ calendar: "1 月 1 日 → 12 月 31 日", apr_mar: "4 月 1 日 → 次年 3 月 31 日",
    custom: "每个项目自定义日期", doi_year_end: "成立日（DOI）→ 年结日" }[value] || "每个项目自定义日期");
}

export function CompanyForm({ store, initial = null, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({
    legalName: initial?.legalName || "",
    entityType: initial?.entityType || "",
    incorporationDate: initial?.incorporationDate || "",
    kind: initial?.kind || "company",
    parentEntityId: initial?.parentEntityId || "",
    relationshipRole: initial?.relationshipRole || "",
    fiscalYearPreset: initial?.fiscalYearPreset || "calendar",
    notes: initial?.notes || "",
  }));
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const updateParent = (event) => setValues((current) => ({ ...current, parentEntityId: event.target.value,
    relationshipRole: event.target.value ? current.relationshipRole : "" }));
  const children = initial ? store.entities.filter((entity) => entity.parentEntityId === initial.id) : [];
  const parentOptions = store.entities.filter((entity) => entity.kind === "holding_company" && !entity.archived
    && entity.id !== initial?.id);
  return <form className="workbench-form company-master-form" onSubmit={(event) => {
    event.preventDefault();
    if (!values.legalName.trim()) return;
    onSubmit({ ...values, legalName: values.legalName.trim(), entityType: values.entityType.trim(),
      parentEntityId: values.parentEntityId || null,
      relationshipRole: values.parentEntityId ? values.relationshipRole.trim() : "", notes: values.notes.trim() });
  }}>
    <div className="company-master-lead"><FolderTree aria-hidden="true" /><div><strong>{t(initial ? "编辑公司主档" : "建立公司主档")}</strong>
      <span>{t("公司主档保存长期资料；报告期间、项目排期和业务模块在年度项目中设置。")}</span></div></div>
    <div className="form-grid" data-columns="2"><label><span>{t("法律实体 *")}</span>
      <input autoFocus required value={values.legalName} onChange={update("legalName")} placeholder={t("公司完整名称")} /></label>
      <label><span>{t("主体类型（可选）")}</span><input list="v11-entity-type-options" value={values.entityType}
        onChange={update("entityType")} placeholder={t("例如：有限公司、个人独资、合伙企业或直接输入")} />
        <datalist id="v11-entity-type-options">{["有限公司", "个人独资", "合伙企业", "个人"].map((type) =>
          <option key={type} value={t(type)} />)}</datalist></label>
      <label><span>{t("默认会计年度")}</span><select value={values.fiscalYearPreset} onChange={update("fiscalYearPreset")}>
        {["calendar", "apr_mar", "custom"].map((preset) => <option value={preset} key={preset}>{presetLabel(preset, t)}</option>)}</select></label>
      <label><span>{t("成立／开始日期（DOI，可选）")}</span><input type="date" value={values.incorporationDate}
        onChange={update("incorporationDate")} /><small className="form-help">{t("用于首个项目的 DOI → 年结日期间。")}</small></label>
      <label><span>{t("所属控股公司")}</span><select value={values.parentEntityId} onChange={updateParent}>
        <option value="">{t("独立主体（不属于控股公司）")}</option>
        {parentOptions.map((entity) => <option key={entity.id} value={entity.id}>{entity.legalName}</option>)}</select></label>
      {values.parentEntityId && <label className="span-two"><span>{t("控股公司归属角色")}</span>
        <input value={values.relationshipRole} onChange={update("relationshipRole")}
          placeholder={t("例如：子公司、联营公司或中间控股公司")} /></label>}</div>
    <label className="check-option company-holding-toggle"><input type="checkbox" role="switch"
      checked={values.kind === "holding_company"} onChange={(event) => setValues((current) => ({ ...current,
        kind: event.target.checked ? "holding_company" : "company" }))} />
      <span><strong>{t("启用控股公司架构")}</strong><small>{t("允许在此主体下建立公司层级和合并年度项目。")}</small></span></label>
    {values.kind === "company" && children.length > 0 && <div className="inline-warning"><CircleAlert aria-hidden="true" />
      <span>{t("这家控股公司仍有 {count} 家直属成员。转换为普通公司前请先移动这些成员。", { count: children.length })}</span></div>}
    <label><span>{t("公司备注")}</span><textarea rows="3" value={values.notes} onChange={update("notes")}
      placeholder={t("记录长期适用、不会随年度项目改变的公司资料")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={values.kind === "company" && children.length > 0}>{t(initial ? "保存公司主档" : "建立公司")}</button></footer>
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
  onCreateAnotherYear = null, onSubmit, onClose }) {
  const { language, t } = useUiLanguage();
  const existing = engagementsForEntity(store, entity.id);
  const suggestedYear = initial ? Number(initial.periodStart?.slice(0, 4)) || new Date().getFullYear()
    : suggestNextFiscalYear(entity, store.engagements) || new Date().getFullYear();
  const initialPreset = initial?.periodPreset || entity.fiscalYearPreset || "calendar";
  const generated = initial ? { periodStart: initial.periodStart, periodEnd: initial.periodEnd }
    : fiscalPeriodForYear(initialPreset, suggestedYear);
  const [values, setValues] = React.useState(() => ({
    internalName: initial?.internalName || "",
    periodPreset: initialPreset,
    baseYear: suggestedYear,
    periodStart: generated.periodStart || "",
    periodEnd: generated.periodEnd || "",
    reportingFramework: initial?.reportingFramework || existing[0]?.reportingFramework || "",
    owner: initial?.owner || "",
    startDate: initial?.startDate || "",
    dueDate: initial?.dueDate || "",
    notes: initial?.notes || "",
    consolidationEnabled: initial?.consolidation?.enabled !== false,
  }));
  const previousDefault = existing.find((engagement) => !initial || engagement.id !== initial.id) || null;
  const [sourceMode, setSourceMode] = React.useState(previousDefault ? "previous" : "template");
  const [sourceEngagementId, setSourceEngagementId] = React.useState(preferredSourceId || previousDefault?.id || "");
  const [selections, setSelections] = React.useState(() => initialSelections(store.workstreamCategories,
    store.selectedSampleIdsByCategory));
  const [error, setError] = React.useState("");
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const changePreset = (event) => {
    const periodPreset = event.target.value;
    if (periodPreset === "doi_year_end") {
      const dates = fiscalPeriodFromIncorporation(entity);
      setValues((current) => ({ ...current, periodPreset, periodStart: dates.periodStart, periodEnd: dates.periodEnd }));
      return;
    }
    const dates = fiscalPeriodForYear(periodPreset, values.baseYear);
    setValues((current) => ({ ...current, periodPreset,
      periodStart: periodPreset === "custom" ? current.periodStart : dates.periodStart,
      periodEnd: periodPreset === "custom" ? current.periodEnd : dates.periodEnd }));
  };
  const changeYear = (event) => {
    const baseYear = Number(event.target.value);
    const dates = fiscalPeriodForYear(values.periodPreset, baseYear);
    setValues((current) => ({ ...current, baseYear,
      periodStart: dates.periodStart || current.periodStart, periodEnd: dates.periodEnd || current.periodEnd }));
  };
  const changeDate = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value,
    periodPreset: current.periodPreset === "doi_year_end" && field === "periodEnd"
      && current.periodStart === entity.incorporationDate ? "doi_year_end"
      : event.target.value === current[field] ? current.periodPreset : "custom" }));
  const toggleCategory = (category) => setSelections((current) => current.some((selection) => selection.categoryId === category.id)
    ? current.filter((selection) => selection.categoryId !== category.id)
    : [...current, { categoryId: category.id, type: category.builtinType || "custom", customName: category.name || "",
      sampleId: store.selectedSampleIdsByCategory[category.id] || "" }]);
  const source = existing.find((engagement) => engagement.id === sourceEngagementId) || previousDefault;
  const submit = (event) => {
    event.preventDefault(); setError("");
    if (!quickField) {
      if (!values.periodStart || !values.periodEnd) { setError(t("请填写完整的报告期间。")); return; }
      if (values.periodEnd < values.periodStart) { setError(t("报告结束日不得早于开始日。")); return; }
      if (engagementPeriodExists(store, entity.id, values.periodStart, values.periodEnd, initial?.id || "")) {
        setError(t("这家公司已经有相同报告期间的项目，包括归档项目。")); return;
      }
    }
    onSubmit({ ...values, entityId: entity.id, baseYear: undefined,
      periodPreset: values.periodPreset === "custom" ? inferPeriodPreset(values.periodStart, values.periodEnd) === "custom"
        ? "custom" : values.periodPreset : values.periodPreset,
      workstreamSelections: selections }, { sourceMode, sourceEngagement: source });
  };
  if (quickField === "schedule") return <form className="workbench-form" data-quick-field="schedule" onSubmit={submit}>
    <div className="engagement-company-lock"><i>{entity.kind === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
      <span><small>{t("年度项目")}</small><strong>{entity.legalName} · {fiscalPeriodShortLabel(initial, language)}</strong></span></div>
    <div className="project-date-groups" data-single="true"><fieldset><legend>{t("项目排期")}</legend><div>
      <label><span>{t("开始日")}</span><input autoFocus type="date" value={values.startDate} max={values.dueDate || undefined}
        onChange={update("startDate")} /></label><label><span>{t("截止日")}</span><input type="date" value={values.dueDate}
          min={values.startDate || undefined} onChange={update("dueDate")} /></label></div></fieldset></div>
    {error && <div className="form-error" role="alert"><CircleAlert aria-hidden="true" />{error}</div>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存项目排期")}</button></footer>
  </form>;
  if (["owner", "framework"].includes(quickField)) {
    const field = quickField === "owner" ? "owner" : "reportingFramework";
    const label = quickField === "owner" ? "负责人" : "财务报告准则／框架";
    return <form className="workbench-form engagement-quick-form" data-quick-field={quickField} onSubmit={submit}>
      <div className="engagement-company-lock"><i>{entity.kind === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
        <span><small>{t("年度项目")}</small><strong>{entity.legalName} · {fiscalPeriodShortLabel(initial, language)}</strong></span></div>
      <label><span>{t(label)}</span>{quickField === "framework" ? <><input autoFocus list="v11-quick-framework-options"
        value={values[field]} onChange={update(field)} placeholder={t("选择常用框架或直接输入")} />
        <datalist id="v11-quick-framework-options">{FRAMEWORKS.map((framework) => <option key={framework} value={framework} />)}</datalist></>
        : <input autoFocus value={values[field]} onChange={update(field)} placeholder={t("例如：项目经理或主审")} />}</label>
      {error && <div className="form-error" role="alert"><CircleAlert aria-hidden="true" />{error}</div>}
      <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
        <button type="submit" className="button primary">{t("保存")}</button></footer>
    </form>;
  }
  return <form className="workbench-form annual-engagement-form" onSubmit={submit}>
    <div className="engagement-company-lock"><i>{entity.kind === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
      <span><small>{t("法律实体")}</small><strong>{entity.legalName}</strong></span></div>
    <section className="period-builder"><header><div><strong>{t("报告期间")}</strong>
      <span>{t("完整起止日期是项目的权威期间。")}</span></div>
      {!initial ? <em>{t("公司默认：{preset}", { preset: presetLabel(entity.fiscalYearPreset, t) })}</em>
        : onCreateAnotherYear && <button type="button" className="period-create-another" onClick={onCreateAnotherYear}>
          <CalendarPlus aria-hidden="true" />{t("新建另一年度")}</button>}</header>
      <div className="period-builder-controls"><label><span>{t("期间方式")}</span><select value={values.periodPreset} onChange={changePreset}>
        {["calendar", "apr_mar", ...(entity.incorporationDate || initialPreset === "doi_year_end" ? ["doi_year_end"] : []), "custom"]
          .map((preset) => <option value={preset} key={preset}>{presetLabel(preset, t)}</option>)}</select></label>
        {!["custom", "doi_year_end"].includes(values.periodPreset) && <label><span>{t(values.periodPreset === "apr_mar" ? "起始年度" : "年度")}</span>
          <input type="number" min="1900" max="2200" value={values.baseYear} onChange={changeYear} /></label>}
        <label><span>{t("报告开始日 *")}</span><input type="date" required value={values.periodStart}
          max={values.periodEnd || undefined} onChange={changeDate("periodStart")} /></label>
        <label><span>{t("报告结束日 *")}</span><input type="date" required value={values.periodEnd}
          min={values.periodStart || undefined} onChange={changeDate("periodEnd")} /></label></div>
      {values.periodStart && values.periodEnd && <div className="period-preview"><CalendarPlus aria-hidden="true" />
        <strong>{fiscalPeriodShortLabel(values, language)}</strong><span>{formatDate(values.periodStart, language)} → {formatDate(values.periodEnd, language)}</span></div>}
    </section>
    {!initial && <section className="engagement-source"><header><strong>{t("起始方式")}</strong>
      <span>{t("新年度默认复制最近项目的结构，并清空所有完成状态、负责人和日期。")}</span></header>
      <div className="choice-tabs" role="group">{previousDefault && <button type="button" data-active={sourceMode === "previous" || undefined}
        onClick={() => setSourceMode("previous")}>{t("复制上一年度")}</button>}
        <button type="button" data-active={sourceMode === "template" || undefined} onClick={() => setSourceMode("template")}>{t("从范本建立")}</button>
        <button type="button" data-active={sourceMode === "blank" || undefined} onClick={() => setSourceMode("blank")}>{t("空白项目")}</button></div>
      {sourceMode === "previous" && <label><span>{t("来源年度")}</span><select value={sourceEngagementId}
        onChange={(event) => setSourceEngagementId(event.target.value)}>{existing.map((engagement) => <option key={engagement.id} value={engagement.id}>
          {fiscalPeriodShortLabel(engagement, language)}{engagement.internalName ? ` · ${engagement.internalName}` : ""}</option>)}</select></label>}
      {sourceMode === "template" && entity.kind === "company" && <div className="annual-template-picker">
        {store.workstreamCategories.filter((category) => category.id !== "custom").map((category) => {
          const selected = selections.find((selection) => selection.categoryId === category.id);
          const templates = store.samples.filter((sample) => sample.categoryId === category.id);
          return <div key={category.id} data-selected={Boolean(selected) || undefined}><label><input type="checkbox" checked={Boolean(selected)}
            onChange={() => toggleCategory(category)} /><span>{workstreamCategoryLabel(category, language)}</span></label>
            {selected && <select aria-label={`${workstreamCategoryLabel(category, language)} · ${t("起始范本")}`}
              value={selected.sampleId} onChange={(event) => setSelections((current) => current.map((item) => item.categoryId === category.id
                ? { ...item, sampleId: event.target.value } : item))}><option value="">{t("空白流程")}</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>}</div>;
        })}</div>}
    </section>}
    <div className="form-grid" data-columns="2"><label><span>{t("财务报告准则／框架")}</span><input list="v11-framework-options"
      value={values.reportingFramework} onChange={update("reportingFramework")} placeholder={t("选择常用框架或直接输入")} />
      <datalist id="v11-framework-options">{FRAMEWORKS.map((framework) => <option key={framework} value={framework} />)}</datalist></label>
      <label><span>{t("负责人")}</span><input value={values.owner} onChange={update("owner")} placeholder={t("例如：项目经理或主审")} /></label>
      <label><span>{t("项目开始日")}</span><input type="date" value={values.startDate} max={values.dueDate || undefined}
        onChange={update("startDate")} /></label><label><span>{t("项目截止日")}</span><input type="date" value={values.dueDate}
          min={values.startDate || undefined} onChange={update("dueDate")} /></label>
      <label className="span-two"><span>{t("内部项目名称（可选）")}</span><input value={values.internalName} onChange={update("internalName")}
        placeholder={t("导航仍优先显示公司名称和完整报告期间")} /></label></div>
    {entity.kind === "holding_company" && <label className="check-option"><input type="checkbox" checked={values.consolidationEnabled}
      onChange={(event) => setValues((current) => ({ ...current, consolidationEnabled: event.target.checked }))} />
      <span><strong>{t("本级需要独立合并流程")}</strong><small>{t("关闭后，本级只汇总组成部分。")}</small></span></label>}
    <label><span>{t("项目备注")}</span><textarea rows="3" value={values.notes} onChange={update("notes")} /></label>
    {error && <div className="form-error" role="alert"><CircleAlert aria-hidden="true" />{error}</div>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(initial ? "保存项目" : "建立年度项目")}</button></footer>
  </form>;
}

export function EntityOverview({ store, entity, onEdit, onNewEngagement, onOpenEngagement, onEditEngagement,
  onTax, onArchive, onRestore, onDelete, onMerge }) {
  const { language, t } = useUiLanguage();
  const engagements = engagementsForEntity(store, entity.id);
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
    <header className="entity-overview-header"><div className="entity-overview-title"><i>{entity.kind === "holding_company"
      ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i><div><span>{t("公司主档")}</span>
      <h2>{entity.legalName}</h2><p>{entity.entityType || t("主体类型未设置")}{entity.kind === "holding_company"
        ? ` · ${t("控股公司架构")}` : ""}</p></div></div>
      <div className="entity-overview-actions">{!entity.archived && <button type="button" className="button primary" onClick={onNewEngagement}>
        <Plus aria-hidden="true" />{t("新建项目")}</button>}<button type="button" className="icon-only" onClick={onEdit}
          aria-label={t("编辑公司主档")} data-tooltip={t("编辑公司主档")}><Edit3 aria-hidden="true" /></button>
        {entity.archived ? <><button type="button" className="icon-only" onClick={onRestore} aria-label={t("恢复公司")}
          data-tooltip={t("恢复公司")}><ArchiveRestore aria-hidden="true" /></button>
          <button type="button" className="icon-only danger-quiet" onClick={onDelete} aria-label={t("永久删除公司")}
            data-tooltip={t("永久删除公司")}><Trash2 aria-hidden="true" /></button></>
          : <button type="button" className="icon-only" onClick={onArchive} aria-label={t("归档公司")}
            data-tooltip={t("归档公司")}><Archive aria-hidden="true" /></button>}</div></header>
    <div className="entity-facts"><button type="button" onClick={() => latestEngagement ? onEditEngagement(latestEngagement) : onNewEngagement()}
      aria-label={`${t("最新年结／报告期间")}：${latestPeriodLabel}`} title={latestPeriodLabel}>
      <span>{t("最新年结／报告期间")}</span><strong>{latestPeriodLabel}</strong><CalendarDays aria-hidden="true" /></button>
      <button type="button" onClick={onEdit}><span>{t("所属控股公司")}</span>
        <strong>{parent?.legalName || t("独立公司")}</strong><Settings2 aria-hidden="true" /></button>
      <button type="button" onClick={onTax} data-urgency={taxSummary.urgency}><span>{t("税务期限")}</span>
        <strong>{taxSummary.next ? `${formatDate(taxSummary.next.dueDate, language)} · ${taxSummary.openCount}` : t("没有未完成期限")}</strong>
        <ReceiptText aria-hidden="true" /></button><div><span>{t("年度项目")}</span><strong>{engagements.length}</strong></div></div>
    <section className="annual-project-list"><header><div><h3>{t("历年项目")}</h3>
      <p>{t("每个报告期间独立保存模块、负责人、排期、待清事项和进度。")}</p></div>
      {!entity.archived && <button type="button" className="button secondary" onClick={onNewEngagement}><CalendarPlus aria-hidden="true" />{t("新建年度项目")}</button>}</header>
      {engagements.length ? <div className="annual-project-rows">{engagements.map((engagement) => {
        const view = entity.kind === "holding_company" ? store.groups.find((item) => item.id === engagement.id)
          : store.projects.find((item) => item.id === engagement.id);
        const stats = entity.kind === "holding_company" ? null : projectStats(view || { workstreams: [] });
        const percentage = stats?.percentage || 0;
        return <article key={engagement.id} data-archived={engagement.archived || undefined}>
          <button type="button" className="annual-project-open" onClick={() => onOpenEngagement(engagement)}>
            <span className="annual-period"><strong>{fiscalPeriodShortLabel(engagement, language)}</strong>
              <small>{formatDate(engagement.periodStart, language)} → {formatDate(engagement.periodEnd, language)}</small></span>
            <span className="annual-owner"><small>{t("负责人")}</small><strong>{engagement.owner || t("未设置")}</strong></span>
            <span className="annual-schedule"><small>{t("项目排期")}</small><strong>{engagement.startDate && engagement.dueDate
              ? `${formatDate(engagement.startDate, language)} → ${formatDate(engagement.dueDate, language)}` : t("未完整设置")}</strong></span>
            <span className="annual-progress"><strong>{percentage}%</strong><ProgressBar value={percentage} compact /></span>
            <ChevronRight aria-hidden="true" /></button>
          {!engagement.archived && <button type="button" className="icon-only" onClick={() => onEditEngagement(engagement)}
            aria-label={t("编辑年度项目")} data-tooltip={t("编辑年度项目")}><Settings2 aria-hidden="true" /></button>}
        </article>;
      })}</div> : <div className="entity-empty-projects"><CalendarPlus aria-hidden="true" /><strong>{t("这家公司还没有年度项目")}</strong>
        <span>{t("先建立公司主档，再按需要加入 FY2023、FY2024、FY2025 等项目。")}</span>
        {!entity.archived && <button type="button" className="button primary" onClick={onNewEngagement}>{t("建立第一个项目")}</button>}</div>}
    </section>
    <section className="entity-outstanding-summary"><header><div><h3>{t("历年待清事项")}</h3>
      <p>{t("每项均标注来源年度；进入对应项目后处理。")}</p></div><strong>{openOutstanding.length}</strong></header>
      {openOutstanding.length ? <div>{openOutstanding.map(({ engagement, item }) => <button type="button" key={`${engagement.id}:${item.id}`}
        onClick={() => onOpenEngagement(engagement)}><span><strong>{item.title}</strong><small>{fiscalPeriodShortLabel(engagement, language)}
          {engagement.internalName ? ` · ${engagement.internalName}` : ""}</small></span>
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
    <footer className="entity-overview-footer"><button type="button" className="button secondary" onClick={onMerge}><GitMerge aria-hidden="true" />
      {t("合并重复公司")}</button><span>{t("合并前会预览项目、税务期限和期间冲突，不会按名称自动处理。")}</span></footer>
  </section>;
}

export function MergeEntitiesForm({ store, initialEntityId, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const normalizedName = (name) => String(name || "").trim().toLocaleLowerCase();
  const duplicateSets = [...new Map(store.entities.map((entity) => [normalizedName(entity.legalName),
    store.entities.filter((candidate) => normalizedName(candidate.legalName) === normalizedName(entity.legalName))])).values()]
    .filter((entities) => entities.length > 1);
  const defaultSet = duplicateSets.find((entities) => entities.some((entity) => entity.id === initialEntityId)) || duplicateSets[0] || [];
  const [sourceId, setSourceId] = React.useState(defaultSet.find((entity) => entity.id !== initialEntityId)?.id || defaultSet[1]?.id || "");
  const [targetId, setTargetId] = React.useState(defaultSet.find((entity) => entity.id === initialEntityId)?.id || defaultSet[0]?.id || "");
  const source = store.entities.find((entity) => entity.id === sourceId);
  const target = store.entities.find((entity) => entity.id === targetId);
  const sourceProjects = source ? engagementsForEntity(store, source.id) : [];
  const targetProjects = target ? engagementsForEntity(store, target.id) : [];
  const conflicts = sourceProjects.filter((project) => targetProjects.some((candidate) => candidate.periodStart === project.periodStart
    && candidate.periodEnd === project.periodEnd));
  return <form className="workbench-form merge-entities-form" onSubmit={(event) => { event.preventDefault();
    if (source && target && source.id !== target.id && !conflicts.length) onSubmit(source.id, target.id); }}>
    <div className="company-master-lead"><GitMerge aria-hidden="true" /><div><strong>{t("合并重复公司")}</strong>
      <span>{t("选择要并入的公司和保留的公司；系统不会自动按名称合并。")}</span></div></div>
    {!duplicateSets.length ? <div className="inline-warning"><CircleAlert aria-hidden="true" />{t("没有找到同名的重复公司。")}</div>
      : <><div className="form-grid" data-columns="2"><label><span>{t("并入这家公司")}</span><select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
        {store.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.legalName} · {engagementsForEntity(store, entity.id).length}</option>)}</select></label>
        <label><span>{t("保留这家公司")}</span><select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          {store.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.legalName} · {engagementsForEntity(store, entity.id).length}</option>)}</select></label></div>
        <div className="merge-preview"><div><span>{t("将移动的年度项目")}</span><strong>{sourceProjects.length}</strong></div>
          <div><span>{t("将合并的税务期限")}</span><strong>{source?.taxDeadlines.length || 0}</strong></div>
          <div data-danger={conflicts.length > 0 || undefined}><span>{t("相同期间冲突")}</span><strong>{conflicts.length}</strong></div></div>
        {conflicts.length > 0 && <div className="form-error"><CircleAlert aria-hidden="true" />
          {t("两家公司有相同报告期间。请先修改或归档并删除重复项目后再合并。")}</div>}</>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={!source || !target || source.id === target.id || conflicts.length > 0}>{t("确认合并")}</button></footer>
  </form>;
}

export function HoldingComponentsPanel({ store, engagement, readOnly = false, onOpen, onUpdate, onSync }) {
  const { language, t } = useUiLanguage();
  const entity = store.entities.find((item) => item.id === engagement.entityId);
  const components = engagement.consolidation?.components || [];
  const currentChildren = store.entities.filter((item) => item.parentEntityId === entity?.id);
  const snapshotIds = new Set(components.map((component) => component.entityId));
  const currentIds = new Set(currentChildren.map((child) => child.id));
  const added = currentChildren.filter((child) => !snapshotIds.has(child.id));
  const removed = components.filter((component) => !currentIds.has(component.entityId));
  const progressFor = (component) => {
    const target = store.engagements.find((item) => item.id === component.engagementId);
    const targetEntity = target && store.entities.find((item) => item.id === target.entityId);
    if (!target || !targetEntity) return 0;
    if (targetEntity.kind === "holding_company") return groupProgress(store, target.id).percentage;
    return projectStats(store.projects.find((item) => item.id === target.id) || { workstreams: [] }).percentage;
  };
  return <section className="holding-components-panel"><header><div><h3>{t("本年度组成部分")}</h3>
    <p>{t("范围按建立项目时的架构保存；每家公司必须指定同一报告期间的年度项目。")}</p></div>
    {!readOnly && <button type="button" className="button secondary" onClick={onSync}><FolderTree aria-hidden="true" />
      {added.length || removed.length ? t("同步当前架构 · +{added}/−{removed}", { added: added.length, removed: removed.length }) : t("检查当前架构")}</button>}</header>
    {(added.length > 0 || removed.length > 0) && <div className="structure-difference"><CircleAlert aria-hidden="true" />
      <span>{t("当前架构与本年度范围不同：新增 {added} 家，移出 {removed} 家。历史范围不会自动改变。", {
        added: added.length, removed: removed.length })}</span></div>}
    {components.length ? <div className="holding-component-rows">{components.map((component) => {
      const currentEntity = store.entities.find((item) => item.id === component.entityId);
      const candidates = currentEntity ? engagementsForEntity(store, currentEntity.id) : [];
      const target = store.engagements.find((item) => item.id === component.engagementId);
      const targetEntity = target && store.entities.find((item) => item.id === target.entityId);
      const matching = candidates.filter((candidate) => candidate.periodStart === engagement.periodStart
        && candidate.periodEnd === engagement.periodEnd);
      const unresolved = !target;
      const done = (component.readinessConditions || []).filter((condition) => condition.done).length;
      return <article key={component.id} data-unresolved={unresolved || undefined}><div className="component-identity"><i>{(currentEntity?.kind
        || component.entitySnapshot?.kind) === "holding_company" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
        <span><strong>{currentEntity?.legalName || component.entitySnapshot?.legalName || t("已删除的公司")}</strong>
          <small>{component.role || t("未设置集团角色")}{!currentEntity ? ` · ${t("历史快照")}` : ""}</small></span></div>
        <label><span>{t("对应年度项目")}</span><select disabled={readOnly || !currentEntity} value={target?.id || ""}
          onChange={(event) => {
            const selected = candidates.find((candidate) => candidate.id === event.target.value);
            onUpdate(component.id, { engagementId: selected?.id || null,
              periodSnapshot: selected ? { engagementId: selected.id, periodStart: selected.periodStart,
                periodEnd: selected.periodEnd, label: fiscalPeriodShortLabel(selected, "en") }
                : { engagementId: "", periodStart: "", periodEnd: "", label: "" } });
          }}>
          <option value="">{matching.length > 1 ? t("多项匹配，待指定") : t("待指定")}</option>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{fiscalPeriodShortLabel(candidate, language)}
            {candidate.periodStart === engagement.periodStart && candidate.periodEnd === engagement.periodEnd ? ` · ${t("期间匹配")}` : ""}</option>)}</select></label>
        <div className="component-progress"><span>{t("审计进度")}</span><strong>{progressFor(component)}%</strong><ProgressBar value={progressFor(component)} compact /></div>
        <div className="component-readiness"><span>{t("合并就绪")}</span><strong>{done}/{component.readinessConditions?.length || 0}</strong></div>
        {target && <button type="button" className="icon-only" onClick={() => onOpen(targetEntity?.kind === "holding_company" ? "group" : "project", target.id)}
          aria-label={t("打开年度项目")} data-tooltip={t("打开年度项目")}><ChevronRight aria-hidden="true" /></button>}
        {unresolved && <span className="component-unresolved"><CircleAlert aria-hidden="true" />{t("待指定")}</span>}
        {(component.readinessConditions || []).length > 0 && <div className="component-readiness-checks">{component.readinessConditions.map((condition) => <label key={condition.id}>
          <input type="checkbox" disabled={readOnly} checked={condition.done} onChange={(event) => onUpdate(component.id, {
            readinessConditions: component.readinessConditions.map((item) => item.id === condition.id ? { ...item, done: event.target.checked } : item),
          })} /><span>{condition.label}</span></label>)}</div>}
      </article>;
    })}</div> : <div className="entity-empty-projects"><FolderTree aria-hidden="true" /><strong>{t("本年度尚未保存组成部分")}</strong>
      <span>{t("同步当前架构后，系统会按完整报告期间尝试匹配下属公司的项目。")}</span></div>}
  </section>;
}
