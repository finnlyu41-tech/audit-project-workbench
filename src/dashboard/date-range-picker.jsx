import React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatDate } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]) ? date : null;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function addMonths(value, count) {
  return new Date(value.getFullYear(), value.getMonth() + count, 1, 12);
}

function calendarDates(month) {
  const first = startOfMonth(month);
  const leading = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function orderedRange(first, second) {
  return first <= second ? [first, second] : [second, first];
}

export function DateRangePicker({ startDate = "", dueDate = "", onChange, autoFocus = false }) {
  const { language, t } = useUiLanguage();
  const calendarId = React.useId();
  const openerRef = React.useRef(null);
  const initialMonth = () => startOfMonth(parseIsoDate(startDate) || parseIsoDate(dueDate) || new Date());
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(initialMonth);
  const [anchorDate, setAnchorDate] = React.useState("");
  const [hoverDate, setHoverDate] = React.useState("");
  const locale = language === "en" ? "en-GB" : "zh-HK";
  const monthFormatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" });
  const fullDateFormatter = new Intl.DateTimeFormat(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index, 12);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  });
  const dates = calendarDates(month);
  const preview = anchorDate ? orderedRange(anchorDate, hoverDate || anchorDate)
    : (startDate && dueDate ? orderedRange(startDate, dueDate) : [startDate, dueDate]);

  const toggleCalendar = () => {
    if (!open) {
      setMonth(initialMonth());
      setAnchorDate("");
      setHoverDate("");
    }
    setOpen((current) => !current);
  };
  const chooseDate = (dateValue) => {
    if (!anchorDate) {
      setAnchorDate(dateValue);
      setHoverDate(dateValue);
      return;
    }
    const [nextStart, nextDue] = orderedRange(anchorDate, dateValue);
    onChange(nextStart, nextDue);
    setOpen(false);
    setAnchorDate("");
    setHoverDate("");
    window.requestAnimationFrame(() => openerRef.current?.focus());
  };
  const clearDates = () => {
    onChange("", "");
    setOpen(false);
    setAnchorDate("");
    setHoverDate("");
    window.requestAnimationFrame(() => openerRef.current?.focus());
  };

  return <div className="schedule-range-picker" onKeyDown={(event) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    setAnchorDate("");
    openerRef.current?.focus();
  }}>
    <div className="schedule-range-fields">
      <label><span>{t("开始日")}</span><input autoFocus={autoFocus} aria-label={t("项目开始日")} type="date"
        value={startDate} max={dueDate || undefined} onChange={(event) => onChange(event.target.value, dueDate)} /></label>
      <span className="schedule-range-arrow" aria-hidden="true">→</span>
      <label><span>{t("截止日")}</span><input aria-label={t("项目截止日")} type="date"
        value={dueDate} min={startDate || undefined} onChange={(event) => onChange(startDate, event.target.value)} /></label>
      <button ref={openerRef} type="button" className="schedule-range-open icon-only"
        aria-label={t("选择项目日期范围")} aria-expanded={open} aria-controls={calendarId}
        title={t("选择项目日期范围")} data-tooltip={t("选择项目日期范围")} data-tooltip-side="left" onClick={toggleCalendar}><CalendarDays aria-hidden="true" /></button>
    </div>
    <small className="schedule-range-help">{t("打开一次日历，先选择开始日，再选择截止日。")}</small>
    {open && <section id={calendarId} className="schedule-range-calendar" role="dialog" aria-label={t("项目日期范围") }>
      <header><button type="button" className="icon-only" aria-label={t("上个月")} data-tooltip={t("上个月")}
        onClick={() => setMonth((current) => addMonths(current, -1))}><ChevronLeft aria-hidden="true" /></button>
        <strong>{monthFormatter.format(month)}</strong>
        <button type="button" className="icon-only" aria-label={t("下个月")} data-tooltip={t("下个月")} data-tooltip-side="left"
          onClick={() => setMonth((current) => addMonths(current, 1))}><ChevronRight aria-hidden="true" /></button></header>
      <p aria-live="polite">{anchorDate
        ? t("已选择开始日 {date}，请选择截止日。", { date: formatDate(anchorDate, language) })
        : t("请选择开始日，再选择截止日。")}</p>
      <div className="schedule-range-weekdays" aria-hidden="true">{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}</div>
      <div className="schedule-range-days" role="grid">{dates.map((date) => {
        const dateValue = toIsoDate(date);
        const outside = date.getMonth() !== month.getMonth();
        const inRange = Boolean(preview[0] && preview[1] && dateValue >= preview[0] && dateValue <= preview[1]);
        const rangeStart = dateValue === preview[0];
        const rangeEnd = dateValue === preview[1];
        return <button type="button" role="gridcell" key={dateValue} data-date={dateValue}
          data-outside={outside || undefined} data-in-range={inRange || undefined}
          data-range-start={rangeStart || undefined} data-range-end={rangeEnd || undefined}
          aria-selected={rangeStart || rangeEnd} aria-label={fullDateFormatter.format(date)}
          onMouseEnter={() => anchorDate && setHoverDate(dateValue)} onFocus={() => anchorDate && setHoverDate(dateValue)}
          onClick={() => chooseDate(dateValue)}>{date.getDate()}</button>;
      })}</div>
      <footer><button type="button" className="text-button" onClick={clearDates}><X aria-hidden="true" />{t("清除日期")}</button>
        <span>{startDate && dueDate ? `${formatDate(startDate, language)} → ${formatDate(dueDate, language)}` : t("尚未设置项目日期")}</span></footer>
    </section>}
  </div>;
}
