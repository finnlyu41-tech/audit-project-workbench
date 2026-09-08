import { HK_CALENDAR_MIN, HK_CALENDAR_MAX, HK_CALENDAR_VERSION, HK_PUBLIC_HOLIDAYS } from "./hk-public-holidays.js";

const DAY = 86_400_000;
const holidays = new Set(HK_PUBLIC_HOLIDAYS);
export const MAX_WORKDAYS = 1000;
export const WORKWEEKS = ["mon-fri", "mon-sat"];
export function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
const iso = date => date.toISOString().slice(0, 10);
const covered = value => value >= HK_CALENDAR_MIN && value <= HK_CALENDAR_MAX;
export const validWorkdays = value => Number.isInteger(value) && value >= 1 && value <= MAX_WORKDAYS;
function parsedDays(value, allowZero = false) {
  if (!["number", "string"].includes(typeof value) || (typeof value === "string" && !/^\d+$/.test(value))) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= (allowZero ? 0 : 1) && n <= MAX_WORKDAYS ? n : null;
}
function working(date, workweek) {
  return date.getUTCDay() !== 0 && (workweek === "mon-sat" || date.getUTCDay() !== 6) && !holidays.has(iso(date));
}
export function validSchedulePlan(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.mode !== "workdays" || value.calendar !== "HK"
    || !WORKWEEKS.includes(value.workweek) || !validWorkdays(value.workdays) || !dateOnly(value.requestedStartDate)
    || typeof value.calendarVersion !== "string" || !value.calendarVersion || value.calendarVersion.length > 64) return false;
  if (value.direction !== undefined && !["forward", "backward"].includes(value.direction)) return false;
  if (value.direction === "backward" && (!dateOnly(value.targetDueDate) || parsedDays(value.bufferDays ?? 0, true) === null)) return false;
  return true;
}
// This stores intent/provenance, not a live formula. Opening a saved record
// never changes dates even after holiday coverage or workweek preferences change.
export function schedulePlanFields(record) {
  if (!validSchedulePlan(record?.schedulePlan)) return {};
  const { mode, calendar, workweek, workdays, requestedStartDate, calendarVersion, direction, targetDueDate, bufferDays } = record.schedulePlan;
  return { schedulePlan: { mode, calendar, workweek, workdays, requestedStartDate, calendarVersion,
    ...(direction === "backward" ? { direction, targetDueDate, bufferDays: bufferDays ?? 0 } : {}) } };
}

export function countWorkingDays(startDate, dueDate, workweek = "mon-fri") {
  const start = dateOnly(startDate), end = dateOnly(dueDate);
  if (!start || !end) return { error: "start" };
  if (!WORKWEEKS.includes(workweek)) return { error: "week" };
  if (dueDate < startDate) return { error: "range" };
  if (!covered(startDate) || !covered(dueDate)) return { error: "coverage" };
  let workdays = 0; const skippedDates = [];
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (working(d, workweek)) workdays += 1; else skippedDates.push(iso(d));
  }
  return { workdays, skippedDays: skippedDates.length, skippedDates };
}

// Forward/backward traversal checks EVERY encountered date, including the
// non-working days at a year boundary. No network or timezone arithmetic.
function traverse(start, count, direction, workweek) {
  const date = dateOnly(start);
  if (!date) return { error: "start" };
  if (!WORKWEEKS.includes(workweek)) return { error: "week" };
  let first = "", last = "", seen = 0; const skippedDates = [];
  while (seen < count) {
    const value = iso(date);
    if (!covered(value)) return { error: "coverage" };
    if (working(date, workweek)) { first ||= value; last = value; seen += 1; }
    else skippedDates.push(value);
    if (seen < count) date.setUTCDate(date.getUTCDate() + direction);
  }
  return { startDate: direction > 0 ? first : last, dueDate: direction > 0 ? last : first,
    skippedDays: skippedDates.length, skippedDates };
}
export function calculateWorkingSchedule(requestedStartDate, rawDays, workweek = "mon-fri") {
  if (!dateOnly(requestedStartDate)) return { error: "start" };
  const workdays = parsedDays(rawDays);
  if (workdays === null) return { error: "duration" };
  const result = traverse(requestedStartDate, workdays, 1, workweek);
  if (result.error) return result;
  return { ...result, schedulePlan: { mode: "workdays", calendar: "HK", workweek, workdays,
    requestedStartDate, calendarVersion: HK_CALENDAR_VERSION } };
}
export function shiftWorkingDate(value, offset, workweek = "mon-fri") {
  if (!dateOnly(value)) return { error: "start" };
  if (!Number.isInteger(offset) || Math.abs(offset) > MAX_WORKDAYS) return { error: "duration" };
  const direction = offset < 0 ? -1 : 1;
  const anchor = traverse(value, 1, direction, workweek);
  if (anchor.error) return anchor;
  const result = traverse(anchor.startDate, Math.abs(offset) + 1, direction, workweek);
  return result.error ? result : { date: direction < 0 ? result.startDate : result.dueDate };
}
// Follow-up intervals exclude the sending date, including weekend sends.
export function followingWorkingDate(value, rawDays, workweek = "mon-fri") {
  const date = dateOnly(value), count = parsedDays(rawDays);
  if (!date) return { error: "start" };
  if (count === null) return { error: "duration" };
  if (!covered(value)) return { error: "coverage" };
  date.setUTCDate(date.getUTCDate() + 1);
  const result = traverse(iso(date), count, 1, workweek);
  return result.error ? result : { date: result.dueDate };
}
export function calculateBackwardSchedule(targetDueDate, rawDays, workweek = "mon-fri", rawBuffer = 0) {
  if (!dateOnly(targetDueDate)) return { error: "start" };
  const workdays = parsedDays(rawDays), bufferDays = parsedDays(rawBuffer, true);
  if (workdays === null || bufferDays === null) return { error: "duration" };
  const end = traverse(targetDueDate, bufferDays + 1, -1, workweek);
  if (end.error) return end;
  const result = traverse(end.startDate, workdays, -1, workweek);
  if (result.error) return result;
  const interval = countWorkingDays(result.startDate, targetDueDate, workweek);
  return { ...result, skippedDays: interval.skippedDays, skippedDates: interval.skippedDates,
    schedulePlan: { mode: "workdays", calendar: "HK", workweek, workdays, requestedStartDate: result.startDate,
      calendarVersion: HK_CALENDAR_VERSION, direction: "backward", targetDueDate, bufferDays } };
}
export function initialScheduleDraft(record = {}) {
  const plan = schedulePlanFields(record).schedulePlan;
  return { mode: plan ? "workdays" : "manual", direction: plan?.direction || "forward", workweek: plan?.workweek || "mon-fri",
    workdays: plan ? String(plan.workdays) : "", requestedStartDate: plan?.requestedStartDate || record?.startDate || "",
    targetDueDate: plan?.targetDueDate || record?.dueDate || "", bufferDays: String(plan?.bufferDays || 0),
    snapshot: plan ? { startDate: record.startDate, dueDate: record.dueDate, schedulePlan: plan } : null };
}
export function resolveScheduleDraft(draft, dates) {
  if (draft.mode === "manual") return { startDate: dates.startDate, dueDate: dates.dueDate, schedulePlan: undefined };
  if (draft.direction === "count") {
    const count = countWorkingDays(dates.startDate, dates.dueDate, draft.workweek || "mon-fri");
    return count.error ? count : { ...count, startDate: dates.startDate, dueDate: dates.dueDate, schedulePlan: undefined };
  }
  if (draft.snapshot) {
    const { startDate, dueDate, schedulePlan } = draft.snapshot;
    const span = (dateOnly(dueDate) - dateOnly(schedulePlan.requestedStartDate)) / DAY + 1;
    return { startDate, dueDate, schedulePlan, saved: true, skippedDays: Math.max(0, span - schedulePlan.workdays) };
  }
  return draft.direction === "backward"
    ? calculateBackwardSchedule(draft.targetDueDate, draft.workdays, draft.workweek || "mon-fri", draft.bufferDays || "0")
    : calculateWorkingSchedule(draft.requestedStartDate, draft.workdays, draft.workweek || "mon-fri");
}
export const SCHEDULE_ERRORS = {
  start: "请选择有效的项目开始日。", duration: "预计工作天数须为 1 至 1000 的整数。",
  coverage: "排期超出香港假期数据范围（2025—2027）；请缩短工期或切换为手动日期。",
  range: "项目截止日不得早于开始日。", week: "请选择有效的工作周。",
};
