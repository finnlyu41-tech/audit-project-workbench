import React from "react";
import { ArrowRight } from "lucide-react";
import { formatDate, outstandingIsOpen, projectStats } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import "./project-focus-summary.css";

export function ProjectFocusSummary({ engagement, store, next, onContinue, readOnly = false, holding = false }) {
  const { language, t } = useUiLanguage();
  const stats = projectStats(engagement);
  const openOutstanding = (engagement.outstandingItems || [])
    .filter((item) => outstandingIsOpen(item, store?.outstandingStatuses)).length;
  const nextLabel = next?.item?.title || next?.node?.title
    || (next?.workstreamId ? t("为业务模块添加节点") : stats.complete ? t("已完成") : stats.workstreams ? t("未设置") : t("未开始"));
  const canContinue = Boolean(!readOnly && next && onContinue && (!holding || engagement.nextAction));
  const nextContent = <span><small>{t("下一步")}</small><strong>{nextLabel}</strong></span>;

  return <div className="project-focus-summary" data-testid="project-focus-summary">
    {canContinue ? <button type="button" className="project-focus-next" onClick={() => onContinue(next)}>
      {nextContent}<ArrowRight aria-hidden="true" />
    </button> : <div className="project-focus-next" data-readonly="true">{nextContent}</div>}
    <dl className="project-focus-facts">
      <div><dt>{t("截止日")}</dt><dd>{engagement.dueDate ? formatDate(engagement.dueDate, language) : t("未设置截止日")}</dd></div>
      <div><dt>{t("待清")}</dt><dd>{t("{count} 项未完成", { count: openOutstanding })}</dd></div>
      <div><dt>{t("业务模块")}</dt><dd>{stats.workstreams
        ? t("已完成 {done}/{total}", { done: stats.completedWorkstreams, total: stats.workstreams }) : t("未开始")}</dd></div>
    </dl>
  </div>;
}
