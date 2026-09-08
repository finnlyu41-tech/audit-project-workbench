import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { formatDate } from './model.js';
import { HK_CALENDAR } from './hk-holidays.js';
import { estimateWorkingSchedule, MAX_ESTIMATED_WORKDAYS } from './working-day-schedule.js';

export function workingScheduleError(result, t) {
  const labels = { date: "请选择有效的预计开始日期。", days: "预计工作天数须为 1 至 1000 的整数。",
    week: "请选择有效的工作周。", coverage: "假期资料仅覆盖 2025–2027 年，无法可靠计算此排期。请调整范围或改用手动日期。" };
  return t(labels[result?.error] || "无法计算排期，请检查输入。");
}
export function WorkingDayFields({ value, onChange, autoFocus = false }) {
  const { language, t } = useUiLanguage();
  const result = React.useMemo(() => estimateWorkingSchedule(value), [value]);
  const update = field => event => onChange({ ...value, [field]: event.target.value });
  const hasInput = Boolean(value.startDate && value.workdays !== '');
  return <section className="working-day-estimate" aria-label={t("工作日排期估算")}>
    <div className="working-day-inputs">
      <label><span>{t("预计开始日")}</span><input autoFocus={autoFocus} type="date" value={value.startDate}
        min="0001-01-01" max="9999-12-31" required onChange={update('startDate')} /></label>
      <label><span>{t("预计工作天数")}</span><input type="number" inputMode="numeric" min="1"
        max={MAX_ESTIMATED_WORKDAYS} step="1" required value={value.workdays} onChange={update('workdays')} /></label>
      <label><span>{t("工作周")}</span><select value={value.workweek} onChange={update('workweek')}>
        <option value="five">{t("周一至周五")}</option><option value="six">{t("周一至周六")}</option></select></label>
    </div>
    <p className="working-day-rule">{t("香港公众假期 · 包含首个工作日；遇周末或假期顺延。")}</p>
    {!result.error && <div className="working-day-preview" aria-live="polite">
      <dl><div><dt>{t("实际开始日")}</dt><dd><time dateTime={result.startDate}>{formatDate(result.startDate, language)}</time></dd></div>
        <div><dt>{t("预计结束日")}</dt><dd><time dateTime={result.dueDate}>{formatDate(result.dueDate, language)}</time></dd></div></dl>
      {result.shifted && <p className="working-day-shift">{t("原开始日 {date} 不工作，开始日已顺延；保存后生效。", { date: formatDate(result.requestedStart, language) })}</p>}
      <p>{t("{workdays} 个工作日，实际期间横跨 {calendarDays} 个日历日。", { workdays: result.workdays, calendarDays: result.calendarDays })}</p>
      {result.skipped.length > 0 && <details className="working-day-skipped"><summary>{t("查看跳过的日期（{count} 天）", { count: result.skipped.length })}</summary>
        <ul>{result.skipped.map(day => <li key={day.date}><time dateTime={day.date}>{formatDate(day.date, language)}</time>
          <span>{day.holiday ? day.holiday[language] || day.holiday.en : t("周末")}</span></li>)}</ul></details>}
    </div>}
    {result.error && hasInput && <p className="working-day-warning" role="alert">{workingScheduleError(result, t)}</p>}
    <small>{t("保存只采用计算后的起止日期，不影响报告期间和税务期限。重新打开后可手动调整。")}</small>
    <details className="working-day-calendar-info"><summary>{t("假期来源与适用范围")}</summary>
      <p>{t("香港公众假期，非劳工假期；周六是否工作按上方工作周选择。不包含个人年假或临时停工。")}</p>
      <p>{t("内置 2025–2027 年官方假期，核对日期：{date}。无网络也可计算；超出覆盖不作推算。", { date: HK_CALENDAR.checkedAt })}</p>
      <p>{t("来源：GovHK 与 1823。此功能估算连续工作日历时，不是人日、人员负荷或合规判断。")}</p>
    </details>
  </section>;
}
