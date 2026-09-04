import React from "react";
import { Building, Building2, CalendarClock, CircleAlert, GripVertical, LocateFixed, ReceiptText } from "lucide-react";
import { formatDate, groupProgress, projectStats, taxDeadlineCategoryLabel, taxDeadlineUrgency,
  workspaceScheduleOrder } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

const DAY_MS = 86400000;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

function endOfWeek(value) {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function matchesFilter(item, complete, filter) {
  if (filter === "archived") return item.archived;
  if (item.archived) return false;
  if (filter === "completed") return complete;
  if (filter === "active") return !complete;
  return true;
}

function scheduleRows(store, filter) {
  const projects = store.projects.map((project) => ({
    id: project.id,
    kind: "project",
    name: project.entity || project.name,
    secondaryName: project.entity && project.name !== project.entity ? project.name : "",
    owner: project.owner,
    startDate: project.startDate,
    dueDate: project.dueDate,
    taxDeadlines: (project.taxDeadlines || []).filter((deadline) => deadline.state === "open" && deadline.dueDate),
    archived: project.archived,
    complete: projectStats(project).complete,
  }));
  const groups = store.groups.map((group) => ({
    id: group.id,
    kind: "group",
    name: group.name,
    secondaryName: "",
    owner: group.owner,
    startDate: group.startDate,
    dueDate: group.dueDate,
    taxDeadlines: (group.taxDeadlines || []).filter((deadline) => deadline.state === "open" && deadline.dueDate),
    archived: group.archived,
    complete: groupProgress(store, group.id).ready,
  }));
  const order = new Map(workspaceScheduleOrder(store).map((key, index) => [key, index]));
  return [...projects, ...groups].filter((row) => matchesFilter(row, row.complete, filter)).sort((left, right) =>
    (order.get(`${left.kind}:${left.id}`) ?? Number.MAX_SAFE_INTEGER)
      - (order.get(`${right.kind}:${right.id}`) ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name));
}

function makeTimeline(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const suppliedDates = rows.flatMap((row) => [parseDate(row.startDate), parseDate(row.dueDate),
    ...(row.taxDeadlines || []).map((deadline) => parseDate(deadline.dueDate))]).filter(Boolean);
  const earliest = suppliedDates.length ? new Date(Math.min(today.getTime(), ...suppliedDates.map((date) => date.getTime()))) : addDays(today, -28);
  const latest = suppliedDates.length ? new Date(Math.max(today.getTime(), ...suppliedDates.map((date) => date.getTime()))) : addDays(today, 84);
  let rangeStart = startOfWeek(addDays(earliest, -7));
  let rangeEnd = endOfWeek(addDays(latest, 7));
  const minimumEnd = endOfWeek(addDays(rangeStart, 83));
  if (rangeEnd < minimumEnd) rangeEnd = minimumEnd;
  const weekCount = Math.ceil((rangeEnd.getTime() - rangeStart.getTime() + DAY_MS) / (DAY_MS * 7));
  const weekWidth = weekCount > 78 ? 28 : weekCount > 56 ? 34 : 42;
  const weeks = Array.from({ length: weekCount }, (_, index) => addDays(rangeStart, index * 7));
  const monthGroups = [];
  weeks.forEach((week) => {
    const key = `${week.getFullYear()}-${week.getMonth()}`;
    const latestGroup = monthGroups.at(-1);
    if (latestGroup?.key === key) latestGroup.weeks += 1;
    else monthGroups.push({ key, date: week, weeks: 1 });
  });
  return { today, rangeStart, rangeEnd, weekCount, weekWidth, weeks, monthGroups };
}

function dayOffset(date, rangeStart) {
  return (date.getTime() - rangeStart.getTime()) / DAY_MS;
}

export function ProjectSchedule({ store, filter, onOpen, onEditSchedule, onOpenTaxDeadline, onReorder }) {
  const { language, t } = useUiLanguage();
  const scrollRef = React.useRef(null);
  const draggingRef = React.useRef(null);
  const [draggingKey, setDraggingKey] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);
  const rows = React.useMemo(() => scheduleRows(store, filter), [store, filter]);
  const timeline = React.useMemo(() => makeTimeline(rows), [rows]);
  const width = timeline.weekCount * timeline.weekWidth;
  const scheduledCount = rows.filter((row) => row.startDate && row.dueDate).length;
  const incompleteCount = rows.length - scheduledCount;
  const todayLeft = (dayOffset(timeline.today, timeline.rangeStart) / 7) * timeline.weekWidth;
  const locale = language === "en" ? "en-GB" : "zh-HK";
  const weekFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const monthFormatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" });
  const finishDrag = () => {
    draggingRef.current = null;
    setDraggingKey(null);
    setDropTarget(null);
  };
  const beginDrag = (event, key) => {
    draggingRef.current = key;
    setDraggingKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-audit-workbench-schedule", key);
    event.dataTransfer.setData("text/plain", key);
  };
  const dragOver = (event, targetKey) => {
    const sourceKey = draggingRef.current;
    if (!sourceKey || sourceKey === targetKey) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget({ key: targetKey, position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" });
  };
  const drop = (event, targetKey) => {
    const sourceKey = draggingRef.current;
    if (!sourceKey || sourceKey === targetKey) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    onReorder?.(sourceKey, targetKey, position);
    finishDrag();
  };
  const reorderWithKeyboard = (event, key) => {
    if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    const index = rows.findIndex((row) => `${row.kind}:${row.id}` === key);
    const target = rows[index + (event.key === "ArrowUp" ? -1 : 1)];
    if (!target) return;
    event.preventDefault();
    onReorder?.(key, `${target.kind}:${target.id}`, event.key === "ArrowUp" ? "before" : "after");
  };

  const scrollToToday = () => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const fixedColumnWidth = viewport.querySelector(".schedule-corner")?.getBoundingClientRect().width || 0;
    const visibleTimelineWidth = Math.max(0, viewport.clientWidth - fixedColumnWidth);
    const requestedLeft = fixedColumnWidth + todayLeft - visibleTimelineWidth / 2;
    viewport.scrollTo({ left: Math.min(Math.max(0, requestedLeft), viewport.scrollWidth - viewport.clientWidth), behavior: "smooth" });
  };
  const horizontalWheel = (event) => {
    const viewport = event.currentTarget;
    if (viewport.scrollWidth <= viewport.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const maximum = viewport.scrollWidth - viewport.clientWidth;
    if ((event.deltaY < 0 && viewport.scrollLeft <= 0) || (event.deltaY > 0 && viewport.scrollLeft >= maximum)) return;
    event.preventDefault();
    viewport.scrollLeft = Math.min(maximum, Math.max(0, viewport.scrollLeft + event.deltaY));
  };

  return <section className="schedule-view">
    <header className="schedule-heading"><div><span className="workspace-label">{t("排期")}</span>
      <h2>{t("项目排期")}</h2><p>{t("按自定义顺序查看每个公司及控股公司的开始日、截止日和横向工期。")}</p></div>
      <div className="schedule-heading-actions"><div className="schedule-summary">
        <span>{t("{count} 项已排期", { count: scheduledCount })}</span>
        <span data-alert={incompleteCount > 0 || undefined}>{t("{count} 项日期待补", { count: incompleteCount })}</span></div>
        <button type="button" className="button secondary" onClick={scrollToToday}><LocateFixed aria-hidden="true" />{t("今天")}</button></div>
    </header>
    <div className="schedule-legend" aria-label={t("排期图例")}><span><i data-tone="active" />{t("进行中")}</span>
      <span><i data-tone="complete" />{t("已完成")}</span><span><i data-tone="overdue" />{t("已逾期")}</span>
      <span><ReceiptText aria-hidden="true" />{t("税务期限")}</span>
      <span><CircleAlert aria-hidden="true" />{t("日期不完整")}</span></div>
    {rows.length ? <div className="schedule-scroll" ref={scrollRef} tabIndex="0" onWheel={horizontalWheel}
      aria-label={t("可横向滚动的项目排期")}>
      <div className="schedule-grid" style={{ "--timeline-width": `${width}px`, "--week-width": `${timeline.weekWidth}px` }}>
        <div className="schedule-corner"><strong>{t("公司／控股公司")}</strong><span>{t("负责人 · 开始日 → 截止日")}</span></div>
        <div className="schedule-calendar-header" style={{ width }}>
          <div className="schedule-months">{timeline.monthGroups.map((month) => <span key={month.key}
            style={{ width: month.weeks * timeline.weekWidth }}>{monthFormatter.format(month.date)}</span>)}</div>
          <div className="schedule-weeks">{timeline.weeks.map((week, index) => <span key={week.toISOString()}
            data-compact={timeline.weekWidth < 34 || undefined}>{(timeline.weekWidth < 34 && index % 2) ? "" : weekFormatter.format(week)}</span>)}</div>
          {todayLeft >= 0 && todayLeft <= width && <span className="schedule-today-header" style={{ left: todayLeft }}
            aria-hidden="true"><b>{t("今天")}</b></span>}
        </div>
        {rows.map((row) => {
          const rowKey = `${row.kind}:${row.id}`;
          const dropPosition = dropTarget?.key === rowKey ? dropTarget.position : undefined;
          const canReorder = filter !== "archived" && !row.archived;
          const start = parseDate(row.startDate);
          const due = parseDate(row.dueDate);
          const invalid = Boolean(start && due && due < start);
          const overdue = Boolean(due && due < timeline.today && !row.complete && !row.archived);
          const tone = row.archived ? "archived" : row.complete ? "complete" : overdue ? "overdue" : "active";
          const barLeft = start ? (dayOffset(start, timeline.rangeStart) / 7) * timeline.weekWidth : null;
          const dueLeft = due ? (dayOffset(due, timeline.rangeStart) / 7) * timeline.weekWidth : null;
          const durationDays = start && due && !invalid ? Math.max(1, dayOffset(due, start) + 1) : 0;
          const barWidth = durationDays ? Math.max(8, (durationDays / 7) * timeline.weekWidth) : 0;
          const durationWeeks = durationDays ? Math.max(1, Math.ceil(durationDays / 7)) : 0;
          const taxMarkers = Object.values((row.taxDeadlines || []).reduce((groups, deadline) => ({ ...groups,
            [deadline.dueDate]: [...(groups[deadline.dueDate] || []), deadline] }), {}));
          const openSchedule = () => row.archived || !onEditSchedule
            ? onOpen(row.kind, row.id) : onEditSchedule(row.kind, row.id);
          return <React.Fragment key={rowKey}>
            <div className="schedule-row-meta" data-dragging={draggingKey === rowKey || undefined}
              data-drop-position={dropPosition} onDragOver={(event) => dragOver(event, rowKey)}
              onDrop={(event) => drop(event, rowKey)}>
              {canReorder ? <button type="button" className="schedule-drag-handle" draggable="true"
                aria-label={t("拖动调整“{name}”的排期顺序；按 Alt 加上下方向键也可移动", { name: row.name })}
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                data-tooltip={t("拖动调整顺序；Alt + 上下方向键也可移动")}
                onDragStart={(event) => beginDrag(event, rowKey)} onDragEnd={finishDrag}
                onKeyDown={(event) => reorderWithKeyboard(event, rowKey)}><GripVertical aria-hidden="true" /></button>
                : <span className="schedule-drag-spacer" aria-hidden="true" />}
              <button type="button" className="schedule-row-open" onClick={() => onOpen(row.kind, row.id)}>
                <i data-kind={row.kind}>{row.kind === "group" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>
                <span><strong>{row.name}</strong>{row.secondaryName && <small>{row.secondaryName}</small>}
                  <small>{row.owner || t("未设置负责人")} · {row.startDate ? formatDate(row.startDate, language) : t("未设置开始日")}
                    <b aria-hidden="true">→</b>{row.dueDate ? formatDate(row.dueDate, language) : t("未设置截止日")}</small></span>
              </button>
              {!row.archived && <button type="button" className="schedule-row-edit"
                aria-label={t("编辑“{name}”的项目排期", { name: row.name })}
                data-tooltip={t("编辑项目开始日和截止日")}
                onClick={() => onEditSchedule?.(row.kind, row.id)}><CalendarClock aria-hidden="true" /></button>}
            </div>
            <div className="schedule-lane" style={{ width }} data-tone={tone} data-drop-position={dropPosition}
              onDragOver={(event) => dragOver(event, rowKey)} onDrop={(event) => drop(event, rowKey)}>
              {todayLeft >= 0 && todayLeft <= width && <span className="schedule-today-line" style={{ left: todayLeft }} aria-hidden="true" />}
              {start && due && !invalid && <button type="button" className="schedule-bar" style={{ left: barLeft, width: barWidth }}
                data-tone={tone} onClick={openSchedule}
                aria-label={t("{name}：{start} 至 {deadline}", { name: row.name, start: formatDate(row.startDate, language), deadline: formatDate(row.dueDate, language) })}
                data-tooltip={t("{start} 至 {deadline} · {weeks} 周", { start: formatDate(row.startDate, language), deadline: formatDate(row.dueDate, language), weeks: durationWeeks })}>
                {barWidth >= 52 && <span>{durationWeeks}{t("周")}</span>}</button>}
              {!invalid && start && !due && <button type="button" className="schedule-milestone" data-kind="start"
                style={{ left: barLeft }} onClick={openSchedule} data-tooltip={t("只有开始日，尚未设置截止日")}
                aria-label={t("{name}：只有开始日，尚未设置截止日", { name: row.name })}><CalendarClock aria-hidden="true" /></button>}
              {!invalid && due && !start && <button type="button" className="schedule-milestone" data-kind="deadline"
                style={{ left: dueLeft }} onClick={openSchedule} data-tooltip={t("只有截止日，尚未设置开始日")}
                aria-label={t("{name}：只有截止日，尚未设置开始日", { name: row.name })}><CalendarClock aria-hidden="true" /></button>}
              {(!start && !due) && <button type="button" className="schedule-missing" onClick={openSchedule}
                aria-label={t(row.archived ? "查看“{name}”的归档记录" : "设置“{name}”的项目日期", { name: row.name })}>
                <CircleAlert aria-hidden="true" />{t(row.archived ? "查看归档记录" : "设置项目日期")}</button>}
              {invalid && <button type="button" className="schedule-missing" data-danger onClick={openSchedule}
                aria-label={t(row.archived ? "查看“{name}”的归档记录" : "{name}：截止日早于开始日", { name: row.name })}>
                <CircleAlert aria-hidden="true" />{t("截止日早于开始日")}</button>}
              {taxMarkers.map((deadlines) => {
                const markerDate = parseDate(deadlines[0].dueDate);
                if (!markerDate) return null;
                const markerLeft = (dayOffset(markerDate, timeline.rangeStart) / 7) * timeline.weekWidth;
                const urgency = deadlines.some((deadline) => taxDeadlineUrgency(deadline, timeline.today).level === "overdue") ? "overdue"
                  : deadlines.some((deadline) => taxDeadlineUrgency(deadline, timeline.today).level === "due_today") ? "due_today"
                    : deadlines.some((deadline) => taxDeadlineUrgency(deadline, timeline.today).level === "due_soon") ? "due_soon" : "upcoming";
                const names = deadlines.map((deadline) => taxDeadlineCategoryLabel(deadline, language)).join(" · ");
                return <button type="button" className="schedule-tax-marker" key={deadlines[0].dueDate}
                  style={{ left: markerLeft }} data-urgency={urgency}
                  onClick={() => onOpenTaxDeadline?.(row.kind, row.id, deadlines.length === 1 ? deadlines[0].id : null)}
                  aria-label={t("{name} 在 {date} 有 {count} 项税务期限", { name: row.name,
                    date: formatDate(deadlines[0].dueDate, language), count: deadlines.length })}
                  data-tooltip={`${formatDate(deadlines[0].dueDate, language)} · ${names}`}>
                  <ReceiptText aria-hidden="true" />{deadlines.length > 1 && <strong>{deadlines.length}</strong>}</button>;
              })}
            </div>
          </React.Fragment>;
        })}
      </div>
    </div> : <div className="schedule-empty"><CalendarClock aria-hidden="true" /><strong>{t("这个筛选条件下没有项目")}</strong>
      <span>{t("在左侧切换状态，或新建公司后设置项目开始日和截止日。")}</span></div>}
  </section>;
}
