import React from "react";
import { BarChart3, BellRing, CalendarRange, CheckCircle2, ChevronRight, House, ListFilter, ListTodo, Plus } from "lucide-react";
import { ProgressBar } from "./components.jsx";
import { engagementTypesLabel, formatDate, homeOverviewData, outstandingStatusLabel,
  taxDeadlineCategoryLabel, yearEndOrPeriodLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { PRIORITY_FILTERS, nextEngagementAction, priorityItemsFor, recentRecordsFor } from "./ux-model.js";

function overviewDate(value, language) {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-HK", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(value);
}

function deadlineBadge(item, t) {
  if (item.urgency === "overdue") return t("逾期 {count} 天", { count: item.alert?.daysOverdue || 0 });
  if (item.urgency === "due_today") return t("今天到期");
  return t("{count} 天后到期", { count: item.alert?.daysUntil ?? item.daysUntil ?? 0 });
}

export function HomeOverview({ store, now, onOpen, onOpenDeadline, onNewCompany, onNewEngagement,
  onShowDeadlines, onShowProjects, onShowSchedule, recentVisits = [], onClearRecent, onOpenOutstanding }) {
  const { language, t } = useUiLanguage();
  const overview = React.useMemo(() => {
    const data = homeOverviewData(store, now);
    const priorityItems = priorityItemsFor(data);
    return { ...data, priorityItems,
      deadlineAttentionCount: priorityItems.filter((item) => ["deadline", "upcoming"].includes(item.category)).length,
      immediateDeadlineCount: priorityItems.filter((item) => ["overdue", "due_today"].includes(item.urgency)).length };
  }, [store, now]);
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [owner, setOwner] = React.useState("");
  const [priorityLimit, setPriorityLimit] = React.useState(5);
  const recent = recentRecordsFor(store, recentVisits);
  const owners = [...new Set([...overview.records.map((record) => record.engagement.owner),
    ...overview.alerts.map((alert) => alert.owner)].filter(Boolean))].sort();
  const filteredPriorities = priorityItemsFor(overview, priorityFilter, owner);
  const activeRecords = overview.activeRecords.filter((record) => !owner || record.engagement.owner === owner)
    .sort((a, b) => (a.engagement.dueDate || "9999").localeCompare(b.engagement.dueDate || "9999"));
  const filterLabels = { all: "全部事项", today: "今天到期", overdue: "已逾期", week: "未来 7 天", outstanding: "待清事项", setup: "待完善" };
  const changeFilter = (value) => { setPriorityFilter(value); setPriorityLimit(5); };
  const priorityRef = React.useRef(null);
  const summary = overview.immediateDeadlineCount
    ? t("先处理 {count} 项今天到期或已经逾期的工作。", { count: overview.immediateDeadlineCount })
    : overview.deadlineAttentionCount
      ? t("目前没有逾期事项，接下来有 {count} 项期限需要关注。", { count: overview.deadlineAttentionCount })
      : overview.openOutstanding.length
        ? t("期限情况正常，还有 {count} 项待清事项需要跟进。", { count: overview.openOutstanding.length })
        : overview.activeRecords.length
          ? t("目前没有紧急事项，可以继续推进进行中的项目。")
          : store.entities.some((entity) => !entity.archived)
            ? t("公司主档已经建立，下一步可以建立年度项目。")
            : t("先建立第一家公司，再开始安排年度项目。");
  const visiblePriorities = filteredPriorities.slice(0, priorityLimit);

  const priorityPresentation = (item) => {
    if (item.category === "deadline" || item.category === "upcoming") {
      const alert = item.alert;
      const record = item.record;
      const isTax = item.category === "deadline" && alert?.scope === "tax";
      return {
        title: isTax ? taxDeadlineCategoryLabel(alert.taxDeadline, language)
          : record ? engagementTypesLabel(record.engagement, language) || t("项目类型未设置") : t("项目期限"),
        context: record ? `${record.entity.legalName} · ${yearEndOrPeriodLabel(record.engagement, language)}`
          : alert?.recordName || "",
        detail: record?.engagement.owner || alert?.owner || t("未设置负责人"),
        badge: deadlineBadge(item, t),
      };
    }
    if (item.category === "setup") {
      const labels = { start_date: "缺少开始日", due_date: "缺少截止日", workstreams: "尚未添加业务模块" };
      return { title: t("完善项目设置"),
        context: `${engagementTypesLabel(item.record.engagement, language) || t("项目类型未设置")} · ${item.record.entity.legalName}`,
        detail: item.issues.map((issue) => t(labels[issue])).join(" · "), badge: t("待完善") };
    }
    if (item.category === "new_engagement") return { title: t("建立首个项目"), context: item.entity.legalName,
      detail: t("这家公司还没有活跃项目。"), badge: t("待建立") };
    return { title: item.item.title || t("未命名待清事项"),
      context: `${engagementTypesLabel(item.record.engagement, language) || t("项目类型未设置")} · ${item.record.entity.legalName}`,
      detail: `${yearEndOrPeriodLabel(item.record.engagement, language)} · ${outstandingStatusLabel(item.item.status, store.outstandingStatuses, language)}`,
      badge: t("待清") };
  };

  const openPriority = (item) => {
    if (item.category === "deadline") { onOpenDeadline(item.alert); return; }
    if (item.category === "new_engagement") { onNewEngagement(item.entity.id); return; }
    if (item.category === "outstanding" && onOpenOutstanding) {
      onOpenOutstanding(item.record.kind, item.record.id, item.item.id); return;
    }
    if (item.record) onOpen(item.record.kind, item.record.id);
  };

  return <section className="home-overview">
    <header className="home-overview-heading"><div className="home-overview-title"><span><House aria-hidden="true" />{t("首页")}</span>
      <h2>{t("工作台总览")}</h2><p>{summary}</p></div><div className="home-overview-actions">
        <time>{overviewDate(now, language)}</time><div>
          <button type="button" className="button primary" onClick={onNewCompany}><Plus aria-hidden="true" />{t("新建公司")}</button>
          <button type="button" className="button secondary" onClick={() => onShowProjects("all")}><ListFilter aria-hidden="true" />{t("项目列表")}</button>
          <button type="button" className="button secondary" onClick={onShowSchedule}><CalendarRange aria-hidden="true" />{t("项目排期")}</button>
        </div></div></header>

    <section className="home-metric-grid" aria-label={t("整体情况")}>
      <button type="button" onClick={() => onShowProjects("active")}><i><BarChart3 aria-hidden="true" /></i><span>{t("活跃项目")}</span>
        <strong>{overview.activeRecords.length}</strong><small>{t("平均完成 {value}%", { value: overview.averageProgress })}</small></button>
      <button type="button" onClick={() => onShowProjects("completed")}><i><CheckCircle2 aria-hidden="true" /></i><span>{t("已完成项目")}</span>
        <strong>{overview.completedRecords.length}</strong><small>{t("保留在当前记录中")}</small></button>
      <button type="button" data-alert={overview.deadlineAttentionCount > 0 || undefined} onClick={onShowDeadlines}><i><BellRing aria-hidden="true" /></i>
        <span>{t("需关注期限")}</span><strong>{overview.deadlineAttentionCount}</strong><small>{overview.immediateDeadlineCount
          ? t("{count} 项今天到期或已逾期", { count: overview.immediateDeadlineCount }) : t("没有今天到期或逾期")}</small></button>
      <button type="button" data-alert={overview.openOutstanding.length > 0 || undefined}
        onClick={() => { changeFilter("outstanding"); setOwner("");
          window.requestAnimationFrame(() => { priorityRef.current?.focus(); priorityRef.current?.scrollIntoView({ block: "nearest" }); });
        }}><i><ListTodo aria-hidden="true" /></i>
        <span>{t("待清事项")}</span><strong>{overview.openOutstanding.length}</strong><small>{t("来自所有活跃项目")}</small></button>
    </section>

    {recent.length > 0 && <section className="home-recent" aria-label={t("最近访问")}><header><h3>{t("最近访问")}</h3>
      <button type="button" className="text-button" onClick={onClearRecent}>{t("清除访问记录")}</button></header>
      <div>{recent.slice(0, 4).map((record) => <button type="button" key={`${record.kind}:${record.id}`} onClick={() => onOpen(record.kind, record.id)}>
        <span><strong>{record.entity.legalName}</strong><small>{record.engagement
          ? `${engagementTypesLabel(record.engagement, language)} · ${yearEndOrPeriodLabel(record.engagement, language)}` : t("公司主档")}</small></span>
        <ChevronRight aria-hidden="true" /></button>)}</div></section>}
    <div className="home-action-filters"><label><span>{t("行动清单负责人")}</span><select value={owner}
      onChange={(event) => { setOwner(event.target.value); setPriorityLimit(5); }}>
      <option value="">{t("全部负责人")}</option>{owners.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      {(owner || priorityFilter !== "all") && <button type="button" className="button secondary"
        onClick={() => { setOwner(""); changeFilter("all"); }}>{t("清除筛选")}</button>}</div>
    <div className="home-overview-columns">
      <section className="home-overview-panel home-priority-panel" ref={priorityRef} tabIndex="-1"><header><div><span>{t("下一步")}</span>
        <h3>{t("优先处理")}</h3></div><strong aria-live="polite">{filteredPriorities.length}</strong></header>
        <div className="home-priority-filters" role="group" aria-label={t("优先事项筛选")}>{PRIORITY_FILTERS.map((value) =>
          <button type="button" key={value} aria-pressed={priorityFilter === value} onClick={() => changeFilter(value)}>
            <span>{t(filterLabels[value])}</span><strong>{priorityItemsFor(overview, value, owner).length}</strong></button>)}</div>
        {visiblePriorities.length ? <div className="home-priority-list">{visiblePriorities.map((item, index) => {
          const presentation = priorityPresentation(item);
          return <button type="button" key={`${item.category}:${item.alert?.id || item.record?.id || item.entity?.id}:${item.item?.id || index}`}
            data-urgency={item.urgency} onClick={() => openPriority(item)} aria-label={`${presentation.title} · ${presentation.context}`}>
            <i aria-hidden="true" /><span><strong>{presentation.title}</strong><small>{presentation.context}</small>
              <small>{presentation.detail}</small></span><em>{presentation.badge}</em><ChevronRight aria-hidden="true" /></button>;
        })}</div> : <div className="home-overview-empty"><CheckCircle2 aria-hidden="true" /><strong>{t("目前没有需要优先处理的事项")}</strong>
          <span>{t(owner || priorityFilter !== "all" ? "当前筛选没有事项；清除筛选可查看其他工作。" : "可以从右侧选择一个项目继续推进。")}</span></div>}
        {filteredPriorities.length > visiblePriorities.length && <footer><button type="button" className="button secondary"
          onClick={() => setPriorityLimit((value) => value + 5)}>{t("显示更多（剩余 {count} 项）", { count: filteredPriorities.length - visiblePriorities.length })}</button></footer>}
        {priorityLimit > 5 && <footer><button type="button" className="text-button" onClick={() => setPriorityLimit(5)}>{t("只显示前 5 项")}</button></footer>}
      </section>

      <section className="home-overview-panel home-active-panel"><header><div><span>{t("进行中")}</span><h3>{t("进行中的项目")}</h3></div>
        <button type="button" onClick={() => onShowProjects("active")}>{t("查看全部")}<ChevronRight aria-hidden="true" /></button></header>
        {activeRecords.length ? <div className="home-project-list">{activeRecords.slice(0, 6).map((record) =>
          <button type="button" className="home-project-row" key={record.id} onClick={() => onOpen(record.kind, record.id)}>
            <ProgressBar value={record.percentage} compact /><span><strong>{record.entity.legalName}</strong>
              <small>{engagementTypesLabel(record.engagement, language) || t("项目类型未设置")}</small>
              {nextEngagementAction(record.engagement)?.node && <small className="home-card-next">{t("下一步")}：{nextEngagementAction(record.engagement).node.title}</small>}</span><span><strong>{yearEndOrPeriodLabel(record.engagement, language)}</strong>
                <small>{record.engagement.owner || t("未设置负责人")}</small></span><time>{record.engagement.dueDate
                  ? t("截止：{date}", { date: formatDate(record.engagement.dueDate, language) }) : t("未设置截止日")}</time>
            <ChevronRight aria-hidden="true" /></button>)}</div>
          : <div className="home-overview-empty compact"><CheckCircle2 aria-hidden="true" /><strong>{t("没有进行中的项目")}</strong>
            <span>{store.entities.some((entity) => !entity.archived) ? t("从优先处理区建立年度项目。") : t("新建公司后即可建立项目。")}</span></div>}
      </section>
    </div>
  </section>;
}
