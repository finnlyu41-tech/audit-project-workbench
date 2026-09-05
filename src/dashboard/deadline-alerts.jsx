import React from "react";
import { BellRing, Building, Building2, ChevronRight, ReceiptText, Search } from "lucide-react";
import { formatDate } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { handleTabListKeyDown, tabIndexFor } from "./a11y.js";
import { deadlineAlertActionName, deadlineAlertTitle, deadlineAlertUrgency, filterDeadlineAlerts } from "./deadline-alert-view.js";

function alertContext(alert, t) {
  if (alert.scope === "tax") return `${alert.recordName} · ${alert.owner || t("未设置负责人")}`;
  const type = alert.scope === "group" ? t("控股公司截止日")
    : alert.scope === "project" ? t("项目截止日") : alert.recordName;
  return `${type} · ${alert.owner || t("未设置负责人")}`;
}
function AlertIcon({ scope }) {
  if (scope === "tax") return <ReceiptText aria-hidden="true" />;
  if (scope === "group") return <Building2 aria-hidden="true" />;
  return <Building aria-hidden="true" />;
}

export function DeadlineAlertCentre({ alerts, onOpen }) {
  const { language, t } = useUiLanguage();
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [urgency, setUrgency] = React.useState("all");
  const searchRef = React.useRef(null);
  const visible = filterDeadlineAlerts(alerts, language, { query, scope: filter, urgency });
  const matches = filterDeadlineAlerts(alerts, language, { query, urgency });
  const taxCount = matches.filter((alert) => alert.scope === "tax").length;
  const filtered = Boolean(query || filter !== "all" || urgency !== "all");
  const clearFilters = () => {
    setFilter("all"); setQuery(""); setUrgency("all"); searchRef.current?.focus();
  };
  return <div className="deadline-alert-centre">
    <header className="deadline-alert-summary"><span><BellRing aria-hidden="true" /></span><div>
      <strong>{alerts.length ? t("{count} 项期限需要关注", { count: alerts.length }) : t("目前没有需要关注的期限")}</strong>
      <small>{t("项目逾期时显示提醒；税务期限同时显示即将到期事项。")}</small>
    </div></header>
    <div className="deadline-alert-search-tools">
      <label className="deadline-alert-search"><span>{t("查找期限提醒")}</span><span><Search aria-hidden="true" />
        <input ref={searchRef} autoFocus type="search" value={query} aria-label={t("查找期限提醒")}
          placeholder={t("公司、负责人、期限类型或年度")} onChange={(event) => setQuery(event.target.value)} />
      </span></label>
      <label><span>{t("提醒紧急程度")}</span><select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
        <option value="all">{t("全部紧急程度")}</option><option value="overdue">{t("已逾期")}</option>
        <option value="due_today">{t("今天到期")}</option><option value="due_soon">{t("即将到期")}</option>
      </select></label>
    </div>
    <div className="deadline-alert-filters" role="tablist" aria-label={t("期限筛选")} onKeyDown={handleTabListKeyDown}>
      {[["all", "全部", matches.length], ["tax", "税务", taxCount], ["delivery", "项目", matches.length - taxCount]]
        .map(([value, label, count]) => <button type="button" role="tab" key={value}
          aria-selected={filter === value} tabIndex={tabIndexFor(filter === value)} onClick={() => setFilter(value)}>
          <span>{t(label)}</span><strong>{count}</strong></button>)}
    </div>
    <div className="deadline-alert-results"><span role="status">
      {t("显示 {visible} / {total} 项", { visible: visible.length, total: alerts.length })}</span>
      {filtered && <button type="button" className="button secondary" onClick={clearFilters}>{t("清除提醒筛选")}</button>}
    </div>
    {visible.length ? <div className="deadline-alert-list">{visible.map((alert) => <button type="button"
      className="deadline-alert-row" key={alert.id} onClick={() => onOpen(alert)} data-alert-id={alert.id}
      data-urgency={deadlineAlertUrgency(alert)}
      aria-label={alert.urgency === "due_today" ? t("打开 {name}，今天到期", { name: deadlineAlertActionName(alert, language) })
        : alert.urgency === "due_soon" ? t("打开 {name}，{count} 天后到期", { name: deadlineAlertActionName(alert, language), count: alert.daysUntil })
          : t("打开 {name}，已逾期 {count} 天", { name: deadlineAlertActionName(alert, language), count: alert.daysOverdue })}>
      <i data-scope={alert.scope} data-urgency={deadlineAlertUrgency(alert)}><AlertIcon scope={alert.scope} /></i>
      <span className="deadline-alert-copy"><strong>{deadlineAlertTitle(alert, language)}</strong>
        <small>{alertContext(alert, t)}</small></span>
      <span className="deadline-alert-age" data-urgency={deadlineAlertUrgency(alert)}><strong>{alert.urgency === "due_today"
        ? t("今天到期") : alert.urgency === "due_soon" ? t("{count} 天后到期", { count: alert.daysUntil })
          : t("逾期 {count} 天", { count: alert.daysOverdue })}</strong>
        <time dateTime={alert.dueDate}>{formatDate(alert.dueDate, language)}</time></span>
      <ChevronRight aria-hidden="true" /></button>)}</div>
      : <div className="deadline-alert-empty"><BellRing aria-hidden="true" /><strong>{t("这个筛选下没有需要关注的期限")}</strong>
        <span>{t(filtered ? "清除筛选可查看其他提醒；筛选不会修改期限。" : "完成、改期、标记不适用或归档后，相关提醒会自动消失。")}</span></div>}
  </div>;
}
