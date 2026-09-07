import React from "react";
import { ReportRiskPanel, ReportTableRegion } from "./report-ui.jsx";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Building, Building2, CalendarRange, CircleAlert, Layers3, Printer, ReceiptText } from "lucide-react";
import {
  engagementTypesLabel,
  formatDate,
  outstandingStatusLabel,
  reportingPeriodLabel,
  taxDeadlineCategoryLabel,
  workstreamCategoryLabel,
  workstreamTypeLabel,
  yearEndOrPeriodLabel,
} from "./model.js";
import { buildPortfolioReport, buildRecordReport, DEFAULT_MANAGEMENT_REPORT_FILTERS } from "./reporting.js";
import { handleTabListKeyDown, tabIndexFor } from "./a11y.js";
import { useUiLanguage } from "./i18n.jsx";

function urgencyLabel(value, t) {
  return t({ overdue: "已逾期", due_today: "今日到期", due_soon: "即将到期", none: "正常" }[value] || "正常");
}

function recordTypeLabel(kind, t) {
  if (kind === "entity") return t("公司主档");
  return t(kind === "group" ? "控股公司" : "公司");
}

function workstreamLabel(workstream, language, t) {
  return workstream ? workstreamTypeLabel(workstream.type, language, workstream.customName) : t("公司级");
}

function ReportHeading({ title, subtitle, generatedAt, onPrint }) {
  const { language, t } = useUiLanguage();
  return <header className="management-report-heading"><div><span><BarChart3 aria-hidden="true" />{t("内部管理报告")}</span>
    <h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><div><small>{t("生成时间：{time}", {
      time: new Intl.DateTimeFormat(language === "en" ? "en-HK" : language === "zh-Hant" ? "zh-Hant-HK" : "zh-Hans-HK",
        { dateStyle: "medium", timeStyle: "short" }).format(new Date(generatedAt)),
    })}</small><button type="button" className="button primary report-print-button" onClick={onPrint}>
      <Printer aria-hidden="true" />{t("打印报告")}</button></div></header>;
}

function MetricStrip({ metrics }) {
  const { t } = useUiLanguage();
  const entries = [
    ["活跃公司", metrics.activeCompanies, Building],
    ["年度项目", metrics.annualEngagements, CalendarRange],
    ["业务模块", `${metrics.completedWorkstreams}/${metrics.totalWorkstreams}`, Layers3],
    ["逾期项目", metrics.overdueDeliveries, AlertTriangle],
    ["需关注税务期限", metrics.taxAttention, ReceiptText],
    ["未清事项", metrics.openOutstanding, CircleAlert],
  ];
  return <section className="management-metric-strip" aria-label={t("报告摘要")}>{entries.map(([label, value, Icon]) => <article key={label}>
    <Icon aria-hidden="true" /><span>{t(label)}</span><strong>{value}</strong></article>)}</section>;
}

function PortfolioFilters({ store, filters, setFilters }) {
  const { language, t } = useUiLanguage();
  const owners = [...new Set([...store.projects, ...store.groups].map((item) => item.owner).filter(Boolean))].sort();
  const update = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  return <section className="management-report-filters" aria-label={t("报告筛选")}>
    <label><span>{t("记录状态")}</span><select value={filters.status} onChange={update("status")}>
      <option value="active">{t("活跃")}</option><option value="completed">{t("已完成")}</option>
      <option value="all">{t("全部未归档")}</option><option value="archived">{t("归档")}</option></select></label>
    <label><span>{t("负责人")}</span><select value={filters.owner} onChange={update("owner")}>
      <option value="all">{t("全部负责人")}</option>{owners.map((owner) => <option value={owner} key={owner}>{owner}</option>)}</select></label>
    <label><span>{t("控股层级")}</span><select value={filters.holdingCompanyId} onChange={update("holdingCompanyId")}>
      <option value="all">{t("全部控股层级")}</option>{(store.entities || []).filter((entity) => entity.kind === "holding_company" && !entity.archived).map((entity) =>
        <option value={entity.id} key={entity.id}>{entity.legalName}</option>)}</select></label>
    <label><span>{t("业务模块")}</span><select value={filters.categoryId} onChange={update("categoryId")}>
      <option value="all">{t("全部业务模块")}</option>{store.workstreamCategories.map((category) =>
        <option value={category.id} key={category.id}>{workstreamCategoryLabel(category, language)}</option>)}</select></label>
    <label><span>{t("期限紧急程度")}</span><select value={filters.urgency} onChange={update("urgency")}>
      <option value="all">{t("全部紧急程度")}</option><option value="overdue">{t("已逾期")}</option>
      <option value="due_today">{t("今日到期")}</option><option value="due_soon">{t("即将到期")}</option>
      <option value="open_outstanding">{t("有未清事项")}</option></select></label>
    <label><span>{t("项目开始范围")}</span><input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={update("dateFrom")} /></label>
    <label><span>{t("项目截止范围")}</span><input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={update("dateTo")} /></label>
    <button type="button" className="button secondary" onClick={() => setFilters(DEFAULT_MANAGEMENT_REPORT_FILTERS)}>{t("重置筛选")}</button>
  </section>;
}

function SortableHeading({ name, label, sort, onSort }) {
  const selected = sort.key === name;
  const Icon = !selected ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return <th aria-sort={selected ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
    <button type="button" onClick={() => onSort(name)}>{label}<Icon aria-hidden="true" /></button></th>;
}

function PortfolioTable({ report, onOpen }) {
  const { language, t } = useUiLanguage();
  const [sort, setSort] = React.useState({ key: "default", direction: "asc" });
  const toggleSort = (key) => setSort((current) => ({ key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const rows = React.useMemo(() => {
    if (sort.key === "default") return report.rows;
    const value = (row) => ({ name: row.name, owner: row.owner, hierarchy: row.hierarchy.map((item) => item.name).join(" / "),
      schedule: row.dueDate || row.startDate, progress: row.kind === "project" ? row.completedWorkstreams / Math.max(1, row.totalWorkstreams) : row.progress,
      outstanding: row.openOutstanding, tax: row.taxAttention }[sort.key]);
    return [...report.rows].sort((left, right) => {
      const leftValue = value(left); const rightValue = value(right);
      const compared = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue
        : String(leftValue || "").localeCompare(String(rightValue || ""), language === "en" ? "en-HK" : language);
      return (sort.direction === "asc" ? compared : -compared) || left.name.localeCompare(right.name);
    });
  }, [language, report.rows, sort]);
  const groups = React.useMemo(() => {
    const grouped = new Map();
    rows.forEach((row) => {
      const key = row.entityId || `${row.kind}:${row.name}`;
      if (!grouped.has(key)) grouped.set(key, { key, name: row.name, kind: row.kind, rows: [] });
      grouped.get(key).rows.push(row);
    });
    return [...grouped.values()];
  }, [rows]);
  return <section className="management-report-section"><header><div><h3>{t("项目组合明细")}</h3>
    <span>{t("{count} 项记录", { count: report.rows.length })}</span></div></header>
    {report.rows.length ? <ReportTableRegion label={t("项目组合明细")}><table className="management-report-table"><thead><tr>
      <SortableHeading name="name" label={t("公司／控股公司")} sort={sort} onSort={toggleSort} />
      <th>{t("年结／报告期间")}</th>
      <SortableHeading name="owner" label={t("负责人")} sort={sort} onSort={toggleSort} />
      <SortableHeading name="hierarchy" label={t("所属层级")} sort={sort} onSort={toggleSort} />
      <SortableHeading name="schedule" label={t("项目排期")} sort={sort} onSort={toggleSort} />
      <SortableHeading name="progress" label={t("进度")} sort={sort} onSort={toggleSort} />
      <SortableHeading name="outstanding" label={t("待清")} sort={sort} onSort={toggleSort} />
      <SortableHeading name="tax" label={t("税务期限")} sort={sort} onSort={toggleSort} /></tr></thead><tbody>
      {groups.flatMap((group) => group.rows.map((row, index) => <tr key={`${row.kind}:${row.id}`} data-urgency={row.deliveryUrgency}>
        {index === 0 && <td className="management-company-cell" rowSpan={group.rows.length}><button type="button"
          onClick={() => onOpen(row.kind, row.id)}><span className="report-record-icon">
            {group.kind === "group" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</span><span>
            <strong>{group.name}</strong><small>{recordTypeLabel(group.kind, t)} · {t("{count} 个年度项目", { count: group.rows.length })}</small>
          </span></button></td>}
        <td className="management-period-cell"><button type="button" onClick={() => onOpen(row.kind, row.id)}>
          <strong>{yearEndOrPeriodLabel(row, language) || row.periodLabel || t("未设置报告期间")}</strong>
          <small>{engagementTypesLabel(row, language) || t("项目类型未设置")}
            {row.secondaryName ? ` · ${row.secondaryName}` : ""}</small></button></td>
        <td>{row.owner || "—"}</td><td>{row.hierarchy.length ? row.hierarchy.map((item) => item.name).join(" / ") : t("顶层")}</td>
        <td><span>{formatDate(row.startDate, language)} → {formatDate(row.dueDate, language)}</span>
          <small data-urgency={row.deliveryUrgency}>{urgencyLabel(row.deliveryUrgency, t)}</small></td>
        <td>{row.kind === "project" ? t("{done}/{total} 个模块", { done: row.completedWorkstreams, total: row.totalWorkstreams })
          : `${row.progress}%`}</td><td>{row.openOutstanding}</td><td><span>{row.taxAttention}/{row.taxOpen}</span>
          {row.taxUrgency !== "none" && <small data-urgency={row.taxUrgency}>{urgencyLabel(row.taxUrgency, t)}</small>}</td></tr>))}</tbody></table></ReportTableRegion>
      : <div className="management-report-empty"><strong>{t("没有符合筛选的记录")}</strong><span>{t("调整筛选条件后再查看。")}</span></div>}
  </section>;
}

function PortfolioRisks({ report, statuses, onOpen, onOpenOutstanding, onOpenTaxDeadline }) {
  const { language, t } = useUiLanguage();
  const overdue = report.rows.filter((row) => row.deliveryUrgency === "overdue").map((row) => ({
    key: JSON.stringify([row.kind, row.id]), title: row.name,
    context: [yearEndOrPeriodLabel(row, language), row.owner, formatDate(row.dueDate, language)].filter(Boolean).join(" · "),
    onOpen: () => onOpen(row.kind, row.id),
  }));
  const tax = report.taxRisks.map(({ kind, record, deadline, urgency }) => ({
    key: JSON.stringify([kind, record.id, deadline.id]), title: taxDeadlineCategoryLabel(deadline, language),
    context: [record.entity || record.name, deadline.taxYear, formatDate(deadline.dueDate, language), urgencyLabel(urgency.level, t)].filter(Boolean).join(" · "),
    onOpen: () => onOpenTaxDeadline ? onOpenTaxDeadline(kind, record.id, deadline.id) : onOpen(kind, record.id),
  }));
  const outstanding = report.outstandingRisks.map(({ kind, record, item, ageDays }) => ({
    key: JSON.stringify([kind, record.id, item.id]), title: item.title,
    context: [record.entity || record.name, outstandingStatusLabel(item.status, statuses, language), t("{count} 天", { count: ageDays })].join(" · "),
    onOpen: () => onOpenOutstanding ? onOpenOutstanding(kind, record.id, item.id) : onOpen(kind, record.id),
  }));
  return <section className="management-risk-grid">
    <ReportRiskPanel kind="overdue" title={t("逾期项目")} Icon={AlertTriangle} items={overdue} emptyText={t("没有逾期项目")} />
    <ReportRiskPanel kind="tax" title={t("需关注税务期限")} Icon={ReceiptText} items={tax} emptyText={t("没有需要关注的税务期限")} />
    <ReportRiskPanel kind="outstanding" title={t("未清事项")} Icon={CircleAlert} items={outstanding} emptyText={t("没有未清事项")} />
  </section>;
}

function ProjectRecordReport({ report, statuses }) {
  const { language, t } = useUiLanguage();
  const period = reportingPeriodLabel(report, language) || t("未设置");
  return <>
    <section className="record-report-facts"><div><span>{t("项目类型")}</span><strong>
      {engagementTypesLabel(report, language) || t("项目类型未设置")}</strong></div>
      <div><span>{t("负责人")}</span><strong>{report.owner || t("未设置")}</strong></div>
      <div><span>{t("报告期间")}</span><strong>{period}</strong></div><div><span>{t("财务报告准则／框架")}</span>
        <strong>{report.reportingFramework ? t(report.reportingFramework) : t("未设置")}</strong></div><div><span>{t("项目排期")}</span>
        <strong>{formatDate(report.startDate, language)} → {formatDate(report.dueDate, language)}</strong></div></section>
    <section className="management-report-section"><header><div><h3>{t("业务模块")}</h3><span>{t("并行进度与当前节点")}</span></div></header>
      {report.workstreams.length ? <div className="record-workstream-grid">{report.workstreams.map((workstream) => <article key={workstream.id}><header><strong>
        {workstreamTypeLabel(workstream.type, language, workstream.customName)}</strong><span>{workstream.stats.percentage}%</span></header>
        <footer><span>{t("{done}/{total} 个节点", { done: workstream.stats.completedNodes, total: workstream.stats.nodes })}</span>
          <strong>{workstream.currentStage?.title || t("全部节点已完成")}</strong></footer></article>)}</div>
        : <div className="management-report-empty compact"><strong>{t("尚未启用业务模块")}</strong></div>}</section>
    <RecordRiskTables report={report} statuses={statuses} />
  </>;
}

function GroupRecordReport({ report, statuses }) {
  const { language, t } = useUiLanguage();
  const simple = report.consolidationMode === "simple";
  return <>
    {simple && <p className="form-help">{t("简易模式")} · {t("仅跟踪本级合并工作；组成部分保留，未纳入完成判断。")}</p>}
    <section className="record-report-facts"><div><span>{t("负责人")}</span><strong>{report.owner || t("未设置")}</strong></div>
      <div><span>{t("报告期间")}</span><strong>{reportingPeriodLabel(report, language) || t("未设置")}</strong></div>
      {!simple && <div><span>{t("组成部分就绪")}</span><strong>{report.progress.readyCompanies}/{report.progress.totalCompanies}</strong></div>}
      <div><span>{t("本级合并进度")}</span><strong>{report.progress.consolidationPercentage}%</strong></div></section>
    {!simple && <section className="management-report-section"><header><div><h3>{t("组成部分")}</h3><span>{t("进度、就绪状态及截止日")}</span></div></header>
      <ReportTableRegion label={t("组成部分")}><table className="management-report-table"><thead><tr><th>{t("公司／控股公司")}</th>
        <th>{t("角色")}</th><th>{t("负责人")}</th><th>{t("进度")}</th><th>{t("合并就绪")}</th><th>{t("截止日")}</th></tr></thead><tbody>
        {report.members.map((member) => <tr key={`${member.kind}:${member.id}`} data-unresolved={member.unresolved || undefined}><td style={{ "--report-depth": member.depth }}>
          <strong>{member.name}</strong>{member.periodLabel && <small>{member.periodLabel}</small>}</td><td>{member.role || "—"}</td><td>{member.owner || "—"}</td><td>{member.progress}%</td>
          <td>{t(member.unresolved ? "待指定" : member.ready ? "已就绪" : "未就绪")}</td><td>{formatDate(member.dueDate, language)}</td></tr>)}</tbody></table></ReportTableRegion></section>}
    <section className="management-report-section"><header><div><h3>{t("本级合并节点")}</h3><span>{t("明确条件完成情况")}</span></div></header>
      <div className="record-stage-list">{report.nodes.map((node, index) => <article key={node.id}><span>{index + 1}</span><strong>{node.title}</strong>
        <small>{node.completedConditions}/{node.conditions} · {t(node.status)}</small></article>)}</div></section>
    <RecordRiskTables report={report} statuses={statuses} group />
  </>;
}

function EntityRecordReport({ report, statuses }) {
  const { language, t } = useUiLanguage();
  return <>
    <section className="record-report-facts"><div><span>{t("主体类型")}</span><strong>{report.entityType || t("未设置")}</strong></div>
      <div><span>{t("默认会计年度")}</span><strong>{t({ calendar: "1 月 1 日 → 12 月 31 日",
        apr_mar: "4 月 1 日 → 次年 3 月 31 日", custom: "每个项目自定义日期" }[report.fiscalYearPreset])}</strong></div>
      <div><span>{t("年度项目")}</span><strong>{report.projects.length}</strong></div><div><span>{t("未完成税务期限")}</span><strong>{report.taxDeadlines.length}</strong></div></section>
    <section className="management-report-section"><header><div><h3>{t("历年项目")}</h3><span>{t("报告期间、负责人、排期和状态")}</span></div></header>
      {report.projects.length ? <ReportTableRegion label={t("历年项目")}><table className="management-report-table"><thead><tr>
        <th>{t("报告期间")}</th><th>{t("项目类型")}</th><th>{t("负责人")}</th><th>{t("项目排期")}</th><th>{t("状态")}</th></tr></thead><tbody>
        {report.projects.map((project) => <tr key={project.id}><td><strong>{project.label}</strong>
          <small>{reportingPeriodLabel(project, language)}</small></td>
          <td>{engagementTypesLabel(project, language) || t("项目类型未设置")}</td>
          <td>{project.owner || "—"}</td><td>{formatDate(project.startDate, language)} → {formatDate(project.dueDate, language)}</td>
          <td>{t(project.archived ? "归档" : project.complete ? "已完成" : "进行中")}</td></tr>)}</tbody></table></ReportTableRegion>
        : <div className="management-report-empty compact"><strong>{t("这家公司还没有年度项目")}</strong></div>}</section>
    {report.entityKind === "holding_company" && <section className="management-report-section"><header><div><h3>{t("当前控股架构")}</h3>
      <span>{t("当前直属成员，不改写历史年度范围")}</span></div></header><div className="record-stage-list">{report.children.map((child, index) => <article key={child.id}>
        <span>{index + 1}</span><strong>{child.name}</strong><small>{child.role || t(child.kind === "holding_company" ? "控股公司" : "公司")}</small></article>)}</div></section>}
    <section className="record-risk-tables"><article><header><strong>{t("历年待清事项")}</strong><span>{report.outstanding.length}</span></header>
      {report.outstanding.length ? <ReportTableRegion label={t("当前未清事项")} className="record-risk-scroll"><table><thead><tr><th>{t("事项")}</th><th>{t("来源年度")}</th><th>{t("状态")}</th><th>{t("建立时间")}</th></tr></thead><tbody>
        {report.outstanding.map((entry) => <tr key={`${entry.engagementId}:${entry.item.id}`}><td><strong>{entry.item.title}</strong></td>
          <td>{entry.periodLabel}</td><td>{outstandingStatusLabel(entry.item.status, statuses, language)}</td>
          <td>{formatDate(entry.item.createdAt?.slice(0, 10), language)} · {t("{count} 天", { count: entry.ageDays })}</td></tr>)}</tbody></table></ReportTableRegion>
        : <p>{t("没有未清事项")}</p>}</article></section>
    <section className="record-risk-tables"><article><header><strong>{t("未完成税务期限")}</strong><span>{report.taxDeadlines.length}</span></header>
      {report.taxDeadlines.length ? <ReportTableRegion label={t("未完成税务期限")} className="record-risk-scroll"><table><thead><tr><th>{t("期限种类")}</th><th>{t("课税年度")}</th><th>{t("负责人")}</th><th>{t("当前期限")}</th><th>{t("紧急程度")}</th></tr></thead><tbody>
        {report.taxDeadlines.map((deadline) => <tr key={deadline.id}><td>{taxDeadlineCategoryLabel(deadline, language)}</td><td>{deadline.taxYear || "—"}</td>
          <td>{deadline.owner || "—"}</td><td>{formatDate(deadline.dueDate, language)}</td><td>{urgencyLabel(deadline.urgency.level, t)}</td></tr>)}</tbody></table></ReportTableRegion>
        : <p>{t("没有未完成税务期限")}</p>}</article></section>
  </>;
}

function RecordRiskTables({ report, statuses, group = false }) {
  const { language, t } = useUiLanguage();
  return <section className="record-risk-tables"><article><header><strong>{t("当前未清事项")}</strong><span>{report.outstanding.length}</span></header>
    {report.outstanding.length ? <ReportTableRegion label={t("当前未清事项")} className="record-risk-scroll"><table><thead><tr><th>{t("事项")}</th><th>{t("状态")}</th><th>{t("所属层级或业务模块")}</th><th>{t("建立时间")}</th></tr></thead><tbody>
      {report.outstanding.map((entry) => { const item = group ? entry.item : entry; return <tr key={JSON.stringify([entry.sourceType, entry.sourceId, item.id])}><td><strong>{item.title}</strong>
        {group && <small>{entry.sourceName}</small>}</td><td>{outstandingStatusLabel(item.status, statuses, language)}</td>
        <td>{workstreamLabel(item.workstream, language, t)}</td><td>{formatDate(item.createdAt?.slice(0, 10), language)} · {t("{count} 天", { count: entry.ageDays })}</td></tr>; })}</tbody></table></ReportTableRegion>
      : <p>{t("没有未清事项")}</p>}</article>
    <article><header><strong>{t("未完成税务期限")}</strong><span>{report.taxDeadlines.length}</span></header>
      {report.taxDeadlines.length ? <ReportTableRegion label={t("未完成税务期限")} className="record-risk-scroll"><table><thead><tr><th>{t("期限种类")}</th><th>{t("课税年度")}</th><th>{t("负责人")}</th><th>{t("当前期限")}</th><th>{t("紧急程度")}</th></tr></thead><tbody>
        {report.taxDeadlines.map((entry) => { const deadline = group ? entry.deadline : entry; return <tr key={JSON.stringify([entry.sourceType, entry.sourceId, deadline.id])}><td>
          <strong>{taxDeadlineCategoryLabel(deadline, language)}</strong>{group && <small>{entry.sourceName}</small>}</td><td>{deadline.taxYear || "—"}</td>
          <td>{deadline.owner || "—"}</td><td>{formatDate(deadline.dueDate, language)}</td>
          <td><span data-urgency={entry.urgency.level}>{urgencyLabel(entry.urgency.level, t)}</span></td></tr>; })}</tbody></table></ReportTableRegion>
        : <p>{t("没有未完成税务期限")}</p>}</article></section>;
}

function PrintScope({ filters, store, current }) {
  const { language, t } = useUiLanguage();
  if (current) return <section className="print-report-scope"><strong>{t("打印范围")}</strong>
    <span>{t("当前记录")}：{current.name}</span></section>;
  const status = { active: "活跃", completed: "已完成", all: "全部未归档", archived: "归档" }[filters.status];
  const urgency = { all: "全部紧急程度", overdue: "已逾期", due_today: "今日到期", due_soon: "即将到期",
    open_outstanding: "有未清事项" }[filters.urgency];
  const holding = filters.holdingCompanyId === "all" ? t("全部控股层级")
    : store.entities?.find((entity) => entity.id === filters.holdingCompanyId)?.legalName || "—";
  const category = filters.categoryId === "all" ? t("全部业务模块")
    : workstreamCategoryLabel(store.workstreamCategories.find((item) => item.id === filters.categoryId), language);
  return <section className="print-report-scope"><strong>{t("打印范围")}</strong><span>{t("记录状态")}：{t(status)}</span>
    <span>{t("负责人")}：{filters.owner === "all" ? t("全部负责人") : filters.owner}</span>
    <span>{t("控股层级")}：{holding}</span><span>{t("业务模块")}：{category}</span>
    <span>{t("期限紧急程度")}：{t(urgency)}</span><span>{t("项目开始范围")}：{formatDate(filters.dateFrom, language)}</span>
    <span>{t("项目截止范围")}：{formatDate(filters.dateTo, language)}</span></section>;
}

export function ManagementReport({ store, selection, now = new Date(), onOpen, onOpenOutstanding, onOpenTaxDeadline }) {
  const { t } = useUiLanguage();
  const [view, setView] = React.useState("portfolio");
  const [filters, setFilters] = React.useState(DEFAULT_MANAGEMENT_REPORT_FILTERS);
  const selectedExists = selection && (selection.kind === "entity" ? store.entities
    : selection.kind === "project" ? store.projects : store.groups).some((item) => item.id === selection.id);
  React.useEffect(() => { if (!selectedExists && view === "record") setView("portfolio"); }, [selectedExists, view]);
  const portfolio = React.useMemo(() => buildPortfolioReport(store, filters, now), [store, filters, now]);
  const record = React.useMemo(() => selectedExists ? buildRecordReport(store, selection.kind, selection.id, now) : null,
    [store, selection, selectedExists, now]);
  const current = view === "record" && record ? record : null;
  const generatedAt = current ? now.toISOString() : portfolio.generatedAt;
  return <div className="management-report" data-report-view={current ? "record" : "portfolio"}>
    <ReportHeading title={current ? current.name : t("项目组合报告")}
      subtitle={current ? current.secondaryName || recordTypeLabel(current.kind, t) : t("事务所内部进度、期限和未清事项摘要")}
      generatedAt={generatedAt} onPrint={() => window.print()} />
    <PrintScope filters={filters} store={store} current={current} />
    <div className="management-report-tabs" role="tablist" aria-label={t("报告范围")} onKeyDown={handleTabListKeyDown}>
      <button type="button" role="tab" aria-selected={!current} tabIndex={tabIndexFor(!current)} onClick={() => setView("portfolio")}>{t("项目组合")}</button>
      <button type="button" role="tab" aria-selected={Boolean(current)} tabIndex={tabIndexFor(Boolean(current))} disabled={!selectedExists}
        onClick={() => setView("record")}>{t("当前记录")}</button></div>
    {!current ? <><PortfolioFilters store={store} filters={filters} setFilters={setFilters} /><MetricStrip metrics={portfolio.metrics} />
      <PortfolioTable report={portfolio} onOpen={onOpen} /><PortfolioRisks key={JSON.stringify(filters)} onOpenOutstanding={onOpenOutstanding} onOpenTaxDeadline={onOpenTaxDeadline} report={portfolio} statuses={store.outstandingStatuses} onOpen={onOpen} /></>
      : <>{current.kind !== "entity" && <section className="record-report-status"><span data-complete={current.complete || undefined}>{t(current.complete ? "已完成" : "进行中")}</span>
        {current.archived && <strong>{t("归档 · 只读")}</strong>}</section>}{current.kind === "entity"
        ? <EntityRecordReport report={current} statuses={store.outstandingStatuses} /> : current.kind === "project"
          ? <ProjectRecordReport report={current} statuses={store.outstandingStatuses} />
          : <GroupRecordReport report={current} statuses={store.outstandingStatuses} />}</>}
  </div>;
}
