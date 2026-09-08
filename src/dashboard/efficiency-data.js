import { dateOnly, validWorkdays, WORKWEEKS } from './working-days.js';
const obj = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
export const OUTPUT_LANGUAGES = ['en', 'zh-Hans', 'zh-Hant'];
export const validAliases = value => Array.isArray(value) && value.length <= 8
  && value.every(v => typeof v === 'string' && v.trim().length > 0 && v.length <= 120);
export function entityEfficiencyFields(record) {
  return { ...(validAliases(record?.aliases) && record.aliases.length ? { aliases: [...new Set(record.aliases.map(v => v.trim()))] } : {}),
    ...(OUTPUT_LANGUAGES.includes(record?.followUpLanguage) ? { followUpLanguage: record.followUpLanguage } : {}) };
}
export function validNextAction(value) {
  return obj(value) && (value.kind === 'outstanding' ? id(value.itemId)
    : value.kind === 'workflow' && id(value.nodeId) && (value.workstreamId === null || id(value.workstreamId)));
}
export function validRemainingWork(value) {
  return obj(value) && Number.isInteger(value.days) && value.days >= 0 && value.days <= 1000 && Boolean(dateOnly(value.asOf));
}
export function engagementEfficiencyFields(record) {
  const next = record?.nextAction;
  return { ...(validNextAction(next) ? { nextAction: next.kind === 'outstanding'
    ? { kind: next.kind, itemId: next.itemId } : { kind: next.kind, workstreamId: next.workstreamId, nodeId: next.nodeId } } : {}),
    ...(validRemainingWork(record?.remainingWork) ? { remainingWork: { days: record.remainingWork.days, asOf: record.remainingWork.asOf } } : {}) };
}
export function validFollowUp(value) {
  return obj(value) && Boolean(dateOnly(value.sentDate)) && Boolean(dateOnly(value.dueDate)) && value.dueDate >= value.sentDate
    && validWorkdays(value.interval) && WORKWEEKS.includes(value.workweek) && typeof value.calendarVersion === 'string'
    && value.calendarVersion.length > 0 && value.calendarVersion.length <= 64;
}
export function outstandingEfficiencyFields(record) {
  if (!validFollowUp(record?.followUp)) return {};
  const { sentDate, dueDate, interval, workweek, calendarVersion } = record.followUp;
  return { followUp: { sentDate, dueDate, interval, workweek, calendarVersion } };
}
export function localIsoDate(now = new Date()) {
  // Calendar estimates share the explicit Hong Kong calendar, not the UTC date.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
