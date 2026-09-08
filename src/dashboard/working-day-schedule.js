import { calendarDate } from './workspace-validation.js';
import { HK_CALENDAR, HK_GENERAL_HOLIDAYS } from './hk-holidays.js';
const DAY = 86400000;
const holidays = new Map(HK_GENERAL_HOLIDAYS.map(day => [day.date, day]));
export const WORKWEEKS = Object.freeze(['five', 'six']);
export const MAX_ESTIMATED_WORKDAYS = 1000;

// One working day includes the effective start day. Persisted schedules remain ordinary date pairs.
export function estimateWorkingSchedule(input = {}) {
  const { startDate, workdays, workweek = 'five' } = input && typeof input === 'object' ? input : {};
  if (!calendarDate(startDate) || startDate < '0001-01-01') return { error: 'date' };
  const text = typeof workdays === 'number' ? String(workdays) : workdays;
  if (typeof text !== 'string' || !/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))
    || Number(text) < 1 || Number(text) > MAX_ESTIMATED_WORKDAYS) return { error: 'days' };
  if (!WORKWEEKS.includes(workweek)) return { error: 'week' };
  const total = Number(text), skipped = []; let counted = 0, effectiveStart = '';
  let stamp = Date.parse(`${startDate}T00:00:00Z`);
  // Coverage is checked before each calendar day, including weekends; no guessed future holidays.
  for (let step = 0; step < total * 8 + 366; step++, stamp += DAY) {
    const date = new Date(stamp), key = date.toISOString().slice(0, 10);
    if (key < HK_CALENDAR.coverageStart || key > HK_CALENDAR.coverageEnd
      || !HK_CALENDAR.years.includes(date.getUTCFullYear())) return { error: 'coverage', year: date.getUTCFullYear() };
    const holiday = holidays.get(key);
    const weekend = date.getUTCDay() === 0 || (workweek === 'five' && date.getUTCDay() === 6);
    if (holiday || weekend) { skipped.push({ date: key, reason: holiday ? 'holiday' : 'weekend', holiday }); continue; }
    if (!effectiveStart) effectiveStart = key;
    if (++counted !== total) continue;
    return { requestedStart: startDate, startDate: effectiveStart, dueDate: key, workdays: total, workweek,
      calendarId: HK_CALENDAR.id, shifted: effectiveStart !== startDate, skipped,
      calendarDays: Math.round((stamp - Date.parse(`${effectiveStart}T00:00:00Z`)) / DAY) + 1 };
  }
  return { error: 'coverage' };
}
