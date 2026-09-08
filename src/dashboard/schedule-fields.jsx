import React from "react";
import { DateRangePicker } from "./date-range-picker.jsx";
import { formatDate } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { MAX_WORKDAYS, resolveScheduleDraft, SCHEDULE_ERRORS } from "./working-days.js";
import "./schedule-fields.css";

export function ScheduleFields({ draft, onDraftChange, startDate, dueDate, onChange, autoFocus = false }) {
  const { language, t } = useUiLanguage();
  const helpId = React.useId(), errorId = React.useId();
  const result = resolveScheduleDraft(draft, { startDate, dueDate });
  const change = patch => onDraftChange({ ...draft, ...patch, snapshot: null });
  const switchMode = mode => {
    if (mode !== draft.mode) change({ mode, requestedStartDate: startDate || draft.requestedStartDate,
      targetDueDate: dueDate || draft.targetDueDate });
  };
  const auto = draft.mode === "workdays", backwards = draft.direction === 'backward', count = draft.direction === 'count';
  const countOrDates = !auto || count;
  return <div className="schedule-fields">
    <div className="choice-tabs schedule-mode" role="group" aria-label={t("排期方式")}>
      {[["manual", "手动日期"], ["workdays", "按工作天数"]].map(([mode, label]) =>
        <button type="button" key={mode} aria-pressed={draft.mode === mode} data-active={draft.mode === mode || undefined}
          onClick={() => switchMode(mode)}>{t(label)}</button>)}
    </div>
    {auto && <div className="efficiency-grid">
      <label><span>{t('计算方向')}</span><select value={draft.direction || 'forward'} onChange={event => change({ direction: event.target.value,
        requestedStartDate: startDate || draft.requestedStartDate, targetDueDate: dueDate || draft.targetDueDate })}>
        <option value="forward">{t('开始日＋天数 → 结束日')}</option><option value="backward">{t('最迟完成日＋天数 → 开始日')}</option>
        <option value="count">{t('开始日＋结束日 → 工作天数')}</option></select></label>
      <label><span>{t('工作周')}</span><select value={draft.workweek || 'mon-fri'} onChange={event => change({ workweek: event.target.value })}>
        <option value="mon-fri">{t('周一至周五')}</option><option value="mon-sat">{t('周一至周六')}</option></select></label>
    </div>}
    {countOrDates ? <DateRangePicker startDate={startDate} dueDate={dueDate} onChange={onChange} autoFocus={autoFocus} /> : <>
      <div className="working-day-inputs">
        <label><span>{t("预计工作天数")}</span><input autoFocus={autoFocus} aria-label={t("预计工作天数")}
          type="number" inputMode="numeric" min="1" max={MAX_WORKDAYS} step="1" required value={draft.workdays}
          aria-describedby={`${helpId}${result.error === "duration" ? ` ${errorId}` : ""}`}
          aria-invalid={result.error === "duration" || undefined} onChange={event => change({ workdays: event.target.value })} /></label>
        {backwards ? <label><span>{t('最迟完成日')}</span><input type="date" aria-label={t('最迟完成日')} required
          min="0001-01-01" max="9999-12-31" value={draft.targetDueDate || ''} onChange={event => change({ targetDueDate: event.target.value })} /></label>
          : <label><span>{t("开始日")}</span><input aria-label={t("项目开始日")} type="date" required min="0001-01-01" max="9999-12-31"
            value={draft.requestedStartDate} aria-describedby={helpId} onChange={event => change({ requestedStartDate: event.target.value })} /></label>}
        <label><span>{t(backwards ? '自动开始日' : "自动结束日")}</span><input aria-label={t(backwards ? '自动开始日' : "自动结束日")} type="date" readOnly
          value={result.error ? "" : backwards ? result.startDate : result.dueDate} aria-describedby={helpId} /></label>
      </div>
      {backwards && <label className="working-day-buffer"><span>{t('提前内部完成（工作天，可选）')}</span><input aria-label={t('提前内部完成（工作天，可选）')} type="number" min="0" max="1000" step="1"
        value={draft.bufferDays || '0'} onChange={event => change({ bufferDays: event.target.value })} />
        <small>{t('缓冲在预计工期之外；休息日截止时向前取工作日，不推迟最迟完成日。')}</small></label>}
    </>}
    {auto && <>
      <p className="working-day-help" id={helpId}>{t(draft.workweek === 'mon-sat'
        ? '香港公共假期 · 周一至周六工作 · 第一个工作日算第 1 天。'
        : "香港公共假期 · 周一至周五工作 · 第一个工作日算第 1 天。")}</p>
      <p className="working-day-coverage">{t("内置官方假期：2025—2027，可离线计算；不含个人休假或公司额外假期。")}</p>
      {result.error ? <p className="form-error" role="alert" id={errorId}>{t(SCHEDULE_ERRORS[result.error])}</p>
        : <div className="working-day-preview" role="status">
          <strong>{t("{days} 个工作天：{start} → {end}", { days: count ? result.workdays : draft.workdays,
            start: formatDate(result.startDate, language), end: formatDate(result.dueDate, language) })}</strong>
          {!result.saved && <span>{t("已跳过 {count} 天周末／公共假期。", { count: result.skippedDays })}</span>}
          {!backwards && !count && result.startDate !== draft.requestedStartDate && <span>{t("所选开始日为休息日，实际开始日顺延至 {date}。",
            { date: formatDate(result.startDate, language) })}</span>}
          {count && <span>{t('区间计数不会保存预计工期；两端日期保持手动设置。')}</span>}
          {result.saved && <span>{t("保留已保存日期；修改天数或开始日后才重新计算。")}</span>}
          {result.skippedDates?.length > 0 && <details><summary>{t('查看跳过的日期')}</summary><p>{result.skippedDates.join(' · ')}</p></details>}
        </div>}
    </>}
  </div>;
}
