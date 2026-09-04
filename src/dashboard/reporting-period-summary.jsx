import React from "react";
import { engagementReportingPeriods, formalReportingPeriodLabel, inferPeriodPreset,
  yearEndOrPeriodLabel } from "./model.js";

function reportingYearRange(periods) {
  const years = periods.map((period) => (period.periodEnd || period.periodStart || "").slice(0, 4))
    .filter((year) => /^\d{4}$/u.test(year));
  if (!years.length) return "";
  return years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`;
}

export function ReportingPeriodSummary({ engagement, language, t, className = "", owner = "", compact = false }) {
  const periods = engagementReportingPeriods(engagement);
  const fullLabel = yearEndOrPeriodLabel(engagement, language) || t("未设置报告期间");
  const accessibleLabel = [fullLabel, owner].filter(Boolean).join(" · ");
  if (periods.length <= 1) return <small className={className} title={accessibleLabel}>{accessibleLabel}</small>;

  const yearEndsOnly = periods.every((period) => ["calendar", "apr_mar"]
    .includes(inferPeriodPreset(period.periodStart, period.periodEnd)));
  if (compact) {
    const countLabel = t(yearEndsOnly ? "{count} 个年结日" : "{count} 个报告期间", { count: periods.length });
    return <small className={`${className} period-summary-compact`} aria-label={accessibleLabel} title={accessibleLabel}>
      {[countLabel, reportingYearRange(periods)].filter(Boolean).join(" · ")}
    </small>;
  }

  const values = periods.map((period) => yearEndsOnly
    ? formalReportingPeriodLabel(period, language) : yearEndOrPeriodLabel(period, language));
  return <small className={`${className} period-summary`} aria-label={accessibleLabel} title={accessibleLabel}>
    <span className="period-summary-heading">{t(yearEndsOnly ? "年结日" : "报告期间")}</span>
    <span className="period-summary-values">{values.map((value, index) =>
      <span className="period-summary-value" key={periods[index].id}>{value}</span>)}</span>
    {owner && <span className="period-summary-owner">{owner}</span>}
  </small>;
}
