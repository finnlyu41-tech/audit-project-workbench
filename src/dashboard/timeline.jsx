import React from "react";
import { Building, Building2, CalendarClock, CircleAlert, Eye, EyeOff, LocateFixed, ReceiptText } from "lucide-react";
import { engagementLatestPeriodEnd, engagementTypesLabel, formatDate, groupProgress, projectStats, taxDeadlineCategoryLabel, taxDeadlineUrgency,
  workspaceScheduleOrder, yearEndOrPeriodLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { ReportingPeriodSummary } from "./reporting-period-summary.jsx";

const DAY_MS = 86400000;
const SCHEDULE_META_WIDTH_KEY = "audit-progress-workbench:schedule-meta-width";
const SCHEDULE_PRECISION_KEY = "audit-progress-workbench:schedule-precision";
const SCHEDULE_PRECISIONS = ["day", "week", "month"];
const DEFAULT_META_WIDTH = 310;
const MIN_META_WIDTH = 250;
const MAX_META_WIDTH = 560;

function clampMetaWidth(value) {
  return Math.min(MAX_META_WIDTH, Math.max(MIN_META_WIDTH, Math.round(Number(value) || DEFAULT_META_WIDTH)));
}

function savedMetaWidth() {
  try { return clampMetaWidth(window.localStorage.getItem(SCHEDULE_META_WIDTH_KEY)); }
  catch { return DEFAULT_META_WIDTH; }
}

function saveMetaWidth(value) {
  try { window.localStorage.setItem(SCHEDULE_META_WIDTH_KEY, String(clampMetaWidth(value))); }
  catch { /* Layout preferences can safely fall back to the default width. */ }
}

function savedPrecision() {
  try {
    const value = window.localStorage.getItem(SCHEDULE_PRECISION_KEY);
    return SCHEDULE_PRECISIONS.includes(value) ? value : "week";
  } catch { return "week"; }
}

function savePrecision(value) {
  try { window.localStorage.setItem(SCHEDULE_PRECISION_KEY, value); }
  catch { /* Layout preferences can safely fall back to the weekly view. */ }
}

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

function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function addMonths(value, months) {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function calendarDayNumber(value) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY_MS;
}

function matchesFilter(item, complete, filter) {
  if (filter === "archived") return item.archived;
  if (item.archived) return false;
  if (filter === "completed") return complete;
  if (filter === "active") return !complete;
  return true;
}

function scheduleRows(store, filter, language = "en") {
  if (Array.isArray(store.entities) && Array.isArray(store.engagements)) {
    const entityById = new Map(store.entities.map((entity) => [entity.id, entity]));
    const latestByEntity = new Map();
    store.engagements.filter((engagement) => !engagement.archived).forEach((engagement) => {
      const current = latestByEntity.get(engagement.entityId);
      if (!current || engagementLatestPeriodEnd(engagement) > engagementLatestPeriodEnd(current)) {
        latestByEntity.set(engagement.entityId, engagement);
      }
    });
    const order = new Map(workspaceScheduleOrder(store).map((key, index) => [key, index]));
    return store.engagements.flatMap((engagement) => {
      const entity = entityById.get(engagement.entityId);
      if (!entity) return [];
      const kind = entity.kind === "holding_company" ? "group" : "project";
      const view = kind === "group" ? store.groups.find((group) => group.id === engagement.id)
        : store.projects.find((project) => project.id === engagement.id);
      const complete = kind === "group" ? Boolean(view && groupProgress(store, engagement.id).ready)
        : Boolean(view && projectStats(view).complete);
      const row = {
        id: engagement.id,
        kind,
        name: entity.legalName,
        engagement,
        periodLabel: yearEndOrPeriodLabel(engagement, language),
        engagementTypes: engagement.engagementTypes || [],
        engagementType: engagement.engagementType || "",
        secondaryName: "",
        owner: engagement.owner,
        startDate: engagement.startDate,
        dueDate: engagement.dueDate,
        taxDeadlines: (entity.taxDeadlines || []).filter((deadline) => deadline.state === "open" && deadline.dueDate
          && (deadline.linkedEngagementId === engagement.id
            || (!deadline.linkedEngagementId && latestByEntity.get(entity.id)?.id === engagement.id))),
        archived: Boolean(entity.archived || engagement.archived),
        complete,
      };
      return matchesFilter(row, complete, filter) ? [row] : [];
    }).sort((left, right) => (order.get(`${left.kind}:${left.id}`) ?? Number.MAX_SAFE_INTEGER)
      - (order.get(`${right.kind}:${right.id}`) ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name));
  }
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

function rangeSegments(rangeStart, rangeEnd, unit, pixelsPerDay) {
  const segments = [];
  const endExclusive = addDays(rangeEnd, 1);
  let cursor = new Date(rangeStart);
  while (cursor < endExclusive) {
    const nextBoundary = unit === "year" ? new Date(cursor.getFullYear() + 1, 0, 1)
      : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const next = nextBoundary < endExclusive ? nextBoundary : endExclusive;
    segments.push({ key: `${unit}-${cursor.getFullYear()}-${cursor.getMonth()}`,
      date: new Date(cursor), width: (calendarDayNumber(next) - calendarDayNumber(cursor)) * pixelsPerDay });
    cursor = next;
  }
  return segments;
}

function makeTimeline(rows, precision = "week") {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const suppliedDates = rows.flatMap((row) => [parseDate(row.startDate), parseDate(row.dueDate),
    ...(row.taxDeadlines || []).map((deadline) => parseDate(deadline.dueDate))]).filter(Boolean);
  const earliest = suppliedDates.length ? new Date(Math.min(today.getTime(), ...suppliedDates.map((date) => date.getTime()))) : addDays(today, -28);
  const latest = suppliedDates.length ? new Date(Math.max(today.getTime(), ...suppliedDates.map((date) => date.getTime()))) : addDays(today, 84);
  let rangeStart;
  let rangeEnd;
  let pixelsPerDay;
  if (precision === "day") {
    rangeStart = startOfWeek(addDays(earliest, -3));
    rangeEnd = endOfWeek(addDays(latest, 3));
    const minimumEnd = endOfWeek(addDays(rangeStart, 41));
    if (rangeEnd < minimumEnd) rangeEnd = minimumEnd;
    pixelsPerDay = 36;
  } else if (precision === "month") {
    rangeStart = startOfMonth(addMonths(earliest, -1));
    rangeEnd = endOfMonth(addMonths(latest, 1));
    const minimumEnd = endOfMonth(addMonths(rangeStart, 11));
    if (rangeEnd < minimumEnd) rangeEnd = minimumEnd;
    const monthCount = (rangeEnd.getFullYear() - rangeStart.getFullYear()) * 12
      + rangeEnd.getMonth() - rangeStart.getMonth() + 1;
    const monthWidth = monthCount > 72 ? 70 : monthCount > 48 ? 82 : 98;
    pixelsPerDay = monthWidth / 30.4375;
  } else {
    rangeStart = startOfWeek(addDays(earliest, -7));
    rangeEnd = endOfWeek(addDays(latest, 7));
    const minimumEnd = endOfWeek(addDays(rangeStart, 83));
    if (rangeEnd < minimumEnd) rangeEnd = minimumEnd;
    const weekCount = Math.ceil((calendarDayNumber(addDays(rangeEnd, 1)) - calendarDayNumber(rangeStart)) / 7);
    const weekWidth = weekCount > 78 ? 28 : weekCount > 56 ? 34 : 42;
    pixelsPerDay = weekWidth / 7;
  }
  const dayCount = calendarDayNumber(addDays(rangeEnd, 1)) - calendarDayNumber(rangeStart);
  const ticks = precision === "day"
    ? Array.from({ length: dayCount }, (_, index) => ({ date: addDays(rangeStart, index), width: pixelsPerDay }))
    : precision === "month" ? rangeSegments(rangeStart, rangeEnd, "month", pixelsPerDay)
      : Array.from({ length: Math.ceil(dayCount / 7) }, (_, index) => ({ date: addDays(rangeStart, index * 7), width: pixelsPerDay * 7 }));
  const majorGroups = rangeSegments(rangeStart, rangeEnd, precision === "month" ? "year" : "month", pixelsPerDay);
  return { today, precision, rangeStart, rangeEnd, pixelsPerDay, ticks, majorGroups,
    width: dayCount * pixelsPerDay, gridWidth: precision === "day" ? pixelsPerDay
      : precision === "month" ? 30.4375 * pixelsPerDay : 7 * pixelsPerDay };
}

function dayOffset(date, rangeStart) {
  return calendarDayNumber(date) - calendarDayNumber(rangeStart);
}

export function ProjectSchedule({ store, filter, onOpen, onEditSchedule, onOpenTaxDeadline, onReorder,
  simplifiedView = false, onToggleSimplifiedView }) {
  const { language, t } = useUiLanguage();
  const scrollRef = React.useRef(null);
  const draggingRef = React.useRef(null);
  const resizeRef = React.useRef(null);
  const [draggingKey, setDraggingKey] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);
  const [metaWidth, setMetaWidth] = React.useState(savedMetaWidth);
  const [precision, setPrecision] = React.useState(savedPrecision);
  const [resizingMeta, setResizingMeta] = React.useState(false);
  const rows = React.useMemo(() => scheduleRows(store, filter, language), [store, filter, language]);
  const timeline = React.useMemo(() => makeTimeline(rows, precision), [rows, precision]);
  const width = timeline.width;
  const scheduledCount = rows.filter((row) => row.startDate && row.dueDate).length;
  const incompleteCount = rows.length - scheduledCount;
  const todayLeft = (dayOffset(timeline.today, timeline.rangeStart) + .5) * timeline.pixelsPerDay;
  const locale = language === "en" ? "en-GB" : "zh-HK";
  const weekFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const monthFormatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" });
  const shortMonthFormatter = new Intl.DateTimeFormat(locale, { month: "short" });
  const yearFormatter = new Intl.DateTimeFormat(locale, { year: "numeric" });
  const dayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric" });
  const changePrecision = (value) => {
    setPrecision(value);
    savePrecision(value);
  };
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
  const beginMetaResize = (event) => {
    event.preventDefault();
    resizeRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: metaWidth, currentWidth: metaWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingMeta(true);
  };
  const resizeMeta = (event) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const width = clampMetaWidth(resize.startWidth + event.clientX - resize.startX);
    resize.currentWidth = width;
    setMetaWidth(width);
  };
  const finishMetaResize = (event) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    saveMetaWidth(resize.currentWidth);
    resizeRef.current = null;
    setResizingMeta(false);
  };
  const resizeMetaWithKeyboard = (event) => {
    const increments = { ArrowLeft: -20, ArrowRight: 20, Home: MIN_META_WIDTH, End: MAX_META_WIDTH };
    if (!(event.key in increments)) return;
    event.preventDefault();
    const width = event.key === "Home" || event.key === "End" ? increments[event.key]
      : clampMetaWidth(metaWidth + increments[event.key]);
    setMetaWidth(width);
    saveMetaWidth(width);
  };
  const resetMetaWidth = () => {
    setMetaWidth(DEFAULT_META_WIDTH);
    saveMetaWidth(DEFAULT_META_WIDTH);
  };
  React.useEffect(() => {
    if (!resizingMeta) return undefined;
    const move = (event) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      const width = clampMetaWidth(resize.startWidth + event.clientX - resize.startX);
      resize.currentWidth = width;
      setMetaWidth(width);
    };
    const finish = (event) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      saveMetaWidth(resize.currentWidth);
      resizeRef.current = null;
      setResizingMeta(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [resizingMeta]);

  const scrollToToday = () => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const fixedColumnWidth = viewport.querySelector(".schedule-corner")?.getBoundingClientRect().width || 0;
    const visibleTimelineWidth = Math.max(0, viewport.clientWidth - fixedColumnWidth);
    const requestedLeft = todayLeft - visibleTimelineWidth / 2;
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
        <button type="button" className="button secondary schedule-detail-toggle" aria-pressed={simplifiedView}
          data-tooltip={t(simplifiedView ? "显示导航和排期详情" : "隐藏导航和排期详情")}
          onClick={onToggleSimplifiedView}>{simplifiedView ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          <span>{t("简化视图")}</span></button>
        <div className="schedule-precision" role="group" aria-label={t("时间精度")}>
          {SCHEDULE_PRECISIONS.map((value) => <button type="button" key={value} aria-pressed={precision === value}
            onClick={() => changePrecision(value)}>{t(value === "day" ? "天" : value === "month" ? "月" : "周")}</button>)}
        </div>
        <button type="button" className="button secondary" onClick={scrollToToday}><LocateFixed aria-hidden="true" />{t("今天")}</button></div>
    </header>
    <div className="schedule-legend" aria-label={t("排期图例")}><span><i data-tone="active" />{t("进行中")}</span>
      <span><i data-tone="complete" />{t("已完成")}</span><span><i data-tone="overdue" />{t("已逾期")}</span>
      <span><ReceiptText aria-hidden="true" />{t("税务期限")}</span>
      <span><CircleAlert aria-hidden="true" />{t("日期不完整")}</span></div>
    {rows.length ? <div className="schedule-scroll" ref={scrollRef} tabIndex="0" onWheel={horizontalWheel}
      aria-label={t("可横向滚动的项目排期")}>
      <div className="schedule-grid" data-resizing={resizingMeta || undefined} data-precision={precision}
        data-simplified={simplifiedView || undefined}
        style={{ "--timeline-width": `${width}px`, "--time-grid-width": `${timeline.gridWidth}px`, "--schedule-meta-width": `${metaWidth}px` }}>
        <div className="schedule-corner"><strong>{t("公司／控股公司")}</strong><span>{t(simplifiedView ? "项目类型 · 报告期间" : "项目类型 · 负责人")}</span>
          <button type="button" className="schedule-column-resizer" role="separator" aria-orientation="vertical"
            aria-label={t("拖动调整公司栏宽度")} aria-valuemin={MIN_META_WIDTH} aria-valuemax={MAX_META_WIDTH}
            aria-valuenow={metaWidth} aria-keyshortcuts="ArrowLeft ArrowRight Home End"
            data-tooltip={t("拖动调整公司栏宽度；双击恢复默认宽度")}
            onPointerDown={beginMetaResize} onPointerMove={resizeMeta} onPointerUp={finishMetaResize}
            onPointerCancel={finishMetaResize} onKeyDown={resizeMetaWithKeyboard} onDoubleClick={resetMetaWidth} />
        </div>
        <div className="schedule-calendar-header" style={{ width }}>
          <div className="schedule-months">{timeline.majorGroups.map((group) => <span key={group.key}
            style={{ width: group.width }}>{precision === "month" ? yearFormatter.format(group.date) : monthFormatter.format(group.date)}</span>)}</div>
          <div className="schedule-weeks">{timeline.ticks.map((tick, index) => <span key={tick.date.toISOString()}
            style={{ width: tick.width, flexBasis: tick.width }}
            data-compact={tick.width < 34 || undefined}>{precision === "day" ? dayFormatter.format(tick.date)
              : precision === "month" ? shortMonthFormatter.format(tick.date)
                : (tick.width < 34 && index % 2) ? "" : weekFormatter.format(tick.date)}</span>)}</div>
          {todayLeft >= 0 && todayLeft <= width && <span className="schedule-today-header" style={{ left: todayLeft }}
            aria-hidden="true"><b>{t("今天")}</b></span>}
        </div>
        {rows.map((row) => {
          const rowKey = `${row.kind}:${row.id}`;
          const rowAccessibleName = [row.name, row.periodLabel].filter(Boolean).join(" · ");
          const dropPosition = dropTarget?.key === rowKey ? dropTarget.position : undefined;
          const canReorder = filter !== "archived" && !row.archived;
          const start = parseDate(row.startDate);
          const due = parseDate(row.dueDate);
          const invalid = Boolean(start && due && due < start);
          const overdue = Boolean(due && due < timeline.today && !row.complete && !row.archived);
          const tone = row.archived ? "archived" : row.complete ? "complete" : overdue ? "overdue" : "active";
          const barLeft = start ? dayOffset(start, timeline.rangeStart) * timeline.pixelsPerDay : null;
          const dueLeft = due ? (dayOffset(due, timeline.rangeStart) + .5) * timeline.pixelsPerDay : null;
          const durationDays = start && due && !invalid ? Math.max(1, dayOffset(due, start) + 1) : 0;
          const barWidth = durationDays ? Math.max(8, durationDays * timeline.pixelsPerDay) : 0;
          const durationWeeks = durationDays ? Math.max(1, Math.ceil(durationDays / 7)) : 0;
          const durationMonths = durationDays ? Math.max(1, Math.ceil(durationDays / 30.4375)) : 0;
          const durationLabel = precision === "day" ? t("{count} 天", { count: durationDays })
            : precision === "month" ? t("{count} 个月", { count: durationMonths })
              : t("{count} 周", { count: durationWeeks });
          const taxMarkers = Object.values((row.taxDeadlines || []).reduce((groups, deadline) => ({ ...groups,
            [deadline.dueDate]: [...(groups[deadline.dueDate] || []), deadline] }), {}));
          const projectTypeLabel = engagementTypesLabel(row, language);
          const projectTypeOwner = [projectTypeLabel,
            row.owner || t("未设置负责人")].filter(Boolean).join(" · ");
          const openSchedule = () => row.archived || !onEditSchedule
            ? onOpen(row.kind, row.id) : onEditSchedule(row.kind, row.id);
          return <React.Fragment key={rowKey}>
            <div className="schedule-row-meta" data-dragging={draggingKey === rowKey || undefined}
              data-drop-position={dropPosition} draggable={canReorder} title={canReorder ? t("按住项目即可拖动排序") : undefined}
              onDragStart={(event) => beginDrag(event, rowKey)} onDragEnd={finishDrag} onDragOver={(event) => dragOver(event, rowKey)}
              onDrop={(event) => drop(event, rowKey)}>
              <button type="button" className="schedule-row-open" onClick={() => onOpen(row.kind, row.id)}
                aria-description={canReorder ? t("按住项目即可拖动排序；按 Alt 加上下方向键也可移动") : undefined}
                aria-keyshortcuts={canReorder ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
                onKeyDown={(event) => reorderWithKeyboard(event, rowKey)}>
                {!simplifiedView && <i data-kind={row.kind}>{row.kind === "group" ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</i>}
                <span><strong>{row.name}</strong>{simplifiedView
                  ? <>{projectTypeLabel && <small className="schedule-project-type">{projectTypeLabel}</small>}
                    {row.periodLabel && <ReportingPeriodSummary engagement={row.engagement || row} language={language} t={t}
                      className="schedule-reporting-period" compact />}</>
                  : <>{row.periodLabel && <ReportingPeriodSummary engagement={row.engagement || row} language={language} t={t}
                      className="schedule-reporting-period" />}
                    {projectTypeOwner && <small className="schedule-project-type">{projectTypeOwner}</small>}
                    {row.secondaryName && <small>{row.secondaryName}</small>}</>}
                </span>
              </button>
              {!row.archived && <button type="button" className="schedule-row-edit"
                aria-label={t("编辑“{name}”的项目排期", { name: rowAccessibleName })}
                data-tooltip={t("编辑项目开始日和截止日")}
                onClick={() => onEditSchedule?.(row.kind, row.id)}><CalendarClock aria-hidden="true" /></button>}
            </div>
            <div className="schedule-lane" style={{ width }} data-tone={tone} data-drop-position={dropPosition}
              onDragOver={(event) => dragOver(event, rowKey)} onDrop={(event) => drop(event, rowKey)}>
              {todayLeft >= 0 && todayLeft <= width && <span className="schedule-today-line" style={{ left: todayLeft }} aria-hidden="true" />}
              {start && due && !invalid && <button type="button" className="schedule-bar" style={{ left: barLeft, width: barWidth }}
                data-tone={tone} onClick={openSchedule}
                aria-label={t("{name}：{start} 至 {deadline}", { name: row.name, start: formatDate(row.startDate, language), deadline: formatDate(row.dueDate, language) })}
                title={`${formatDate(row.startDate, language)} → ${formatDate(row.dueDate, language)} · ${durationLabel}`}>
                {barWidth >= 52 && <span>{durationLabel}</span>}</button>}
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
                const markerLeft = (dayOffset(markerDate, timeline.rangeStart) + .5) * timeline.pixelsPerDay;
                const urgency = deadlines.some((deadline) => taxDeadlineUrgency(deadline, timeline.today).level === "overdue") ? "overdue"
                  : deadlines.some((deadline) => taxDeadlineUrgency(deadline, timeline.today).level === "due_today") ? "due_today"
                    : deadlines.some((deadline) => taxDeadlineUrgency(deadline, timeline.today).level === "due_soon") ? "due_soon" : "upcoming";
                const names = deadlines.map((deadline) => taxDeadlineCategoryLabel(deadline, language)).join(" · ");
                return <button type="button" className="schedule-tax-marker" key={deadlines[0].dueDate}
                  style={{ left: markerLeft }} data-urgency={urgency}
                  onClick={() => onOpenTaxDeadline?.(row.kind, row.id, deadlines.length === 1 ? deadlines[0].id : null)}
                  aria-label={t("{name} 在 {date} 有 {count} 项税务期限", { name: row.name,
                    date: formatDate(deadlines[0].dueDate, language), count: deadlines.length })}
                  title={`${formatDate(deadlines[0].dueDate, language)} · ${names}`}>
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
