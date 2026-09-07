import { calendarDate } from './workspace-validation.js';

const asDate = value => calendarDate(value) ? new Date(`${value}T00:00:00Z`) : null;
const iso = value => value && value.getUTCFullYear() >= 1 && value.getUTCFullYear() <= 9999 ? value.toISOString().slice(0,10) : '';
export function nextCalendarDate(value) {
  const date=asDate(value); if(!date) return ''; date.setUTCDate(date.getUTCDate()+1); return iso(date);
}
// Inclusive period end, with month-end/leap-day clamping. It is a drafting suggestion, not a legal limit.
export function periodEndAfterMonths(start, months) {
  const date=asDate(start); if(!date || !Number.isInteger(months) || months<1 || months>1200) return '';
  const day=date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth()+months);
  if(day===1) date.setUTCDate(0);
  else { const last=new Date(date); last.setUTCMonth(last.getUTCMonth()+1); last.setUTCDate(0);
    date.setUTCDate(Math.min(day-1,last.getUTCDate())); }
  return iso(date);
}
export function periodAfterEnd(end) {
  const periodStart=nextCalendarDate(end), periodEnd=periodEndAfterMonths(periodStart,12);
  return { periodStart, periodEnd };
}
export function firstPeriodEndChoices(start, preset='calendar') {
  if(!asDate(start)) return [];
  const limit=periodEndAfterMonths(start,18), choices=[];
  if(!limit) return [];
  const year=Number(start.slice(0,4)), suffix=preset==='apr_mar'?'-03-31':preset==='calendar'?'-12-31':null;
  if(suffix) for(let offset=0;offset<=2;offset++) { const end=`${String(year+offset).padStart(4,'0')}${suffix}`;
    if(calendarDate(end) && end>=start && end<=limit) choices.push({kind:'year_end',end}); }
  for(const months of [12,18]) { const end=periodEndAfterMonths(start,months); if(end) choices.push({kind:'months',months,end}); }
  return choices;
}
