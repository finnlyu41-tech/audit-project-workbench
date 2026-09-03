import React from "react";
import { BellRing, Building, Building2, ChevronRight, Layers3 } from "lucide-react";
import { formatDate, workstreamTypeLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

function alertTitle(alert, language, t) {
  if (alert.scope === "workstream") {
    return workstreamTypeLabel(alert.workstream?.type, language, alert.workstream?.customName);
  }
  return alert.recordName;
}

function alertContext(alert, t) {
  const type = alert.scope === "group" ? t("控股公司截止日")
    : alert.scope === "project" ? t("项目截止日") : alert.recordName;
  return `${type} · ${alert.owner || t("未设置负责人")}`;
}

function AlertIcon({ scope }) {
  if (scope === "group") return <Building2 aria-hidden="true" />;
  if (scope === "workstream") return <Layers3 aria-hidden="true" />;
  return <Building aria-hidden="true" />;
}

export function DeadlineAlertCentre({ alerts, onOpen }) {
  const { language, t } = useUiLanguage();
  return <div className="deadline-alert-centre">
    <header className="deadline-alert-summary"><span><BellRing aria-hidden="true" /></span><div>
      <strong>{alerts.length ? t("{count} 项截止日期已逾期", { count: alerts.length }) : t("目前没有逾期事项")}</strong>
      <small>{t("只显示未归档且尚未完成的项目、控股公司和业务模块。")}</small>
    </div></header>
    {alerts.length ? <div className="deadline-alert-list">{alerts.map((alert) => <button type="button"
      className="deadline-alert-row" key={alert.id} onClick={() => onOpen(alert)}
      aria-label={t("打开 {name}，已逾期 {count} 天", { name: alertTitle(alert, language, t), count: alert.daysOverdue })}>
      <i data-scope={alert.scope}><AlertIcon scope={alert.scope} /></i>
      <span className="deadline-alert-copy"><strong>{alertTitle(alert, language, t)}</strong>
        <small>{alertContext(alert, t)}</small></span>
      <span className="deadline-alert-age"><strong>{t("逾期 {count} 天", { count: alert.daysOverdue })}</strong>
        <time>{formatDate(alert.dueDate, language)}</time></span>
      <ChevronRight aria-hidden="true" /></button>)}</div>
      : <div className="deadline-alert-empty"><BellRing aria-hidden="true" /><strong>{t("所有截止日期均正常")}</strong>
        <span>{t("项目完成、改期或归档后，相关提醒会自动消失。")}</span></div>}
  </div>;
}
