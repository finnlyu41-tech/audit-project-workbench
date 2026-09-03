import React from "react";
import { BellRing, Building, Building2, ChevronRight, Layers3, ReceiptText } from "lucide-react";
import { formatDate, taxDeadlineCategoryLabel, workstreamTypeLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

function alertTitle(alert, language, t) {
  if (alert.scope === "tax") {
    const title = taxDeadlineCategoryLabel(alert.taxDeadline, language);
    return alert.taxDeadline?.taxYear ? `${title} · ${alert.taxDeadline.taxYear}` : title;
  }
  if (alert.scope === "workstream") {
    return workstreamTypeLabel(alert.workstream?.type, language, alert.workstream?.customName);
  }
  return alert.recordName;
}

function alertContext(alert, t) {
  if (alert.scope === "tax") return `${alert.recordName} · ${alert.owner || t("未设置负责人")}`;
  const type = alert.scope === "group" ? t("控股公司截止日")
    : alert.scope === "project" ? t("项目截止日") : alert.recordName;
  return `${type} · ${alert.owner || t("未设置负责人")}`;
}

function AlertIcon({ scope }) {
  if (scope === "tax") return <ReceiptText aria-hidden="true" />;
  if (scope === "group") return <Building2 aria-hidden="true" />;
  if (scope === "workstream") return <Layers3 aria-hidden="true" />;
  return <Building aria-hidden="true" />;
}

export function DeadlineAlertCentre({ alerts, onOpen }) {
  const { language, t } = useUiLanguage();
  const [filter, setFilter] = React.useState("all");
  const visible = alerts.filter((alert) => filter === "all" || (filter === "tax" ? alert.scope === "tax" : alert.scope !== "tax"));
  const taxCount = alerts.filter((alert) => alert.scope === "tax").length;
  const deliveryCount = alerts.length - taxCount;
  return <div className="deadline-alert-centre">
    <header className="deadline-alert-summary"><span><BellRing aria-hidden="true" /></span><div>
      <strong>{alerts.length ? t("{count} 项期限需要关注", { count: alerts.length }) : t("目前没有需要关注的期限")}</strong>
      <small>{t("项目及模块显示逾期事项；税务期限同时显示即将到期事项。")}</small>
    </div></header>
    <div className="deadline-alert-filters" role="tablist">{[["all", "全部", alerts.length], ["tax", "税务", taxCount],
      ["delivery", "项目与模块", deliveryCount]].map(([value, label, count]) => <button type="button" role="tab" key={value}
        aria-selected={filter === value} onClick={() => setFilter(value)}><span>{t(label)}</span><strong>{count}</strong></button>)}</div>
    {visible.length ? <div className="deadline-alert-list">{visible.map((alert) => <button type="button"
      className="deadline-alert-row" key={alert.id} onClick={() => onOpen(alert)}
      data-urgency={alert.urgency || "overdue"}
      aria-label={alert.urgency === "due_today" ? t("打开 {name}，今天到期", { name: alertTitle(alert, language, t) })
        : alert.urgency === "due_soon" ? t("打开 {name}，{count} 天后到期", { name: alertTitle(alert, language, t), count: alert.daysUntil })
          : t("打开 {name}，已逾期 {count} 天", { name: alertTitle(alert, language, t), count: alert.daysOverdue })}>
      <i data-scope={alert.scope} data-urgency={alert.urgency || "overdue"}><AlertIcon scope={alert.scope} /></i>
      <span className="deadline-alert-copy"><strong>{alertTitle(alert, language, t)}</strong>
        <small>{alertContext(alert, t)}</small></span>
      <span className="deadline-alert-age" data-urgency={alert.urgency || "overdue"}><strong>{alert.urgency === "due_today"
        ? t("今天到期") : alert.urgency === "due_soon" ? t("{count} 天后到期", { count: alert.daysUntil })
          : t("逾期 {count} 天", { count: alert.daysOverdue })}</strong>
        <time>{formatDate(alert.dueDate, language)}</time></span>
      <ChevronRight aria-hidden="true" /></button>)}</div>
      : <div className="deadline-alert-empty"><BellRing aria-hidden="true" /><strong>{t("这个筛选下没有需要关注的期限")}</strong>
        <span>{t("完成、改期、标记不适用或归档后，相关提醒会自动消失。")}</span></div>}
  </div>;
}
