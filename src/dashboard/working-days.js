import { HK_CALENDAR_MIN, HK_CALENDAR_MAX, HK_CALENDAR_VERSION, HK_PUBLIC_HOLIDAYS } from "./hk-public-holidays.js";

const DAY = 86_400_000;
const holidays = new Set(HK_PUBLIC_HOLIDAYS);
export const MAX_WORKDAYS = 1000;
function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
function validDays(value) { return Number.isInteger(value) && value >= 1 && value <= MAX_WORKDAYS; }
// Preserve intent and provenance, not a live formula. Calendar updates must
// never silently recalculate historical dates or invalidate old snapshots.
export function validSchedulePlan(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && value.mode === "workdays" && value.calendar === "HK" && value.workweek === "mon-fri"
    && validDays(value.workdays) && dateOnly(value.requestedStartDate)
    && typeof value.calendarVersion === "string" && value.calendarVersion.length > 0 && value.calendarVersion.length <= 64);
}
export function schedulePlanFields(record) {
  if (!validSchedulePlan(record?.schedulePlan)) return {};
  const { mode, calendar, workweek, workdays, requestedStartDate, calendarVersion } = record.schedulePlan;
  return { schedulePlan: { mode, calendar, workweek, workdays, requestedStartDate, calendarVersion } };
}

// UTC is only a date-arithmetic container: no local timezone or DST offsets.
export function calculateWorkingSchedule(requestedStartDate, rawDays) {
  const date = dateOnly(requestedStartDate);
  if (!date) return { error: "start" };
  if ((typeof rawDays !== "number" && typeof rawDays !== "string")
    || (typeof rawDays === "string" && !/^\d+$/.test(rawDays))) return { error: "duration" };
  const workdays = Number(rawDays);
  if (!validDays(workdays)) return { error: "duration" };
  let startDate = "", count = 0, skippedDays = 0;
  // Validate coverage on every traversed day, including cross-year weekends.
  while (count < workdays) {
    const iso = date.toISOString().slice(0, 10);
    if (iso < HK_CALENDAR_MIN || iso > HK_CALENDAR_MAX) return { error: "coverage" };
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6 || holidays.has(iso)) skippedDays += 1;
    else { startDate ||= iso; count += 1; }
    if (count === workdays) return { startDate, dueDate: iso, skippedDays,
      schedulePlan: { mode: "workdays", calendar: "HK", workweek: "mon-fri", workdays,
        requestedStartDate, calendarVersion: HK_CALENDAR_VERSION } };
    date.setUTCDate(date.getUTCDate() + 1);
  }
}

export function initialScheduleDraft(record = {}) {
  const plan = schedulePlanFields(record).schedulePlan;
  return { mode: plan ? "workdays" : "manual", workdays: plan ? String(plan.workdays) : "",
    requestedStartDate: plan?.requestedStartDate || record?.startDate || "",
    snapshot: plan ? { startDate: record.startDate, dueDate: record.dueDate, schedulePlan: plan } : null };
}
export function resolveScheduleDraft(draft, dates) {
  if (draft.mode === "manual") return { startDate: dates.startDate, dueDate: dates.dueDate, schedulePlan: undefined };
  if (draft.snapshot) {
    const { startDate, dueDate, schedulePlan } = draft.snapshot;
    const span = (dateOnly(dueDate) - dateOnly(schedulePlan.requestedStartDate)) / DAY + 1;
    return { startDate, dueDate, schedulePlan, saved: true, skippedDays: Math.max(0, span - schedulePlan.workdays) };
  }
  return calculateWorkingSchedule(draft.requestedStartDate, draft.workdays);
}
export const SCHEDULE_ERRORS = {
  start: "请选择有效的项目开始日。",
  duration: "预计工作天数须为 1 至 1000 的整数。",
  coverage: "排期超出香港假期数据范围（2025—2027）；请缩短工期或切换为手动日期。",
};
